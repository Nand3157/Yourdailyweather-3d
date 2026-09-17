"use client";

import type { WeatherCondition } from "@/lib/weather/types";

interface Props {
  condition: WeatherCondition;
  size?: number;
  className?: string;
  label?: string;
}

/** Animated SVG weather icon system — no emoji (§11). */
export default function WeatherIcon({ condition, size = 56, className = "", label }: Props) {
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true };
  const common = { width: size, height: size, viewBox: "0 0 64 64", className, ...a11y };

  const sun = (
    <g className="anim-spin-slow" style={{ transformOrigin: "24px 24px" }}>
      <circle cx="24" cy="24" r="10" fill="#FBBF24" />
      <circle cx="24" cy="24" r="13" fill="#FBBF24" opacity="0.25" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={24 + Math.cos(a) * 15}
            y1={24 + Math.sin(a) * 15}
            x2={24 + Math.cos(a) * 19}
            y2={24 + Math.sin(a) * 19}
            stroke="#FBBF24"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );

  const cloud = (x: number, y: number, s: number, fill = "#E2E8F0", opacity = 1, drift = true) => (
    <g className={drift ? "anim-drift" : undefined} opacity={opacity}>
      <ellipse cx={x} cy={y} rx={13 * s} ry={8 * s} fill={fill} />
      <circle cx={x - 8 * s} cy={y - 3 * s} r={6.5 * s} fill={fill} />
      <circle cx={x + 8 * s} cy={y - 2 * s} r={5.5 * s} fill={fill} />
    </g>
  );

  const rain = (x: number, count = 3, offset = 0) => (
    <g stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round">
      {Array.from({ length: count }).map((_, i) => (
        <line
          key={i}
          className="rain-drop"
          style={{ animationDelay: `${offset + i * 0.25}s` }}
          x1={x + i * 9 - 9}
          y1={46}
          x2={x + i * 9 - 11}
          y2={52}
        />
      ))}
    </g>
  );

  const snow = (x: number, count = 3) => (
    <g fill="#F0F9FF">
      {Array.from({ length: count }).map((_, i) => (
        <circle key={i} className="snow-flake" style={{ animationDelay: `${i * 0.7}s` }} cx={x + i * 9 - 9} cy={48} r="2.4" />
      ))}
    </g>
  );

  switch (condition) {
    case "sunny":
      return <svg {...common}>{sun}</svg>;
    case "night":
      return (
        <svg {...common}>
          <path d="M40 36a14 14 0 1 1-18-21 11 11 0 0 0 18 21z" fill="#C4B5FD" />
          <circle className="anim-twinkle" cx="46" cy="14" r="1.8" fill="#fff" />
          <circle className="anim-twinkle" style={{ animationDelay: "1s" }} cx="54" cy="26" r="1.4" fill="#fff" />
          <circle className="anim-twinkle" style={{ animationDelay: "2s" }} cx="38" cy="8" r="1.2" fill="#fff" />
        </svg>
      );
    case "partlyCloudy":
      return (
        <svg {...common}>
          <g transform="translate(-8,-6) scale(0.85)">{sun}</g>
          {cloud(38, 40, 1.05)}
        </svg>
      );
    case "cloudy":
      return (
        <svg {...common}>
          {cloud(26, 26, 0.9, "#CBD5E1")}
          {cloud(38, 40, 1.1)}
        </svg>
      );
    case "rain":
      return (
        <svg {...common}>
          {cloud(32, 32, 1.1, "#94A3B8")}
          {cloud(32, 28, 0.9)}
          {rain(32)}
        </svg>
      );
    case "storm":
      return (
        <svg {...common}>
          {cloud(32, 30, 1.1, "#64748B")}
          <path className="anim-flash" d="M34 38l-7 12h5l-2 8 9-13h-5l3-7z" fill="#FDE047" />
          {rain(32, 2, 0.4)}
        </svg>
      );
    case "snow":
      return (
        <svg {...common}>
          {cloud(32, 30, 1.05, "#CBD5E1")}
          {snow(32)}
        </svg>
      );
    case "fog":
      return (
        <svg {...common}>
          {cloud(32, 24, 0.95, "#CBD5E1", 0.9, false)}
          <g className="anim-fog" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round">
            <line x1="14" y1="42" x2="50" y2="42" />
            <line x1="18" y1="49" x2="46" y2="49" opacity="0.7" />
            <line x1="22" y1="56" x2="42" y2="56" opacity="0.45" />
          </g>
        </svg>
      );
    case "wind":
      return (
        <svg {...common} fill="none" stroke="#7DD3FC" strokeWidth="3" strokeLinecap="round">
          <g className="anim-drift">
            <path d="M8 24h28a7 7 0 1 0-7-7" />
            <path d="M8 34h40a7 7 0 1 1-7 7" opacity="0.7" />
            <path d="M8 44h22" opacity="0.45" />
          </g>
        </svg>
      );
    default:
      return <svg {...common}>{sun}</svg>;
  }
}
