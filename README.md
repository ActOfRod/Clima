# Clima

AI-powered weather for phone, tablet, and desktop. Dark dual layouts, local forecasts, and animated radar — deployed to GitHub Pages on every merge to `main`.

Live: [https://actofrod.github.io/Clima/](https://actofrod.github.io/Clima/)

## What’s in the app

- **Weather (home)** — current conditions, hourly strip, air conditions, 7-day forecast
- **Local** — on-device Clima AI briefing, NWS alerts (US), humidity, dew point, pressure, sun times
- **Radar** — RainViewer frames with smooth playback and nowcast
- **Cities / Map / Settings** — saved places, location map, units, privacy

Desktop and tablet use a sidebar shell inspired by the reference dashboard. Phones use a stacked layout with a bottom tab bar.

## Clima AI

Insights run **on-device** from the forecast (no LLM key, nothing leaves the device):

- Natural-language briefing and clothing
- Rain timing and best outdoor window
- UV / air-quality / trend callouts
- Activity scores (run, hang, photo, commute)

## Free weather APIs

GitHub Pages is a static host, so Clima only calls **no-key, CORS-friendly** APIs from the browser.

| API | Use in Clima | Key | Coverage |
| --- | --- | --- | --- |
| [Open-Meteo](https://open-meteo.com) | Forecast, air quality, geocoding | None | Global |
| [api.weather.gov](https://api.weather.gov) | US watches / warnings | None (User-Agent) | United States |
| [RainViewer](https://www.rainviewer.com/api.html) | Radar + nowcast tiles | None | Global radar mosaic |
| [CARTO / OSM](https://carto.com) | Dark basemap | None | Global |

Other free or free-tier APIs reviewed, **not wired** (key, CORS, or region limits):

- MET Norway (`api.met.no`) — excellent, requires identifying User-Agent; CORS is awkward in the browser
- Bright Sky / DWD — Germany
- Environment Canada GeoMet — Canada
- 7Timer, wttr.in — simple, weaker models
- OpenWeatherMap, WeatherAPI, Weatherbit, Visual Crossing, Tomorrow.io, AccuWeather, Pirate Weather — free tiers **need API keys** (unsafe to embed on Pages)
- NASA POWER, OpenAQ — climate / air quality, not a full forecast UI

## Develop

```bash
npm install
npm run dev
npm test
npm run build
```

## Deploy (GitHub Pages)

Pages is enabled on this repo (`github-pages` environment, workflow source).
`.github/workflows/deploy.yml` builds and publishes on every push to `main`.

## Android / Play Store

The web app is a PWA and a Capacitor shell (`com.actofrod.clima`).

```bash
npm run android:sync
npx cap add android   # first time only
npx cap open android
```

Then in Android Studio: generate a signed **AAB**, create a Play Console listing, and point privacy policy at `https://actofrod.github.io/Clima/privacy`.

Play Console itself (store listing, signing key, review) has to be done in Google’s UI.
