import type { WeatherCondition } from "./types.ts";
import { timeOfDay } from "./conditions.ts";

export type TimeOfDay = "day" | "sunset" | "night";
export type HeroScene = "rain" | "snow" | "storm" | "fog" | "clear";

/**
 * Shared interaction channel between the page and the 3D HERO ENGINE.
 * Mutable: the page writes (tap pulses, pointer, scroll), the engine reads
 * every frame — no React re-renders cross this boundary.
 */
export interface HeroFx {
  pulse: number; // bumped on background tap
  energy: number; // 0..1, set on pulse, decays each frame
  tpx: number; // pointer target -1..1
  tpy: number;
  px: number; // damped pointer
  py: number;
  scroll: number; // 0..1 page scroll progress
  scrollY: number; // px
  sScroll: number; // damped scroll
}

/**
 * 3D HERO ENGINE — core mapping
 *
 *  Weather API Data
 *       ↓
 *  Weather State + Time of Day
 *       ↓
 *  3D HERO ENGINE → branches to 5 scenes
 *       ↓
 *  Scroll + Mouse Input → Camera / Particle Motion
 */

export function heroSceneFor(
  condition: WeatherCondition,
  tod: TimeOfDay
): HeroScene {
  // Direct weather-driven branches
  if (condition === "rain") return "rain";
  if (condition === "snow") return "snow";
  if (condition === "storm") return "storm";
  if (condition === "fog") return "fog";
  if (condition === "cloudy") return "fog"; // overcast treated as fog-volume scene

  // Clear family — stays "clear" but scene internally splits by time-of-day
  // sunny / partlyCloudy / wind / night all go through Clear
  return "clear";
}

export function resolveHeroInput(
  condition: WeatherCondition,
  nowEpoch: number,
  sunriseEpoch?: number,
  sunsetEpoch?: number
): { tod: TimeOfDay; scene: HeroScene } {
  const tod = timeOfDay(nowEpoch, sunriseEpoch, sunsetEpoch) as TimeOfDay;
  const scene = heroSceneFor(condition, tod);
  return { tod, scene };
}
