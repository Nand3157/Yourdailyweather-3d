"use client";

import { motion } from "motion/react";
import { Sunrise, Sunset } from "lucide-react";
import { sunProgress } from "@/lib/weather/conditions";

function toEpoch(time: string | undefined, baseEpoch: number): number | undefined {
  if (!time) return undefined;
  const m = time.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i);
  if (!m) return undefined;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ampm = m[4]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const d = new Date(baseEpoch * 1000);
  d.setHours(h, min, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function fmt(time: string | undefined): string {
  if (!time) return "—";
  const m = time.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?/i);
  if (!m) return time;
  let h = parseInt(m[1], 10);
  const suffix = m[3]?.toUpperCase() ?? (h >= 12 ? "PM" : "AM");
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

/** Sunlight arc with live sun position (§19). */
export default function SunArc({ sunrise, sunset, nowEpoch }: { sunrise: string; sunset: string; nowEpoch: number }) {
  const sr = toEpoch(sunrise, nowEpoch);
  const ss = toEpoch(sunset, nowEpoch);
  const p = sr && ss ? sunProgress(nowEpoch, sr, ss) : 0.5;
  const angle = Math.PI * (1 - p);
  const cx = 100 + 80 * Math.cos(angle);
  const cy = 92 - 78 * Math.sin(angle);

  return (
    <div className="glass-soft p-4 md:p-5" role="img" aria-label={`Sunrise ${fmt(sunrise)}, sunset ${fmt(sunset)}`}>
      <h3 className="mb-1 text-sm font-semibold uppercase tracking-[0.2em] opacity-70">Sun path</h3>
      <svg viewBox="0 0 200 100" className="w-full" aria-hidden>
        <path d="M 20 92 A 80 78 0 0 1 180 92" fill="none" stroke="var(--ink-soft)" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="5 5" />
        <motion.circle
          cx={cx}
          cy={cy}
          r="9"
          fill="#FBBF24"
          initial={false}
          animate={{ cx, cy }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
        />
        <circle cx={cx} cy={cy} r="14" fill="#FBBF24" opacity="0.25" />
      </svg>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5"><Sunrise aria-hidden className="h-4 w-4 text-amber-300" /> {fmt(sunrise)}</span>
        <span className="flex items-center gap-1.5">{fmt(sunset)} <Sunset aria-hidden className="h-4 w-4 text-orange-400" /></span>
      </div>
    </div>
  );
}
