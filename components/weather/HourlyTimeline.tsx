"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { formatTemp } from "@/lib/weather/units";
import { mapCondition } from "@/lib/weather/conditions";
import WeatherIcon from "./WeatherIcon";
import type { HourlyWeather } from "@/lib/weather/types";

function hourLabel(ts: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en", { hour: "numeric", timeZone: tz }).format(new Date(ts * 1000));
  } catch {
    return new Date(ts * 1000).getHours() + ":00";
  }
}

/** PAST ← NOW → FUTURE horizontal timeline (§5/17). */
export default function HourlyTimeline({
  previous, next, now, timezone, unit,
}: {
  previous: HourlyWeather[];
  next: HourlyWeather[];
  now: HourlyWeather | null;
  timezone: string;
  unit: "C" | "F";
}) {
  const nowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    nowRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, []);

  const renderHour = (h: HourlyWeather, accent: "past" | "now" | "future", i: number) => (
    <motion.div
      key={`${h.timestamp}-${accent}`}
      ref={accent === "now" ? nowRef : undefined}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(i * 0.02, 0.4) }}
      className={`flex w-[76px] shrink-0 snap-center flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center ${
        accent === "now"
          ? "border-sky-300/60 bg-sky-400/20 font-semibold shadow-[0_0_24px_rgba(56,189,248,0.35)]"
          : "border-white/10 bg-white/5 opacity-75"
      }`}
      aria-label={`${accent === "now" ? "Current hour" : hourLabel(h.timestamp, timezone)}: ${formatTemp(h.temperature, unit)}, rain ${Math.round(h.precipitationProbability)} percent`}
    >
      <span className="text-[11px] uppercase tracking-wider opacity-70">
        {accent === "now" ? "NOW" : hourLabel(h.timestamp, timezone)}
      </span>
      <WeatherIcon condition={mapCondition(h.icon, h.conditions)} size={30} />
      <span className="text-base">{formatTemp(h.temperature, unit)}</span>
      <span className="text-xs text-[var(--accent)]">{Math.round(h.precipitationProbability)}%</span>
    </motion.div>
  );

  return (
    <section aria-label="Hourly timeline: previous 24 hours, now, next 24 hours" className="mx-auto w-full max-w-6xl px-4 pt-6">
      <div className="glass p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] opacity-60">
          <span>← Previous 24h</span>
          <h2 className="text-sm font-semibold tracking-normal text-current opacity-100">Hour by hour</h2>
          <span>Next 24h →</span>
        </div>
        <div className="timeline-scroll flex snap-x gap-2 overflow-x-auto pb-2" role="list" tabIndex={0} aria-label="Scrollable hourly forecast">
          {previous.map((h, i) => renderHour(h, "past", i))}
          {now && renderHour({ ...now, isNow: true }, "now", 24)}
          {next.map((h, i) => renderHour(h, "future", i + 25))}
        </div>
      </div>
    </section>
  );
}
