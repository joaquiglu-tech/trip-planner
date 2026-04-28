import { supabase } from './supabase';

const API_KEY = 'AIzaSyD7cRriZQE319Gx9x84_HUSD_M9YNbHDWA';

// Search for a place by name + city, return place details
export async function fetchPlaceData(itemId, name, city) {
  // Check cache first
  const { data: cached } = await supabase.from('place_cache').select('*').eq('item_id', itemId).single();
  if (cached && cached.photo_url) return cached;

  try {
    // Use Places API (New) — Text Search
    const searchRes = await fetch(
      `https://places.googleapis.com/v1/places:searchText`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.currentOpeningHours,places.photos',
        },
        body: JSON.stringify({
          textQuery: `${name} ${city} Italy`,
          maxResultCount: 1,
        }),
      }
    );

    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const place = searchData.places?.[0];
    if (!place) return null;

    // Get photo URLs (up to 5 for carousel)
    let photoUrl = '';
    const photoUrls = [];
    if (place.photos?.length > 0) {
      const maxPhotos = Math.min(place.photos.length, 5);
      for (let i = 0; i < maxPhotos; i++) {
        const url = `https://places.googleapis.com/v1/${place.photos[i].name}/media?maxHeightPx=400&maxWidthPx=600&key=${API_KEY}`;
        photoUrls.push(url);
      }
      photoUrl = photoUrls[0];
    }

    const result = {
      item_id: itemId,
      place_id: place.id || '',
      photo_url: photoUrl,
      photo_urls: JSON.stringify(photoUrls),
      rating: place.rating || 0,
      total_ratings: place.userRatingCount || 0,
      address: place.formattedAddress || '',
      phone: place.nationalPhoneNumber || '',
      website: place.websiteUri || '',
      hours: place.currentOpeningHours?.weekdayDescriptions || [],
    };

    // Cache in Supabase
    await supabase.from('place_cache').upsert(result, { onConflict: 'item_id' });

    // Return with parsed photo_urls for immediate use
    result.photo_urls = photoUrls;

    return result;
  } catch (err) {
    console.warn('Places API error:', err);
    return null;
  }
}

// Fetch drive time between two points using Routes API
export async function fetchDriveTime(originLat, originLng, destLat, destLng) {
  try {
    const res = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
          destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
          travelMode: 'DRIVE',
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    const durationSec = parseInt(route.duration?.replace('s', '') || '0');
    const distanceKm = Math.round((route.distanceMeters || 0) / 1000);
    const hours = Math.floor(durationSec / 3600);
    const mins = Math.round((durationSec % 3600) / 60);
    const durationText = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

    return { durationText, distanceKm, durationSec };
  } catch (err) {
    console.warn('Routes API error:', err);
    return null;
  }
}
