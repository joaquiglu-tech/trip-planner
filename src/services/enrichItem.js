import { supabase } from './supabase';
import { fetchPlaceData } from './googlePlaces';

// Auto-enrich a newly added item with external data
// Called after item is saved to DB — updates the item row async
export async function enrichItem(item) {
  const changes = {};

  // Google Places: photos, rating, address, phone, coords, price_level
  if (item.name && item.city) {
    try {
      const place = await fetchPlaceData(item.id, item.name, item.city);
      if (place) {
        if (place.place_id) changes.google_place_id = place.place_id;
        if (place.address && !item.description) changes.description = place.address;
      }
    } catch (err) {
      console.warn('Google Places enrichment failed:', err);
    }
  }

  // Save enrichment to DB if we found anything
  if (Object.keys(changes).length > 0) {
    const { error } = await supabase.from('items').update({
      ...changes,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id);
    if (error) console.warn('enrichItem DB update failed for', item.name, error);
  }

  return changes;
}
