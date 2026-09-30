export function PrivacyPage() {
  return (
    <article className="card mx-auto max-w-2xl space-y-4 p-6 text-sm leading-relaxed text-muted">
      <h1 className="text-2xl font-semibold text-ink">Privacy</h1>
      <p>
        Clima has no accounts, no ads, and no analytics. The app talks directly to public weather
        services from your device; the developer runs no servers that receive your data.
      </p>
      <p>
        If you allow location, Clima reads your position each time it opens to show the weather
        where you are. Your coordinates are sent to Open-Meteo (forecasts, air quality, past model
        runs), BigDataCloud (your town's name), and in the US the National Weather Service (alerts,
        nearest station). Readings from the nearest airport station come from the Iowa Environmental
        Mesonet. Radar, satellite, and map tiles for the area on screen come from LibreWXR, Esri,
        and NASA GIBS. Clima never tracks your location in the background.
      </p>
      <p>
        Settings, saved cities, Teach Clima notes, and the forecast model Clima trains for your area
        stay in local storage on this device and are never uploaded. Uninstalling or clearing the
        app's storage deletes them.
      </p>
      <p>
        These services receive your IP address and standard request details under their own
        policies. Clima does not sell or share your data with anyone else.
      </p>
      <p>
        Full policy:{" "}
        <a className="text-accent" href="https://actofrod.github.io/Clima/privacy/">
          actofrod.github.io/Clima/privacy
        </a>
      </p>
    </article>
  );
}
