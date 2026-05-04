import { fetchHotelPrice } from './hotelPrices';

// Extract Xotelo hotel key from TripAdvisor URL
// Pattern: g{location_id}-d{hotel_id} in the URL
export function extractXoteloKey(url) {
  if (!url) return null;
  const match = url.match(/g\d+-d\d+/);
  return match ? match[0] : null;
}

// Fetch estimated cost from Xotelo for a hotel key + dates
// Returns { xotelo_key, estimated_cost, per_night, source, all_rates } or null
export async function fetchStayEstimate(xoteloKey, checkIn, checkOut) {
  if (!xoteloKey || !checkIn || !checkOut) return null;
  try {
    const price = await fetchHotelPrice(xoteloKey, checkIn, checkOut);
    if (!price) return null;
    // Prefer Booking.com or Expedia rates, fallback to lowest
    const preferred = price.all_rates.find(r => r.source === 'Booking.com')
      || price.all_rates.find(r => r.source === 'Expedia')
      || price.all_rates[0];
    return {
      xotelo_key: xoteloKey,
      estimated_cost: preferred ? preferred.per_night : price.per_night,
      per_night: price.per_night,
      source: preferred?.source || price.source,
      all_rates: price.all_rates,
      nights: price.nights,
      total: price.total,
    };
  } catch (err) {
    console.warn('Xotelo fetch failed:', err);
    return null;
  }
}
