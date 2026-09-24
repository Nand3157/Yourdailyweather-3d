"use client";

import { motion, useReducedMotion } from "motion/react";
import { motionTransition } from "@/lib/motion";
import { Thermometer, Wind, CloudRain, Droplets } from "lucide-react";
import { formatTemp, windLabel } from "@/lib/weather/units";
import { compassLabel } from "@/lib/weather/conditions";
import type { CurrentWeather } from "@/lib/weather/types";

function Card({ icon, label, value, sub, valueLabel, index }: {
  icon: React.ReactNode; label: string; value: string; sub: string; valueLabel: string; index: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...motionTransition(reduced), delay: reduced ? 0 : index * 0.06 }}
      className="glass-soft card-lift p-4 text-left md:p-5"
    >
      <div className="flex items-center gap-2">
        <span className="text-[var(--accent)]">{icon}</span>
        <span className="kicker">{label}</span>
      </div>
      <p className="tabular mt-3 text-2xl font-semibold md:text-3xl" aria-label={valueLabel}>
        {value}
      </p>
      <p className="text-soft mt-1 text-sm">{sub}</p>
    </motion.div>
  );
}

/** Four primary metric cards + secondary strip (§15). */
export default function WeatherStats({ current, unit }: { current: CurrentWeather; unit: "C" | "F" }) {
  const cards = [
    {
      icon: <Thermometer aria-hidden className="h-4 w-4" />,
      label: "Temperature",
      value: formatTemp(current.temperature, unit),
      sub: `Feels like ${formatTemp(current.feelsLike, unit)}`,
      valueLabel: `Temperature ${formatTemp(current.temperature, unit)}, feels like ${formatTemp(current.feelsLike, unit)}`,
    },
    {
      icon: <Wind aria-hidden className="h-4 w-4" />,
      label: "Wind",
      value: windLabel(current.windSpeed),
      sub: compassLabel(current.windDirection),
      valueLabel: `Wind ${windLabel(current.windSpeed)} ${compassLabel(current.windDirection)}`,
    },
    {
      icon: <CloudRain aria-hidden className="h-4 w-4" />,
      label: "Rain Chance",
      value: `${Math.round(current.precipitationProbability)}%`,
      sub: current.precipitation > 0 ? `${current.precipitation} mm` : "No accumulation",
      valueLabel: `Rain probability ${Math.round(current.precipitationProbability)} percent`,
    },
    {
      icon: <Droplets aria-hidden className="h-4 w-4" />,
      label: "Humidity",
      value: `${Math.round(current.humidity)}%`,
      sub: current.dew !== undefined ? `Dew ${formatTemp(current.dew, unit)}` : "Relative humidity",
      valueLabel: `Humidity ${Math.round(current.humidity)} percent`,
    },
  ];

  const extra: Array<[string, string, string]> = [
    ["UV Index", current.uvIndex !== undefined ? String(Math.round(current.uvIndex)) : "—", current.uvIndex !== undefined ? `UV index ${Math.round(current.uvIndex)}` : "UV index unavailable"],
    ["Visibility", current.visibility !== undefined ? `${Math.round(current.visibility)} km` : "—", `Visibility ${current.visibility ?? "unavailable"}`],
    ["Pressure", current.pressure !== undefined ? `${Math.round(current.pressure)} hPa` : "—", `Pressure ${current.pressure ?? "unavailable"}`],
    ["Cloud Cover", current.cloudCover !== undefined ? `${Math.round(current.cloudCover)}%` : "—", `Cloud cover ${current.cloudCover ?? "unavailable"}`],
  ];

  return (
    <section aria-label="Current weather statistics" className="mx-auto w-full max-w-6xl px-4 pt-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <Card key={c.label} {...c} index={i} />
        ))}
      </div>
      <dl className="glass mt-3 grid grid-cols-2 gap-px overflow-hidden !p-0 sm:grid-cols-4">
        {extra.map(([k, v, label]) => (
          <div key={k} className="bg-transparent px-4 py-3">
            <dt className="kicker">{k}</dt>
            <dd className="tabular mt-1.5 text-lg font-medium" aria-label={label}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
