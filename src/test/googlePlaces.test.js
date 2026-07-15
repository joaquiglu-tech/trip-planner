import { describe, it, expect } from "vitest";
import { parsePlaceResults } from "../services/googlePlaces";

// M38/M27 — shared parser for the Places searchText response. Coords normalize
// to null (never undefined) so downstream never saves undefined lat/lng.
describe("parsePlaceResults", () => {
  it("maps the Places response to the app shape", () => {
    const data = {
      places: [
        {
          id: "p1",
          displayName: { text: "Hotel Roma" },
          formattedAddress: "Rome, Italy",
          location: { latitude: 41.9, longitude: 12.5 },
        },
      ],
    };
    expect(parsePlaceResults(data)).toEqual([
      {
        placeId: "p1",
        name: "Hotel Roma",
        address: "Rome, Italy",
        lat: 41.9,
        lng: 12.5,
      },
    ]);
  });

  it("normalizes a missing location to null coords (not undefined)", () => {
    const data = { places: [{ id: "p2", displayName: { text: "No Coords" } }] };
    const [r] = parsePlaceResults(data);
    expect(r.lat).toBeNull();
    expect(r.lng).toBeNull();
  });

  it("preserves a real 0 coordinate", () => {
    const data = {
      places: [{ id: "p3", location: { latitude: 0, longitude: 0 } }],
    };
    const [r] = parsePlaceResults(data);
    expect(r.lat).toBe(0);
    expect(r.lng).toBe(0);
  });

  it("returns [] for empty/missing payloads", () => {
    expect(parsePlaceResults({})).toEqual([]);
    expect(parsePlaceResults(null)).toEqual([]);
    expect(parsePlaceResults({ places: [] })).toEqual([]);
  });
});
