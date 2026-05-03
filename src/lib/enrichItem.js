import { supabase } from './supabase';
import { fetchPlaceData } from './googlePlaces';
import { fetchHotelPrice } from './hotelPrices';

// Auto-enrich a newly added item with external data
// Called after item is saved to DB — updates the item row async
export async function enrichItem(item) {
  const changes = {};

  // 1. Google Places: photos, rating, address, phone, coords, price_level
  if (item.type !== 'transport' && item.name && item.city) {
    try {
      const place = await fetchPlaceData(item.id, item.name, item.city);
      if (place) {
        if (place.place_id) changes.google_place_id = place.place_id;
        if (place.address) changes.description = changes.description || item.description || place.address;
        // Get coords from Google Places if we don't have them
        // Note: Google Places Text Search doesn't return lat/lng directly
        // but the place_cache stores the data for the DetailModal
      }
    } catch (err) {
      console.warn('Google Places enrichment failed:', err);
    }
  }

  // 2. For stays: try to find Xotelo key via TripAdvisor search
  if (item.type === 'stay' && item.name && item.city && !item.xotelo_key) {
    try {
      const key = await findXoteloKey(item.name, item.city);
      if (key) {
        changes.xotelo_key = key;
        // Immediately fetch live price
        const checkIn = getDefaultCheckIn(item.city);
        const checkOut = addDays(checkIn, item.nights || 1);
        const price = await fetchHotelPrice(key, checkIn, checkOut);
        if (price) {
          changes.live_price = price.per_night;
          changes.live_price_source = price.source;
          changes.live_price_updated = new Date().toISOString();
        }
      }
    } catch (err) {
      console.warn('Xotelo enrichment failed:', err);
    }
  }

  // 3. Save enrichment to DB if we found anything
  if (Object.keys(changes).length > 0) {
    await supabase.from('items').update({
      ...changes,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
  }

  return changes;
}

// Search Google for TripAdvisor URL to extract xotelo key
async function findXoteloKey(hotelName, city) {
  try {
    // Use Google Places to find the hotel — if it returns a website that's TripAdvisor, extract the key
    // This is a best-effort approach; won't work for all hotels
    const searchQuery = `${hotelName} ${city} tripadvisor`;
    // We can't do a Google web search from the client.
    // Instead, try Xotelo's rates endpoint with a known TripAdvisor pattern.
    // For now, this is a placeholder — xotelo_key must be set manually or via the edit modal.
    return null;
  } catch {
    return null;
  }
}

// City-based default check-in dates
const CITY_CHECK_IN = {
  'Rome': '2026-07-20', 'Florence': '2026-07-24', 'Montepulciano': '2026-07-25',
  "Val d'Orcia": '2026-07-26', 'Lerici': '2026-07-27', 'Bergamo Alta': '2026-07-28',
  'Bellagio': '2026-07-29', 'Sirmione': '2026-07-30', 'Verona': '2026-07-31', 'Venice': '2026-08-01',
};

function getDefaultCheckIn(city) { return CITY_CHECK_IN[city] || '2026-07-20'; }

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
