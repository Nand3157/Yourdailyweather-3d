/**
 * US EPA AQI banding (Open-Meteo `us_aqi` is already the consolidated index).
 * Bands: 0-50 Good, 51-100 Moderate, 101-150 Unhealthy for sensitive groups,
 * 151-200 Unhealthy, 201-300 Very unhealthy, 301+ Hazardous.
 */

export interface AqiBand {
  label: string;
  /** Tailwind-independent CSS color for the dial and accents. */
  color: string;
  advice: string;
}

const BANDS: Array<{ max: number } & AqiBand> = [
  { max: 50, label: "Good", color: "#4ade80", advice: "Air quality is satisfactory — enjoy outdoor activity." },
  { max: 100, label: "Moderate", color: "#facc15", advice: "Acceptable air; unusually sensitive people should watch for symptoms." },
  { max: 150, label: "Unhealthy for sensitive groups", color: "#fb923c", advice: "Sensitive groups: reduce prolonged outdoor exertion." },
  { max: 200, label: "Unhealthy", color: "#f87171", advice: "Everyone may feel effects — limit prolonged outdoor exertion." },
  { max: 300, label: "Very unhealthy", color: "#c084fc", advice: "Health alert: avoid outdoor activity when possible." },
  { max: Infinity, label: "Hazardous", color: "#f43f5e", advice: "Emergency conditions: stay indoors, keep windows closed." },
];

export function aqiBand(aqi: number): AqiBand {
  const v = Number.isFinite(aqi) ? Math.max(0, Math.round(aqi)) : 0;
  return BANDS.find((b) => v <= b.max) ?? BANDS[BANDS.length - 1];
}

/** Progress 0..1 across the 0-500 dial (clamped; used for the arc fill). */
export function aqiProgress(aqi: number): number {
  const v = Number.isFinite(aqi) ? Math.max(0, aqi) : 0;
  return Math.min(1, v / 300); // dial saturates at "very unhealthy"
}

export interface Pollutant {
  key: string;
  label: string;
  value: number | undefined;
  unit: string;
}

/** Shape Open-Meteo `current` block into display-ready pollutants. */
export function pollutantRows(current: {
  pm2_5?: number | null;
  pm10?: number | null;
  ozone?: number | null;
  nitrogen_dioxide?: number | null;
  sulphur_dioxide?: number | null;
  carbon_monoxide?: number | null;
}): Pollutant[] {
  return [
    { key: "pm2_5", label: "PM2.5", value: current.pm2_5 ?? undefined, unit: "µg/m³" },
    { key: "pm10", label: "PM10", value: current.pm10 ?? undefined, unit: "µg/m³" },
    { key: "ozone", label: "Ozone", value: current.ozone ?? undefined, unit: "µg/m³" },
    { key: "no2", label: "NO₂", value: current.nitrogen_dioxide ?? undefined, unit: "µg/m³" },
    { key: "so2", label: "SO₂", value: current.sulphur_dioxide ?? undefined, unit: "µg/m³" },
    { key: "co", label: "CO", value: current.carbon_monoxide ?? undefined, unit: "µg/m³" },
  ];
}
