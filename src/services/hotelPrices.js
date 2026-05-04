import { supabase } from './supabase';

const XOTELO_BASE = 'https://data.xotelo.com/api/rates';

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

// Fetch and update live prices for all stays that have xotelo_key
export async function refreshHotelPrices(items) {
  const stays = items.filter(it => it.type === 'stay' && it.xotelo_key);
  const results = {};

  for (const stay of stays) {
    // Determine check-in/out from day assignment or use trip dates
    const checkIn = stay.check_in_date || '2026-07-20'; // fallback
    const checkOut = stay.check_out_date || '2026-07-24';

    const price = await fetchHotelPrice(stay.xotelo_key, checkIn, checkOut);
    if (price) {
      results[stay.id] = price;
      // Update the items table with live price
      await supabase.from('items').update({
        live_price: price.per_night,
        live_price_source: price.source,
        live_price_updated: new Date().toISOString(),
      }).eq('id', stay.id);
    }
    // Small delay to be polite to the API
    await new Promise(r => setTimeout(r, 300));
  }

  return results;
}
