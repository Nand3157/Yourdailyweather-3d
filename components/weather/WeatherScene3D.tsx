"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WeatherCondition } from "@/lib/weather/types";

/** Shared mutable interaction state (page writes, scene reads — no re-renders). */
export interface AtmosphereFx {
  pulse: number; // bumped on background tap
  energy: number; // 0..1, set by scene, decays
  tpx: number; // pointer target -1..1
  tpy: number;
  px: number; // smoothed pointer
  py: number;
}

let dotTex: THREE.CanvasTexture | null = null;
/** Soft round sprite so points render as glow dots, never squares. */
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

interface SceneProps {
  condition: WeatherCondition;
  intensity: number; // 0..1 derived from precipprob + precip (§45), scaled by user level
  windSpeed: number; // km/h → horizontal drift
  fx: AtmosphereFx;
}

/** Decays pulse energy; mounted first so others read fresh values. */
function FxDriver({ fx }: { fx: AtmosphereFx }) {
  const last = useRef(fx.pulse);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (fx.pulse !== last.current) {
      last.current = fx.pulse;
      fx.energy = 1;
    }
    fx.energy = Math.max(0, fx.energy - dt * 0.7);
    fx.px = THREE.MathUtils.damp(fx.px, fx.tpx, 3, dt);
    fx.py = THREE.MathUtils.damp(fx.py, fx.tpy, 3, dt);
  });
  return null;
}

/** Camera follows the pointer with buttery damping (window-level, never steals UI gestures). */
function ParallaxRig({ fx, reduced }: { fx: AtmosphereFx; reduced: boolean }) {
  useFrame(({ camera }) => {
    if (reduced) return;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, fx.px * 0.9, 2.5, 1 / 60);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, -fx.py * 0.55, 2.5, 1 / 60);
    camera.lookAt(0, 0, -3);
  });
  return null;
}

function ParticleField({ condition, intensity, windSpeed, fx }: SceneProps) {
  const ref = useRef<THREE.Points>(null);
  const reduced = typeof window !== "undefined" && window.innerWidth < 768;

  const count = useMemo(() => {
    if (condition === "rain" || condition === "storm") return reduced ? 300 : 900;
    if (condition === "snow") return reduced ? 160 : 500;
    if (condition === "night") return 420;
    if (condition === "sunny") return 220;
    return 200; // cloud / fog / wind / partly
  }, [condition, reduced]);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      speeds[i] = 0.5 + Math.random();
    }
    return { positions, speeds };
  }, [count]);

  const color = useMemo(() => {
    switch (condition) {
      case "rain":
      case "storm":
        return "#7dd3fc";
      case "snow":
        return "#f0f9ff";
      case "night":
        return "#ddd6fe";
      case "sunny":
        return "#fde68a";
      case "fog":
      case "cloudy":
        return "#cbd5e1";
      default:
        return "#bae6fd";
    }
  }, [condition]);

  const size = condition === "fog" || condition === "cloudy" ? 0.35 : condition === "snow" ? 0.08 : 0.05;
  const wind = Math.min(windSpeed / 40, 1.5);
  const dot = useMemo(() => softDotTexture(), []);

  useFrame((state, rawDt) => {
    const pts = ref.current;
    if (!pts) return;
    const e = fx.energy; // tap energy: everything flares
    const pos = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const t = state.clock.elapsedTime;
    const dt = Math.min(rawDt, 0.05);

    for (let i = 0; i < count; i++) {
      const s = speeds[i];
      if (condition === "rain" || condition === "storm") {
        arr[i * 3 + 1] -= dt * (9 + intensity * 8) * (1 + e * 1.5) * s;
        arr[i * 3] += dt * wind * 3 * (1 + e * 2) * s;
        if (arr[i * 3 + 1] < -7) {
          arr[i * 3 + 1] = 7;
          arr[i * 3] = (Math.random() - 0.5) * 24;
        }
        if (arr[i * 3] > 12) arr[i * 3] = -12;
      } else if (condition === "snow") {
        arr[i * 3 + 1] -= dt * (0.5 + intensity) * (1 + e) * s;
        arr[i * 3] += dt * (Math.sin(t * (0.8 + e * 3) + i) * (0.4 + e) + wind);
        if (arr[i * 3 + 1] < -7) {
          arr[i * 3 + 1] = 7;
          arr[i * 3] = (Math.random() - 0.5) * 24;
        }
      } else if (condition === "night") {
        arr[i * 3 + 1] += Math.sin(t * (1.5 + e * 4) + i) * dt * (0.05 + e * 0.3);
      } else if (condition === "sunny") {
        const a = t * (0.15 + e * 0.9) * s + i;
        arr[i * 3] += Math.cos(a) * dt * (0.25 + e * 1.2);
        arr[i * 3 + 1] += Math.sin(a) * dt * (0.2 + e);
      } else {
        // clouds / fog / wind: gusts surge on tap
        arr[i * 3] += dt * (0.3 + wind * 1.4) * (1 + e * 3) * s;
        arr[i * 3 + 1] += Math.sin(t * 0.5 + i) * dt * 0.1;
        if (arr[i * 3] > 12) arr[i * 3] = -12;
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
        opacity={condition === "fog" ? 0.35 : condition === "storm" ? 0.6 : 0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function GlowOrb({ condition, fx }: { condition: WeatherCondition; fx: AtmosphereFx }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.15;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.04 + fx.energy * 0.55;
    ref.current.scale.setScalar(condition === "sunny" ? pulse : 1);
  });
  if (condition !== "sunny" && condition !== "night" && condition !== "partlyCloudy") return null;
  const isSun = condition === "sunny" || condition === "partlyCloudy";
  return (
    <mesh ref={ref} position={isSun ? [6.5, 3.8, -8] : [-6.5, 3.8, -8]}>
      <sphereGeometry args={[isSun ? 0.65 : 0.55, 32, 32]} />
      <meshBasicMaterial color={isSun ? "#fbbf24" : "#c4b5fd"} transparent opacity={0.85} />
    </mesh>
  );
}

function StormFlash({ active, fx }: { active: boolean; fx: AtmosphereFx }) {
  const light = useRef<THREE.DirectionalLight>(null);
  useFrame((state) => {
    if (!light.current || !active) return;
    const t = state.clock.elapsedTime % 7;
    const ambient = t > 6.6 && t < 6.85 ? 2.5 : 0; // occasional distant lightning
    light.current.intensity = 0.5 + ambient + (fx.energy > 0.4 ? 3.5 * fx.energy : 0); // tap = strike
  });
  return <directionalLight ref={light} position={[4, 6, 2]} intensity={0.5} color="#c4b5fd" />;
}

/** Shooting star across the night sky whenever the sky is tapped. */
function ShootingStar({ active, fx }: { active: boolean; fx: AtmosphereFx }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const seen = useRef(fx.pulse);
  const start = useRef(-10);
  useFrame((state) => {
    if (!active || !ref.current || !mat.current) return;
    if (fx.pulse !== seen.current) {
      seen.current = fx.pulse;
      start.current = state.clock.elapsedTime + Math.random() * 0.15;
    }
    const k = (state.clock.elapsedTime - start.current) / 0.9;
    if (k < 0 || k > 1) {
      mat.current.opacity = 0;
      return;
    }
    ref.current.position.set(8 - 14 * k, 5 - 6 * k, -6);
    mat.current.opacity = Math.sin(k * Math.PI) * 0.9;
  });
  if (!active) return null;
  return (
    <mesh ref={ref} rotation={[0, 0, Math.atan2(-6, -14)]} position={[8, 5, -6]}>
      <boxGeometry args={[1.8, 0.035, 0.035]} />
      <meshBasicMaterial ref={mat} color="#ffffff" transparent opacity={0} />
    </mesh>
  );
}

/**
 * Interactive WebGL atmosphere behind the UI.
 * - Pointer parallax via window listener (never steals UI gestures).
 * - Tap-the-sky pulses: page bumps fx.pulse on background taps; every
 *   scene element flares (storm strikes, snow swirls, stars shoot).
 * - Rendered only when effects are on; page-level dynamic import keeps
 *   Three.js out of the initial bundle.
 */
export default function WeatherScene3D({
  condition,
  intensity,
  windSpeed,
  fx,
}: {
  condition: WeatherCondition;
  intensity: number;
  windSpeed: number;
  fx: AtmosphereFx;
}) {
  const [failed, setFailed] = useState(false);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      fx.tpx = (e.clientX / window.innerWidth) * 2 - 1;
      fx.tpy = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [fx, reducedMotion]);

  if (failed) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[5]" style={{ pointerEvents: "none" }}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
        camera={{ position: [0, 0, 10], fov: 60 }}
        onCreated={({ gl }) => {
          // Belt and suspenders: this layer must never intercept pointer input.
          gl.domElement.style.pointerEvents = "none";
          gl.domElement.style.touchAction = "pan-y";
          const lose = () => setFailed(true);
          gl.domElement.addEventListener("webglcontextlost", lose, { once: true });
        }}
      >
        <ambientLight intensity={condition === "storm" ? 0.35 : 0.7} />
        <FxDriver fx={fx} />
        <ParallaxRig fx={fx} reduced={reducedMotion} />
        <StormFlash active={condition === "storm"} fx={fx} />
        <GlowOrb condition={condition} fx={fx} />
        <ShootingStar active={condition === "night"} fx={fx} />
        <ParticleField condition={condition} intensity={intensity} windSpeed={windSpeed} fx={fx} />
      </Canvas>
    </div>
  );
}
