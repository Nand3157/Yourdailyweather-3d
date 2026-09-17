"use client";

import { useEffect, useState } from "react";
import { backgroundFor, timeOfDay } from "@/lib/weather/conditions";
import type { WeatherCondition } from "@/lib/weather/types";

/** Full-app dynamic atmosphere layer (CSS gradients, morphs on change §13/47). */
export default function WeatherBackground({
  condition,
  sunriseEpoch,
  sunsetEpoch,
  nowEpoch,
  theme,
}: {
  condition: WeatherCondition;
  sunriseEpoch?: number;
  sunsetEpoch?: number;
  nowEpoch: number;
  theme: "light" | "dark";
}) {
  const tod = timeOfDay(nowEpoch, sunriseEpoch, sunsetEpoch);
  const bg = backgroundFor(condition, tod, theme);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setStyle({
      ["--grad-top" as string]: bg.top,
      ["--grad-mid" as string]: bg.mid,
      ["--grad-bot" as string]: bg.bot,
      ["--glow-a" as string]: bg.glowA,
      ["--glow-b" as string]: bg.glowB,
    });
  }, [bg.top, bg.mid, bg.bot, bg.glowA, bg.glowB]);

  return <div aria-hidden className="app-atmosphere fixed inset-0 -z-10" style={style} />;
}
