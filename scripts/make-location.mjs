// Builds public/location.bin: an Israel-shaped point cloud in the PPT1 format,
// from the Natural Earth 1:50m country polygons shipped in the world-atlas package.
// Run: node scripts/make-location.mjs
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';

const ROOT = path.resolve(import.meta.dirname, '..');
const COUNT = 44000;
const COUNTRY_ID = '376';
const HEIGHT = 1.86; // model units; matched to the scale of the bust's morph target
const HOLON = { lon: 34.78, lat: 32.01 };

let seed = 20240517;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const topo = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/world-atlas/countries-50m.json'), 'utf8'));
const country = feature(topo, topo.objects.countries).features.find((f) => f.id === COUNTRY_ID);
if (!country) throw new Error('country not found');
const polys = country.geometry.type === 'Polygon' ? [country.geometry.coordinates] : country.geometry.coordinates;

const inRing = (x, y, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inCountry = (x, y) => polys.some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));

let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
for (const p of polys) for (const [x, y] of p[0]) {
  minLon = Math.min(minLon, x); maxLon = Math.max(maxLon, x);
  minLat = Math.min(minLat, y); maxLat = Math.max(maxLat, y);
}
const midLon = (minLon + maxLon) / 2, midLat = (minLat + maxLat) / 2;
const k = HEIGHT / (maxLat - minLat);
const lonK = k * Math.cos((midLat * Math.PI) / 180);
const toModel = (lon, lat) => [(lon - midLon) * lonK, (lat - midLat) * k];

const pts = [];
// A faint coastline/border: edge points read as the outline of the shape.
const edges = [];
let perimeter = 0;
for (const p of polys) for (const ring of p) for (let i = 1; i < ring.length; i++) {
  const [ax, ay] = toModel(...ring[i - 1]), [bx, by] = toModel(...ring[i]);
  const len = Math.hypot(bx - ax, by - ay);
  edges.push({ ax, ay, bx, by, len, cum: (perimeter += len) });
}
const EDGE = Math.round(COUNT * 0.16);
for (let i = 0; i < EDGE; i++) {
  const t = rand() * perimeter;
  const e = edges.find((s) => s.cum >= t) ?? edges[edges.length - 1];
  const f = rand();
  pts.push([
    e.ax + (e.bx - e.ax) * f + (rand() - 0.5) * 0.006,
    e.ay + (e.by - e.ay) * f + (rand() - 0.5) * 0.006,
    (rand() - 0.5) * 0.02,
    0.55 + rand() * 0.3,
  ]);
}
// A soft bright cluster marking Holon.
const [hx, hy] = toModel(HOLON.lon, HOLON.lat);
const CITY = Math.round(COUNT * 0.015);
for (let i = 0; i < CITY; i++) {
  const r = 0.02 * Math.sqrt(-2 * Math.log(1 - rand() * 0.98));
  const a = rand() * Math.PI * 2;
  pts.push([hx + Math.cos(a) * r, hy + Math.sin(a) * r, (rand() - 0.5) * 0.02, 0.8 + rand() * 0.2]);
}
while (pts.length < COUNT) {
  const lon = minLon + rand() * (maxLon - minLon);
  const lat = minLat + rand() * (maxLat - minLat);
  if (!inCountry(lon, lat)) continue;
  const [x, y] = toModel(lon, lat);
  pts.push([x, y, (rand() - 0.5) * 0.05, 0.3 + rand() * 0.35]);
}
for (let i = pts.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [pts[i], pts[j]] = [pts[j], pts[i]];
}

const scale = 3.2640338758938015e-5;
const buf = Buffer.alloc(12 + COUNT * 8);
buf.write('PPT1', 0, 'ascii');
buf.writeUInt32LE(COUNT, 4);
buf.writeFloatLE(scale, 8);
pts.forEach(([x, y, z, l], i) => {
  const o = 12 + i * 8;
  buf.writeInt16LE(Math.round(x / scale), o);
  buf.writeInt16LE(Math.round(y / scale), o + 2);
  buf.writeInt16LE(Math.round(z / scale), o + 4);
  buf.writeUInt8(Math.round(l * 255), o + 6);
});
fs.writeFileSync(path.join(ROOT, 'public/location.bin'), buf);
const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
console.log(`wrote location.bin: ${COUNT} pts, x ${Math.min(...xs).toFixed(3)}..${Math.max(...xs).toFixed(3)}, y ${Math.min(...ys).toFixed(3)}..${Math.max(...ys).toFixed(3)}, holon at ${hx.toFixed(3)},${hy.toFixed(3)}`);
