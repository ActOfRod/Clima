import { describe, expect, it } from "vitest";
import { currentPlaceId, pickLocalityName } from "./geocoding";

const admin = (name: string, description: string) => ({ name, description });

describe("pickLocalityName", () => {
  it("names a suburb after itself, not the metro area (Warren, MI)", () => {
    expect(
      pickLocalityName({
        city: "Detroit",
        locality: "Warren",
        localityInfo: {
          administrative: [
            admin("Detroit", "city in and county seat of Wayne County, Michigan"),
            admin("Macomb County", "county in Michigan, United States"),
            admin("Warren", "city in Macomb County, Michigan, United States"),
          ],
        },
      }),
    ).toBe("Warren");
  });

  it("keeps the city when the locality is a borough or district of it", () => {
    expect(
      pickLocalityName({
        city: "New York City",
        locality: "Manhattan",
        localityInfo: { administrative: [admin("Manhattan", "borough of New York City, New York")] },
      }),
    ).toBe("New York City");
    expect(
      pickLocalityName({
        city: "London",
        locality: "City of Westminster",
        localityInfo: { administrative: [admin("City of Westminster", "City and borough in London")] },
      }),
    ).toBe("London");
  });

  it("keeps the city when the locality is a neighborhood with no admin entry", () => {
    expect(pickLocalityName({ city: "Paris", locality: "Saint-Merri", localityInfo: { administrative: [] } })).toBe(
      "Paris",
    );
  });

  it("falls back to whichever name exists", () => {
    expect(pickLocalityName({ city: "", locality: "Annapolis Royal" })).toBe("Annapolis Royal");
    expect(pickLocalityName({ city: "Detroit" })).toBe("Detroit");
    expect(pickLocalityName({})).toBeNull();
  });
});

describe("currentPlaceId", () => {
  it("rounds to ~100 m and is marked as a current-location place", () => {
    expect(currentPlaceId(42.51421, -83.01471)).toBe("current:42.514,-83.015");
    expect(currentPlaceId(42.51421, -83.01471)).toBe(currentPlaceId(42.51438, -83.01462));
  });
});
