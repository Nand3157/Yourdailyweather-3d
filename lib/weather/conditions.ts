import type { WeatherCondition } from "./types";

/** Map raw Visual Crossing icon/condition strings to the internal model (§36). */
export function mapCondition(icon: string | undefined, conditions: string | undefined): WeatherCondition {
  const raw = `${icon ?? ""} ${conditions ?? ""}`.toLowerCase();

  if (/thunder|lightning|storm/.test(raw)) return "storm";
  if (/snow|sleet|hail|flurr/.test(raw)) return "snow";
  if (/fog|mist|haze|smoke|dust/.test(raw)) return "fog";
  if (/\brain\b|showers|drizzle|precip/.test(raw)) return "rain";
  if (/wind/.test(raw)) return "wind";
  if (/cloudy|overcast/.test(raw) && !/partly/.test(raw)) return "cloudy";
  if (/partly/.test(raw)) return "partlyCloudy";
  if (/clear|sun/.test(raw)) {
    if (/night/.test(raw)) return "night";
    return "sunny";
  }
  if (/night/.test(raw)) return "night";
  if (/clear/.test(raw)) return "sunny";
  return "partlyCloudy";
}

/** Day / sunset-transition / night bucket from sunrise/sunset + now (§46). */
export function timeOfDay(nowEpoch: number, sunriseEpoch?: number, sunsetEpoch?: number): "day" | "sunset" | "night" {
  if (!sunriseEpoch || !sunsetEpoch) return "day";
  const hour = 3600;
  if (nowEpoch >= sunriseEpoch && nowEpoch < sunsetEpoch - hour) return "day";
  if (nowEpoch >= sunsetEpoch - hour && nowEpoch <= sunsetEpoch + hour) return "sunset";
  return "night";
}

/** Fraction 0..1 of the sun along its arc (for SunArc). */
export function sunProgress(nowEpoch: number, sunriseEpoch: number, sunsetEpoch: number): number {
  if (sunsetEpoch <= sunriseEpoch) return 0;
  return Math.min(1, Math.max(0, (nowEpoch - sunriseEpoch) / (sunsetEpoch - sunriseEpoch)));
}

export function compassLabel(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

/** Dynamic background stops per condition + time of day + theme (§13). */
export function backgroundFor(
  condition: WeatherCondition,
  tod: "day" | "sunset" | "night",
  theme: "light" | "dark" = "dark"
): {
  top: string;
  mid: string;
  bot: string;
  glowA: string;
  glowB: string;
} {
  if (theme === "light") {
    if (tod === "night" || condition === "night")
      return { top: "#8b93b8", mid: "#c9cede", bot: "#f4f4fa", glowA: "rgba(129,140,248,.30)", glowB: "rgba(255,255,255,.7)" };
    switch (condition) {
      case "sunny":
        return { top: "#4a90c4", mid: "#a8d0ee", bot: "#eef6fd", glowA: "rgba(251,191,36,.5)", glowB: "rgba(255,255,255,.65)" };
      case "partlyCloudy":
        return { top: "#5b8fc0", mid: "#b9d6ea", bot: "#f2f7fc", glowA: "rgba(251,191,36,.35)", glowB: "rgba(255,255,255,.6)" };
      case "cloudy":
        return { top: "#8fa3b8", mid: "#c9d6e2", bot: "#f1f5f9", glowA: "rgba(255,255,255,.5)", glowB: "rgba(148,163,184,.4)" };
      case "rain":
        return { top: "#5b7fa6", mid: "#a9c3d9", bot: "#eef3f8", glowA: "rgba(2,132,199,.25)", glowB: "rgba(255,255,255,.55)" };
      case "storm":
        return { top: "#64748b", mid: "#b6c2d1", bot: "#eef2f7", glowA: "rgba(100,116,139,.35)", glowB: "rgba(255,255,255,.5)" };
      case "snow":
        return { top: "#9db8d2", mid: "#d7e5f1", bot: "#ffffff", glowA: "rgba(255,255,255,.8)", glowB: "rgba(186,230,253,.5)" };
      case "fog":
        return { top: "#9aa8b8", mid: "#d3dce4", bot: "#f6f8fa", glowA: "rgba(255,255,255,.5)", glowB: "rgba(148,163,184,.35)" };
      case "wind":
        return { top: "#5fa3b8", mid: "#bfe0ea", bot: "#f2fafc", glowA: "rgba(34,211,238,.3)", glowB: "rgba(255,255,255,.55)" };
      default:
        return { top: "#5b8fc0", mid: "#b9d6ea", bot: "#f2f7fc", glowA: "rgba(251,191,36,.3)", glowB: "rgba(255,255,255,.6)" };
    }
  }
  if (tod === "night" || condition === "night")
    return { top: "#0b1030", mid: "#0a0f28", bot: "#030014", glowA: "rgba(129,140,248,.25)", glowB: "rgba(76,29,149,.30)" };
  switch (condition) {
    case "sunny":
      return { top: "#2f6fb4", mid: "#12365f", bot: "#030014", glowA: "rgba(251,191,36,.35)", glowB: "rgba(125,211,252,.25)" };
    case "partlyCloudy":
      return { top: "#274b73", mid: "#0e2338", bot: "#030014", glowA: "rgba(251,191,36,.22)", glowB: "rgba(125,211,252,.22)" };
    case "cloudy":
      return { top: "#334155", mid: "#16202e", bot: "#030014", glowA: "rgba(148,163,184,.20)", glowB: "rgba(71,85,105,.25)" };
    case "rain":
      return { top: "#1e3a5f", mid: "#0d1b2e", bot: "#030014", glowA: "rgba(34,211,238,.22)", glowB: "rgba(30,58,95,.4)" };
    case "storm":
      return { top: "#232333", mid: "#12141f", bot: "#030014", glowA: "rgba(167,139,250,.20)", glowB: "rgba(30,58,95,.45)" };
    case "snow":
      return { top: "#7d9bbf", mid: "#33465c", bot: "#0a1220", glowA: "rgba(224,242,254,.30)", glowB: "rgba(186,230,253,.20)" };
    case "fog":
      return { top: "#475569", mid: "#1e293b", bot: "#030014", glowA: "rgba(203,213,225,.18)", glowB: "rgba(100,116,139,.25)" };
    case "wind":
      return { top: "#164e63", mid: "#0c2631", bot: "#030014", glowA: "rgba(34,211,238,.20)", glowB: "rgba(21,94,117,.35)" };
    default:
      return { top: "#0b1e3a", mid: "#07111f", bot: "#030014", glowA: "rgba(125,211,252,.22)", glowB: "rgba(129,140,248,.18)" };
  }
}
