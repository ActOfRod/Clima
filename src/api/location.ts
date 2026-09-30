import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export type LocationFailure = "denied" | "off" | "timeout" | "unsupported";

export class LocationError extends Error {
  readonly kind: LocationFailure;
  constructor(kind: LocationFailure, message: string) {
    super(message);
    this.name = "LocationError";
    this.kind = kind;
  }
}

export interface Fix {
  latitude: number;
  longitude: number;
  /** Metres. */
  accuracy: number;
}

const PRECISE = { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 };
const COARSE = { enableHighAccuracy: false, timeout: 8_000, maximumAge: 5 * 60_000 };

function classify(err: unknown): LocationError {
  if (err instanceof LocationError) return err;
  const code = (err as { code?: number | string } | null)?.code;
  const message = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err);
  if (code === 1 || /denied|permission/i.test(message)) {
    return new LocationError("denied", "Location permission is off for Clima.");
  }
  if (code === 3 || /time(d)? ?out/i.test(message)) {
    return new LocationError("timeout", "Finding your location took too long.");
  }
  if (/disabled|not enabled|services/i.test(message)) {
    return new LocationError("off", "Location services are turned off on this device.");
  }
  return new LocationError("off", "Your location is unavailable right now.");
}

async function nativePermission(): Promise<void> {
  let status = await Geolocation.checkPermissions();
  const granted = () => status.location === "granted" || status.coarseLocation === "granted";
  if (!granted()) status = await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
  if (!granted()) throw new LocationError("denied", "Location permission is off for Clima.");
}

async function nativeFix(options: typeof PRECISE): Promise<Fix> {
  const pos = await Geolocation.getCurrentPosition(options);
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
}

function webFix(options: typeof PRECISE): Promise<Fix> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      reject,
      options,
    );
  });
}

/**
 * Current device position. Uses the native plugin in the Android app (proper
 * runtime permission flow) and the browser API on the web. Tries a precise fix
 * first, then a faster network-based one before giving up.
 */
export async function getCurrentFix(): Promise<Fix> {
  const native = Capacitor.isNativePlatform();
  if (!native && !("geolocation" in navigator)) {
    throw new LocationError("unsupported", "This device can't share its location.");
  }
  try {
    if (native) await nativePermission();
    const read = native ? nativeFix : webFix;
    try {
      return await read(PRECISE);
    } catch (err) {
      const failure = classify(err);
      if (failure.kind === "denied") throw failure;
      return await read(COARSE);
    }
  } catch (err) {
    throw classify(err);
  }
}
