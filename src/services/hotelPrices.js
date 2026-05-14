const XOTELO_BASE = '/api/xotelo';

// Fetch live hotel prices from Xotelo (pulls from Booking.com, Expedia, Agoda, etc.)
export async function fetchHotelPrice(xoteloKey, checkIn, checkOut) {
  if (!xoteloKey) return null;
  try {
    const res = await fetch(`${XOTELO_BASE}?hotel_key=${xoteloKey}&chk_in=${checkIn}&chk_out=${checkOut}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error || !data.result?.rates?.length) return null;

    // Find lowest rate
    const rates = data.result.rates;
    const lowest = rates.reduce((min, r) => (r.rate + (r.tax || 0)) < (min.rate + (min.tax || 0)) ? r : min, rates[0]);
    const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
    const perNight = Math.round((lowest.rate + (lowest.tax || 0)));
    const total = perNight * nights;

    return {
      per_night: perNight,
      total,
      nights,
      source: lowest.name,
      all_rates: rates.map(r => ({ source: r.name, per_night: Math.round(r.rate + (r.tax || 0)) })),
      currency: data.result.currency || 'USD',
    };
  } catch (err) {
    console.warn('Xotelo API error:', err);
    return null;
  }
}

