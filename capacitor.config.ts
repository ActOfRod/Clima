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
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b1220",
    },
  },
};

export default config;
