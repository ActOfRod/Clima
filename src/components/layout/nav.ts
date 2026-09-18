import { CloudSun, Layers, Settings, Sparkles } from "lucide-react";
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
  { id: "settings", to: "/settings", label: "Settings", icon: Settings },
];
