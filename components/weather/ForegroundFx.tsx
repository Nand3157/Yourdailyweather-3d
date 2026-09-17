"use client";

import { useEffect, useRef } from "react";
import type { WeatherCondition } from "@/lib/weather/types";
import type { AtmosphereFx } from "./WeatherScene3D";

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  phase: number;
  sway: number;
  fall: number;
}

/**
 * Foreground precipitation floating OVER the UI.
 *
 * Deliberately a plain 2D canvas with NO event listeners of its own and
 * pointer-events disabled at every level, so it can never intercept clicks,
 * taps or scrolls — it is purely visual. Depth atmosphere stays in the WebGL
 * scene behind the glass; near-field weather drifts in front of it.
 */
export default function ForegroundFx({
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cfgRef = useRef({ condition, intensity, windSpeed });
  cfgRef.current = { condition, intensity, windSpeed };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const small = window.innerWidth < 768;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const rainCount = small ? 130 : 260;
    const snowCount = small ? 60 : 130;
    const drops: Drop[] = Array.from({ length: rainCount }, () => ({
      x: (Math.random() - 0.5) * (w + 80),
      y: Math.random() * h,
      len: 14 + Math.random() * 14,
      speed: 0.7 + Math.random() * 0.6,
    }));
    const flakes: Flake[] = Array.from({ length: snowCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 1 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      sway: 0.4 + Math.random() * 0.8,
      fall: 0.6 + Math.random() * 0.9,
    }));

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { condition: c, intensity: inten, windSpeed: ws } = cfgRef.current;
      const wind = Math.min(ws / 40, 1.5);
      const e = fx.energy;
      ctx.clearRect(0, 0, w, h);

      if (c === "snow") {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        for (const f of flakes) {
          f.y += dt * (55 + inten * 70) * f.fall * (1 + e * 0.6);
          f.phase += dt * (1 + e * 2);
          f.x += (Math.sin(f.phase) * f.sway * 30 + wind * 50) * dt;
          if (f.y > h + 6) {
            f.y = -6;
            f.x = Math.random() * w;
          }
          if (f.x > w + 6) f.x = -6;
          if (f.x < -6) f.x = w + 6;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const fall = (560 + inten * 420) * (1 + e * 1.2);
        const slant = wind * 26;
        ctx.strokeStyle = c === "storm" ? "rgba(191,230,255,0.45)" : "rgba(159,220,255,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of drops) {
          d.y += dt * fall * d.speed;
          d.x += dt * wind * 140 * d.speed;
          if (d.y > h + 30) {
            d.y = -30;
            d.x = (Math.random() - 0.5) * (w + 80);
          }
          if (d.x > w + 40) d.x = -40;
          const len = d.len * (1 + e * 0.5);
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + slant * 0.12, d.y - len);
        }
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [fx]);

  if (condition !== "rain" && condition !== "storm" && condition !== "snow") return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]" style={{ pointerEvents: "none" }}>
      <canvas ref={canvasRef} className="pointer-events-none block h-full w-full" style={{ pointerEvents: "none" }} />
    </div>
  );
}
