"use client";

import { motion, AnimatePresence, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";
import { Star, MapPin } from "lucide-react";
import { formatTemp } from "@/lib/weather/units";
import { moodSentence } from "@/lib/weather/mood";
import { mapCondition } from "@/lib/weather/conditions";
import WeatherIcon from "./WeatherIcon";
import type { WeatherResponse } from "@/lib/weather/types";

function AnimatedTemp({ celsius, unit }: { celsius: number; unit: "C" | "F" }) {
  const spring = useSpring(celsius, { stiffness: 120, damping: 20 });
  useEffect(() => {
    spring.set(celsius);
  }, [celsius, spring]);
  const display = useTransform(spring, (v) => formatTemp(v, unit));
  return <motion.span>{display}</motion.span>;
}

interface Props {
  data: WeatherResponse;
  unit: "C" | "F";
  isFavorite: boolean;
  onToggleFavorite: () => void;
  usingGeo: boolean;
  updatedAgo: string;
}

/** Visual centerpiece (§10): location → giant temp → condition → feels-like → mood. */
export default function WeatherHero({ data, unit, isFavorite, onToggleFavorite, usingGeo, updatedAgo }: Props) {
  const { current, location } = data;
  const condition = mapCondition(current.icon, current.conditions);
  const hour = new Date(current.datetimeEpoch * 1000).getHours();
  const key = `${location.name}-${Math.round(current.temperature)}-${current.icon}`;

  return (
    <section aria-labelledby="hero-location" className="mx-auto w-full max-w-6xl px-4 pt-8 text-center md:pt-12">
      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.99 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="flex items-center justify-center gap-2 text-sm opacity-70">
            <MapPin aria-hidden className="h-4 w-4" />
            <h1 id="hero-location" className="text-lg font-medium tracking-wide">
              {location.name}
              {location.country ? <span className="opacity-70">, {location.country}</span> : null}
            </h1>
            <motion.button
              type="button"
              whileTap={{ scale: 0.8 }}
              onClick={onToggleFavorite}
              aria-label={isFavorite ? `Remove ${location.name} from favorites` : `Add ${location.name} to favorites`}
              aria-pressed={isFavorite}
              className="rounded-full p-1.5 transition hover:bg-white/10"
            >
              <motion.span
                key={String(isFavorite)}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="block"
              >
                <Star aria-hidden className={`h-5 w-5 ${isFavorite ? "fill-amber-300 text-amber-300" : "opacity-60"}`} />
              </motion.span>
            </motion.button>
          </div>

          {usingGeo && <p className="mt-1 text-xs opacity-50">Using your current location</p>}

          <div className="mt-2 flex items-start justify-center gap-4">
            <p className="temp-display" aria-label={`Temperature ${formatTemp(current.temperature, unit)}`}>
              <AnimatedTemp celsius={current.temperature} unit={unit} />
            </p>
            <WeatherIcon condition={condition} size={96} label={current.conditions} />
          </div>

          <p className="mt-1 text-2xl font-light md:text-3xl">{current.conditions || "—"}</p>
          <p className="text-soft mt-1 text-base">Feels like {formatTemp(current.feelsLike, unit)}</p>
          <p className="text-soft mx-auto mt-3 max-w-md text-sm leading-relaxed">{moodSentence(current, hour)}</p>
          <p className="mt-4 text-xs opacity-50">
            Updated {updatedAgo} · Weather data powered by Visual Crossing{data.demo ? " (demo)" : ""}
          </p>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
