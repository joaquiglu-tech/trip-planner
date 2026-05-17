#!/usr/bin/env node
/**
 * Backfill lat/lng for items missing coordinates.
 * Uses Google Places Text Search API to find each item by "name city".
 *
 * Usage: node scripts/backfill-coords.js
 * Requires: VITE_GOOGLE_MAPS_API_KEY in .env or env var
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env manually to avoid dotenv dependency
const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l && !l.startsWith('#')).map(l => l.split('=')).map(([k, ...v]) => [k.trim(), v.join('=').trim()]));

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://eestsuywkpxddjvyqers.supabase.co';
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;
const API_KEY = env.VITE_GOOGLE_MAPS_API_KEY;

if (!SUPABASE_KEY || !API_KEY) {
  console.error('Missing VITE_SUPABASE_ANON_KEY or VITE_GOOGLE_MAPS_API_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getCoords(name, city) {
  const query = city ? `${name} ${city}` : name;
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.location',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!res.ok) { console.warn(`  API error ${res.status} for "${query}"`); return null; }
  const data = await res.json();
  const place = data.places?.[0];
  if (!place?.location) return null;
  return {
    lat: place.location.latitude,
    lng: place.location.longitude,
    google_place_id: place.id || null,
  };
}

async function main() {
  // Sign in to pass RLS
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'joaquiglu@gmail.com', password: '4360012',
  });
  if (authErr) { console.error('Auth failed:', authErr.message); process.exit(1); }
  console.log('Authenticated.\n');

  // Get stops for city lookup
  const { data: stops } = await supabase.from('stops').select('id, name');
  const stopMap = {};
  (stops || []).forEach(s => { stopMap[s.id] = s.name; });

  // Get items missing lat/lng
  const { data: items, error } = await supabase
    .from('items')
    .select('id, name, type, stop_ids, lat, lng')
    .is('lat', null);

  if (error) { console.error('Failed to fetch items:', error); process.exit(1); }

  const toFix = (items || []).filter(i => i.name);
  console.log(`Found ${toFix.length} items missing coordinates.\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (const item of toFix) {
    const city = item.stop_ids?.[0] ? stopMap[item.stop_ids[0]] || '' : '';

    // Skip transport items — they use origin/dest coords, not item coords
    if (item.type === 'transport') {
      console.log(`SKIP  ${item.name} (transport — uses origin/dest)`);
      skipped++;
      continue;
    }

    const coords = await getCoords(item.name, city);
    if (!coords) {
      console.log(`FAIL  ${item.name} (${city}) — no results`);
      failed++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from('items')
      .update({ lat: coords.lat, lng: coords.lng, google_place_id: coords.google_place_id })
      .eq('id', item.id);

    if (updateErr) {
      console.log(`ERR   ${item.name} — ${updateErr.message}`);
      failed++;
    } else {
      console.log(`OK    ${item.name} (${city}) → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      updated++;
    }

    // Rate limit: 100ms between requests
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${failed} failed.`);
}

main();
