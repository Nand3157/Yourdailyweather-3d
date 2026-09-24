"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SkyPalette } from "@/lib/weather/sky";
import type { HeroFx } from "@/lib/weather/hero";

/**
 * SKY DOME — the signature layer. One fragment shader paints the whole
 * atmosphere: gradient zenith→horizon, domain-warped FBM clouds with lit
 * edges, a sun/moon halo, twinkling stars, aurora curtains on clear nights
 * and a lightning strobe for storms. Palettes come from lib/weather/sky.ts;
 * motion comes from the shared HeroFx channel (tap energy, scroll, pointer).
 */

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform vec3  uHorizon;
  uniform vec3  uZenith;
  uniform vec3  uCloud;
  uniform vec3  uCloudLit;
  uniform vec3  uHalo;
  uniform float uTime;
  uniform float uCover;    // cloud coverage threshold
  uniform float uSpeed;    // cloud advection speed
  uniform float uAurora;   // 0..1
  uniform float uStars;    // 0..1
  uniform float uFlash;    // lightning 0..1 (JS-driven)
  uniform float uEnergy;   // tap energy 0..1
  uniform float uShiftX;   // pointer parallax
  uniform float uShiftY;   // scroll parallax
  uniform float uAspect;   // plane aspect for circular falloffs

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
  #ifdef REDUCED
    #define OCTAVES 3
  #else
    #define OCTAVES 5
  #endif
  float fbm(vec2 p) {
    float v = 0.0, a = 0.55;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < OCTAVES; i++) {
      v += a * noise(p);
      p = rot * p * 2.03 + vec2(11.7, 5.3);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    uv.x += uShiftX;
    uv.y += uShiftY;
    float y = uv.y;

    // ── Sky gradient: warm glow band near horizon → deep zenith ──
    vec3 col = mix(uHorizon, uZenith, smoothstep(0.10, 0.85, y));

    // ── Sun / moon halo (upper-right like the orb, or upper-left for night) ──
    vec2 sun = vec2(0.72, 0.66);
    vec2 d2 = (uv - sun) * vec2(uAspect, 1.0);
    float halo = exp(-length(d2) * 4.2) * 0.9 + exp(-length(d2) * 1.8) * 0.22;
    col += uHalo * halo * (0.55 + uEnergy * 0.85);

    // ── Stars: sparse sparkle, fade near horizon ──
    if (uStars > 0.01) {
      vec2 sg = uv * vec2(uAspect, 1.0) * 42.0;
      vec2 cell = floor(sg);
      float h = hash(cell);
      vec2 pos = fract(sg) - 0.5;
      float star = smoothstep(0.06, 0.0, length(pos - (vec2(hash(cell + 7.0), hash(cell + 13.0)) - 0.5) * 0.7));
      float tw = 0.55 + 0.45 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
      col += vec3(0.85, 0.88, 1.0) * star * tw * uStars * smoothstep(0.18, 0.5, y) * step(0.82, h);
    }

    // ── Clouds: domain-warped FBM, denser near the horizon ──
    vec2 p = vec2(uv.x * uAspect * 2.6, uv.y * 3.2 - uTime * 0.008 * uSpeed);
    vec2 q = vec2(fbm(p + uTime * 0.014 * uSpeed), fbm(p + vec2(4.8, 2.9) - uTime * 0.011 * uSpeed));
    float f = fbm(p + q * 1.6);
    float horizonBoost = mix(0.16, 0.0, smoothstep(0.12, 0.8, y)); // extra coverage low
    float c = smoothstep(uCover - horizonBoost, uCover + 0.34, f);
    // lit edge: sample shifted toward the light, edge = where thickness falls off
    float f2 = fbm(p + q * 1.6 + vec2(0.16, -0.1));
    float edge = clamp(c - smoothstep(uCover - horizonBoost, uCover + 0.34, f2), 0.0, 1.0);
    vec3 cloudCol = mix(uCloud, uCloudLit, edge * (0.55 + halo * 0.6 + uEnergy * 0.5));
    float cloudFade = smoothstep(0.02, 0.22, y); // no clouds below the horizon line
    col = mix(col, cloudCol, c * cloudFade * 0.92);

    // ── Aurora curtains: ridged FBM ribbons high in the sky ──
    if (uAurora > 0.01) {
      float ribbon = fbm(vec2(uv.x * uAspect * 1.4 + uTime * 0.03, y * 2.0));
      float curtain = smoothstep(0.62, 0.95, ribbon) * exp(-pow((y - 0.62) * 3.4, 2.0));
      vec3 aCol = mix(vec3(0.16, 0.9, 0.62), vec3(0.55, 0.4, 0.95), smoothstep(0.45, 0.8, y));
      col += aCol * curtain * uAurora * (0.5 + 0.5 * sin(uTime * 0.7 + uv.x * 6.0));
    }

    // ── Lightning: strobe lifts sky + clouds ──
    col += vec3(0.82, 0.85, 1.0) * uFlash * (0.35 + c * 0.65);

    // ── Subtle grain so gradients never band ──
    col += (hash(uv * 913.0 + uTime) - 0.5) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function SkyDome({
  palette,
  fx,
  quality,
  storm,
}: {
  palette: SkyPalette;
  fx: HeroFx;
  quality: "full" | "reduced";
  storm: boolean;
}) {
  const boltClock = useRef(0);

  const uniforms = useMemo(
    () => ({
      uHorizon: { value: new THREE.Color(palette.horizon) },
      uZenith: { value: new THREE.Color(palette.zenith) },
      uCloud: { value: new THREE.Color(palette.cloud) },
      uCloudLit: { value: new THREE.Color(palette.cloudLit) },
      uHalo: { value: new THREE.Color(palette.halo) },
      uTime: { value: 0 },
      uCover: { value: palette.cloudCover },
      uSpeed: { value: palette.cloudSpeed },
      uAurora: { value: palette.aurora },
      uStars: { value: palette.stars },
      uFlash: { value: 0 },
      uEnergy: { value: 0 },
      uShiftX: { value: 0 },
      uShiftY: { value: 0 },
      uAspect: { value: 2.0 },
    }),
    // palette identity changes → new colors uploaded below, keep uniforms stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Palette updates without re-creating the material (smooth scene transitions).
  useMemo(() => {
    uniforms.uHorizon.value.set(palette.horizon);
    uniforms.uZenith.value.set(palette.zenith);
    uniforms.uCloud.value.set(palette.cloud);
    uniforms.uCloudLit.value.set(palette.cloudLit);
    uniforms.uHalo.value.set(palette.halo);
    uniforms.uCover.value = palette.cloudCover;
    uniforms.uSpeed.value = palette.cloudSpeed;
    uniforms.uAurora.value = palette.aurora;
    uniforms.uStars.value = palette.stars;
  }, [palette, uniforms]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uEnergy.value = fx.energy;
    uniforms.uShiftX.value = fx.px * 0.02;
    uniforms.uShiftY.value = -fx.sScroll * 0.06;

    // Lightning scheduler: double strike per 6.5s cycle, tap adds its own.
    if (storm) {
      boltClock.current = (boltClock.current + dt) % 6.5;
      const tc = boltClock.current;
      const bolt = tc > 5.9 && tc < 6.14 ? 1 : tc > 4.2 && tc < 4.3 ? 0.55 : 0;
      const flicker = bolt > 0 ? 0.75 + 0.25 * Math.sin(t * 90.0) : 0;
      uniforms.uFlash.value = THREE.MathUtils.lerp(
        uniforms.uFlash.value,
        Math.max(bolt * flicker, fx.energy > 0.5 ? fx.energy * 0.8 : 0),
        0.5
      );
    } else {
      uniforms.uFlash.value = 0;
    }
  });

  return (
    <mesh position={[0, 1.5, -26]} renderOrder={-10}>
      <planeGeometry args={[124, 64]} />
      <shaderMaterial
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        defines={quality === "reduced" ? { REDUCED: "" } : {}}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
