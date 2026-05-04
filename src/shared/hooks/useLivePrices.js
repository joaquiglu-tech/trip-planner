import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { fetchHotelPrice } from '../../services/hotelPrices';

// Fetches live hotel prices for all stays with xotelo_key.
// Writes estimated_cost back to DB so it's always fresh.
// Re-fetches when stop dates change.
export function useLivePrices(staysWithKeys, stops) {
  const [livePrices, setLivePrices] = useState({});

  const stopsDateKey = useMemo(() =>
    (stops || []).map(s => `${s.id}:${s.start_date}:${s.end_date}`).join(','),
  [stops]);

  // Key that changes when stays list changes (new item added, key updated)
  const staysKey = useMemo(() =>
    staysWithKeys.map(s => `${s.id}:${s.xotelo_key}`).join(','),
  [staysWithKeys]);

  useEffect(() => {
    if (!staysWithKeys.length || !stops.length) return;
    let cancelled = false;

    (async () => {
      for (const stay of staysWithKeys) {
        if (cancelled) break;
        try {
          const dates = getStayDates(stay, stops);
          const price = await fetchHotelPrice(stay.xotelo_key, dates.checkIn, dates.checkOut);
          if (cancelled) break;
          if (price) {
            const perNight = price.per_night;
            const total = price.total;

            // Update React state for live display
            setLivePrices(prev => ({ ...prev, [stay.id]: {
              perNight, total, nights: price.nights, source: price.source, allRates: price.all_rates,
              lastUpdated: new Date().toISOString(),
            }}));

            // Write estimated_cost to DB if it changed
            if (total !== Number(stay.estimated_cost || 0)) {
              await supabase.from('items').update({
                estimated_cost: total,
                updated_at: new Date().toISOString(),
              }).eq('id', stay.id);
            }
          }
        } catch { /* skip individual hotel errors */ }
        await new Promise(r => setTimeout(r, 500));
      }
    })();

    return () => { cancelled = true; };
  }, [staysKey, stopsDateKey]);

  return livePrices;
}

function getStayDates(stay, stops) {
  const firstStopId = stay.stop_ids?.[0];
  if (firstStopId) {
    const byId = stops.find(s => s.id === firstStopId);
    if (byId) return { checkIn: String(byId.start_date).substring(0, 10), checkOut: String(byId.end_date).substring(0, 10) };
  }
  if (stops.length > 0) return { checkIn: String(stops[0].start_date).substring(0, 10), checkOut: String(stops[stops.length - 1].end_date).substring(0, 10) };
  return { checkIn: '2026-07-20', checkOut: '2026-08-02' };
}
