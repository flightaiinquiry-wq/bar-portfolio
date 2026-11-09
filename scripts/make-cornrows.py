"""Rebuild the hero bust's hair as cornrows, directly in the PPT1 point-cloud format.

Usage: python -I scripts/make-cornrows.py <source.bin> <output.bin> [preview_dir]

PPT1 layout (little endian):
  char[4] "PPT1" | uint32 count | float32 scale
  count * { int16 x, int16 y, int16 z, uint8 luma, uint8 pad }

The bust is a front-facing relief and the renderer has no occlusion (additive
points, no depth write), so braids live only on the camera-facing scalp shell.
"""
import site
import sys

sys.path.append(site.getusersitepackages())  # -I drops the user site; numpy/PIL live there

import pathlib
import struct

import numpy as np

SEED = 11
PART_Q = 0.56            # side parts, as a share of the row span (the centre part is at 0)
ROW_EDGES = np.array([-1.0, -PART_Q, 0.0, PART_Q, 1.0])   # four rows that fill the scalp
PART_WIDTH = 0.009       # full width of the part lines at the bottom of the valleys between rows
PART_POINTS = 650        # shared across the three parts
BODY_DONORS = 4000       # points moved from the torso to the braids (hair needs the density)
LINK_PITCH = 0.078       # length of one over/under link along a braid
RIDGE = 0.064            # how far a braid rises off the scalp
ROPE_SHARE = 0.50        # how much of that height is the round rope; the rest is the strands on it
OUTER_ROW_GAIN = 1.20    # brightness of the two outer rows relative to the middle two
EAR_POINTS = 520         # per ear
CONTOUR_FOLLOW = 0.35    # 0 = rows run straight back, 1 = rows follow the skull outline to the crown
WEAVE_SHEAR = 1.45       # links a strand travels from the seam to the edge of a braid (the V)
WEAVE_ALONG = 0.50       # strand thickness along the braid, as a share of one link
WEAVE_ACROSS = 0.60      # strand reach across the braid, as a share of its half width
LIGHT = np.array([-0.30, 0.66, 0.68]) / np.linalg.norm([-0.30, 0.66, 0.68])
TAIL_POINTS = 420        # per hanging braid end
TAIL_WIDTH = 0.034       # full width of a hanging braid end
TAIL_PITCH = 0.045       # link length on a hanging braid end
TAIL_RELIEF = 0.020      # strand height on a hanging braid end
TAIL_Z = -0.30           # depth of the ends: behind the ears
# (top |x|, end |x|, top y, end y, brightness, sway phase)
TAILS = ((0.418, 0.400, -0.01, -0.22, 1.0, 0.0), (0.385, 0.362, -0.06, -0.30, 0.85, 1.7))

# Scalp ellipse in the front view.
HEAD_A, HEAD_B, HEAD_CY = 0.415, 0.545, 0.22

# Face / jaw silhouette below the ellipse centre, measured from the source cloud.
JAW_Y = np.array([-0.42, -0.27, -0.20, -0.13, -0.06, 0.02, 0.10, 0.22])
JAW_W = np.array([0.29, 0.335, 0.365, 0.385, 0.40, 0.41, 0.415, 0.415])

# The line-up: a flat, squared edge across the forehead that steps back at the temples.
HAIRLINE_X = np.array([0.0, 0.25, 0.285, 0.31, 0.35, 0.385, 0.425])
HAIRLINE_Y = np.array([0.425, 0.420, 0.405, 0.335, 0.285, 0.190, 0.080])

# Where the source cloud's own hair began. Everything above it is replaced, even
# where the squared line-up sits higher (that strip is refilled with skin).
SOURCE_HAIR_X = np.array([0.0, 0.11, 0.20, 0.28, 0.345, 0.39, 0.425])
SOURCE_HAIR_Y = np.array([0.420, 0.415, 0.395, 0.350, 0.280, 0.200, 0.100])


def load(path):
    d = pathlib.Path(path).read_bytes()
    if d[:4] != b"PPT1":
        raise SystemExit("not a PPT1 file")
    n, scale = struct.unpack("<If", d[4:12])
    r = np.frombuffer(d, dtype=[("x", "<i2"), ("y", "<i2"), ("z", "<i2"), ("l", "u1"), ("p", "u1")], offset=12, count=n)
    return np.stack([r["x"], r["y"], r["z"]], 1).astype(float) * scale, r["l"] / 255.0, scale


def save(path, P, L, scale):
    q = np.round(P / scale).astype(np.int64)
    if q.min() < -32768 or q.max() > 32767:
        raise SystemExit("coordinates overflow int16")
    rec = np.zeros(len(P), dtype=[("x", "<i2"), ("y", "<i2"), ("z", "<i2"), ("l", "u1"), ("p", "u1")])
    rec["x"], rec["y"], rec["z"] = q[:, 0], q[:, 1], q[:, 2]
    rec["l"] = np.clip(np.round(L * 255), 0, 255).astype(np.uint8)
    pathlib.Path(path).write_bytes(b"PPT1" + struct.pack("<If", len(P), scale) + rec.tobytes())


def half_width(y):
    above = np.sqrt(np.clip(1 - ((y - HEAD_CY) / HEAD_B) ** 2, 0, 1)) * HEAD_A
    return np.where(y >= HEAD_CY, above, np.interp(y, JAW_Y, JAW_W))


def hairline(x):
    return np.interp(np.abs(x), HAIRLINE_X, HAIRLINE_Y)


def source_hairline(x):
    return np.interp(np.abs(x), SOURCE_HAIR_X, SOURCE_HAIR_Y)


class Scalp:
    """Ellipsoid shell, with depth calibrated to the kept face points."""

    def __init__(self, P, keep):
        band = keep & (P[:, 1] > 0.12) & (P[:, 1] < 0.5)
        S = self.shell(P[band, 0], P[band, 1])
        ok = S > 0.25
        A = np.stack([np.ones(ok.sum()), S[ok]], 1)
        (self.zc, self.c), *_ = np.linalg.lstsq(A, P[band, 2][ok], rcond=None)
        self.c = float(np.clip(self.c, 0.24, 0.5))

    @staticmethod
    def shell(x, y):
        return np.sqrt(np.clip(1 - (x / HEAD_A) ** 2 - ((y - HEAD_CY) / HEAD_B) ** 2, 0, 1))

    def z(self, x, y):
        return self.zc + self.c * self.shell(x, y)

    def normal(self, x, y, z):
        n = np.stack([x / HEAD_A**2, (y - HEAD_CY) / HEAD_B**2, (z - self.zc) / self.c**2], -1)
        return n / np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-9)


def row_span(y):
    """Half span of the rows at height y: nearly straight back, easing in toward the crown."""
    skull = HEAD_A * np.sqrt(np.clip(1 - ((y - HEAD_CY) / HEAD_B) ** 2, 1e-4, 1))
    return HEAD_A + (skull - HEAD_A) * CONTOUR_FOLLOW


def in_hair(x, y):
    return ((x / HEAD_A) ** 2 + ((y - HEAD_CY) / HEAD_B) ** 2 < 0.995) & (y >= hairline(x))


def braid_surface(u, d):
    """A plait's relief: a round rope carrying slanted strands either side of a centre seam.

    u is in links along the braid, d is -1..1 across it. Returns (height 0..1, strand 0..1).
    """
    v = u - WEAVE_SHEAR * np.abs(d) + 0.5 * (d > 0)
    delta = v - np.round(v)
    across = (np.abs(d) - 0.5) / WEAVE_ACROSS
    strand = np.sqrt(np.clip(1 - (delta / WEAVE_ALONG) ** 2 - across**2, 0, 1))
    rope = np.clip(1 - d**2, 0, 1) ** 0.35
    return rope * (ROPE_SHARE + (1 - ROPE_SHARE) * strand), strand


def lit(u, d, pitch, half_width, relief, N, T, B):
    """Light the relief itself, so every strand has a bright side and a shadowed side."""
    e = 0.015
    along = (braid_surface(u + e, d)[0] - braid_surface(u - e, d)[0]) / (2 * e)
    side = (braid_surface(u, np.clip(d + e, -1, 1))[0] - braid_surface(u, np.clip(d - e, -1, 1))[0]) / (2 * e)
    n = N - T * np.clip(along * relief / pitch, -2.5, 2.5)[:, None]
    n = n - B * np.clip(side * relief / half_width, -2.5, 2.5)[:, None]
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
    return np.clip(n @ LIGHT, 0, 1)


def make_rows(n, rng, scalp):
    """Fill the whole scalp with plaited rows, leaving only thin parts between them."""
    last = len(ROW_EDGES) - 2
    out_p, out_l, got = [], [], 0
    while got < n:
        m = (n - got) * 8 + 2000
        x = rng.uniform(-HEAD_A, HEAD_A, m)
        y = rng.uniform(0.0, HEAD_CY + HEAD_B, m)
        ok = in_hair(x, y)
        x, y = x[ok], y[ok]

        span = row_span(y)
        q = x / span
        k = np.clip(np.searchsorted(ROW_EDGES, q) - 1, 0, last)
        lo, hi = ROW_EDGES[k], ROW_EDGES[k + 1]
        d = (2 * q - lo - hi) / (hi - lo)
        # distance to the nearest part; the outer edges of the outer rows have none
        to_lo = np.where(k == 0, 9.0, (q - lo) * span)
        to_hi = np.where(k == last, 9.0, (hi - q) * span)
        clear = np.minimum(to_lo, to_hi) > 0.5 * PART_WIDTH

        # arc position over the head, so links foreshorten as a row rolls over the crown
        meridian = HEAD_B * np.sqrt(np.clip(1 - (x / HEAD_A) ** 2, 1e-4, 1))
        phi = np.arcsin(np.clip((y - HEAD_CY) / meridian, -1, 1))
        u = phi * 0.5 * (HEAD_B + scalp.c) / LINK_PITCH + k * 0.37
        height, strand = braid_surface(u, d)

        z = scalp.z(x, y)
        N = scalp.normal(x, y, z)
        B = np.stack([1 - N[:, 0] ** 2, -N[:, 0] * N[:, 1], -N[:, 0] * N[:, 2]], 1)
        B /= np.maximum(np.linalg.norm(B, axis=1, keepdims=True), 1e-9)
        T = np.cross(N, B)
        shade = lit(u, d, LINK_PITCH, 0.5 * (hi - lo) * span, RIDGE, N, T, B)
        # Lit faces get both brighter points and more of them; seams fall away to dark.
        tone = shade**2 * (0.30 + 0.70 * strand**0.5)
        accept = clear & (rng.uniform(0, 1, len(x)) < 0.10 + 0.90 * np.clip(tone * 1.4, 0, 1))

        # keep the line-up tight: braids start low at the hairline and swell as they run back
        rise = 0.5 + 0.5 * np.clip((y - hairline(x)) / 0.12, 0, 1)
        P = np.stack([x, y, z], 1) + N * (RIDGE * height * rise)[:, None]
        luma = 0.08 + tone
        # the outer rows sit deeper in the scene and draw smaller, so lift them to match
        luma = luma * np.where((k == 0) | (k == last), OUTER_ROW_GAIN, 1.0)
        out_p.append(P[accept])
        out_l.append(luma[accept])
        got += int(accept.sum())
    return np.concatenate(out_p)[:n], np.clip(np.concatenate(out_l)[:n], 0.08, 1.0)


def make_parts(n, rng, scalp):
    """Thin lines of scalp at the bottom of the valleys between rows."""
    px, py = [], []
    got = 0
    while got < n:
        m = (n - got) * 3 + 200
        y = rng.uniform(0.0, HEAD_CY + HEAD_B, m)
        x = rng.choice(ROW_EDGES[1:-1], m) * row_span(y) + rng.normal(0, 0.22 * PART_WIDTH, m)
        ok = in_hair(x, y)
        px.append(x[ok])
        py.append(y[ok])
        got += int(ok.sum())
    x, y = np.concatenate(px)[:n], np.concatenate(py)[:n]
    return np.stack([x, y, scalp.z(x, y)], 1), rng.uniform(0.50, 0.82, n)


def make_forehead_skin(P, L, keep, rng, scalp):
    """Refill the strip where the squared line-up sits above the source cloud's hairline."""
    patch = keep & (np.abs(P[:, 0]) < 0.2) & (P[:, 1] > 0.2) & (P[:, 1] < 0.36)
    density = patch.sum() / (0.4 * 0.16)
    xs = np.linspace(-HEAD_A, HEAD_A, 2001)
    gap = np.clip(hairline(xs) - source_hairline(xs), 0, None)
    n = int(density * gap.sum() * (xs[1] - xs[0]))
    if n == 0:
        return np.zeros((0, 3)), np.zeros(0)
    x = rng.choice(xs, n, p=gap / gap.sum())
    low = source_hairline(x)
    y = low + rng.uniform(0, 1, n) * np.clip(hairline(x) - low, 0, None)
    return np.stack([x, y, scalp.z(x, y)], 1), rng.choice(L[patch], n)


def make_ear(sign, n, rng, scalp):
    cx, cy, rx, ry = sign * 0.402, 0.075, 0.05, 0.105
    z0 = -0.20      # sits at the depth of the cheek edge so it stays attached when the head turns
    th = rng.uniform(-0.5 * np.pi, 0.5 * np.pi, n)      # outer half only; the inner half is inside the head
    band = rng.uniform(0, 1, n)
    outer = band < 0.34
    r = np.where(outer, rng.normal(1.0, 0.03, n), np.sqrt(rng.uniform(0.0, 0.86, n)))
    x = cx + sign * np.cos(th) * rx * r
    y = cy + np.sin(th) * ry * r * (1 - 0.14 * (np.sin(th) < 0))
    z = z0 + 0.05 * (1 - r) + rng.normal(0, 0.006, n)
    luma = np.where(outer, rng.uniform(0.42, 0.62, n), rng.uniform(0.28, 0.5, n))
    return np.stack([x, y, z], 1), luma


def make_tail(sign, x_top, x_end, y_top, y_end, gain, phase, n, rng):
    """A short plait hanging from behind the ear to a point.

    The renderer has no occlusion, so anything that would sit behind the jaw is left
    out: the plait simply comes into view where it clears the head.
    """
    length = y_top - y_end
    out_p, out_l, got = [], [], 0
    while got < n:
        m = (n - got) * 8 + 200
        s = rng.uniform(0, 1, m)
        d = rng.uniform(-1, 1, m)
        y = y_top - s * length
        w = 0.5 * TAIL_WIDTH * (0.22 + 0.78 * np.clip((1 - s) / 0.35, 0, 1) ** 0.6)
        u = s * length / TAIL_PITCH
        height, strand = braid_surface(u, d)
        c = np.sqrt(np.clip(1 - d**2, 0, 1))
        N = np.stack([d, np.zeros(m), c], 1)
        T = np.tile([0.0, -1.0, 0.0], (m, 1))
        B = np.tile([1.0, 0.0, 0.0], (m, 1))
        tone = lit(u, d, TAIL_PITCH, w, TAIL_RELIEF, N, T, B) ** 1.5 * (0.30 + 0.70 * strand**0.5)
        emerge = np.clip(s / 0.16, 0, 1)     # fades in from behind the ear: no hard top edge
        r = w * (0.72 + 0.38 * height)
        x = sign * (x_top + (x_end - x_top) * s + 0.004 * np.sin(s * 5 + phase)) + d * r
        clear_of_head = np.abs(x) > np.interp(y, JAW_Y, JAW_W) + 0.002
        ok = clear_of_head & (rng.uniform(0, 1, m) < (0.08 + 0.92 * np.clip(tone * 1.4, 0, 1)) * emerge)
        P = np.stack([x, y, TAIL_Z + c * r], 1)
        out_p.append(P[ok])
        out_l.append(gain * (0.12 + 1.5 * tone[ok]))
        got += int(ok.sum())
    return np.concatenate(out_p)[:n], np.clip(np.concatenate(out_l)[:n], 0.08, 1.0)


def build(P, L, rng):
    x, y = P[:, 0], P[:, 1]
    outside = (y > -0.30) & (np.abs(x) > half_width(y))
    above = y > np.minimum(hairline(x), source_hairline(x))
    hair = outside | above
    # The braids need more density than the original hair budget allows, so a
    # random sample of torso points moves up to the head.
    torso = np.flatnonzero((y < -0.55) & ~hair)
    hair[rng.choice(torso, BODY_DONORS, replace=False)] = True
    removed = np.flatnonzero(hair)
    keep = ~hair
    scalp = Scalp(P, keep)
    print(f"removed {len(removed)} hair points; scalp zc={scalp.zc:.3f} c={scalp.c:.3f}")

    R = len(removed)
    skin_p, skin_l = make_forehead_skin(P, L, keep, rng, scalp)
    n_rows = R - EAR_POINTS * 2 - PART_POINTS - TAIL_POINTS * 2 * len(TAILS) - len(skin_p)
    print(f"{n_rows} braid points, {len(skin_p)} refilled forehead points")

    rows_p, rows_l = make_rows(n_rows, rng, scalp)
    parts_p, parts_l = make_parts(PART_POINTS, rng, scalp)
    new_p, new_l = [skin_p, rows_p, parts_p], [skin_l, rows_l, parts_l]

    for sign in (-1, 1):
        p, l = make_ear(sign, EAR_POINTS, rng, scalp)
        new_p.append(p)
        new_l.append(l)
        for tail in TAILS:
            p, l = make_tail(sign, *tail, TAIL_POINTS, rng)
            new_p.append(p)
            new_l.append(l)

    new_p, new_l = np.concatenate(new_p), np.concatenate(new_l)
    assert len(new_p) == R, (len(new_p), R)

    # Reuse the freed indices in shuffled order: the mobile build keeps every Nth
    # point, so hair must stay evenly mixed through the buffer.
    order = rng.permutation(R)
    P2, L2 = P.copy(), L.copy()
    P2[removed] = new_p[order]
    L2[removed] = new_l[order]
    return P2, L2


def preview(P, L, path, turn=0.0, seed=1, width=1440, height=900):
    """Approximate the site's camera and additive point sprites."""
    from PIL import Image

    rng = np.random.default_rng(seed)
    c, s = np.cos(turn), np.sin(turn)
    xr = P[:, 0] * c + P[:, 2] * s
    zr = -P[:, 0] * s + P[:, 2] * c
    k = 1.2007
    vh = 2 * np.tan(np.radians(22.5)) * 3
    wy = -vh / 2 + (P[:, 1] - P[:, 1].min()) * k
    wx, wz = xr * k, zr * k
    dist = 3 - wz
    f = height / vh * 3
    px = width / 2 + wx * f / dist
    py = height / 2 - wy * f / dist
    a_size = 0.5 + 0.35 * L + 1.4 * rng.random(len(P)) ** 3
    size = 5.5 * a_size / dist
    alpha = (0.16 + 0.84 * L) * 0.5
    img = np.zeros((height, width), float)
    for r in range(1, 6):
        lo, hi = (r - 1) if r > 1 else 0, r
        m = (size >= lo) & (size < hi)
        if not m.any():
            continue
        rad = max(r / 2, 0.75)
        k_r = int(np.ceil(rad))
        for dx in range(-k_r, k_r + 1):
            for dy in range(-k_r, k_r + 1):
                dd = np.hypot(dx, dy) / rad
                if dd >= 1:
                    continue
                w = 1 - dd * 0.9
                ix, iy = (px[m] + dx).astype(int), (py[m] + dy).astype(int)
                ok = (ix >= 0) & (ix < width) & (iy >= 0) & (iy < height)
                np.add.at(img, (iy[ok], ix[ok]), alpha[m][ok] * w)
    bg = np.array([38, 38, 43], float)
    rgb = np.clip(bg[None, None] + img[..., None] * 215, 0, 255).astype(np.uint8)
    Image.fromarray(rgb).save(path)


if __name__ == "__main__":
    src, dst = sys.argv[1], sys.argv[2]
    P, L, scale = load(src)
    rng = np.random.default_rng(SEED)
    P2, L2 = build(P, L, rng)
    save(dst, P2, L2, scale)
    print(f"wrote {dst}: {len(P2)} points, y {P2[:,1].min():.3f}..{P2[:,1].max():.3f}, x {P2[:,0].min():.3f}..{P2[:,0].max():.3f}")
    if len(sys.argv) > 3:
        out = pathlib.Path(sys.argv[3])
        out.mkdir(parents=True, exist_ok=True)
        preview(P, L, out / "original_0.png")
        preview(P2, L2, out / "cornrows_0.png")
        preview(P2, L2, out / "cornrows_r22.png", turn=0.22)
        preview(P2, L2, out / "cornrows_l60.png", turn=-0.6)
