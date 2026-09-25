import { describe, expect, it } from "vitest";
import { iemNetwork, parseIemCsv } from "./observations";

describe("parseIemCsv", () => {
  const csv = [
    "station,valid,tmpf,p01i,wxcodes",
    "NYC,2026-09-20 00:51,68.00,0.00,null",
    "NYC,2026-09-20 01:51,50.00,0.12,-RA",
    "NYC,2026-09-20 02:20,55.00,0.00,VCSH",
    "NYC,2026-09-20 02:51,59.00,0.00,VCSH",
    "NYC,2026-09-20 03:51,null,0.0001,null",
    "NYC,2026-09-20 04:51,60.00,0.00,+TSRA BR",
  ].join("\n");
  const obs = parseIemCsv(csv);

  it("assigns :51 reports to the next top of hour and converts to °C", () => {
    expect(obs.get("2026-09-20T01")?.temp).toBeCloseTo(20, 5);
    expect(obs.get("2026-09-20T02")?.temp).toBeCloseTo(10, 5);
  });

  it("keeps the report closest to the hour", () => {
    expect(obs.get("2026-09-20T03")?.temp).toBeCloseTo(15, 5);
  });

  it("flags rain from precip totals or present-weather codes, not vicinity showers or trace", () => {
    expect(obs.get("2026-09-20T02")?.wet).toBe(true);
    expect(obs.get("2026-09-20T03")?.wet).toBe(false);
    expect(obs.get("2026-09-20T04")?.wet).toBe(false);
    expect(obs.get("2026-09-20T05")?.wet).toBe(true);
  });

  it("keeps hours with missing temperature", () => {
    expect(obs.get("2026-09-20T04")?.temp).toBeNull();
  });
});

describe("iemNetwork", () => {
  it("maps countries and Canadian provinces to IEM ASOS networks", () => {
    expect(iemNetwork({ id: "x", name: "London", countryCode: "GB", latitude: 51.5, longitude: 0 })).toBe("GB__ASOS");
    expect(
      iemNetwork({ id: "y", name: "Toronto", admin: "Ontario", countryCode: "CA", latitude: 43.7, longitude: -79.4 }),
    ).toBe("CA_ON_ASOS");
    expect(iemNetwork({ id: "z", name: "?", latitude: 0, longitude: 0 })).toBeNull();
  });
});
