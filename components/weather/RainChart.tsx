"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import type { HourlyWeather } from "@/lib/weather/types";

/** Precipitation probability bars from real precipprob (§18). */
export default function RainChart({ hours, timezone }: { hours: HourlyWeather[]; timezone: string }) {
  const data = hours.map((h) => {
    let label = "";
    try {
      label = new Intl.DateTimeFormat("en", { hour: "numeric", timeZone: timezone }).format(new Date(h.timestamp * 1000));
    } catch {}
    return { label, prob: Math.round(h.precipitationProbability) };
  });
  const max = Math.max(...data.map((d) => d.prob), 0);

  return (
    <section aria-label="Chance of rain" className="mx-auto w-full max-w-6xl px-4 pt-6">
      <div className="glass chart-glow p-4 md:p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="kicker kicker-rule">Chance of rain</h2>
          <span className="tabular text-xs opacity-50">Peak {max}%</span>
        </div>
        <div className="h-40 w-full" role="img" aria-label={`Hourly rain probability, peaking at ${max} percent.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
              <XAxis dataKey="label" tick={{ fill: "var(--ink-soft)", fontSize: 11 }} interval={5} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "var(--ink-soft)", fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  background: "var(--sheet)",
                  border: "1px solid var(--stroke)",
                  borderRadius: 12,
                  color: "var(--ink)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  boxShadow: "0 12px 32px -12px rgba(2, 6, 23, 0.5)",
                }}
                cursor={{ fill: "var(--glass)", stroke: "var(--stroke)" }}
                formatter={(v) => [`${v}%`, "Rain probability"]}
              />
              <Bar dataKey="prob" radius={[6, 6, 2, 2]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.prob >= 60 ? "#38BDF8" : d.prob >= 30 ? "#7DD3FC" : "rgba(125,211,252,0.35)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
