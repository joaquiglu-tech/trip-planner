import { fetchPlaceData } from './googlePlaces';

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
