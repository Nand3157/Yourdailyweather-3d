import type { HeroScene, TimeOfDay } from "./hero";

/**
 * FLUID STYLE — the single source of truth for the FluidField silk layer.
 * (scene, time-of-day, theme) → ink tints, turbulence, base flow direction,
 * advection speed, trail persistence (fade) and ink gain.
 * Pure + unit-tested; the shader only renders what this decides.
 */
export interface FluidStyle {
  tintA: string; // deep field color (old ink / low density)
  tintB: string; // mid trail color (fresh ink)
  tintC: string; // hot edge / sheen color (wake, shockwave)
  turbulence: number; // curl strength — storm >> calm
  flowDir: number; // base flow direction, radians (0 = +x)
  flowSpeed: number; // time scale of the flow field
  fade: number; // per-frame trail retention (higher = longer trails)
  gain: number; // ink deposited per frame
}

export function fluidStyleFor(
  scene: HeroScene,
  tod: TimeOfDay,
  theme: "light" | "dark"
): FluidStyle {
  // ── Light theme: ink-on-paper — streaks are pigment, not light ──
  if (theme === "light") {
    const base: FluidStyle = {
      tintA: "#9db8d2",
      tintB: "#5f83ad",
      tintC: "#1e3a5f",
      turbulence: 0.55,
      flowDir: 0.1,
      flowSpeed: 0.5,
      fade: 0.94,
      gain: 0.4,
    };
    if (scene === "storm")
      return { ...base, tintA: "#6a7686", tintB: "#3d4757", tintC: "#141a26", turbulence: 1.5, flowDir: -0.5, flowSpeed: 1.5, fade: 0.945, gain: 0.62 };
    if (scene === "rain")
      return { ...base, tintA: "#8fa9c4", tintB: "#4a6f99", tintC: "#16324f", turbulence: 1.0, flowDir: 0.45, flowSpeed: 1.0, fade: 0.95, gain: 0.52 };
    if (scene === "snow")
      return { ...base, tintA: "#c3d5e6", tintB: "#8fa9c4", tintC: "#41597a", turbulence: 0.35, flowDir: 0.0, flowSpeed: 0.3, fade: 0.93, gain: 0.32 };
    if (scene === "fog")
      return { ...base, tintA: "#c9d4dd", tintB: "#9db0c0", tintC: "#5a7086", turbulence: 0.22, flowDir: 0.15, flowSpeed: 0.22, fade: 0.92, gain: 0.26 };
    // clear
    if (tod === "night")
      return { ...base, tintA: "#7d89ab", tintB: "#54628c", tintC: "#232e4e", turbulence: 0.4, flowDir: -0.15, flowSpeed: 0.35, fade: 0.925, gain: 0.3 };
    if (tod === "sunset")
      return { ...base, tintA: "#d9b090", tintB: "#b0785a", tintC: "#5f3040", turbulence: 0.5, flowDir: 0.2, flowSpeed: 0.4, fade: 0.945, gain: 0.38 };
    return base;
  }

  // ── Dark theme: light-on-dark — the signature luminous silk ──
  const night: FluidStyle = {
    tintA: "#243060",
    tintB: "#5e79c8",
    tintC: "#c9d8ff",
    turbulence: 0.42,
    flowDir: -0.2,
    flowSpeed: 0.38,
    fade: 0.93,
    gain: 0.34,
  };
  const day: FluidStyle = {
    tintA: "#1a2c50",
    tintB: "#4d7fd6",
    tintC: "#bcd9ff",
    turbulence: 0.6,
    flowDir: 0.12,
    flowSpeed: 0.55,
    fade: 0.925,
    gain: 0.42,
  };
  const sunset: FluidStyle = {
    tintA: "#3a2038",
    tintB: "#d07a4e",
    tintC: "#ffd9a8",
    turbulence: 0.55,
    flowDir: 0.25,
    flowSpeed: 0.45,
    fade: 0.925,
    gain: 0.44,
  };

  if (scene === "storm")
    return { ...sunset, tintA: "#1c1530", tintB: "#7a6cc8", tintC: "#cfc4ff", turbulence: 1.7, flowDir: -0.55, flowSpeed: 1.6, fade: 0.95, gain: 0.66 };
  if (scene === "rain") {
    const base = tod === "night" ? night : tod === "sunset" ? sunset : day;
    return { ...base, tintA: "#16223f", tintB: "#4d74b8", tintC: "#9fd4ff", turbulence: 1.05, flowDir: 0.5, flowSpeed: 1.05, fade: 0.95, gain: 0.55 };
  }
  if (scene === "snow") {
    const base = tod === "night" ? night : day;
    return { ...base, tintA: "#22304f", tintB: "#7f97c4", tintC: "#e8f1ff", turbulence: 0.3, flowDir: 0.0, flowSpeed: 0.28, fade: 0.935, gain: 0.3 };
  }
  if (scene === "fog") {
    const base = tod === "night" ? night : day;
    return { ...base, tintA: "#262e45", tintB: "#6b7a96", tintC: "#b8c4d8", turbulence: 0.2, flowDir: 0.18, flowSpeed: 0.2, fade: 0.925, gain: 0.24 };
  }
  // clear
  if (tod === "night") return night;
  if (tod === "sunset") return sunset;
  return day;
}
