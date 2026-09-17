# Atmospheric Weather

Premium, interactive weather dashboard — Next.js + TypeScript + Tailwind + Motion + React Three Fiber + Recharts + Lucide + Zod + date-fns. Data via the Visual Crossing Timeline API through a server-side proxy (key never reaches the browser).

## Setup

```bash
npm install
cp .env.example .env   # then set VISUAL_CROSSING_API_KEY
npm run dev
```

Open http://localhost:3000. Without a key, dev mode serves a clearly-marked demo payload (`demo: true`); production without a key returns a friendly error.

## Deploy (Vercel)

1. Import the repo, framework preset Next.js.
2. Add environment variable `VISUAL_CROSSING_API_KEY` (Production + Preview). Never use a `NEXT_PUBLIC_` prefix.
3. Deploy. No extra config needed.

## Scripts

- `npm run dev` / `build` / `start` / `lint`
- `npm test` — unit tests for condition mapping, units, mood, and previous/next-24h transform

## API

`GET /api/weather?location=Ahmedabad` or `?lat=..&lon=..` → `{ location, current, previous24Hours[24], next24Hours[24], sunrise, sunset, timezone, updatedAt }`.
