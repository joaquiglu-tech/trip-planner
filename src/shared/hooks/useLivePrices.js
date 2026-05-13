import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { fetchHotelPrice } from '../../services/hotelPrices';

export function useLivePrices(staysWithKeys, stops) {
  const [livePrices, setLivePrices] = useState({});
  const fetchedRef = useRef(new Set());

  const stopsDateKey = useMemo(() =>
    (stops || []).map(s => `${s.id}:${s.start_date}:${s.end_date}`).join(','),
  [stops]);

  const staysKey = useMemo(() =>
    staysWithKeys.map(s => `${s.id}:${s.xotelo_key}`).join(','),
  [staysWithKeys]);

  useEffect(() => {
    if (!staysWithKeys.length || !stops.length) return;

    // Reset fetched set when deps change (dates changed, new stays)
    fetchedRef.current = new Set();
    let cancelled = false;

    async function fetchAll() {
      for (const stay of staysWithKeys) {
        if (cancelled) break;

        // Skip if already fetched this session with same key
        const fetchKey = `${stay.id}:${stay.xotelo_key}:${stopsDateKey}`;
        if (fetchedRef.current.has(fetchKey)) continue;

        try {
          const dates = getStayDates(stay, stops);
          if (!dates) continue;
          const price = await fetchHotelPrice(stay.xotelo_key, dates.checkIn, dates.checkOut);
          if (cancelled) break;

          if (price) {
            const perNight = price.per_night;
            const total = price.total;
            fetchedRef.current.add(fetchKey);

            setLivePrices(prev => ({ ...prev, [stay.id]: {
              perNight, total, nights: price.nights, source: price.source,
              allRates: price.all_rates, lastUpdated: new Date().toISOString(),
            }}));

            // Write to DB
            if (total !== Number(stay.estimated_cost || 0)) {
              const { error } = await supabase.from('items').update({
                estimated_cost: total,
                updated_at: new Date().toISOString(),
                updated_by: 'xotelo-sync',
              }).eq('id', stay.id);
              if (error) console.warn('Failed to update estimated_cost for', stay.name, error);
            }
          }
        } catch (err) {
          console.warn('Xotelo fetch error for', stay.name, err);
        }
        await new Promise(r => setTimeout(r, 500));
      }
    }

    fetchAll();
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
  return null;
}
