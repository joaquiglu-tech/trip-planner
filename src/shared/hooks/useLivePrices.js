import { useState, useEffect } from 'react';
import { fetchHotelPrice } from '../../services/hotelPrices';

// Fetch live hotel prices for stays with xotelo_key
// staysWithKeys: items filtered to type=stay with xotelo_key
// stopsData: stops array for date lookup
export function useLivePrices(staysWithKeys, stopsData) {
  const [livePrices, setLivePrices] = useState({});

  useEffect(() => {
    if (!staysWithKeys.length || !stopsData.length) return;
    let cancelled = false;

    (async () => {
      for (const stay of staysWithKeys) {
        if (cancelled) break;
        try {
          const dates = getStayDates(stay, stopsData);
          const price = await fetchHotelPrice(stay.xotelo_key, dates.checkIn, dates.checkOut);
          if (!cancelled && price) {
            setLivePrices(prev => ({ ...prev, [stay.id]: { perNight: price.per_night, source: price.source, allRates: price.all_rates } }));
          }
        } catch { /* skip */ }
        await new Promise(r => setTimeout(r, 500));
      }
    })();

    return () => { cancelled = true; };
  }, [staysWithKeys.length, stopsData.length]);

  return livePrices;
}

function getStayDates(stay, stops) {
  const firstStopId = stay.stop_ids?.[0];
  if (firstStopId) {
    const byId = stops.find(s => s.id === firstStopId);
    if (byId) return { checkIn: String(byId.start_date).substring(0, 10), checkOut: String(byId.end_date).substring(0, 10) };
  }
  const stop = stops.find(s => s.name === stay.city || s.name?.includes(stay.city));
  if (stop) return { checkIn: String(stop.start_date).substring(0, 10), checkOut: String(stop.end_date).substring(0, 10) };
  if (stops.length > 0) return { checkIn: String(stops[0].start_date).substring(0, 10), checkOut: String(stops[stops.length - 1].end_date).substring(0, 10) };
  return { checkIn: '2026-07-20', checkOut: '2026-08-02' };
}
