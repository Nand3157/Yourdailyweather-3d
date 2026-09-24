"use client";

import { motion } from "motion/react";
import { Navigation } from "lucide-react";
import { compassLabel } from "@/lib/weather/conditions";
import { windLabel } from "@/lib/weather/units";

/** Spring-animated wind compass (§20). */
export default function WindCompass({ speed, direction }: { speed: number; direction: number }) {
  return (
    <div className="glass-soft card-lift flex items-center gap-4 p-4 md:p-5" role="img" aria-label={`Wind ${windLabel(speed)} from ${compassLabel(direction)}`}>
      <div className="relative h-24 w-24 shrink-0 rounded-full border border-[var(--stroke)] bg-white/5" aria-hidden>
        {/* tick ring */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-40" aria-hidden>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const x1 = 50 + 42 * Math.sin(a), y1 = 50 - 42 * Math.cos(a);
            const x2 = 50 + 47 * Math.sin(a), y2 = 50 - 47 * Math.cos(a);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={i % 3 === 0 ? 2 : 1} />;
          })}
        </svg>
        {["N", "E", "S", "W"].map((d) => (
          <span
            key={d}
            className="absolute text-[10px] font-semibold opacity-60"
            style={{
              top: d === "N" ? 4 : d === "S" ? undefined : "50%",
              bottom: d === "S" ? 4 : undefined,
              left: d === "W" ? 6 : d === "E" ? undefined : "50%",
              right: d === "E" ? 6 : undefined,
              transform: d === "N" || d === "S" ? "translateX(-50%)" : "translateY(-50%)",
            }}
          >
            {d}
          </span>
        ))}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{ rotate: direction + 180 }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
        >
          <Navigation className="h-7 w-7 fill-[var(--accent)] text-[var(--accent)]" />
        </motion.div>
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </div>
      <div>
        <h3 className="kicker">Wind</h3>
        <p className="tabular mt-1 text-2xl font-semibold">{windLabel(speed)}</p>
        <p className="text-soft text-sm">{compassLabel(direction)} · {Math.round(direction)}°</p>
      </div>
    </div>
  );
}
