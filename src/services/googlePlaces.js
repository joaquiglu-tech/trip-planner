import { supabase, GOOGLE_MAPS_API_KEY as API_KEY } from './supabase';

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
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.currentOpeningHours,places.photos,places.priceLevel',
        },
        body: JSON.stringify({
          textQuery: `${name} ${city}`,
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
      price_level: place.priceLevel || null,
    };

    // Cache in Supabase
    const { error: cacheErr } = await supabase.from('place_cache').upsert(result, { onConflict: 'item_id' });
    if (cacheErr) console.warn('place_cache upsert failed for', itemId, cacheErr);

    // Return with parsed photo_urls for immediate use
    result.photo_urls = photoUrls;

    return result;
  } catch (err) {
    console.warn('Places API error:', err);
    return null;
  }
}

