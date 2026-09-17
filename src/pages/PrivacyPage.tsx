export function PrivacyPage() {
  return (
    <article className="card mx-auto max-w-2xl space-y-4 p-6 text-sm leading-relaxed text-[#c5d0e0]">
      <h1 className="text-2xl font-semibold text-white">Privacy</h1>
      <p>
        Clima is a client-side weather app. Forecasts, air quality, geocoding, radar, and US
        alerts are requested directly from public weather APIs by your device.
      </p>
      <p>
        If you allow location, the coordinates stay on your device and are used only to reverse
        geocode a place name and fetch weather for that point. Saved cities, unit preferences, and
        the last viewed place are stored in local browser storage.
      </p>
      <p>
        Clima AI does not send your data to a language-model provider. Insights are computed locally
        from the forecast payload.
      </p>
      <p>
        We do not run our own analytics, ads, or accounts. Third-party APIs (Open-Meteo, National
        Weather Service, RainViewer, CARTO/OSM) may log standard request metadata according to their
        own policies.
      </p>
    </article>
  );
}
