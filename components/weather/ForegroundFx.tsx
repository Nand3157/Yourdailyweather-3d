"use client";

import { useEffect, useRef } from "react";
import type { WeatherCondition } from "@/lib/weather/types";
import type { HeroFx } from "@/lib/weather/hero";

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
  theme,
  fx,
}: {
  condition: WeatherCondition;
  intensity: number;
  windSpeed: number;
  theme: "light" | "dark";
  fx: HeroFx;
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

    const rainCount = small ? 150 : 280;
    const snowCount = small ? 60 : 130;
    // Rain spans the full viewport width (not just the left half)
    const drops: Drop[] = Array.from({ length: rainCount }, () => ({
      x: Math.random() * w,
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

      const isLight = theme === "light";
      if (c === "snow") {
        ctx.fillStyle = isLight ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.55)";
        // second pass for glow in light mode
        const shadow = isLight;
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
          if (shadow) {
            ctx.shadowColor = "rgba(255,255,255,0.9)";
            ctx.shadowBlur = 6;
          }
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
          if (shadow) ctx.shadowBlur = 0;
        }
      } else {
        const fall = (560 + inten * 420) * (1 + e * 1.2);
        const slant = wind * 26;
        if (isLight) {
          ctx.strokeStyle = c === "storm" ? "rgba(15,23,42,0.45)" : "rgba(30,58,95,0.5)";
        } else {
          ctx.strokeStyle = c === "storm" ? "rgba(191,230,255,0.45)" : "rgba(159,220,255,0.35)";
        }
        ctx.lineWidth = isLight ? 1.25 : 1;
        ctx.beginPath();
        for (const d of drops) {
          d.y += dt * fall * d.speed;
          d.x += dt * wind * 140 * d.speed;
          if (d.y > h + 30) {
            d.y = -30;
            d.x = Math.random() * w;
          }
          if (d.x > w + 40) d.x = -40;
          if (d.x < -40) d.x = w + 40;
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
