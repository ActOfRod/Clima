# Clima

AI-powered weather for phone, tablet, and desktop. Dark dual layouts, local forecasts, and animated radar — deployed to GitHub Pages on every merge to `main`.

Live: [https://actofrod.github.io/Clima/](https://actofrod.github.io/Clima/)

## What’s in the app

- **Weather (home)** — current conditions, hourly strip, air conditions, 7-day forecast
- **Local** — on-device Clima AI briefing, forecast trust, teach-Clima feedback, NWS alerts (US)
- **Radar** — HD NOAA NEXRAD in the US; NASA GPM IMERG worldwide (no watermarks)
- **Cities / Map / Settings** — saved places, location map, units, privacy

Desktop and tablet use a sidebar shell inspired by the reference dashboard. Phones use a stacked layout with a bottom tab bar.

## Clima AI

Insights run **on-device** (no LLM key, nothing leaves the device):

- **Ensemble honesty** — GEFS members plus NCEP NBM (US) or ECMWF IFS (elsewhere). When models split, Clima shows a range instead of a fake-precise number
- Rain chance is blended from the high-res model, the national blend, and ensemble wet-member fraction
- Clothing, rain timing, UV / air-quality callouts, activity scores
- **Teach Clima** — on-device bias for “felt colder / wetter than this” so the app learns *your* climate, not a national average

## Free weather APIs

GitHub Pages is a static host, so Clima only calls **no-key, CORS-friendly** APIs from the browser.

| API | Use in Clima | Key | Coverage |
| --- | --- | --- | --- |
| [Open-Meteo](https://open-meteo.com) | Forecast, air quality, geocoding, GEFS ensemble, NBM, IFS | None | Global |
| [api.weather.gov](https://api.weather.gov) | US watches / warnings | None (User-Agent) | United States |
| [Iowa State IEM](https://mesonet.agron.iastate.edu/) | HD NEXRAD reflectivity mosaic | None | CONUS |
| [NASA GIBS / GPM IMERG](https://nasa.gov) | Global precipitation radar | None | Global |
| [Esri Dark Gray](https://www.esri.com) | Dark unlabeled basemap | None | Global |

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
