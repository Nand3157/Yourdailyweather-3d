"use client";

import { motion, useReducedMotion } from "motion/react";
import { Droplets, Wind } from "lucide-react";
import { motionTransition } from "@/lib/motion";
import { toDisplayTemp } from "@/lib/weather/units";
import { mapCondition } from "@/lib/weather/conditions";
import WeatherIcon from "./WeatherIcon";
import type { DailyForecast } from "@/lib/weather/types";

function dayLabel(epoch: number, tz: string, isToday: boolean): string {
  if (isToday) return "Today";
  try {
    return new Intl.DateTimeFormat("en", { weekday: "short", timeZone: tz }).format(new Date(epoch * 1000));
  } catch {
    return new Date(epoch * 1000).toDateString().slice(0, 3);
  }
}

/** Expandable daily row: summary bar always visible, detail grid on tap (§17-style card). */
function DayRow({ day, tz, unit }: { day: DailyForecast; tz: string; unit: "C" | "F" }) {
  const condition = mapCondition(day.icon, day.conditions);

  // Range bar: position min/max within the week's overall span.
  // Outer <li> comes from the parent's motion.li — this is the row body.
  return (
    <div className="group">
      <details className="rounded-xl transition-colors open:bg-white/5">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-2 py-2.5 [&::-webkit-details-marker]:hidden">
          <span className="w-12 shrink-0 text-sm font-medium">{dayLabel(day.date, tz, day.isToday)}</span>
          <WeatherIcon condition={condition} size={34} className="shrink-0" />
          <span className="hidden min-w-0 flex-1 truncate text-sm opacity-70 sm:block">{day.conditions || "—"}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs opacity-70" title={`${day.precipitationProbability}% chance of precipitation`}>
            <Droplets aria-hidden className="h-3.5 w-3.5" />
            {Math.round(day.precipitationProbability)}%
          </span>
          <span className="tabular flex w-20 shrink-0 items-center justify-end gap-1.5 text-sm">
            <span className="opacity-55">{Math.round(toDisplayTemp(day.tempMin, unit))}°</span>
            <span className="font-semibold">{Math.round(toDisplayTemp(day.tempMax, unit))}°</span>
          </span>
        </summary>
        <dl className="grid grid-cols-2 gap-2 px-3 pb-3 pt-1 text-xs sm:grid-cols-4">
          <div>
            <dt className="kicker">Wind</dt>
            <dd className="tabular mt-0.5 flex items-center gap-1">
              <Wind aria-hidden className="h-3 w-3" /> {Math.round(day.windSpeed)} km/h
            </dd>
          </div>
          <div>
            <dt className="kicker">Humidity</dt>
            <dd className="tabular mt-0.5">{Math.round(day.humidity)}%</dd>
          </div>
          <div>
            <dt className="kicker">UV Index</dt>
            <dd className="tabular mt-0.5">{day.uvIndex !== undefined ? Math.round(day.uvIndex) : "—"}</dd>
          </div>
          <div>
            <dt className="kicker">Precip</dt>
            <dd className="tabular mt-0.5">{day.precipitation > 0 ? `${day.precipitation} mm` : "None"}</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}

/** 7-day outlook with expandable per-day details. */
export default function ForecastCard({ days, timezone, unit }: { days: DailyForecast[]; timezone: string; unit: "C" | "F" }) {
  const reduced = useReducedMotion();
  if (!days.length) return null;
  return (
    <section aria-label="7 day forecast" className="mx-auto w-full max-w-6xl px-4 pt-6">
      <div className="glass p-4 md:p-5">
        <h2 className="kicker kicker-rule mb-2">7-day forecast</h2>
        <ul role="list" className="divide-y divide-[var(--stroke)]">
          {days.slice(0, 7).map((d, i) => (
            <motion.li
              key={d.date}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-20px" }}
              transition={{ ...motionTransition(reduced), delay: reduced ? 0 : i * 0.04 }}
            >
              <DayRow day={d} tz={timezone} unit={unit} />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
