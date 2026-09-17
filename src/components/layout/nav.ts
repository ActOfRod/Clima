import { CloudSun, Layers, Map, MapPinned, Settings, Sparkles } from "lucide-react";
import type { RouteId } from "../../types";

export const NAV: Array<{
  id: RouteId;
  to: string;
  label: string;
  icon: typeof CloudSun;
}> = [
  { id: "home", to: "/", label: "Weather", icon: CloudSun },
  { id: "local", to: "/local", label: "Local", icon: Sparkles },
  { id: "radar", to: "/radar", label: "Radar", icon: Layers },
  { id: "cities", to: "/cities", label: "Cities", icon: MapPinned },
  { id: "map", to: "/map", label: "Map", icon: Map },
  { id: "settings", to: "/settings", label: "Settings", icon: Settings },
];
