# Clima

AI-powered weather for phone, tablet, and desktop. Dark dual layouts, local forecasts, and animated radar — deployed to GitHub Pages on every merge to `main`.

Live: [https://actofrod.github.io/Clima/](https://actofrod.github.io/Clima/)

## What’s in the app

- **Weather (home)** — current conditions, hourly strip, air conditions, 7-day forecast
- **Clima AI** — next-2-hours rain strip (live LibreWXR radar nowcast sampled at your spot, then Open-Meteo 15-minute forecasts), on-device briefing, forecast trust with the Clima local model behind See more, Model Training (Teach Clima) dialog, NWS alerts (US)
- **Radar** — [LibreWXR](https://librewxr.net) real radar composites worldwide with a 1-hour nowcast and selectable palettes; a Radar / Satellite / Both switch adds the animated NOAA GMGSI satellite mosaic (visible by day, infrared at night); NOAA NEXRAD / NASA GPM as fallback
- **Cities / Map / Settings** — saved places, location map, units, privacy

Desktop and tablet use a sidebar shell inspired by the reference dashboard. Phones use a stacked layout with a bottom tab bar.

## Clima AI

Insights run **on-device** (no LLM key, nothing leaves the device):

- **Ensemble honesty** — GEFS members plus NCEP NBM (US) or ECMWF IFS (elsewhere). When models split, Clima shows a range instead of a fake-precise number
- Rain chance is blended from the high-res model, the national blend, and ensemble wet-member fraction
- Clothing, rain timing, UV / air-quality callouts, activity scores
- **Teach Clima** — on-device bias for “felt colder / wetter than this” so the app learns *your* climate, not a national average

### Clima local model (machine learning, on-device)

Clima checks how every major model has actually performed at your spot, then corrects today's forecast accordingly:

1. **Training data.** The last 60 days of what ECMWF, GFS, ICON, GEM, UKMO (and NBM in the US) forecast 0–3 days ahead, from Open-Meteo's previous-runs archive. This is paired with real hourly readings from the nearest airport weather station (METAR/ASOS via the Iowa Environmental Mesonet, within 60 km).
2. **Temperature.** A recency-weighted ridge regression per lead day learns each model's local bias, how much to trust each one, and the time-of-day error pattern. The regularization strength is chosen on the most recent 20% of days, which the model has not seen.
3. **Rain.** A logistic regression turns the models' rain signals into a probability calibrated against what the station actually observed. Its inputs are the models' vote and amounts, each model's own amount, cloud cover, humidity, and a ±2-hour timing window. Because rain hours are rare, the rain model is selected and gated with blocked 5-fold cross-validation over the whole window. On 90 days at eight Michigan airports, it beat the raw model vote at every station for every lead day, by 16–38% on average.
4. **Honesty gate.** A correction is only applied if it beats the plain model average on held-out data. The **Clima Local Model** card shows the error reduction, who Clima trusts, and a skill trend.
5. **Live anchor.** The latest station reading measures today's model error, and that correction fades out over the next few hours.
6. **Gets better over time.** The model retrains every 3 hours on a rolling window, so it follows the seasons. Each training round is logged on-device.

## Free weather APIs

GitHub Pages is a static host, so Clima only calls **no-key, CORS-friendly** APIs from the browser.

| API | Use in Clima | Key | Coverage |
| --- | --- | --- | --- |
| [Open-Meteo](https://open-meteo.com) | Forecast, air quality, geocoding, GEFS ensemble, NBM, IFS, multi-model + previous-runs archive (ML training) | None | Global |
| [api.weather.gov](https://api.weather.gov) | US watches / warnings, nearest US stations | None (User-Agent) | United States |
| [Iowa State IEM](https://mesonet.agron.iastate.edu/) | Airport station observations (ML ground truth), fallback NEXRAD mosaic | None | Global METAR / CONUS radar |
| [LibreWXR](https://librewxr.net) | Radar composites, nowcast, motion arrows, GMGSI satellite (CC-BY-4.0) | None | Global |
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
