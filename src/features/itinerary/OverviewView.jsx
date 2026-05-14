import { useMemo } from 'react';
import { $f, itemCost } from '../../shared/hooks/useItems';
import { RouteMap } from './MapComponents';
import { formatStopDate, calcNights, formatRelativeTime, getStay, getStopStats, detectConflicts } from './utils';

export default function OverviewView({ items, stops, expenses, onItemTap, onDaySelect }) {
  const daysLeft = useMemo(() => {
    if (!stops || !stops.length) return 0;
    return Math.ceil((new Date(stops[0].start_date) - new Date()) / 86400000);
  }, [stops]);

  // Same calculation as BudgetSummary for consistency
  const stats = useMemo(() => {
    let selTotal = 0, confTotal = 0;
    items.forEach(it => {
      if (it.status !== 'sel' && it.status !== 'conf') return;
      if (it.status === 'conf') {
        const exp = (expenses || []).filter(e => e.item_id === it.id).reduce((s, e) => s + Number(e.amount || 0), 0);
        selTotal += exp > 0 ? exp : itemCost(it);
      } else {
        selTotal += itemCost(it);
      }
    });
    (expenses || []).forEach(e => { confTotal += Number(e.amount || 0); });
    return { estimated: selTotal, confirmed: confTotal };
  }, [items, expenses]);

  const recentItems = useMemo(() =>
    items.filter(it => it.status && it.updated_by)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 8),
  [items]);

  const { stopConflicts } = useMemo(() => detectConflicts(items, stops), [items, stops]);

  if (!stops || stops.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No stops yet</div>
        <div className="empty-state-text">Add your first destination to start planning</div>
      </div>
    );
  }

  return (
    <>
      {daysLeft > 0 && (
        <div className="home-header">
          <div className="home-trip-name">{(() => {
            const homeCity = stops.length > 0 ? stops[0].name : '';
            const tripStops = stops.filter(s => s.name !== homeCity);
            return tripStops.length > 1 ? `${tripStops[0]?.name} to ${tripStops[tripStops.length - 1]?.name}` : (tripStops[0]?.name || 'Trip');
          })()}</div>
          <div className="home-countdown">{daysLeft} days away</div>
        </div>
      )}
      <div className="home-stats">
        <div className="home-stat"><div className="home-stat-num">{$f(stats.estimated)}</div><div className="home-stat-label">Estimated</div></div>
        <div className="home-stat"><div className="home-stat-num" style={{ color: 'var(--green)' }}>{$f(stats.confirmed)}</div><div className="home-stat-label">Confirmed</div></div>
      </div>
      {stopConflicts.length > 0 && (
        <div className="conflict-banner">
          {stopConflicts.map((c, i) => (
            <div key={i} className="conflict-item">Date overlap: {c.stop1.name} and {c.stop2.name}</div>
          ))}
        </div>
      )}
      <div className="itin-map-schedule">
        <div className="itin-map-col">
          <div className="itin-col-header">
            <div className="itin-section-title" style={{ margin: 0 }}>Route</div>
            {(() => {
              const homeCity = stops.length > 0 ? stops[0].name : '';
              const tripStops = stops.filter(s => s.lat && s.lng && s.name !== homeCity);
              const mapsUrl = tripStops.length > 1
                ? `https://www.google.com/maps/dir/${tripStops.map(s => `${s.lat},${s.lng}`).join('/')}`
                : null;
              return mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener" className="itin-maps-btn itin-maps-btn-sm">Open in Google Maps</a> : null;
            })()}
          </div>
          <RouteMap stops={stops} items={items} />
        </div>
        <div className="itin-schedule-col">
          <div className="itin-col-header">
            <div className="itin-section-title" style={{ margin: 0 }}>Recent activity</div>
          </div>
          {recentItems.length > 0 ? (
            <div className="itin-schedule-scroll">
              {recentItems.map(r => (
                <div key={r.id} className="itin-recent-row">
                  <span className="itin-recent-who">{(r.updated_by || '').split('@')[0]}</span>
                  <span className="itin-recent-action">{r.status === 'conf' ? 'booked' : r.status === 'sel' ? 'added' : 'updated'}</span>
                  <span className="itin-recent-name">{r.name}</span>
                  <span className="itin-recent-time">{formatRelativeTime(r.updated_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>No recent activity</div>
          )}
        </div>
      </div>
      <div className="home-section-title">Your destinations</div>
      <div className="home-destinations">
        {stops.map((stop, idx) => {
          const ss = getStopStats(stop, items);
          const nights = calcNights(stop);
          const stay = getStay(items, stop.id);
          return (
            <div key={stop.id} className={`home-dest-card home-dest-${ss.status}`} onClick={() => onDaySelect(idx)}>
              <div className="home-dest-top">
                <div>
                  <div className="home-dest-name">{stop.name}</div>
                  <div className="home-dest-dates">{formatStopDate(stop)}{nights > 1 ? ` · ${nights}n` : ''}</div>
                </div>
                <div className="home-dest-indicator">
                  {ss.status === 'ready' && <span className="home-flag ready">✓</span>}
                  {ss.status === 'critical' && <span className="home-flag critical">!</span>}
                  {ss.status === 'warning' && <span className="home-flag warning">—</span>}
                </div>
              </div>
              <div className="home-dest-statuses">
                {ss.hasStays && <span className={`home-dest-status ${ss.stayBooked ? 'booked' : ss.staySelected ? 'selected' : 'missing'}`}>{ss.stayBooked ? '✓' : ss.staySelected ? '●' : '!'} {stay?.name || 'Stay'}</span>}
                {ss.hasTransport && <span className={`home-dest-status ${ss.transportBooked ? 'booked' : 'missing'}`}>{ss.transportBooked ? '✓' : '!'} Transport</span>}
                {ss.actTotal > 0 && <span className={`home-dest-status ${ss.actSelected > 0 ? 'selected' : ''}`}>{ss.actSelected}/{ss.actTotal} Activities</span>}
                {ss.foodTotal > 0 && <span className={`home-dest-status ${ss.foodSelected > 0 ? 'selected' : ''}`}>{ss.foodSelected}/{ss.foodTotal} Food</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
