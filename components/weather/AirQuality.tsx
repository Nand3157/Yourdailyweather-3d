"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Wind } from "lucide-react";
import { motionTransition } from "@/lib/motion";
import { aqiBand, aqiProgress, pollutantRows } from "@/lib/weather/aqi";

interface AqData {
  current: {
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
    nitrogen_dioxide?: number;
    sulphur_dioxide?: number;
    carbon_monoxide?: number;
  };
}

/** Dial arc geometry (0..300 sweep across 180°). */
const R = 42;
const CX = 50;
const CY = 50;

function arcPoint(fraction: number): { x: number; y: number } {
  const angle = Math.PI * (1 - fraction); // 180° → 0° left-to-right
  return { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
}

function arcPath(from: number, to: number): string {
  const a = arcPoint(from);
  const b = arcPoint(to);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`;
}

/** Air quality glass card: dial, band, advice and pollutant breakdown. */
export default function AirQuality({ lat, lon }: { lat: number; lon: number }) {
  const [data, setData] = useState<AqData | null>(null);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetch(`/api/air-quality?lat=${lat}&lon=${lon}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return (await res.json()) as AqData;
      })
      .then((body) => {
        if (!cancelled && body?.current) setData(body);
        else if (!cancelled) setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lon]);

  if (failed) return null; // AQI is a bonus panel — never block the dashboard
  if (!data) {
    return (
      <div className="glass-soft card-lift p-4 md:p-5" aria-label="Loading air quality" role="status">
        <div className="skeleton h-5 w-36" />
        <div className="skeleton mx-auto mt-4 h-24 w-24" />
        <div className="skeleton mt-4 h-4 w-48" />
      </div>
    );
  }

  const aqi = data.current.us_aqi;
  if (aqi === undefined) return null;
  const band = aqiBand(aqi);
  const progress = aqiProgress(aqi);
  const needle = arcPoint(Math.min(0.999, progress));
  const rows = pollutantRows(data.current).filter((p) => p.value !== undefined);

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={motionTransition(reduced)}
      className="glass-soft card-lift p-4 md:p-5"
      role="img"
      aria-label={`Air quality index ${Math.round(aqi)} — ${band.label}`}
    >
      <h3 className="kicker kicker-rule mb-1 flex items-center gap-2">
        <Wind aria-hidden className="h-4 w-4" /> Air quality
      </h3>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0" aria-hidden>
          <svg viewBox="0 0 100 62" className="w-full">
            <path d={arcPath(0, 1)} fill="none" stroke="var(--stroke)" strokeWidth="7" strokeLinecap="round" />
            <motion.path
              d={arcPath(0, Math.min(0.999, progress))}
              fill="none"
              stroke={band.color}
              strokeWidth="7"
              strokeLinecap="round"
              initial={reduced ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduced ? 0 : 1.1, ease: "easeOut" }}
            />
            <motion.circle
              cx={needle.x}
              cy={needle.y}
              r="4.5"
              fill={band.color}
              initial={false}
              animate={{ cx: needle.x, cy: needle.y }}
              transition={{ type: "spring", stiffness: 60, damping: 15 }}
            />
          </svg>
          <div className="tabular absolute inset-x-0 bottom-0 text-center text-xl font-semibold">{Math.round(aqi)}</div>
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold" style={{ color: band.color }}>
            {band.label}
          </p>
          <p className="text-soft mt-1 text-xs leading-relaxed">{band.advice}</p>
        </div>
      </div>
      {rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--stroke)] pt-3 text-center">
          {rows.map((p) => (
            <div key={p.key}>
              <dt className="text-[10px] font-medium uppercase tracking-wider opacity-50">{p.label}</dt>
              <dd className="tabular mt-0.5 text-sm font-medium">
                {p.value}
                <span className="ml-0.5 text-[10px] opacity-50">{p.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </motion.div>
  );
}
