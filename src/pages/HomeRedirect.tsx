import { Navigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export function HomeRedirect() {
  const { settings } = useApp();
  return (
    <Navigate
      to={settings.defaultPage === "local" ? "/local" : "/weather"}
      replace
    />
  );
}
