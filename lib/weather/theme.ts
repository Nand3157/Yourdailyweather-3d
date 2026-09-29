/**
 * THEME BY LOCATION SUN — when the user has not chosen a theme, the page
 * follows the sun at the SEARCHED LOCATION: light while the sun is up there,
 * dark from its sunset to sunrise. The location's IANA timezone (from the
 * weather payload) decides what "now" means; the device clock is only a
 * fallback before any location loads.
 *
 * Pure + unit-tested; useThemePref only wires it to state.
 */

export type ThemePref = "system" | "light" | "dark";

/** Hour of day (0-23) at an IANA timezone, or null if the zone is unknown. */
export function hourInZone(nowMs: number, timezone: string | null): number | null {
  if (!timezone) return null;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone });
    const h = parseInt(fmt.format(new Date(nowMs)), 10);
    return Number.isFinite(h) ? h % 24 : null;
  } catch {
    return null;
  }
}

/** Minutes since local midnight at an IANA timezone ("HH:MM" → comparison basis). */
export function minutesInZone(nowMs: number, timezone: string | null): number | null {
  if (!timezone) return null;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    });
    const parts = fmt.format(new Date(nowMs));
    const m = parts.match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return (parseInt(m[1], 10) % 24) * 60 + parseInt(m[2], 10);
  } catch {
    return null;
  }
}

/** "06:24" or "6:24 PM" (optionally with seconds) → minutes since midnight. */
export function timeStringToMinutes(time: string | undefined): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const meridiem = m[3]?.toUpperCase();
  if (meridiem === "PM" && h < 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/**
 * Decide the resolved theme for a "system" preference.
 *
 * @param nowMs     current time (any clock — it is converted to the zone)
 * @param timezone  IANA timezone of the searched location (null = fallback)
 * @param sunrise   location sunrise "HH:MM" string (optional refinement)
 * @param sunset    location sunset "HH:MM" string (optional refinement)
 */
export function themeBySun(
  nowMs: number,
  timezone: string | null,
  sunrise?: string | null,
  sunset?: string | null
): "light" | "dark" {
  const mins = minutesInZone(nowMs, timezone);
  const rise = timeStringToMinutes(sunrise ?? undefined);
  const set = timeStringToMinutes(sunset ?? undefined);

  if (mins == null) {
    // No usable timezone — fall back to the device clock, coarse 6–18 window.
    const h = new Date(nowMs).getHours();
    return h >= 6 && h < 18 ? "light" : "dark";
  }

  // With real sunrise/sunset for that location, sun-up = light.
  if (rise != null && set != null && set > rise) {
    return mins >= rise && mins < set ? "light" : "dark";
  }
  // Otherwise: coarse daylight window in the location's own time.
  const h = Math.floor(mins / 60);
  return h >= 6 && h < 18 ? "light" : "dark";
}

/**
 * Parse "06:24" / "6:24 PM"-style local time strings to an epoch (ms) on the
 * device's calendar day. Kept for callers that need absolute timestamps.
 */
export function localTimeToEpochToday(time: string | undefined, nowMs: number): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const meridiem = m[3]?.toUpperCase();
  if (meridiem === "PM" && h < 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;
  const d = new Date(nowMs);
  d.setHours(h, min, 0, 0);
  return d.getTime();
}
