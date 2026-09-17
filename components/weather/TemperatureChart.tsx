"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from "recharts";
import { toDisplayTemp } from "@/lib/weather/units";
import type { HourlyWeather } from "@/lib/weather/types";

interface Props {
  previous: HourlyWeather[];
  next: HourlyWeather[];
  timezone: string;
  unit: "C" | "F";
}

function tick(ts: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en", { hour: "numeric", timeZone: tz }).format(new Date(ts * 1000));
  } catch {
    return "";
  }
}

/** Interactive temperature graph with NOW marker + past/future split (§16). */
export default function TemperatureChart({ previous, next, timezone, unit }: Props) {
  const past = previous.map((h) => ({ t: h.timestamp, label: tick(h.timestamp, timezone), past: Math.round(toDisplayTemp(h.temperature, unit)) as number | undefined, future: undefined as number | undefined }));
  const future = next.map((h) => ({ t: h.timestamp, label: tick(h.timestamp, timezone), past: undefined as number | undefined, future: Math.round(toDisplayTemp(h.temperature, unit)) }));
  const data = [...past, ...future];
  const nowLabel = past.length ? past[past.length - 1].label : "";

  return (
    <section aria-label="Temperature graph" className="mx-auto w-full max-w-6xl px-4 pt-6">
      <div className="glass p-4 md:p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70">Temperature · 48 hours</h2>
          <span className="text-xs opacity-50">°{unit}</span>
        </div>
        <div className="h-56 w-full md:h-64" role="img" aria-label={`Temperature over 48 hours in degrees ${unit}. Past shown in slate, future in sky blue.`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
              <defs>
                <linearGradient id="gPast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#94A3B8" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gFuture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--stroke)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--ink-soft)", fontSize: 11 }} interval={5} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "var(--ink-soft)", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "rgba(7,17,31,0.92)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, color: "#fff" }}
                labelFormatter={(l) => `${l}`}
                formatter={(v, name) => [`${v}°${unit}`, name === "future" ? "Forecast" : "Observed"]}
              />
              <Area type="monotone" dataKey="past" stroke="#94A3B8" strokeWidth={2.5} fill="url(#gPast)" dot={false} />
              <Area type="monotone" dataKey="future" stroke="#38BDF8" strokeWidth={2.5} fill="url(#gFuture)" dot={false} />
              {nowLabel && <ReferenceLine x={nowLabel} stroke="#F59E0A" strokeDasharray="4 4" label={{ value: "NOW", fill: "#F59E0A", fontSize: 10, position: "top" }} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Text alternative for screen readers (§31). */}
        <ul className="sr-only">
          {data.filter((_, i) => i % 6 === 0).map((d) => (
            <li key={d.t}>{d.label}: {d.past ?? d.future} degrees {unit}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
