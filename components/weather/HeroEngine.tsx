"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { HeroScene, TimeOfDay, HeroFx } from "@/lib/weather/hero";
import { skyPaletteFor } from "@/lib/weather/sky";
import SkyDome from "./SkyDome";

/**
 * ╔════════════════════════════════════════════════════╗
 * ║  3D HERO ENGINE — Atmospheric Weather            ║
 * ╠════════════════════════════════════════════════════╣
 * ║  Weather API Data                                 ║
 * ║       ↓                                           ║
 * ║  Weather State + Time of Day                      ║
 * ║       ↓                                           ║
 * ║  3D HERO ENGINE                                   ║
 * ║    Rain | Snow | Storm | Fog | Clear              ║
 * ║       ↓                                           ║
 * ║  Scroll + Mouse Input                             ║
 * ║       ↓                                           ║
 * ║  Camera / Particle Motion                         ║
 * ╚════════════════════════════════════════════════════╝
 *
 *  Single Canvas, 5 scene branches, unified input → output.
 *  ForegroundFx (2D rain over UI) stays separate for click safety,
 *  but the HERO field behind the glass is fully driven here.
 */

// ─────────────────────────────────────────────────────
// Shared fx channel — page writes, engine reads (no re-renders).
// The HeroFx type lives in lib/weather/hero.ts next to the scene model.
// ─────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────
// Texture helper — soft glow dots, never squares
// ─────────────────────────────────────────────────────
let dotTex: THREE.CanvasTexture | null = null;
export function softDotTexture(): THREE.CanvasTexture {
  if (dotTex) return dotTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  dotTex = new THREE.CanvasTexture(c);
  return dotTex;
}

// ─────────────────────────────────────────────────────
// Drivers — decay pulse, damp mouse, damp scroll
// ─────────────────────────────────────────────────────
function HeroDriver({ fx }: { fx: HeroFx }) {
  const lastPulse = useRef(fx.pulse);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (fx.pulse !== lastPulse.current) {
      lastPulse.current = fx.pulse;
      fx.energy = 1;
    }
    fx.energy = Math.max(0, fx.energy - dt * 0.7);
    fx.px = THREE.MathUtils.damp(fx.px, fx.tpx, 3, dt);
    fx.py = THREE.MathUtils.damp(fx.py, fx.tpy, 3, dt);
    fx.sScroll = THREE.MathUtils.damp(fx.sScroll, fx.scroll, 4, dt);
  });
  return null;
}

// ─────────────────────────────────────────────────────
// Camera rig — mouse parallax + scroll dolly
// Scroll: 0 at top → camera at z=10, 1 at bottom → z=7 + tilt
// ─────────────────────────────────────────────────────
function HeroCamera({ fx, reduced }: { fx: HeroFx; reduced: boolean }) {
  useFrame(({ camera }) => {
    if (reduced) return;
    const sc = fx.sScroll; // 0..1
    // Mouse parallax (subtle)
    const tx = fx.px * 0.85;
    const ty = -fx.py * 0.45;
    // Scroll dolly: push in slightly + lift as user explores
    const tz = 10 - sc * 2.2;
    const ly = sc * 0.6; // look-at drifts up
    camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 2.5, 1 / 60);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, ty + sc * 0.3, 2.5, 1 / 60);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, tz, 2, 1 / 60);
    // FOV breathes with scroll for depth
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = THREE.MathUtils.damp(cam.fov, 60 + sc * 6, 2, 1 / 60);
    cam.updateProjectionMatrix();
    camera.lookAt(0, ly, -4);
  });
  return null;
}

// ─────────────────────────────────────────────────────
// Scene pieces — 5 branches
// ─────────────────────────────────────────────────────

// Shared fog planes for Fog scene
function FogLayers({ fx }: { fx: HeroFx }) {
  const refs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.forEach((r, i) => {
      if (!r.current) return;
      r.current.position.x = Math.sin(t * 0.08 + i * 1.7) * (2 + i) * 0.6 + fx.px * (0.3 + i * 0.15);
      r.current.position.y = Math.cos(t * 0.06 + i) * 0.4 + fx.sScroll * (i - 1) * 0.5;
      (r.current.material as THREE.MeshBasicMaterial).opacity = 0.08 + i * 0.04 - fx.sScroll * 0.02;
    });
  });
  return (
    <>
      {refs.map((r, i) => (
        <mesh key={i} ref={r} position={[0, (i - 1) * 1.2, -5 - i * 1.5]}>
          {/* oversized so the plane edges never cut across the viewport */}
          <planeGeometry args={[40, 22]} />
          <meshBasicMaterial color={i === 1 ? "#cbd5e1" : "#94a3b8"} transparent opacity={0.1} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function GlowOrb({ tod, fx }: { tod: TimeOfDay; fx: HeroFx }) {
  const ref = useRef<THREE.Mesh>(null);
  const isDay = tod !== "night";
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.12;
    const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.1) * 0.03 + fx.energy * 0.45;
    ref.current.scale.setScalar(breathe);
    // Parallax drift
    ref.current.position.x = (isDay ? 6.2 : -5.8) + fx.px * 0.6;
    ref.current.position.y = 3.6 - fx.sScroll * 1.2;
  });
  // Sunset orb is bigger + warmer, night is small moon
  const size = tod === "sunset" ? 0.95 : isDay ? 0.65 : 0.52;
  const color = tod === "sunset" ? "#fb923c" : isDay ? "#fbbf24" : "#e9d5ff";
  return (
    <mesh ref={ref} position={[isDay ? 6.2 : -5.8, 3.6, -8]}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshBasicMaterial color={color} transparent opacity={tod === "sunset" ? 0.9 : 0.85} />
    </mesh>
  );
}

function StarField({ active, fx }: { active: boolean; fx: HeroFx }) {
  const ref = useRef<THREE.Points>(null);
  const dot = useMemo(() => softDotTexture(), []);
  const count = 380;
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 30;
      a[i * 3 + 1] = (Math.random() - 0.5) * 16;
      a[i * 3 + 2] = -4 - Math.random() * 6;
    }
    return a;
  }, []);
  useFrame((state) => {
    if (!active || !ref.current) return;
    const arr = (ref.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.9 + i) * 0.0008 + fx.sScroll * 0.002;
    }
    (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });
  if (!active) return null;
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.07} map={dot} color="#ddd6fe" transparent opacity={0.75} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function ShootingStar({ active, fx }: { active: boolean; fx: HeroFx }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const seen = useRef(fx.pulse);
  const start = useRef(-10);
  useFrame((state) => {
    if (!active || !ref.current || !mat.current) return;
    if (fx.pulse !== seen.current) {
      seen.current = fx.pulse;
      start.current = state.clock.elapsedTime + Math.random() * 0.12;
    }
    const k = (state.clock.elapsedTime - start.current) / 0.85;
    if (k < 0 || k > 1) {
      mat.current.opacity = 0;
      return;
    }
    ref.current.position.set(9 - 16 * k, 5.5 - 6 * k, -6);
    mat.current.opacity = Math.sin(k * Math.PI) * 0.9;
  });
  if (!active) return null;
  return (
    <mesh ref={ref} rotation={[0, 0, Math.atan2(-6, -16)]} position={[9, 5.5, -6]}>
      <boxGeometry args={[1.9, 0.035, 0.035]} />
      <meshBasicMaterial ref={mat} color="#ffffff" transparent opacity={0} />
    </mesh>
  );
}

function StormFlash({ active, fx }: { active: boolean; fx: HeroFx }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.AmbientLight>(null);
  useFrame((state) => {
    if (!light.current) return;
    const t = state.clock.elapsedTime % 6.5;
    const bolt = t > 5.9 && t < 6.12 ? 3.2 : t > 4.2 && t < 4.28 ? 1.8 : 0;
    const tap = fx.energy > 0.5 ? 4 * fx.energy : 0;
    light.current.intensity = 0.45 + bolt + tap;
    if (fill.current) fill.current.intensity = active ? 0.35 + bolt * 0.15 : 0.7;
  });
  return (
    <>
      <ambientLight ref={fill} intensity={active ? 0.35 : 0.7} />
      <directionalLight ref={light} position={[5, 7, 3]} intensity={0.45} color="#c4b5fd" />
    </>
  );
}

// ─────────────────────────────────────────────────────
// Particle field — 5 branches with scroll-reactive motion
// ─────────────────────────────────────────────────────
function HeroParticles({
  scene,
  tod,
  intensity,
  windSpeed,
  fx,
  quality,
}: {
  scene: HeroScene;
  tod: TimeOfDay;
  intensity: number;
  windSpeed: number;
  fx: HeroFx;
  quality: "full" | "reduced";
}) {
  const ref = useRef<THREE.Points>(null);
  const reduced = quality === "reduced" || (typeof window !== "undefined" && window.innerWidth < 768);
  const count = useMemo(() => {
    if (scene === "rain" || scene === "storm") return reduced ? 320 : 820;
    if (scene === "snow") return reduced ? 170 : 480;
    if (scene === "fog") return reduced ? 120 : 280;
    if (scene === "clear" && tod === "night") return 350;
    if (scene === "clear") return tod === "day" ? 180 : 220;
    return 200;
  }, [scene, tod, reduced]);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      speeds[i] = 0.5 + Math.random() * 0.9;
    }
    return { positions, speeds };
  }, [count]);

  const color = useMemo(() => {
    if (scene === "rain" || scene === "storm") return "#7dd3fc";
    if (scene === "snow") return "#f0f9ff";
    if (scene === "fog") return "#cbd5e1";
    if (scene === "clear" && tod === "night") return "#ddd6fe";
    if (scene === "clear" && tod === "sunset") return "#fed7aa";
    if (scene === "clear") return "#fde68a";
    return "#bae6fd";
  }, [scene, tod]);

  const size = scene === "fog" ? 0.32 : scene === "snow" ? 0.085 : scene === "clear" && tod === "night" ? 0.055 : 0.05;
  const wind = Math.min(windSpeed / 38, 1.6);
  const dot = useMemo(() => softDotTexture(), []);

  useFrame((state, rawDt) => {
    const pts = ref.current;
    if (!pts) return;
    const e = fx.energy;
    const sc = fx.sScroll;
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const t = state.clock.elapsedTime;
    const dt = Math.min(rawDt, 0.05);

    // Scroll pushes particles upward slightly (parallax) + adds drift
    const scrollLift = sc * 1.8;

    for (let i = 0; i < count; i++) {
      const s = speeds[i];
      if (scene === "rain" || scene === "storm") {
        const turbo = scene === "storm" ? 1.25 : 1;
        arr[i * 3 + 1] -= dt * (9.5 + intensity * 8) * turbo * (1 + e * 1.4) * s;
        arr[i * 3] += dt * wind * 3.2 * (1 + e * 1.8) * s;
        arr[i * 3 + 1] += scrollLift * dt * 0.6 * s; // scroll lifts rain slightly
        if (arr[i * 3 + 1] < -8) {
          arr[i * 3 + 1] = 8;
          arr[i * 3] = (Math.random() - 0.5) * 26;
        }
        if (arr[i * 3] > 13) arr[i * 3] = -13;
        if (arr[i * 3] < -13) arr[i * 3] = 13;
      } else if (scene === "snow") {
        arr[i * 3 + 1] -= dt * (0.55 + intensity * 1.1) * (1 + e * 0.9) * s;
        arr[i * 3] += dt * (Math.sin(t * (0.85 + e * 2.5) + i) * (0.45 + e * 0.7) + wind * 1.1) * s;
        arr[i * 3 + 1] += scrollLift * dt * 0.5 * s;
        if (arr[i * 3 + 1] < -8) {
          arr[i * 3 + 1] = 8;
          arr[i * 3] = (Math.random() - 0.5) * 26;
        }
      } else if (scene === "fog") {
        arr[i * 3] += dt * (0.25 + wind * 0.9) * (1 + e * 2.2) * s;
        arr[i * 3 + 1] += Math.sin(t * 0.35 + i * 0.7) * dt * 0.08 + scrollLift * dt * 0.15 * s;
        if (arr[i * 3] > 13) arr[i * 3] = -13;
      } else if (scene === "clear" && tod === "night") {
        arr[i * 3 + 1] += Math.sin(t * (1.3 + e * 3) + i) * dt * (0.05 + e * 0.25);
        // night stars drift with scroll
        arr[i * 3] += sc * dt * 0.3 * s;
      } else if (scene === "clear") {
        // Sunny / sunset dust motes orbit + scroll parallax
        const a = t * (0.14 + e * 0.7) * s + i;
        const rad = 0.22 + e * 0.9;
        arr[i * 3] += Math.cos(a) * dt * rad;
        arr[i * 3 + 1] += Math.sin(a) * dt * (rad * 0.8) + scrollLift * dt * 0.4 * s;
        // extra wind push for dusty wind-clear
        if (wind > 0.7) arr[i * 3] += wind * dt * 0.5 * s;
      }
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        map={dot}
        color={color}
        transparent
        opacity={scene === "fog" ? 0.28 : scene === "storm" ? 0.62 : scene === "clear" && tod === "night" ? 0.7 : 0.58}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─────────────────────────────────────────────────────
// Engine root
// ─────────────────────────────────────────────────────
export default function HeroEngine({
  scene,
  tod,
  intensity,
  windSpeed,
  fx,
  theme,
  quality = "full",
}: {
  scene: HeroScene;
  tod: TimeOfDay;
  intensity: number;
  windSpeed: number;
  fx: HeroFx;
  theme: "light" | "dark";
  /** "reduced" halves particle counts and caps DPR (user setting, not viewport). */
  quality?: "full" | "reduced";
}) {
  const [failed, setFailed] = useState(false);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // Mouse → fx.tpx/tpy, Scroll → fx.scroll
  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      fx.tpx = (e.clientX / window.innerWidth) * 2 - 1;
      fx.tpy = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      fx.scrollY = window.scrollY;
      fx.scroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    };
    onScroll();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [fx, reducedMotion]);

  const palette = useMemo(() => skyPaletteFor(scene, tod, theme), [scene, tod, theme]);

  if (failed) return null;
  const isStorm = scene === "storm";
  const isFog = scene === "fog";
  const isClearNight = scene === "clear" && tod === "night";
  const isClear = scene === "clear";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[5]" style={{ pointerEvents: "none" }}>
      <Canvas
        dpr={[1, quality === "reduced" ? 1.25 : 1.75]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        camera={{ position: [0, 0, 10], fov: 60 }}
        onCreated={({ gl }) => {
          gl.domElement.style.pointerEvents = "none";
          gl.domElement.style.touchAction = "pan-y";
          const lose = () => setFailed(true);
          gl.domElement.addEventListener("webglcontextlost", lose, { once: true });
        }}
      >
        {/* ── Signature shader sky behind everything ── */}
        <SkyDome palette={palette} fx={fx} quality={quality} storm={isStorm} />

        {/* Storm gets its own lighting rig, otherwise soft ambient */}
        {isStorm ? <StormFlash active fx={fx} /> : <ambientLight intensity={isFog ? 0.55 : isClearNight ? 0.45 : 0.72} />}

        <HeroDriver fx={fx} />
        <HeroCamera fx={fx} reduced={reducedMotion} />

        {/* ── 5 branches — only one mounts ── */}
        {isFog && <FogLayers fx={fx} />}
        {isClear && <GlowOrb tod={tod} fx={fx} />}
        {isClearNight && <StarField active fx={fx} />}
        {(isClearNight || isStorm) && <ShootingStar active={isClearNight || (isStorm && fx.energy > 0.6)} fx={fx} />}
        <HeroParticles scene={scene} tod={tod} intensity={intensity} windSpeed={windSpeed} fx={fx} quality={quality} />

        {/* Extra storm veil */}
        {isStorm && <FogLayers fx={fx} />}
      </Canvas>
    </div>
  );
}
