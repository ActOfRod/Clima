import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import { RadarMap } from "../components/radar/RadarMap";
import { SearchBar } from "../components/weather/SearchBar";
import { useApp } from "../context/AppContext";
import { useIsDesktop } from "../hooks/useMediaQuery";
import "leaflet/dist/leaflet.css";

const pin = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:999px;background:#3b9bff;box-shadow:0 0 0 8px rgba(59,155,255,.25)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function MapPage() {
  const { place } = useApp();
  const desktop = useIsDesktop();
  return (
    <div className="flex flex-col gap-4">
      <SearchBar />
      <div>
        <h1 className="text-2xl font-semibold">Map</h1>
        <p className="text-sm text-[#8b9cb3]">
          {place.name} · {place.latitude.toFixed(3)}, {place.longitude.toFixed(3)}
        </p>
      </div>
      <div
        className="overflow-hidden rounded-[28px] ring-1 ring-white/10"
        style={{ height: desktop ? 280 : 200 }}
      >
        <MapContainer
          center={[place.latitude, place.longitude]}
          zoom={8}
          className="h-full w-full"
          key={`${place.latitude}-${place.longitude}`}
        >
          <TileLayer
            attribution="&copy; OSM &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <Marker position={[place.latitude, place.longitude]} icon={pin} />
        </MapContainer>
      </div>
      <RadarMap height={desktop ? "52vh" : "46vh"} />
    </div>
  );
}
