"use client";

import { useEffect, useRef, useState } from "react";

export interface GeoSuggestion {
  name: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  population?: number;
}

const DEBOUNCE_MS = 220;
const MIN_QUERY = 2;

/**
 * Debounced location autocomplete against /api/geocode (Open-Meteo).
 * Cancels in-flight requests when the query changes and never races:
 * only the latest query's response is applied.
 */
export function useGeocode(query: string) {
  const [results, setResults] = useState<GeoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const seq = ++latest.current;
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = (await res.json()) as { results?: GeoSuggestion[] };
        if (seq !== latest.current) return; // a newer query already won
        setResults(body.results ?? []);
        setError(false);
      } catch {
        if (seq !== latest.current) return;
        setResults([]);
        setError(true);
      } finally {
        if (seq === latest.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading, error };
}

/** Display label: "City, Region, Country" with empties collapsed. */
export function suggestionLabel(s: GeoSuggestion): string {
  return [s.name, s.admin1, s.country].filter(Boolean).join(", ");
}
