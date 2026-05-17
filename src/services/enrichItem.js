import { fetchPlaceData } from './googlePlaces';
import { supabase } from './supabase';

/**
 * One-time backfill: find all items missing lat/lng and enrich them.
 * Call from browser console: import('/src/services/enrichItem.js').then(m => m.backfillCoords())
 */
export async function backfillCoords() {
  const { data: stops } = await supabase.from('stops').select('id, name');
  const stopMap = {};
  (stops || []).forEach(s => { stopMap[s.id] = s.name; });

  const { data: items } = await supabase.from('items').select('id, name, type, stop_ids, lat, lng').is('lat', null);
  const toFix = (items || []).filter(i => i.name && i.type !== 'transport');
  console.log(`Backfill: ${toFix.length} items to process`);

  let ok = 0, fail = 0;
  for (const item of toFix) {
    const city = item.stop_ids?.[0] ? stopMap[item.stop_ids[0]] || '' : '';
    const place = await fetchPlaceData(item.id, item.name, city);
    if (place?.lat && place?.lng) {
      const { error } = await supabase.from('items').update({ lat: place.lat, lng: place.lng, google_place_id: place.place_id || null }).eq('id', item.id);
      if (error) { console.warn(`ERR ${item.name}:`, error.message); fail++; }
      else { console.log(`OK ${item.name} → ${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}`); ok++; }
    } else {
      console.warn(`MISS ${item.name} (${city})`);
      fail++;
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`Done: ${ok} updated, ${fail} failed`);
}

/**
 * Auto-enrich a newly added item with external data.
 * Returns changes object — caller is responsible for persisting via updateItem.
 */
export async function enrichItem(item) {
  const changes = {};

  // Google Places: photos, rating, address, phone, coords, price_level
  if (item.name && item.city) {
    try {
      const place = await fetchPlaceData(item.id, item.name, item.city);
      if (place) {
        if (place.place_id) changes.google_place_id = place.place_id;
        if (place.lat && place.lng) { changes.lat = place.lat; changes.lng = place.lng; }
        if (place.address && !item.description) changes.description = place.address;
      }
    } catch (err) {
      console.warn('Google Places enrichment failed:', err);
    }
  }

  return changes;
}
