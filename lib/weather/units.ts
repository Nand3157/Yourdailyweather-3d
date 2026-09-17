export type TempUnit = "C" | "F";

/** Visual Crossing returns metric (°C). Convert client-side only (§23). */
export function toDisplayTemp(celsius: number, unit: TempUnit): number {
  return unit === "F" ? (celsius * 9) / 5 + 32 : celsius;
}

export function formatTemp(celsius: number, unit: TempUnit): string {
  return `${Math.round(toDisplayTemp(celsius, unit))}°`;
}

export function windLabel(kmh: number): string {
  return `${Math.round(kmh)} km/h`;
}

/** Clamp the user atmosphere-intensity level (§50 settings). */
export function clampLevel(v: number): number {
  if (Number.isNaN(v)) return 1;
  return Math.min(1.6, Math.max(0.3, v));
}
