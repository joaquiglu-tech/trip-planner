import { describe, it, expect } from "vitest";
import {
  formatStopDate,
  formatTime,
  formatRelativeTime,
  getStay,
  getCalendarDates,
} from "../features/itinerary/utils";

// L25 / L26 — date-range formatting edge cases
describe("formatStopDate", () => {
  it("shows a single day when there is no end date (L25)", () => {
    expect(formatStopDate({ start_date: "2026-07-20", end_date: null })).toBe(
      "Jul 20",
    );
    expect(formatStopDate({ start_date: "2026-07-20" })).toBe("Jul 20");
  });
  it("includes years across a year boundary (L26)", () => {
    expect(
      formatStopDate({ start_date: "2026-12-30", end_date: "2027-01-02" }),
    ).toBe("Dec 30, 2026 – Jan 2, 2027");
  });
  it("same-month range", () => {
    expect(
      formatStopDate({ start_date: "2026-07-20", end_date: "2026-07-25" }),
    ).toBe("Jul 20–25");
  });
  it("cross-month, same year", () => {
    expect(
      formatStopDate({ start_date: "2026-07-30", end_date: "2026-08-02" }),
    ).toBe("Jul 30 – Aug 2");
  });
});

// L27 — time without minutes
describe("formatTime", () => {
  it("formats datetime-local", () => {
    expect(formatTime("2026-07-20T14:00")).toBe("2:00 PM");
  });
  it("defaults minutes to 00 when missing (L27)", () => {
    expect(formatTime("14")).toBe("2:00 PM");
  });
  it("pads single-digit minutes", () => {
    expect(formatTime("09:5")).toBe("9:05 AM");
  });
  it('empty → ""', () => {
    expect(formatTime("")).toBe("");
  });
});

// L28 — invalid timestamp
describe("formatRelativeTime", () => {
  it('returns "" for an invalid/empty timestamp (L28)', () => {
    expect(formatRelativeTime("not-a-date")).toBe("");
    expect(formatRelativeTime("")).toBe("");
  });
});

// L24 — deterministic stay pick (confirmed first)
describe("getStay", () => {
  it("prefers a confirmed stay over a selected one", () => {
    const items = [
      { id: "a", type: "stay", status: "sel", stop_ids: ["s1"] },
      { id: "b", type: "stay", status: "conf", stop_ids: ["s1"] },
    ];
    expect(getStay(items, "s1").id).toBe("b");
  });
});

// L22 — calendar spans min-start .. max-end even if stops are unsorted
describe("getCalendarDates (L22)", () => {
  it("uses the earliest start and latest end regardless of order", () => {
    const stops = [
      { id: "s2", name: "B", start_date: "2026-07-24", end_date: "2026-07-26" },
      { id: "s1", name: "A", start_date: "2026-07-20", end_date: "2026-07-22" },
    ];
    const dates = getCalendarDates(stops);
    expect(dates[0].date).toBe("2026-07-20");
    expect(dates[dates.length - 1].date).toBe("2026-07-26");
  });
});
