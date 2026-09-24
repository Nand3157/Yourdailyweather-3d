"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { Share2 } from "lucide-react";
import { useWeather } from "@/hooks/useWeather";
import { useFavorites, useUnit, useThemePref, useEffectsPref, useIntensity } from "@/hooks/usePrefs";
import { mapCondition } from "@/lib/weather/conditions";
import { resolveHeroInput, type HeroFx } from "@/lib/weather/hero";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";
import WeatherBackground from "@/components/weather/WeatherBackground";
import WeatherHero from "@/components/weather/WeatherHero";
import WeatherStats from "@/components/weather/WeatherStats";
import HourlyTimeline from "@/components/weather/HourlyTimeline";
import TemperatureChart from "@/components/weather/TemperatureChart";
import RainChart from "@/components/weather/RainChart";
import SunArc from "@/components/weather/SunArc";
import WindCompass from "@/components/weather/WindCompass";
import FavoriteLocations from "@/components/favorites/FavoriteLocations";
import SettingsPanel from "@/components/settings/SettingsPanel";

const HeroEngine = dynamic(() => import("@/components/weather/HeroEngine"), {
  ssr: false,
  loading: () => null,
});

import ForegroundFx from "@/components/weather/ForegroundFx";

function dayEpoch(time: string | undefined, ref: number): number | undefined {
  if (!time) return undefined;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return undefined;
  const d = new Date(ref * 1000);
  d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-10" aria-label="Loading weather" role="status">
      <div className="skeleton mx-auto h-6 w-44" />
      <div className="skeleton mx-auto mt-6 h-28 w-56" />
      <div className="skeleton mx-auto mt-4 h-5 w-64" />
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="skeleton mt-4 h-56" />
    </div>
  );
}

export default function Home() {
  const { data, loading, refreshing, error, location, load, refresh, usingGeo, updatedAgo } = useWeather();
  const { favorites, toggle } = useFavorites();
  const { unit, setUnit } = useUnit();
  const { resolved, setPref } = useThemePref();
  const { effects, setEffects } = useEffectsPref();
  const { level, setLevel } = useIntensity();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [shared, setShared] = useState(false);

  // Shared interaction channel to the 3D HERO ENGINE (mutable, no re-renders).
  // Weather API Data → Weather State + Time of Day → 3D HERO ENGINE → Scroll+Mouse → Camera/Particle
  const fxRef = useRef<HeroFx | null>(null);
  if (!fxRef.current) fxRef.current = { pulse: 0, energy: 0, tpx: 0, tpy: 0, px: 0, py: 0, scroll: 0, scrollY: 0, sScroll: 0 };
  const fx = fxRef.current;
  const downPos = useRef<{ x: number; y: number } | null>(null);

  /** Tap-the-sky: taps (not drags, not UI controls) pulse the atmosphere. */
  const onBgPointerDown = (e: React.PointerEvent) => {
    downPos.current = { x: e.clientX, y: e.clientY };
  };
  const onBgPointerUp = (e: React.PointerEvent) => {
    const d = downPos.current;
    downPos.current = null;
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;
    const el = e.target as HTMLElement;
    if (el.closest("button, a, input, select, textarea, canvas, summary, [role='dialog']")) return;
    fx.pulse += 1;
  };

  const condition = useMemo(
    () => (data ? mapCondition(data.current.icon, data.current.conditions) : "partlyCloudy"),
    [data]
  );
  const nowEpoch = data?.current.datetimeEpoch ?? Math.floor(Date.now() / 1000);
  const sunriseEpoch = useMemo(() => dayEpoch(data?.sunrise, nowEpoch), [data?.sunrise, nowEpoch]);
  const sunsetEpoch = useMemo(() => dayEpoch(data?.sunset, nowEpoch), [data?.sunset, nowEpoch]);
  const { tod, scene } = useMemo(
    () => resolveHeroInput(condition, nowEpoch, sunriseEpoch, sunsetEpoch),
    [condition, nowEpoch, sunriseEpoch, sunsetEpoch]
  );
  const intensity = useMemo(() => {
    if (!data) return 0.4;
    return Math.min(1, data.current.precipitationProbability / 100 + data.current.precipitation / 5);
  }, [data]);

  const handleLocate = () => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        try {
          localStorage.setItem("aw-geo", "1");
        } catch {}
        void load(`${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}`, { force: true });
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const handleShare = async () => {
    if (!data) return;
    const text = `${data.location.name}: ${Math.round(data.current.temperature)}°C, ${data.current.conditions}. Feels like ${Math.round(data.current.feelsLike)}°C. — Atmospheric Weather`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Atmospheric Weather", text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* dismissed */
    }
  };

  const nowHour = data?.previous24Hours[data.previous24Hours.length - 1] ?? null;
  const prevHours = data?.previous24Hours.slice(0, -1) ?? [];

  return (
    <>
      <WeatherBackground condition={condition} sunriseEpoch={sunriseEpoch} sunsetEpoch={sunsetEpoch} nowEpoch={nowEpoch} theme={resolved} />
      {/* 3D HERO ENGINE — single entry point for all atmospheric 3D */}
      {data && effects !== "off" && (
        <HeroEngine
          scene={scene}
          tod={tod}
          intensity={Math.min(1, intensity * level)}
          windSpeed={data.current.windSpeed}
          fx={fx}
          theme={resolved}
          quality={effects === "reduced" ? "reduced" : "full"}
        />
      )}
      {data && effects === "full" && (condition === "rain" || condition === "storm" || condition === "snow") && (
        <ForegroundFx
          condition={condition}
          intensity={Math.min(1, intensity * level)}
          windSpeed={data.current.windSpeed}
          theme={resolved}
          fx={fx}
        />
      )}

      <Header
        onSearch={(l) => void load(l)}
        onLocate={handleLocate}
        onRefresh={refresh}
        onOpenSettings={() => setSettingsOpen(true)}
        loading={loading}
        locating={locating}
        refreshing={refreshing}
        unit={unit}
        onUnit={setUnit}
        theme={resolved}
        onTheme={() => setPref(resolved === "dark" ? "light" : "dark")}
      />

      <main id="main" className="pb-28 md:pb-16" onPointerDown={onBgPointerDown} onPointerUp={onBgPointerUp}>
        {loading && !data && <Skeleton />}

        {!loading && !data && error && (
          <section className="mx-auto w-full max-w-xl px-4 pt-16 text-center" role="alert" aria-live="assertive">
            <h1 className="text-2xl font-semibold">What&apos;s the weather like today?</h1>
            <p className="text-soft mt-3">{error.message}</p>
            {error.suggestions.length > 0 && (
              <ul className="mt-5 flex flex-wrap justify-center gap-2">
                {error.suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => void load(s)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:-translate-y-px hover:bg-white/10"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {data && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={data.location.name + data.updatedAt}>
            <WeatherHero
              data={data}
              unit={unit}
              isFavorite={favorites.includes(data.location.name)}
              onToggleFavorite={() => toggle(data.location.name)}
              usingGeo={usingGeo}
              updatedAgo={updatedAgo}
            />
            <WeatherStats current={data.current} unit={unit} />
            <TemperatureChart previous={data.previous24Hours} next={data.next24Hours} timezone={data.timezone} unit={unit} />
            <HourlyTimeline previous={prevHours} next={data.next24Hours} now={nowHour} timezone={data.timezone} unit={unit} />
            <RainChart hours={[...data.previous24Hours.slice(-12), ...data.next24Hours.slice(0, 12)]} timezone={data.timezone} />

            <section aria-label="Sun and wind" className="mx-auto grid w-full max-w-6xl gap-3 px-4 pt-6 md:grid-cols-2">
              <SunArc sunrise={data.sunrise} sunset={data.sunset} nowEpoch={nowEpoch} />
              <WindCompass speed={data.current.windSpeed} direction={data.current.windDirection} />
            </section>

            <FavoriteLocations favorites={favorites} current={location} onSelect={(l) => void load(l)} />

            <div className="mx-auto w-full max-w-6xl px-4 pt-6 text-center">
              <button
                type="button"
                onClick={handleShare}
                className="glass-soft items-center gap-2 px-5 py-2.5 text-sm transition hover:-translate-y-px active:scale-95 inline-flex"
              >
                <Share2 aria-hidden className="h-4 w-4" /> {shared ? "Link copied!" : "Share weather"}
              </button>
              <p className="mt-2 text-xs opacity-40">Tip: tap the sky — the atmosphere reacts.</p>
            </div>

            <footer className="text-soft mx-auto w-full max-w-6xl px-4 pb-4 pt-8 text-center text-xs">
              Weather data powered by Visual Crossing · {data.location.name} · Updated {updatedAgo}
            </footer>
          </motion.div>
        )}
      </main>

      <MobileNav
        onWeather={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        onFavorites={() => void (favorites[0] ? load(favorites[0]) : setSettingsOpen(true))}
        onSettings={() => setSettingsOpen(true)}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={resolved === "dark" ? "dark" : "light"}
        onTheme={(t) => setPref(t === "system" ? "system" : t)}
        unit={unit}
        onUnit={setUnit}
        effects={effects}
        onEffects={setEffects}
        level={level}
        onLevel={setLevel}
      />
    </>
  );
}
