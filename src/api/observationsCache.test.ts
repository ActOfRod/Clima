import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchObservations } from "./observations";

const STATION = { id: "KDET", name: "Detroit City", latitude: 42.4, longitude: -83.0, distanceKm: 9 };
const NOW = new Date(Date.UTC(2026, 8, 30, 12, 0));

function csv(hours: string[]): string {
  return ["station,valid,tmpf,p01i,wxcodes", ...hours.map((h) => `DET,${h}:51,50.00,0.00,null`)].join("\n");
}

describe("fetchObservations cache", () => {
  const store = new Map<string, string>();
  const calls: string[] = [];

  beforeEach(() => {
    store.clear();
    calls.length = 0;
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("downloads the full window once, then only the recent days", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return new Response(csv(["2026-09-01 10", "2026-09-29 10"]), { status: 200 });
    });
    const first = await fetchObservations(STATION, 60, NOW);
    expect(first.size).toBe(2);
    expect(new URL(calls[0]).searchParams.get("month1")).toBe("8");
    expect(new URL(calls[0]).searchParams.getAll("report_type")).toEqual(["3"]);

    const later = new Date(NOW.getTime() + 3 * 3_600_000);
    await fetchObservations(STATION, 60, later);
    const second = new URL(calls[1]).searchParams;
    expect(second.get("month1")).toBe("9");
    expect(second.get("day1")).toBe("28");
  });

  it("returns cached readings when the archive fails", async () => {
    vi.stubGlobal("fetch", async () => new Response(csv(["2026-09-29 10"]), { status: 200 }));
    await fetchObservations(STATION, 60, NOW);
    vi.stubGlobal("fetch", async () => new Response("slow down", { status: 503 }));
    const obs = await fetchObservations(STATION, 60, new Date(NOW.getTime() + 3_600_000));
    expect(obs.get("2026-09-29T11")?.temp).toBeCloseTo(10, 5);
  }, 15_000);

  it("fails when there is nothing cached to fall back on", async () => {
    vi.stubGlobal("fetch", async () => new Response("bad", { status: 400 }));
    await expect(fetchObservations(STATION, 60, NOW)).rejects.toThrow();
  });
});
