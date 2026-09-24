import type { HeroScene, TimeOfDay } from "./hero";

/**
 * SKY MODEL — the single source of truth for the shader-driven sky.
 * (scene, time-of-day, theme) → horizon/zenith colors, cloud coverage,
 * sun/moon halo tint, aurora strength, lightning flash cadence.
 * Pure + unit-tested; the shader only renders what this decides.
 */
export interface SkyPalette {
  horizon: string; // three.js color at the horizon
  zenith: string; // three.js color at the top of the dome
  cloud: string; // cloud body color
  cloudLit: string; // cloud edge / lit side
  halo: string; // sun/moon glow tint
  cloudCover: number; // 0..1 FBM threshold
  cloudSpeed: number; // advection speed multiplier
  aurora: number; // 0..1 clear-night curtains
  flash: number; // 0..1 lightning strobe strength
  stars: number; // 0..1 starfield opacity
}

const hex = {
  // shared
  white: "#ffffff",
  moon: "#dfe6ff",
};

export function skyPaletteFor(
  scene: HeroScene,
  tod: TimeOfDay,
  theme: "light" | "dark"
): SkyPalette {
  // ── Light theme: paper sky, clouds read as soft ink ──
  if (theme === "light") {
    const base: SkyPalette = {
      horizon: "#bfd9ef",
      zenith: "#5f93c4",
      cloud: "#ffffff",
      cloudLit: "#f2f7fc",
      halo: "#ffd27d",
      cloudCover: 0.42,
      cloudSpeed: 0.5,
      aurora: 0,
      flash: 0,
      stars: 0,
    };
    if (scene === "storm")
      return { ...base, horizon: "#8d9cb0", zenith: "#5d6c80", cloud: "#e2e8f0", cloudLit: "#c3cedd", cloudCover: 0.8, cloudSpeed: 1.6, flash: 0.9 };
    if (scene === "rain")
      return { ...base, horizon: "#a9c4dc", zenith: "#6f97ba", cloud: "#e8eef5", cloudLit: "#cfdce9", cloudCover: 0.68, cloudSpeed: 1 };
    if (scene === "snow")
      return { ...base, horizon: "#d5e4f0", zenith: "#9db8d2", cloud: "#ffffff", cloudLit: "#eef6fd", cloudCover: 0.55, cloudSpeed: 0.4 };
    if (scene === "fog")
      return { ...base, horizon: "#dfe7ee", zenith: "#a9b9c8", cloud: "#f4f7fa", cloudLit: "#e2e9ef", cloudCover: 0.5, cloudSpeed: 0.25 };
    // clear
    if (tod === "night")
      return { ...base, horizon: "#a7b1cd", zenith: "#6b7699", halo: hex.moon, aurora: 0.35, stars: 0.4, cloudCover: 0.2, cloudSpeed: 0.3 };
    if (tod === "sunset")
      return { ...base, horizon: "#ffd9a8", zenith: "#7fa8cf", halo: "#ffb066", cloudLit: "#ffe3c2", cloudCover: 0.35, cloudSpeed: 0.4 };
    return base;
  }

  // ── Dark theme: the signature deep-sky looks ──
  const night: SkyPalette = {
    horizon: "#0d1230",
    zenith: "#020208",
    cloud: "#1b2440",
    cloudLit: "#3b4a75",
    halo: hex.moon,
    cloudCover: 0.2,
    cloudSpeed: 0.3,
    aurora: 0.7,
    flash: 0,
    stars: 1,
  };
  const day: SkyPalette = {
    horizon: "#1d4e8f",
    zenith: "#04122e",
    cloud: "#20304f",
    cloudLit: "#7ea6d9",
    halo: "#ffc46b",
    cloudCover: 0.38,
    cloudSpeed: 0.5,
    aurora: 0,
    flash: 0,
    stars: 0,
  };
  const sunset: SkyPalette = {
    horizon: "#c2593a",
    zenith: "#131c44",
    cloud: "#3a2a4e",
    cloudLit: "#ff9e64",
    halo: "#ff8a3d",
    cloudCover: 0.35,
    cloudSpeed: 0.4,
    aurora: 0,
    flash: 0,
    stars: 0.25,
  };

  if (scene === "storm")
    return { ...sunset, horizon: "#1a1626", zenith: "#050308", cloud: "#171425", cloudLit: "#8b7fd0", halo: "#a78bfa", cloudCover: 0.85, cloudSpeed: 1.8, flash: 1, stars: 0.15 };
  if (scene === "rain") {
    const base = tod === "night" ? night : tod === "sunset" ? sunset : day;
    return { ...base, horizon: tod === "night" ? "#0a0e24" : "#123055", cloud: "#18233d", cloudLit: "#5e7db0", cloudCover: 0.75, cloudSpeed: 1.1, aurora: 0, stars: 0 };
  }
  if (scene === "snow") {
    const base = tod === "night" ? night : day;
    return { ...base, horizon: tod === "night" ? "#141a33" : "#3c5a80", cloud: "#2a3550", cloudLit: "#aebfd8", cloudCover: 0.6, cloudSpeed: 0.45, aurora: 0, stars: tod === "night" ? 0.6 : 0 };
  }
  if (scene === "fog") {
    const base = tod === "night" ? night : day;
    return { ...base, horizon: tod === "night" ? "#1c2237" : "#41597a", cloud: "#2a3147", cloudLit: "#8b96ad", cloudCover: 0.55, cloudSpeed: 0.22, aurora: 0, stars: tod === "night" ? 0.3 : 0 };
  }
  // clear
  if (tod === "night") return night;
  if (tod === "sunset") return sunset;
  return day;
}
