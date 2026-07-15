import { describe, it, expect } from "vitest";
import { nightsBetween, computeHotelPrice } from "../services/hotelPrices";

// M03 — nights must be a positive integer or null; never NaN/negative.
describe("nightsBetween (M03)", () => {
  it("counts nights between valid dates", () => {
    expect(nightsBetween("2026-07-20", "2026-07-25")).toBe(5);
  });
  it("returns null for missing/invalid dates", () => {
    expect(nightsBetween(null, "2026-07-25")).toBeNull();
    expect(nightsBetween("2026-07-20", "null")).toBeNull();
    expect(nightsBetween("not-a-date", "2026-07-25")).toBeNull();
  });
  it("returns null when checkout is not after checkin", () => {
    expect(nightsBetween("2026-07-25", "2026-07-20")).toBeNull(); // reversed
    expect(nightsBetween("2026-07-20", "2026-07-20")).toBeNull(); // zero nights
  });
});

describe("computeHotelPrice (M03)", () => {
  const data = (rates, extra = {}) => ({
    result: { rates, currency: "USD", ...extra },
  });

  it("picks the lowest rate incl. tax and totals over nights", () => {
    const r = computeHotelPrice(
      data([
        { name: "Expedia", rate: 100, tax: 20 },
        { name: "Booking.com", rate: 90, tax: 15 },
      ]),
      3,
    );
    expect(r.per_night).toBe(105); // 90 + 15
    expect(r.total).toBe(315); // 105 * 3
    expect(r.source).toBe("Booking.com");
  });

  it("ignores rates with a non-numeric rate (no NaN)", () => {
    const r = computeHotelPrice(
      data([
        { name: "Bad", rate: undefined, tax: 5 },
        { name: "Good", rate: 80, tax: 0 },
      ]),
      2,
    );
    expect(r.per_night).toBe(80);
    expect(Number.isNaN(r.total)).toBe(false);
    expect(r.all_rates).toHaveLength(1);
  });

  it("returns null when there are no usable rates", () => {
    expect(computeHotelPrice(data([]), 3)).toBeNull();
    expect(computeHotelPrice(data([{ name: "X", rate: "abc" }]), 3)).toBeNull();
  });

  it("returns null when the payload carries an error", () => {
    expect(
      computeHotelPrice(
        { error: "nope", result: { rates: [{ name: "X", rate: 10 }] } },
        3,
      ),
    ).toBeNull();
  });
});
