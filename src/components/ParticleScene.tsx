"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { clamp01, prefersReducedMotion, smoothstep, stage } from "@/lib/stage";

const CAMERA_Z = 3;
const FOV = 45;
const FILL_H = 0.9;
const FILL_W = 0.92;
const FORM_SECONDS = 4;
// Scroll windows, in viewport heights.
const GLOBE_AT = 1;
const GLOBE_LEN = 0.6;
const PLACE_AT = 2.3;
const PLACE_LEN = 0.7;
const HELIX_AT = 3.4;
const HELIX_LEN = 0.6;
const SLIDE_LEN = 1.5;
const DRIFT_X = 0.15;
const DRIFT_Y = -0.09;
// Vertical extent the bust is framed by; pinned so hairstyle edits never rescale the figure.
const BUST_MIN_Y = -0.98930;
const BUST_MAX_Y = 0.87352;
const COARSE_KEEP_EVERY = 2;
const HELIX_SPAN = 3.354;
const HELIX_RUNGS = 24;
const RUNG_EVERY = 6;

const vertex = /* glsl */ `
  uniform float uTime, uPointSize, uDpr, uForm;
  uniform float uToGlobe, uToPlace, uToHelix, uToTunnel, uToFrame;
  uniform float uRingMix, uRingR;
  uniform float uHelixLen, uHelixR, uTunnelLen, uSlide, uRough;
  uniform float uGlow, uGlowR, uAspect, uTall;
  uniform float uGlobeK, uGlobeY, uPlaceK, uPlaceY;
  uniform vec4 uFrame;
  uniform vec2 uPtr;

  attribute vec3 aScatter, aGlobe, aPlace;
  attribute float aAlong, aSide, aNoise, aRung, aRungPos, aDelay, aScale, aPhase, aLuma;

  varying float vA;

  float hash(vec2 p, vec2 k, float m) { return fract(sin(dot(p, k)) * m); }

  vec2 rope(float angle, float radius) {
    vec2 p = vec2(sin(angle), cos(angle)) * radius;
    return mix(mix(p, -p, aSide), mix(p, -p, aRungPos), aRung);
  }

  vec3 framePoint() {
    float w = max(uFrame.y - uFrame.x, 1e-4);
    float h = max(uFrame.z - uFrame.w, 1e-4);
    float perimeter = 2.0 * (w + h);
    float top = mix(w / perimeter, 0.25, 0.5);
    float side = mix(h / perimeter, 0.25, 0.5);
    float t = fract(aAlong + 0.5 + top * 0.5);
    vec2 p;
    if (t < top) p = vec2(mix(uFrame.x, uFrame.y, t / top), uFrame.z);
    else if (t < top + side) p = vec2(uFrame.y, mix(uFrame.z, uFrame.w, (t - top) / side));
    else if (t < top * 2.0 + side) p = vec2(mix(uFrame.y, uFrame.x, (t - top - side) / top), uFrame.w);
    else p = vec2(uFrame.x, mix(uFrame.w, uFrame.z, (t - top * 2.0 - side) / side));
    float pad = 0.06 * max(w, h);
    float jx = fract(sin(t * 127.1 + 7.3) * 43758.5453) * 2.0 - 1.0;
    float jy = fract(sin(t * 269.5 + 3.7) * 24634.6345) * 2.0 - 1.0;
    return vec3(p + vec2(jx, jy) * pad * 0.4, jx * pad * 0.5);
  }

  void main() {
    float slotHash = hash(aScatter.xy, vec2(12.9898, 78.233), 43758.5453);
    float pickHash = hash(aScatter.xy, vec2(4.898, 32.233), 12345.678);
    float isRingDot = step(pickHash, 0.02);
    float ringOn = uRingMix * isRingDot;
    float slot = floor(slotHash * 20.0);

    float delay = mix(aDelay, slot / 20.0 * 0.15, ringOn);
    float t = clamp((uForm - delay) / max(1.0 - delay, 0.001), 0.0, 1.0);
    float easeOut = 1.0 - pow(1.0 - t, 3.0);
    float easeBoth = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
    float ease = mix(easeOut, easeBoth, ringOn);
    float form = mix(ease * (1.0 - uRingMix), ease, isRingDot);

    float swirl = (1.0 - form) * 1.4;
    vec3 start = vec3(
      aScatter.x * cos(swirl) - aScatter.z * sin(swirl),
      aScatter.y,
      aScatter.x * sin(swirl) + aScatter.z * cos(swirl)
    );

    float rough = 1.0 + uRough * 3.0;
    float angle = aAlong * 13.0 + uTime * 0.6 + uSlide * 2.4 + aNoise * 0.12 * rough;
    float radius = uHelixR * (0.85 + aNoise * 0.15 * rough);
    vec2 yz = rope(angle, radius);
    vec3 helix = vec3(aAlong * uHelixLen - uSlide * uHelixLen * 0.15, yz.x, yz.y);

    float tunnelSpin = mix(uTime * 0.6, 1.1, smoothstep(0.5, 1.0, uToTunnel));
    vec2 ring2 = rope(aAlong * 13.0 + tunnelSpin + aNoise * 0.12 * rough, radius * 1.5);
    vec3 tunnel = vec3(ring2, aAlong * uTunnelLen * 2.4);

    vec3 globe = vec3(aGlobe.x, aGlobe.y - uGlobeY, aGlobe.z) * uGlobeK + vec3(0.0, uGlobeY, 0.0);
    vec3 place = vec3(aPlace.x, aPlace.y - uPlaceY, aPlace.z) * uPlaceK + vec3(0.0, uPlaceY, 0.0);

    vec3 shape = position;
    shape = mix(shape, globe, uToGlobe);
    shape = mix(shape, place, uToPlace);
    shape = mix(shape, helix, uToHelix);
    shape = mix(shape, tunnel, uToTunnel);
    shape = mix(shape, framePoint(), uToFrame);

    float ringAngle = slot / 20.0 * 6.28318530718 + uTime * 1.2;
    vec3 target = mix(shape, vec3(cos(ringAngle), sin(ringAngle), 0.0) * uRingR, ringOn);
    float pulse = pow(0.5 + 0.5 * sin(uTime - slot / 20.0 * 6.28318530718), 2.0);

    vec3 p = mix(start, target, form);
    p.z += sin(uTime * 0.7 + aPhase) * 0.012 * form;

    float stars = uRingMix * (1.0 - isRingDot);
    p.z = mix(p.z, min(p.z, -uRingR * 0.8), stars);

    vec4 view = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * view;
    gl_Position = clip;

    vec2 toPtr = clip.xy / max(clip.w, 0.001) - uPtr;
    toPtr.x *= uAspect;
    float glow = smoothstep(uGlowR, 0.0, length(toPtr)) * uGlow * form;
    float twinkle = 0.82 + 0.18 * sin(uTime * 1.4 + aPhase * 3.0);

    vA = (0.16 + 0.84 * aLuma) * (1.0 + glow) * twinkle * smoothstep(0.0, 0.12, t);
    vA *= mix(1.0, 1.4, stars);
    vA *= mix(1.0, mix(1.0, step(pickHash, 0.35), uTall), stars);
    vA *= mix(1.0, mix(0.15, 2.2, pulse), ringOn);

    float size = 1.0 + (1.0 - form) * 0.7;
    size *= mix(1.0, 1.05, stars);
    size *= mix(1.0, mix(0.1, 4.5, pulse), ringOn);
    gl_PointSize = min(uPointSize * aScale * size * uDpr / max(-view.z, 0.001), 48.0 * uDpr);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uExposure;
  varying float vA;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(uColor, min(smoothstep(0.5, 0.05, d) * vA * uExposure, 1.0));
    #include <colorspace_fragment>
  }
`;

type Cloud = { count: number; positions: Float32Array; luma: Float32Array };

function parseCloud(buffer: ArrayBuffer): Cloud {
  const v = new DataView(buffer);
  if (String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3)) !== "PPT1") {
    throw new Error("Unexpected point cloud format");
  }
  const count = v.getUint32(4, true);
  const scale = v.getFloat32(8, true);
  const positions = new Float32Array(count * 3);
  const luma = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = 12 + i * 8;
    positions[i * 3] = v.getInt16(o, true) * scale;
    positions[i * 3 + 1] = v.getInt16(o + 2, true) * scale;
    positions[i * 3 + 2] = v.getInt16(o + 4, true) * scale;
    luma[i] = v.getUint8(o + 6) / 255;
  }
  return { count, positions, luma };
}

function bounds(positions: Float32Array) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
  }
  return { width: Math.max(maxX - minX, 0.001), height: Math.max(maxY - minY, 0.001), midY: (minY + maxY) / 2, minY, maxY };
}

function decimate(cloud: Cloud, place: Float32Array) {
  const n = Math.ceil(cloud.count / COARSE_KEEP_EVERY);
  const positions = new Float32Array(n * 3);
  const luma = new Float32Array(n);
  const placed = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const s = i * COARSE_KEEP_EVERY;
    positions.set(cloud.positions.subarray(s * 3, s * 3 + 3), i * 3);
    placed.set(place.subarray(s * 3, s * 3 + 3), i * 3);
    luma[i] = cloud.luma[s];
  }
  return { cloud: { count: n, positions, luma }, place: placed };
}

function buildGeometry({ count, positions, luma }: Cloud, place: Float32Array, globeR: number, globeY: number) {
  const scatter = new Float32Array(count * 3);
  const globe = new Float32Array(count * 3);
  const delay = new Float32Array(count);
  const scale = new Float32Array(count);
  const phase = new Float32Array(count);
  const along = new Float32Array(count);
  const side = new Float32Array(count);
  const noise = new Float32Array(count);
  const rung = new Float32Array(count);
  const rungPos = new Float32Array(count);

  const dir = new THREE.Vector3();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    if (dir.lengthSq() === 0) dir.set(0, 1, 0);
    dir.normalize().multiplyScalar(2 + Math.random() * 4.5);
    dir.toArray(scatter, i * 3);
    delay[i] = Math.random() * 0.55;
    scale[i] = 0.5 + 0.35 * luma[i] + 1.4 * Math.random() ** 3;
    phase[i] = Math.random() * Math.PI * 2;

    const y = 1 - (i / Math.max(count - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(1 - y * y, 0));
    globe[i * 3] = Math.cos(golden * i) * r * globeR;
    globe[i * 3 + 1] = y * globeR + globeY;
    globe[i * 3 + 2] = Math.sin(golden * i) * r * globeR;
  }

  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const step = 1 / Math.max(count - 1, 1);
  order.forEach((idx, k) => {
    noise[idx] = Math.random() * 2 - 1;
    if (k % RUNG_EVERY === 0) {
      const slot = Math.floor(Math.random() * HELIX_RUNGS);
      along[idx] = (slot + 0.5) / HELIX_RUNGS - 0.5 + ((Math.random() - 0.5) / HELIX_RUNGS) * 0.5;
      rung[idx] = 1;
      rungPos[idx] = Math.random();
    } else {
      along[idx] = k * step - 0.5 + (Math.random() - 0.5) * step;
      side[idx] = k % 2;
    }
  });

  const g = new THREE.BufferGeometry();
  const set = (name: string, data: Float32Array, size: number) => g.setAttribute(name, new THREE.BufferAttribute(data, size));
  set("position", positions, 3);
  set("aScatter", scatter, 3);
  set("aGlobe", globe, 3);
  set("aPlace", place, 3);
  set("aAlong", along, 1);
  set("aSide", side, 1);
  set("aNoise", noise, 1);
  set("aRung", rung, 1);
  set("aRungPos", rungPos, 1);
  set("aDelay", delay, 1);
  set("aScale", scale, 1);
  set("aPhase", phase, 1);
  set("aLuma", luma, 1);
  return g;
}

const softLimit = (v: number, limit: number) => limit * Math.tanh(v / limit);
const windowed = (p: number, from: number, length: number) => smoothstep(clamp01((p - from) / length));

function run(host: HTMLDivElement, raw: Cloud, rawPlace: Float32Array) {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const reduced = prefersReducedMotion();
  const box = host.getBoundingClientRect();
  if (!box.width || !box.height) return () => {};

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return () => {};
  }

  const measured = bounds(raw.positions);
  const head = { ...measured, minY: BUST_MIN_Y, maxY: BUST_MAX_Y, height: BUST_MAX_Y - BUST_MIN_Y, midY: (BUST_MIN_Y + BUST_MAX_Y) / 2 };
  const placeB = bounds(rawPlace);
  const { cloud, place } = coarse ? decimate(raw, rawPlace) : { cloud: raw, place: rawPlace };

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(box.width, box.height, false);
  Object.assign(renderer.domElement.style, { width: "100%", height: "100%", display: "block", position: "absolute", inset: "0" });
  host.appendChild(renderer.domElement);
  host.style.transition = "opacity 1.2s ease-in-out";
  host.style.opacity = "0";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, box.width / box.height, 0.1, 100);
  camera.position.z = CAMERA_Z;

  const geometry = buildGeometry(cloud, place, head.height * 0.42, head.midY);
  const u = {
    uTime: { value: 0 },
    uPointSize: { value: 0 },
    uDpr: { value: renderer.getPixelRatio() },
    uForm: { value: reduced ? 1 : 0 },
    uToGlobe: { value: 0 },
    uToPlace: { value: 0 },
    uToHelix: { value: 0 },
    uToTunnel: { value: 0 },
    uToFrame: { value: 0 },
    uRingMix: { value: 0 },
    uRingR: { value: 0.07 * head.width },
    uFrame: { value: new THREE.Vector4() },
    uHelixLen: { value: 0 },
    uTunnelLen: { value: 0 },
    uHelixR: { value: 0.12 * head.height },
    uSlide: { value: 0 },
    uRough: { value: 0 },
    uColor: { value: new THREE.Color("#ffffff") },
    uExposure: { value: 0.5 },
    uPtr: { value: new THREE.Vector2() },
    uGlow: { value: 0 },
    uGlowR: { value: 1 },
    uAspect: { value: 1 },
    uTall: { value: 0 },
    uGlobeK: { value: 1 },
    uGlobeY: { value: head.midY },
    uPlaceK: { value: 1 },
    uPlaceY: { value: placeB.midY },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: u,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pivot = new THREE.Group();
  pivot.add(new THREE.Points(geometry, material));
  scene.add(pivot);

  let fit = 1;
  let viewH = 1;
  let viewW = 1;
  const resize = () => {
    const r = host.getBoundingClientRect();
    const tall = r.width < r.height;
    viewH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * CAMERA_Z;
    viewW = viewH * (r.width / r.height);
    const byHeight = (FILL_H * viewH) / head.height;
    fit = tall ? byHeight : Math.min(byHeight, (FILL_W * viewW) / head.width);
    u.uHelixLen.value = (viewH * HELIX_SPAN) / fit;
    u.uTunnelLen.value = (0.2 * viewH) / fit;
    u.uPointSize.value = THREE.MathUtils.clamp((r.height / 900) * 5.5, 2.4, 7);
    u.uAspect.value = r.width / r.height;
    u.uTall.value = +tall;
    u.uGlobeK.value = tall ? 0.6 : 1;
    u.uPlaceK.value = tall ? 0.7 : 1;
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    renderer.setSize(r.width, r.height, false);
  };
  resize();

  const ptrTarget = new THREE.Vector2();
  const ptr = new THREE.Vector2();
  let ptrOver = 0;
  let hover = 0;
  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      ptrOver = 0;
      return;
    }
    ptrTarget.set(2 * x - 1, -(2 * y - 1));
    ptrOver = 1;
  };
  const onLeave = () => { ptrOver = 0; };
  if (!reduced) {
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
  }
  window.addEventListener("resize", resize);

  const root = document.documentElement.style;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const { lerp, clamp } = THREE.MathUtils;

  let last = performance.now();
  let prevY = window.scrollY;
  let rough = 0;
  let spin = 0;
  let shown = false;
  let raf = 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.02);
    last = now;
    const y = window.scrollY;
    const speed = Math.abs(y - prevY) / Math.max(dt, 0.001);
    prevY = y;
    rough += (clamp(speed / 2400, 0, 1) - rough) * (1 - Math.exp(-dt / 0.15));
    u.uRough.value = rough;

    const time = (u.uTime.value += dt);
    const follow = 1 - Math.exp(-dt / 0.35);
    const settle = 1 - Math.exp(-dt / 1.1);
    ptr.lerp(ptrTarget, follow);
    hover += (ptrOver - hover) * (reduced ? 1 : ptrOver > hover ? follow : settle);

    const p = y / window.innerHeight;
    const lead = clamp01(p);
    const toGlobe = windowed(p, GLOBE_AT, GLOBE_LEN);
    const toPlace = windowed(p, PLACE_AT, PLACE_LEN);
    const toHelix = windowed(p, HELIX_AT, HELIX_LEN);
    const slide = clamp01((p - HELIX_AT - HELIX_LEN) / SLIDE_LEN);
    u.uToGlobe.value = toGlobe;
    u.uToPlace.value = toPlace;
    u.uToHelix.value = toHelix;
    u.uSlide.value = slide;

    root.setProperty("--globe-on", (clamp01((toGlobe - 0.85) / 0.15) * (1 - clamp01(toPlace / 0.15))).toFixed(4));
    root.setProperty("--place-on", (clamp01((toPlace - 0.99) / 0.01) * (1 - clamp01((toHelix - 0.85) / 0.15))).toFixed(4));
    const workOn = clamp01((toHelix - 0.85) / 0.15) * (1 - clamp01((slide - 0.85) / 0.15));
    root.setProperty("--work-on", workOn.toFixed(4));
    stage.workOn = workOn;

    const focus = stage.contactFocus;
    u.uToTunnel.value = stage.closing;
    u.uRingMix.value = stage.ringMix;
    u.uToFrame.value = focus;
    const lock = Math.max(stage.closing, focus);
    const onGlobe = toGlobe * (1 - toPlace);
    spin = (spin + dt * 0.06 * Math.PI * 2 * onGlobe) % (Math.PI * 2);
    const form = u.uForm.value;
    const idleY = Math.sin(0.16 * time) * 0.12;
    const idleX = -Math.sin(0.11 * time + 1.4) * 0.048;

    pivot.rotation.y = (softLimit(lerp(idleY, ptr.x * 0.16, hover) * form, 0.22) - 0.6 * lead * (1 - toGlobe) + spin * onGlobe) * (1 - lock);
    pivot.rotation.x = softLimit(lerp(idleX, -ptr.y * 0.096, hover) * form, 0.132) * (1 - lock);
    pivot.rotation.z = 0.35 * toHelix * (1 - lock);
    u.uPtr.value.copy(ptr);
    u.uGlow.value = 2 * hover;
    if (form < 1) u.uForm.value = Math.min(form + dt / FORM_SECONDS, 1);

    const s = fit * (1 + lead * 0.2 * (1 - toGlobe)) * (1 + 0.6 * slide);
    pivot.scale.setScalar(s);
    const seated = -viewH / 2 - head.minY * s + DRIFT_Y * viewH * lead * (1 - toGlobe);
    const centred = -lerp(lerp(head.midY, placeB.midY, toPlace), 0, toHelix) * s - 0.04 * toPlace * (1 - toHelix) * viewH;
    pivot.position.y = lerp(lerp(seated, centred, toGlobe), 0, stage.ringMix);
    pivot.position.x = lerp(DRIFT_X * viewW * lead * (1 - toGlobe) - 0.22 * toHelix * viewW, 0, stage.ringMix);

    const orbit = (Math.PI / 7) * slide * (1 - lock);
    const dist = CAMERA_Z * (1 - 0.15 * slide);
    camera.position.x = lerp(Math.sin(orbit) * dist, pivot.position.x, lock);
    camera.position.y = lerp(0, pivot.position.y, lock);
    camera.position.z = Math.cos(orbit) * dist;
    lookAt.set(0, 0, 0).lerp(pivot.position, Math.max(slide, lock));
    camera.lookAt(lookAt);

    const rect = stage.contactRect;
    if (rect && focus > 0.001) {
      const depth = Math.abs(camera.position.z - pivot.position.z);
      const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * depth;
      const w = h * camera.aspect;
      const tall = window.innerWidth < window.innerHeight;
      const padX = rect.width * (tall ? 0.08 : 0.1);
      const padY = rect.height * (tall ? 1 : 1.05);
      a.set(
        camera.position.x + ((rect.left - padX) / window.innerWidth - 0.5) * w,
        camera.position.y - ((rect.top - padY) / window.innerHeight - 0.5) * h,
        pivot.position.z,
      );
      b.set(
        camera.position.x + ((rect.left + rect.width + padX) / window.innerWidth - 0.5) * w,
        camera.position.y - ((rect.top + rect.height + padY) / window.innerHeight - 0.5) * h,
        pivot.position.z,
      );
      pivot.updateMatrixWorld();
      pivot.worldToLocal(a);
      pivot.worldToLocal(b);
      u.uFrame.value.set(a.x, b.x, a.y, b.y);
    }

    renderer.render(scene, camera);
    if (!shown) {
      shown = true;
      host.style.opacity = "1";
    }
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("resize", resize);
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
  };
}

export function ParticleScene() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    let stopped = false;
    const abort = new AbortController();
    const get = (url: string) =>
      fetch(url, { signal: abort.signal }).then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return r.arrayBuffer();
      });

    Promise.all([get("/portrait.bin"), get("/location.bin")])
      .then(([head, map]) => {
        if (!stopped) cleanup = run(el, parseCloud(head), parseCloud(map).positions);
      })
      .catch((e) => {
        if (e.name !== "AbortError") console.error(e);
      });

    return () => {
      stopped = true;
      abort.abort();
      cleanup?.();
    };
  }, []);

  return <div ref={host} className="particle-scene" aria-hidden="true" />;
}
