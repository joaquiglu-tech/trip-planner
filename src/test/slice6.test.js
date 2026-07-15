import { describe, it, expect } from "vitest";
import {
  todayStr,
  getTodayDayIndex,
  getDaysUntilTrip,
  detectConflicts,
  validateStopDates,
  groupScheduleItems,
} from "../features/itinerary/utils";

// ── M34: timezone-safe "today" via local date strings ──────────────────────
describe("todayStr", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    // 2026-07-15 just before midnight local — must stay the 15th (not roll to 16 in UTC)
    expect(todayStr(new Date(2026, 6, 15, 23, 30))).toBe("2026-07-15");
    expect(todayStr(new Date(2026, 0, 5, 0, 15))).toBe("2026-01-05");
  });
});

describe("getTodayDayIndex (M34)", () => {
  const stops = [
    { start_date: "2026-07-10", end_date: "2026-07-15" },
    { start_date: "2026-07-15", end_date: "2026-07-20" },
  ];
  it("matches by local date string, inclusive of both ends", () => {
    expect(getTodayDayIndex(stops, "2026-07-12")).toBe(0);
    expect(getTodayDayIndex(stops, "2026-07-20")).toBe(1); // inclusive end
  });
  it("matches a single-day stop (start === end)", () => {
    expect(
      getTodayDayIndex(
        [{ start_date: "2026-07-15", end_date: "2026-07-15" }],
        "2026-07-15",
      ),
    ).toBe(0);
  });
  it("returns null when today is outside every stop", () => {
    expect(getTodayDayIndex(stops, "2026-08-01")).toBeNull();
  });
});

describe("getDaysUntilTrip (M34)", () => {
  const stops = [{ start_date: "2026-07-20", end_date: "2026-07-25" }];
  it("counts whole days from local today to the first start (TZ-safe)", () => {
    expect(getDaysUntilTrip(stops, "2026-07-15")).toBe(5);
    expect(getDaysUntilTrip(stops, "2026-07-20")).toBe(0);
  });
  it("handles no stops", () => {
    expect(getDaysUntilTrip([], "2026-07-15")).toBe(0);
  });
});

// ── M15: conflict detection must not false-positive on bare times ──────────
describe("detectConflicts (M15)", () => {
  const stops = [];
  it("flags overlapping full-datetime items in the same stop", () => {
    const items = [
      {
        id: "a",
        status: "sel",
        stop_ids: ["s1"],
        start_time: "2026-07-20T14:00",
        end_time: "2026-07-20T16:00",
      },
      {
        id: "b",
        status: "sel",
        stop_ids: ["s1"],
        start_time: "2026-07-20T15:00",
        end_time: "2026-07-20T17:00",
      },
    ];
    expect(detectConflicts(items, stops).itemConflicts).toHaveLength(1);
  });
  it("does NOT flag full-datetime items on different days", () => {
    const items = [
      {
        id: "a",
        status: "sel",
        stop_ids: ["s1"],
        start_time: "2026-07-20T14:00",
        end_time: "2026-07-20T16:00",
      },
      {
        id: "b",
        status: "sel",
        stop_ids: ["s1"],
        start_time: "2026-07-21T14:00",
        end_time: "2026-07-21T16:00",
      },
    ];
    expect(detectConflicts(items, stops).itemConflicts).toHaveLength(0);
  });
  it("does NOT flag bare time-only items (no day info)", () => {
    const items = [
      {
        id: "a",
        status: "sel",
        stop_ids: ["s1"],
        start_time: "14:00",
        end_time: "16:00",
      },
      {
        id: "b",
        status: "sel",
        stop_ids: ["s1"],
        start_time: "15:00",
        end_time: "17:00",
      },
    ];
    expect(detectConflicts(items, stops).itemConflicts).toHaveLength(0);
  });
});

// ── M35: stop date validation ──────────────────────────────────────────────
describe("validateStopDates (M35)", () => {
  it("requires both dates", () => {
    expect(validateStopDates("", "2026-07-20")).toBeTruthy();
    expect(validateStopDates("2026-07-20", "")).toBeTruthy();
  });
  it("rejects an inverted range", () => {
    expect(validateStopDates("2026-07-25", "2026-07-20")).toBeTruthy();
  });
  it("accepts a valid range (including equal dates)", () => {
    expect(validateStopDates("2026-07-20", "2026-07-25")).toBeNull();
    expect(validateStopDates("2026-07-20", "2026-07-20")).toBeNull();
  });
});

// ── M37: out-of-range / undated items go to an explicit group, not day one ──
describe("groupScheduleItems (M37)", () => {
  const dateLabels = { "2026-07-20": "Mon Jul 20", "2026-07-21": "Tue Jul 21" };
  it("buckets in-range dated items by day", () => {
    const items = [
      { id: "a", start_time: "2026-07-20T10:00" },
      { id: "b", start_time: "2026-07-21T10:00" },
    ];
    const groups = groupScheduleItems(items, dateLabels);
    expect(groups.map((g) => g.label)).toEqual(["Mon Jul 20", "Tue Jul 21"]);
  });
  it("puts an out-of-range dated item in an Unscheduled group, not day one", () => {
    const items = [
      { id: "a", start_time: "2026-07-20T10:00" },
      { id: "x", start_time: "2026-07-25T10:00" }, // outside range
    ];
    const groups = groupScheduleItems(items, dateLabels);
    const day1 = groups.find((g) => g.label === "Mon Jul 20");
    expect(day1.items.map((i) => i.id)).toEqual(["a"]); // x NOT dumped here
    const unsched = groups.find((g) => g.label === "Unscheduled");
    expect(unsched.items.map((i) => i.id)).toEqual(["x"]);
  });
  it("puts undated items in the Unscheduled group", () => {
    const items = [
      { id: "a", start_time: "2026-07-20T10:00" },
      { id: "u", start_time: "" },
    ];
    const groups = groupScheduleItems(items, dateLabels);
    expect(
      groups.find((g) => g.label === "Unscheduled").items.map((i) => i.id),
    ).toEqual(["u"]);
  });
});
