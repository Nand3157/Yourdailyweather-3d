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
    <div className="glass-soft card-lift p-4 md:p-5" role="img" aria-label={`Sunrise ${fmt(sunrise)}, sunset ${fmt(sunset)}`}>
      <h3 className="kicker kicker-rule mb-1">Sun path</h3>
      <svg viewBox="0 0 200 100" className="w-full" aria-hidden>
        <defs>
          <linearGradient id="sunArcGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="var(--accent-2, #a78bfa)" />
          </linearGradient>
          <filter id="sunGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d="M 20 92 A 80 78 0 0 1 180 92" fill="none" stroke="url(#sunArcGrad)" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="16" fill="#FBBF24" opacity="0.22" filter="url(#sunGlow)" />
        <motion.circle
          cx={cx}
          cy={cy}
          r="9"
          fill="#FBBF24"
          initial={false}
          animate={{ cx, cy }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
        />
      </svg>
      <div className="mt-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5"><Sunrise aria-hidden className="h-4 w-4 text-amber-300" /> {fmt(sunrise)}</span>
        <span className="flex items-center gap-1.5">{fmt(sunset)} <Sunset aria-hidden className="h-4 w-4 text-orange-400" /></span>
      </div>
    </div>
  );
}
