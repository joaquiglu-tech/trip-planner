const XOTELO_BASE = "/api/xotelo";

// Whole nights between two YYYY-MM-DD dates, or null if the dates are missing,
// unparseable, or the checkout isn't strictly after the checkin (M03).
export function nightsBetween(checkIn, checkOut) {
  const inMs = Date.parse(checkIn);
  const outMs = Date.parse(checkOut);
  if (Number.isNaN(inMs) || Number.isNaN(outMs)) return null;
  const n = Math.round((outMs - inMs) / 86400000);
  return n > 0 ? n : null;
}

// Pure: turn a Xotelo payload + nights into a price result, or null. Filters
// out rates without a finite `rate` so a bad entry can't poison the total (M03).
export function computeHotelPrice(data, nights) {
  const rateTotal = (r) => Number(r.rate) + (Number(r.tax) || 0);
  const rates = (data?.result?.rates || []).filter((r) =>
    Number.isFinite(Number(r.rate)),
  );
  if (data?.error || rates.length === 0) return null;
  const lowest = rates.reduce(
    (min, r) => (rateTotal(r) < rateTotal(min) ? r : min),
    rates[0],
  );
  const perNight = Math.round(rateTotal(lowest));
  return {
    per_night: perNight,
    total: perNight * nights,
    nights,
    source: lowest.name,
    all_rates: rates.map((r) => ({
      source: r.name,
      per_night: Math.round(rateTotal(r)),
    })),
    currency: data.result.currency || "USD",
  };
}

// Fetch live hotel prices from Xotelo (pulls from Booking.com, Expedia, Agoda, etc.)
export async function fetchHotelPrice(xoteloKey, checkIn, checkOut) {
  if (!xoteloKey) return null;
  const nights = nightsBetween(checkIn, checkOut);
  if (!nights) return null; // invalid/missing/reversed dates → no bogus estimate
  // M46: abort a hung request after 8s so the price loop can't stall forever.
  // NB: `/api/xotelo` is a Vercel serverless function — under `npm run dev` it
  // 404s (use `vercel dev` or the deployed preview for live prices).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `${XOTELO_BASE}?hotel_key=${encodeURIComponent(xoteloKey)}&chk_in=${encodeURIComponent(checkIn)}&chk_out=${encodeURIComponent(checkOut)}`,
      { signal: controller.signal },
    );
    if (!res.ok) {
      console.warn("Xotelo request failed:", res.status);
      return null;
    }
    const data = await res.json();
    return computeHotelPrice(data, nights);
  } catch (err) {
    console.warn("Xotelo API error:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
