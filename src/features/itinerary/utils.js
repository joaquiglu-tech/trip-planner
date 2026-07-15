// Shared utilities for the itinerary feature

export function toDateStr(d) {
  if (!d) return "";
  return String(d).substring(0, 10);
}

export function formatStopDate(stop) {
  const sd = toDateStr(stop.start_date);
  const ed = toDateStr(stop.end_date);
  if (!sd) return "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const [, smn, sdy] = sd.split("-").map(Number);
  const [, emn, edy] = ed.split("-").map(Number);
  const sm = months[smn - 1],
    em = months[emn - 1];
  if (smn === emn && sdy !== edy) return `${sm} ${sdy}–${edy}`;
  if (smn !== emn) return `${sm} ${sdy} – ${em} ${edy}`;
  return `${sm} ${sdy}`;
}

export function calcNights(stop) {
  const sd = toDateStr(stop.start_date);
  const ed = toDateStr(stop.end_date);
  if (!sd || !ed) return 1;
  const [sy, sm, sday] = sd.split("-").map(Number);
  const [ey, em, eday] = ed.split("-").map(Number);
  return Math.max(
    1,
    Math.round(
      (new Date(ey, em - 1, eday) - new Date(sy, sm - 1, sday)) / 86400000,
    ),
  );
}

export function formatTime(t) {
  if (!t) return "";
  // Handle datetime-local format "2026-07-20T14:00"
  const timePart = t.includes("T") ? t.split("T")[1] : t;
  const [h, m] = timePart.split(":");
  const hour = parseInt(h);
  if (isNaN(hour)) return t;
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

export const TYPE_LABEL_SHORT = {
  stay: "Stay",
  food: "Food",
  activity: "Activity",
  transport: "Transport",
};

export function formatRelativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function itemInStop(it, stopId) {
  return it.stop_ids?.includes(stopId) || false;
}

export function getStay(items, stopId) {
  return items.find(
    (it) =>
      it.type === "stay" &&
      itemInStop(it, stopId) &&
      (it.status === "sel" || it.status === "conf"),
  );
}

// Local calendar date as YYYY-MM-DD (M34). Uses local get*, not toISOString
// (which is UTC and rolls the date near midnight in non-UTC timezones).
export function todayStr(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dateStrToUTC(s) {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// The trip's "home" city is the first stop by convention (used to exclude it
// from route centering and the trip-name label). Single source (M40).
export function homeCityName(stops) {
  return stops?.[0]?.name || "";
}

export function getTodayDayIndex(stops, today = todayStr()) {
  for (let i = 0; i < stops.length; i++) {
    const s = toDateStr(stops[i].start_date);
    const e = toDateStr(stops[i].end_date);
    // Compare date strings, inclusive of both ends (also fixes single-day stops).
    if (s && e && s <= today && today <= e) return i;
  }
  return null;
}

export function getDaysUntilTrip(stops, today = todayStr()) {
  if (!stops.length) return 0;
  const start = toDateStr(stops[0].start_date);
  if (!start) return 0;
  // Both parsed as UTC → no timezone skew, no off-by-one near midnight.
  return Math.round((dateStrToUTC(start) - dateStrToUTC(today)) / 86400000);
}

export function getStopStats(stop, items) {
  const stopItems = items.filter((it) => itemInStop(it, stop.id));
  const stays = stopItems.filter((it) => it.type === "stay");
  const transports = stopItems.filter((it) => it.type === "transport");
  const activities = stopItems.filter((it) => it.type === "activity");
  const food = stopItems.filter((it) => it.type === "food");
  const stayBooked = stays.some((it) => it.status === "conf");
  const staySelected = stays.some(
    (it) => it.status === "sel" || it.status === "conf",
  );
  const transportBooked =
    transports.length === 0 || transports.every((it) => it.status === "conf");
  const actSelected = activities.filter(
    (it) => it.status === "sel" || it.status === "conf",
  ).length;
  const foodSelected = food.filter(
    (it) => it.status === "sel" || it.status === "conf",
  ).length;
  let status = "ready";
  if (
    (stays.length > 0 && !stayBooked) ||
    (transports.length > 0 && !transportBooked)
  )
    status = "critical";
  else if (actSelected === 0 && activities.length > 0) status = "warning";
  return {
    stayBooked,
    staySelected,
    hasTransport: transports.length > 0,
    transportBooked,
    actSelected,
    actTotal: activities.length,
    foodSelected,
    foodTotal: food.length,
    status,
    hasStays: stays.length > 0,
  };
}

export function detectConflicts(items, stops) {
  const stopConflicts = [];
  const itemConflicts = [];
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const aStart = toDateStr(stops[i].start_date);
      const aEnd = toDateStr(stops[i].end_date);
      const bStart = toDateStr(stops[j].start_date);
      const bEnd = toDateStr(stops[j].end_date);
      if (
        aStart &&
        aEnd &&
        bStart &&
        bEnd &&
        aStart <= bEnd &&
        bStart <= aEnd
      ) {
        stopConflicts.push({ stop1: stops[i], stop2: stops[j] });
      }
    }
  }
  const itemsByStop = {};
  items.forEach((it) => {
    if (!it.start_time || !it.end_time) return;
    if (it.status !== "sel" && it.status !== "conf") return;
    (it.stop_ids || []).forEach((sid) => {
      if (!itemsByStop[sid]) itemsByStop[sid] = [];
      itemsByStop[sid].push(it);
    });
  });
  Object.entries(itemsByStop).forEach(([stopId, stopItems]) => {
    for (let i = 0; i < stopItems.length; i++) {
      for (let j = i + 1; j < stopItems.length; j++) {
        const a = stopItems[i],
          b = stopItems[j];
        // M15: only compare items that both carry a full datetime (date+time).
        // Bare times ("14:00") have no day, so comparing them across the
        // multi-day stop produced false conflicts. Full ISO strings compare
        // correctly (date included), so different days won't collide.
        if (!a.start_time.includes("T") || !b.start_time.includes("T"))
          continue;
        if (a.start_time < b.end_time && b.start_time < a.end_time) {
          itemConflicts.push({ item1: a, item2: b, stopId });
        }
      }
    }
  });
  return { stopConflicts, itemConflicts };
}

// Validate a stop's date range (M35). Returns an error string or null.
export function validateStopDates(start, end) {
  if (!start || !end) return "Start and end dates are required.";
  if (end < start) return "End date must be on or after the start date.";
  return null;
}

// Group schedule items into day buckets from a { dateStr: label } map. Items
// whose datetime falls outside the range, or that have no datetime, go into a
// trailing "Unscheduled" group instead of being dumped onto day one (M37).
export function groupScheduleItems(items, dateLabels) {
  const dateKeys = Object.keys(dateLabels || {});
  if (dateKeys.length === 0) return [{ label: null, items }];
  const byDate = {};
  const unscheduled = [];
  items.forEach((it) => {
    const d = it.start_time?.includes("T") ? it.start_time.split("T")[0] : null;
    if (d && dateLabels[d]) (byDate[d] = byDate[d] || []).push(it);
    else unscheduled.push(it);
  });
  if (Object.keys(byDate).length > 0) {
    const groups = [];
    dateKeys.forEach((dk) => {
      if (byDate[dk]?.length)
        groups.push({ label: dateLabels[dk], items: byDate[dk] });
    });
    if (unscheduled.length)
      groups.push({ label: "Unscheduled", items: unscheduled });
    return groups;
  }
  // No dated items — distribute evenly across the day buckets (L18: divide by
  // the number of day buckets, not nights, so the last day isn't left empty).
  const perDay = Math.ceil(items.length / dateKeys.length);
  return dateKeys
    .map((dk, i) => {
      const dayItems = items.slice(i * perDay, (i + 1) * perDay);
      return dayItems.length
        ? { label: dateLabels[dk], items: dayItems }
        : null;
    })
    .filter(Boolean);
}

export function getCalendarDates(stops) {
  if (!stops.length) return [];
  const startStr = toDateStr(stops[0].start_date);
  const endStr = toDateStr(stops[stops.length - 1].end_date);
  if (!startStr || !endStr) return [];
  const dates = [];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const overlapping = stops.filter(
      (s) =>
        dateStr >= toDateStr(s.start_date) && dateStr <= toDateStr(s.end_date),
    );
    const stop = overlapping[0] || null;
    const title =
      overlapping.length > 1
        ? overlapping.map((s) => s.name).join(" / ")
        : stop?.name || "";
    dates.push({
      date: dateStr,
      shortLabel: `${months[d.getMonth()]} ${d.getDate()}`,
      title,
      stop,
      stopIdx: stop ? stops.indexOf(stop) : -1,
      overlapping,
    });
  }
  return dates.filter((cd) => cd.stopIdx >= 0);
}
