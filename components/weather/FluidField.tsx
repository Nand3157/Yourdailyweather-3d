"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { HeroFx, HeroScene, TimeOfDay } from "@/lib/weather/hero";
import { fluidStyleFor, type FluidStyle } from "@/lib/weather/fluidStyle";

/**
 * FLUID FIELD — the hero's real-3D fluid centerpiece.
 *
 * A low-res trail buffer (ping-pong render targets) accumulates ~240 silk
 * ribbons. Each ribbon is a strip advected by curl noise (divergence-free
 * flow — streaks with direction, not dots) and splatted additively into a
 * buffer that fades each frame; persistence turns motion into luminous silk
 * trails. The present pass tints trails per weather, adds a sheen from the
 * trail's local gradient, an expanding tap shockwave, and a quiet vignette.
 *
 * Interactivity (all through the shared fx channel — no extra listeners):
 * - pointer   → a vortex wake bends nearby streaks around the cursor
 * - tap       → a radial shockwave displaces streaks + blooms a bright ring
 * - scroll    → flow speed and exposure lift, like wind rising
 * - windSpeed → tilts the field's base flow direction
 *
 * Stateless: ribbon paths are analytic in the vertex shader (no CPU sim, no
 * per-frame buffer uploads). This component takes over the Canvas render
 * (useFrame priority 1) so the present pass composites in exact screen space:
 *   1. trail sim passes → RTs   2. scene (SkyDome, particles)   3. fluid veil
 */

// ── Fullscreen triangle for RT passes + present (direct clip space) ─────
const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// ── Trail fade pass: retain previous frame with a cool age-shift ────────
const trailFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrev;
  uniform float uFade;      // per-frame retention 0.90..0.97
  void main() {
    // fade + a small constant decay: gaps in the field must return to black,
    // otherwise slow accumulation saturates the whole buffer into a fog film
    vec3 prev = max(texture2D(uPrev, vUv).rgb * uFade - vec3(0.0035), vec3(0.0));
    prev *= vec3(0.996, 0.987, 1.0); // old ink cools toward blue-violet
    gl_FragColor = vec4(prev, 1.0);
  }
`;

// ── Present pass: tint trails + sheen + shockwave ring + vignette ───────
const presentFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTrail;
  uniform vec2  uTexel;
  uniform vec3  uTintA;     // deep field color
  uniform vec3  uTintB;     // mid trail color
  uniform vec3  uTintC;     // hot edge / sheen color
  uniform float uEnergy;    // tap energy 0..1
  uniform float uScroll;    // damped scroll 0..1
  uniform float uAspect;
  uniform float uPulseX;    // last tap, uv space (y up)
  uniform float uPulseY;
  uniform float uPulseAge;  // seconds since tap (10 = idle)
  uniform float uIntensity; // weather intensity 0..1
  uniform float uInk;       // 0 = additive light-on-dark, 1 = ink-on-light

  void main() {
    vec2 uv = vUv;
    vec3 trail = texture2D(uTrail, uv).rgb;

    // gradient of the trail = ink edges — bright silk sheen on motion
    float lx = length(texture2D(uTrail, uv + vec2(uTexel.x, 0.0)).rgb - trail);
    float ly = length(texture2D(uTrail, uv + vec2(0.0, uTexel.y)).rgb - trail);
    float sheen = clamp((lx + ly) * 2.6, 0.0, 1.0);

    float lum = dot(trail, vec3(0.299, 0.587, 0.114));
    vec3 col = mix(uTintA, uTintB, smoothstep(0.0, 0.55, lum));
    col = mix(col, uTintC, sheen * 0.85);

    // tap shockwave: thin expanding ring, brighter where it crosses ink
    if (uPulseAge < 1.6) {
      vec2 d = (uv - vec2(uPulseX, uPulseY)) * vec2(uAspect, 1.0);
      float r = length(d);
      float ring = exp(-pow((r - uPulseAge * 0.85) * 13.0, 2.0));
      col += uTintC * ring * (1.0 - uPulseAge / 1.6) * (0.5 + sheen * 1.2 + uIntensity * 0.5);
    }

    col *= 0.85 + uScroll * 0.3 + uEnergy * 0.25;
    col = 1.0 - exp(-col * 1.25);                            // filmic rolloff
    col *= smoothstep(1.28, 0.35, length(uv - 0.5) * 1.35);  // quiet vignette

    float a = mix(
      // additive mode: soft threshold — faint ink nearly transparent, fresh
      // cores read as a silk veil (never an opaque film over the UI)
      clamp((max(col.r, max(col.g, col.b)) - 0.18) * 0.85, 0.0, 0.62),
      // ink-on-light mode: pigment density, capped so text stays readable
      clamp((lum - 0.2) * 1.1 + sheen * 0.25, 0.0, 0.55),
      uInk
    );
    gl_FragColor = vec4(col, a);
  }
`;

// ── Ribbon vertex shader: analytic curl-noise flow paths ────────────────
const ribbonVert = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uTurb;      // curl strength
  uniform float uFlowDir;   // base wind direction, radians
  uniform float uSpeed;
  uniform float uPulseX;    // last tap, uv space
  uniform float uPulseY;
  uniform float uPulseAge;
  uniform float uMouseX;    // pointer, uv space
  uniform float uMouseY;
  uniform float uWake;      // wake strength 0..1 (fades when pointer idles)
  uniform float uAspect;

  attribute vec3 aSeed;     // x: ribbon id, y: phase, z: depth 0..1

  varying float vShade;
  varying vec2 vRuv;

  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  // curl of scalar noise (gradient rotated 90°) — divergence-free flow
  vec2 curl(vec2 p) {
    float e = 0.12;
    float n1 = noise(p + vec2(0.0, e));
    float n2 = noise(p - vec2(0.0, e));
    float n3 = noise(p + vec2(e, 0.0));
    float n4 = noise(p - vec2(e, 0.0));
    return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
  }

  // one point along a ribbon's analytic path, in field space (~[-1.4, 1.4])
  vec2 flowPoint(float along, vec2 seedPos, float phase, float depth, float t) {
    vec2 p = seedPos;
    p += vec2(cos(uFlowDir), sin(uFlowDir)) * (along * (2.6 - depth * 1.2));
    p += curl(p * (1.1 + depth * 0.9) + vec2(t * 0.22, phase)) * uTurb * along;
    p += curl(p * 2.6 - vec2(t * 0.15, -phase * 1.7)) * uTurb * 0.45 * along;

    // pointer wake — a vortex around the cursor
    vec2 mouse = vec2((uMouseX - 0.5) * 2.0 * uAspect, (uMouseY - 0.5) * 2.0);
    vec2 toM = p - mouse;
    vec2 asp = vec2(uAspect, 1.0);
    float r2 = dot(toM * asp, toM * asp);
    float wake = exp(-r2 * 3.2) * uWake;
    p += vec2(-toM.y, toM.x) * wake * 0.85;      // swirl
    p += -normalize(toM + 1e-4) * wake * 0.30;   // gentle push out

    // tap shockwave — radial displacement following the ring
    if (uPulseAge < 1.6) {
      vec2 pulse = vec2((uPulseX - 0.5) * 2.0 * uAspect, (uPulseY - 0.5) * 2.0);
      vec2 toP = p - pulse;
      float rp = length(toP * asp);
      float band = exp(-pow((rp - uPulseAge * 0.85) * 6.0, 2.0));
      p += normalize(toP + 1e-4) * band * 0.22 * (1.0 - uPulseAge / 1.6);
    }
    return p;
  }

  void main() {
    float id = aSeed.x;
    float phase = aSeed.y;
    float depth = aSeed.z;          // 0 near .. 1 far
    vRuv = uv;

    float t = uTime * uSpeed * (0.6 + depth * 0.8);
    vec2 seedPos = vec2(
      (hash(vec2(id * 3.1, 7.7)) - 0.5) * 2.6,
      (hash(vec2(id * 7.3, 3.9)) - 0.5) * 1.8
    );

    // path tangent via finite difference → screen-space ribbon width
    vec2 pA = flowPoint(position.x, seedPos, phase, depth, t);
    vec2 pB = flowPoint(position.x + 0.01, seedPos, phase, depth, t);
    vec2 tng = normalize(pB - pA + 1e-5);
    vec2 nrm = vec2(-tng.y, tng.x);
    vec2 p = pA + nrm * position.y * 8.0;

    vec2 clip = p * vec2(1.0 / max(uAspect, 0.4), 1.0) * 0.62;
    clip.y += (depth - 0.5) * 0.05;              // subtle depth shear

    // ribbons glow brighter inside the pointer's wake
    vec2 mouseM = vec2((uMouseX - 0.5) * 2.0 * uAspect, (uMouseY - 0.5) * 2.0);
    vec2 dm = p - mouseM;
    float wakeGlow = exp(-dot(dm, dm) * 2.0) * 0.9;
    vShade = 0.22 + fract(id * 0.618) * 0.5 + wakeGlow;
    gl_Position = vec4(clip, 0.0, 1.0);
  }
`;

const ribbonFrag = /* glsl */ `
  precision highp float;
  varying float vShade;
  varying vec2 vRuv;
  uniform float uGain;
  void main() {
    // soft across ribbon width; 0.5 keeps equilibrium ink in tone-map range
    float across = smoothstep(0.0, 0.55, vRuv.y) * smoothstep(1.0, 0.45, vRuv.y);
    gl_FragColor = vec4(1.0, 1.0, 1.0, across * vShade * uGain * 0.5);
  }
`;

export default function FluidField({
  scene,
  tod,
  intensity,
  windSpeed,
  fx,
  theme,
  quality,
}: {
  scene: HeroScene;
  tod: TimeOfDay;
  intensity: number;
  windSpeed: number;
  fx: HeroFx;
  theme: "light" | "dark";
  quality: "full" | "reduced";
}) {
  const { size, scene: r3fScene, camera, gl } = useThree();
  const reduced = quality === "reduced";
  const still = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const style: FluidStyle = useMemo(
    () => fluidStyleFor(scene, tod, theme),
    [scene, tod, theme]
  );

  // ── trail ping-pong buffers (low-res: silk, not sharp) ──
  const res = useMemo(() => {
    const scale = reduced ? 0.35 : 0.5;
    return {
      w: Math.max(160, Math.floor(size.width * scale)),
      h: Math.max(100, Math.floor(size.height * scale)),
    };
  }, [size.width, size.height, reduced]);

  const { rtA, rtB } = useMemo(() => {
    const opts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    } as const;
    return {
      rtA: new THREE.WebGLRenderTarget(res.w, res.h, opts),
      rtB: new THREE.WebGLRenderTarget(res.w, res.h, opts),
    };
  }, [res.w, res.h]);

  useEffect(() => () => { rtA.dispose(); rtB.dispose(); }, [rtA, rtB]);

  // fullscreen triangle geometry for the RT quad passes
  const triGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    return g;
  }, []);

  const trailMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: trailFrag,
        uniforms: {
          uPrev: { value: null as THREE.Texture | null },
          uFade: { value: 0.96 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  const presentMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: presentFrag,
        uniforms: {
          uTrail: { value: null as THREE.Texture | null },
          uTexel: { value: new THREE.Vector2(1 / res.w, 1 / res.h) },
          uTintA: { value: new THREE.Color(style.tintA) },
          uTintB: { value: new THREE.Color(style.tintB) },
          uTintC: { value: new THREE.Color(style.tintC) },
          uEnergy: { value: 0 },
          uScroll: { value: 0 },
          uAspect: { value: 1 },
          uPulseX: { value: 0.5 },
          uPulseY: { value: 0.5 },
          uPulseAge: { value: 10 },
          uIntensity: { value: 0.4 },
          uInk: { value: theme === "light" ? 1 : 0 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }),
    // style/theme changes → uniforms re-uploaded each frame below; keep stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // tints cross-fade rather than snap (same dissolve language as SkyDome)
  const tintTargets = useMemo(
    () => ({
      a: new THREE.Color(style.tintA),
      b: new THREE.Color(style.tintB),
      c: new THREE.Color(style.tintC),
    }),
    [style]
  );

  // ── ribbons ─────────────────────────────────────────────
  const ribbons = useMemo(() => {
    const count = reduced ? 90 : 240;
    const segs = reduced ? 16 : 26;
    const positions = new Float32Array(count * segs * 2 * 3);
    const seeds = new Float32Array(count * segs * 2 * 3);
    const uvs = new Float32Array(count * segs * 2 * 2);
    const indices: number[] = [];
    let vi = 0;
    for (let i = 0; i < count; i++) {
      const id = i + 0.5;
      const phase = Math.random() * Math.PI * 2;
      const depth = Math.pow(Math.random(), 0.7); // bias toward near
      const halfW = (0.0022 + depth * 0.004) * 0.5;
      const row = i * segs;
      for (let s = 0; s < segs; s++) {
        const along = s / (segs - 1) - 0.5; // -0.5..0.5
        for (let side = 0; side < 2; side++) {
          positions[vi * 3] = along;                 // consumed by shader
          positions[vi * 3 + 1] = (side - 0.5) * 2 * halfW; // signed width
          positions[vi * 3 + 2] = 0;
          seeds[vi * 3] = id;
          seeds[vi * 3 + 1] = phase;
          seeds[vi * 3 + 2] = depth;
          uvs[vi * 2] = along + 0.5;
          uvs[vi * 2 + 1] = side;
          vi++;
        }
      }
      for (let s = 0; s < segs - 1; s++) {
        const a = row * 2 + s * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    return geom;
  }, [reduced]);

  useEffect(() => () => ribbons.dispose(), [ribbons]);

  const ribbonMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ribbonVert,
        fragmentShader: ribbonFrag,
        uniforms: {
          uTime: { value: 0 },
          uTurb: { value: 1 },
          uFlowDir: { value: 0 },
          uSpeed: { value: 1 },
          uPulseX: { value: 0.5 },
          uPulseY: { value: 0.5 },
          uPulseAge: { value: 10 },
          uMouseX: { value: 0.5 },
          uMouseY: { value: 0.5 },
          uWake: { value: 0 },
          uAspect: { value: 1 },
          uGain: { value: 0.5 },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  // RT pass scenes (rendered manually)
  const trailScene = useMemo(() => {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(triGeom, trailMat));
    return s;
  }, [triGeom, trailMat]);

  const ribbonScene = useMemo(() => {
    const s = new THREE.Scene();
    const mesh = new THREE.Mesh(ribbons, ribbonMat);
    mesh.frustumCulled = false;
    s.add(mesh);
    return s;
  }, [ribbons, ribbonMat]);

  const presentScene = useMemo(() => {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(triGeom, presentMat));
    return s;
  }, [triGeom, presentMat]);

  const dummyCam = useMemo(() => new THREE.Camera(), []);

  const pulse = useRef({ x: 0.5, y: 0.5, t: -10 });
  const lastPulse = useRef(fx.pulse);
  const flip = useRef(false);
  const wake = useRef({ strength: 0, px: 0, py: 0, moved: 0 });

  // FluidField owns this Canvas's output (priority > 0 disables R3F auto-render)
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;

    // ── tap capture (uv space, y flipped to gl convention) ──
    if (fx.pulse !== lastPulse.current) {
      lastPulse.current = fx.pulse;
      pulse.current = { x: fx.px * 0.5 + 0.5, y: 0.5 - fx.py * 0.5, t };
    }
    const pulseAge = still ? 10 : t - pulse.current.t;

    const mx = fx.px * 0.5 + 0.5;
    const my = 0.5 - fx.py * 0.5;

    // wake fades out when the pointer stops moving
    const moved = Math.abs(fx.tpx - wake.current.px) + Math.abs(fx.tpy - wake.current.py);
    wake.current.px = fx.tpx;
    wake.current.py = fx.tpy;
    wake.current.moved = moved > 0.0015 ? 0 : wake.current.moved + dt;
    const wakeTarget = still ? 0 : wake.current.moved < 1.4 ? 1 : 0;
    wake.current.strength = THREE.MathUtils.damp(wake.current.strength, wakeTarget, 3, dt);

    const aspect = size.width / Math.max(1, size.height);
    const speedScale = still ? 0.08 : 1;

    // ── ribbon uniforms ──
    ribbonMat.uniforms.uTime.value = t;
    ribbonMat.uniforms.uTurb.value = style.turbulence * (1 + fx.energy * 1.6);
    ribbonMat.uniforms.uFlowDir.value = style.flowDir + Math.min(windSpeed / 60, 0.6);
    ribbonMat.uniforms.uSpeed.value = style.flowSpeed * (1 + fx.sScroll * 0.9 + fx.energy * 0.6) * speedScale;
    ribbonMat.uniforms.uAspect.value = aspect;
    ribbonMat.uniforms.uPulseX.value = pulse.current.x;
    ribbonMat.uniforms.uPulseY.value = pulse.current.y;
    ribbonMat.uniforms.uPulseAge.value = pulseAge;
    ribbonMat.uniforms.uMouseX.value = mx;
    ribbonMat.uniforms.uMouseY.value = my;
    ribbonMat.uniforms.uWake.value = wake.current.strength;
    ribbonMat.uniforms.uGain.value = style.gain * (1 + fx.energy * 0.5);

    // ── trail fade ──
    trailMat.uniforms.uFade.value = THREE.MathUtils.damp(
      trailMat.uniforms.uFade.value,
      style.fade * (1 - Math.min(0.25, fx.sScroll * 0.2)),
      2,
      dt
    );

    // ── present uniforms ──
    const k = 1 - Math.exp(-1.6 * dt);
    (presentMat.uniforms.uTintA.value as THREE.Color).lerp(tintTargets.a, k);
    (presentMat.uniforms.uTintB.value as THREE.Color).lerp(tintTargets.b, k);
    (presentMat.uniforms.uTintC.value as THREE.Color).lerp(tintTargets.c, k);
    presentMat.uniforms.uEnergy.value = fx.energy;
    presentMat.uniforms.uScroll.value = fx.sScroll;
    presentMat.uniforms.uAspect.value = aspect;
    presentMat.uniforms.uPulseX.value = pulse.current.x;
    presentMat.uniforms.uPulseY.value = pulse.current.y;
    presentMat.uniforms.uPulseAge.value = pulseAge;
    presentMat.uniforms.uIntensity.value = intensity;
    const inkTarget = theme === "light" ? 1 : 0;
    if (presentMat.uniforms.uInk.value !== inkTarget) {
      presentMat.uniforms.uInk.value = inkTarget;
      presentMat.blending = theme === "light" ? THREE.NormalBlending : THREE.AdditiveBlending;
      presentMat.needsUpdate = true;
    }
    presentMat.uniforms.uTexel.value.set(1 / rtA.width, 1 / rtA.height);

    // ── pass 1+2: fade previous trails, splat fresh ribbons ──
    flip.current = !flip.current;
    const read = flip.current ? rtA : rtB;
    const write = flip.current ? rtB : rtA;
    trailMat.uniforms.uPrev.value = read.texture;
    gl.setRenderTarget(write);
    gl.render(trailScene, dummyCam);          // fade quad overwrites everything
    gl.autoClear = false;                     // ribbons must accumulate, not clear
    gl.render(ribbonScene, dummyCam);         // additive silk ink
    gl.autoClear = true;

    // ── present: scene first (sky + particles), fluid veil on top ──
    gl.setRenderTarget(null);
    gl.render(r3fScene, camera);              // R3F scene: SkyDome, orb, stars…
    gl.autoClear = false;
    presentMat.uniforms.uTrail.value = write.texture;
    gl.render(presentScene, dummyCam);        // fluid veil, additive over sky
    gl.autoClear = true;
  });

  return null;
}
