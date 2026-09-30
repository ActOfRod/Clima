import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.actofrod.clima",
  appName: "Clima",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b1220",
  },
  plugins: {
    // Android 15+ draws edge to edge; this injects --safe-area-inset-* for index.css.
    SystemBars: {
      insetsHandling: "css",
      style: "DEFAULT",
    },
  },
};

export default config;
