import { useState, useMemo } from 'react';
import { toDateStr, formatStopDate, calcNights, itemInStop, getStay } from './utils';
import { DayMap } from './MapComponents';
import ScheduleList from './ScheduleList';
import PlanSection from './PlanSection';
import AddItemModal from '../../shared/modals/AddItemModal';

// Helper: extract date part from datetime-local string
function getItemDate(startTime) {
  if (!startTime) return null;
  return startTime.includes('T') ? startTime.split('T')[0] : null;
}

// selectedDate: optional YYYY-MM-DD for date-mode filtering
// combinedStopIds: optional array of stop IDs for date-mode combined view
export default function StopSection({ stop, items, onItemTap, places, statusFilter, updateStop, deleteStop, updateItem, addItem, stops, showTitle, selectedDate, combinedStopIds, livePrices, expenseMap }) {
  const [editing, setEditing] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [draft, setDraft] = useState({});

  function startEdit() { setDraft({ name: stop.name || '', start_date: toDateStr(stop.start_date), end_date: toDateStr(stop.end_date) }); setEditing(true); }
  function saveEdit() {
    const changes = {};
    if (draft.name !== (stop.name || '')) changes.name = draft.name;
    if (draft.start_date && draft.start_date !== toDateStr(stop.start_date)) changes.start_date = draft.start_date;
    if (draft.end_date && draft.end_date !== toDateStr(stop.end_date)) changes.end_date = draft.end_date;
    if (Object.keys(changes).length > 0 && updateStop) updateStop(stop.id, changes);
    setEditing(false);
  }

  // Filter items: by stop, by status, by selected date (in date mode), transport in departure stop only
  // When combinedStopIds is provided, include items from all those stops
  const stopIdsToMatch = combinedStopIds || [stop.id];

  const scheduled = useMemo(() => {
    return items.filter(it => {
      if (!stopIdsToMatch.some(sid => itemInStop(it, sid))) return false;
      if (it.type === 'transport') {
        const depStop = it.stop_ids?.[0];
        if (!stopIdsToMatch.includes(depStop)) return false;
      }
      if (selectedDate) {
        const itemDate = getItemDate(it.start_time);
        if (itemDate && itemDate !== selectedDate) return false;
      }
      return true;
    })
      .filter(it => { if (statusFilter === 'all') return it.status === 'sel' || it.status === 'conf'; return it.status === statusFilter; })
      .sort((a, b) => (a.start_time || 'zz').localeCompare(b.start_time || 'zz') || (a.sort_order || 0) - (b.sort_order || 0));
  }, [items, stop.id, combinedStopIds, statusFilter, selectedDate]);

  // Number map: sorted item index for map markers and card numbers
  const itemNumberMap = useMemo(() => {
    const map = {};
    scheduled.forEach((it, i) => { map[it.id] = i + 1; });
    return map;
  }, [scheduled]);

  const transportForMap = useMemo(() => {
    return scheduled.filter(it => it.type === 'transport' && !it.is_rental && it.originCoord && it.destCoord);
  }, [scheduled]);

  const allStopItems = useMemo(() => {
    let filtered = items.filter(it => stopIdsToMatch.some(sid => itemInStop(it, sid)));
    if (selectedDate) {
      filtered = filtered.filter(it => {
        const itemDate = getItemDate(it.start_time);
        if (itemDate && itemDate !== selectedDate) return false;
        return true;
      });
    }
    return filtered;
  }, [items, stop.id, selectedDate]);

  const stay = getStay(items, stop.id);
  const stayCoord = stay?.coord || null;
  const stayPlace = stay ? places?.[stay.id] : null;
  const nights = calcNights(stop);
  const tips = stop.tips?.length > 0 ? stop.tips : null;
  const planItems = useMemo(() => {
    if (statusFilter === 'all') return allStopItems;
    return allStopItems.filter(it => it.status === statusFilter);
  }, [allStopItems, statusFilter]);

  return (
    <div className={showTitle ? 'stop-section' : ''}>
      {showTitle && <div className="stop-section-title">{stop.name}</div>}
      <div className="itin-general">
        {editing ? (
          <>
            <div className="itin-general-row"><span className="itin-general-label">Name</span><input className="edit-input" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} style={{ flex: 1 }} /></div>
            <div className="itin-general-row"><span className="itin-general-label">Start</span><input className="edit-input" type="date" value={draft.start_date} onChange={e => setDraft(d => ({ ...d, start_date: e.target.value }))} style={{ flex: 1 }} /></div>
            <div className="itin-general-row"><span className="itin-general-label">End</span><input className="edit-input" type="date" value={draft.end_date} onChange={e => setDraft(d => ({ ...d, end_date: e.target.value }))} style={{ flex: 1 }} /></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="detail-btn" onClick={() => setEditing(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="detail-btn sel" onClick={saveEdit} style={{ flex: 1 }}>Save</button>
            </div>
            {deleteStop && (
              <button className="detail-btn-delete" style={{ marginTop: 8 }} onClick={() => {
                const affectedItems = items.filter(it => itemInStop(it, stop.id));
                if (confirm(`Delete ${stop.name}? ${affectedItems.length > 0 ? `This will unlink ${affectedItems.length} items.` : ''} This cannot be undone.`)) {
                  (async () => {
                    if (updateItem) {
                      for (const item of affectedItems) {
                        const newStopIds = (item.stop_ids || []).filter(sid => sid !== stop.id);
                        await updateItem(item.id, { stop_ids: newStopIds });
                      }
                    }
                    await deleteStop(stop.id);
                    setEditing(false);
                  })();
                }
              }}>Delete this stop</button>
            )}
          </>
        ) : (
          <div className="itin-general-compact">
            <div className="itin-general-dates" onClick={startEdit} style={{ cursor: 'pointer' }}>
              <span>{selectedDate ? (() => { const d = new Date(selectedDate + 'T12:00'); const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${m[d.getMonth()]} ${d.getDate()}`; })() : formatStopDate(stop)}</span>
              {!selectedDate && nights > 1 && <span className="itin-nights">{nights}n</span>}
              <span className="itin-edit-hint">Edit</span>
            </div>
            {stay && (
              <div className="itin-general-stay">
                {stayCoord ? (<a href={`https://www.google.com/maps/dir/?api=1&destination=${stayCoord.lat},${stayCoord.lng}`} target="_blank" rel="noopener" className="itin-link">{stay.name}</a>) : (<span>{stay.name}</span>)}
                {stayPlace?.phone && <span className="itin-detail-sep"> · <a href={`tel:${stayPlace.phone}`} className="itin-link">{stayPlace.phone}</a></span>}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="itin-map-schedule">
        <div className="itin-map-col">
          <div className="itin-col-header">
            <div className="itin-section-title" style={{ margin: 0 }}>Map</div>
            {(() => {
              const coords = scheduled.filter(it => it.coord).map(it => it.coord);
              const mapsUrl = coords.length > 1
                ? `https://www.google.com/maps/dir/${coords.map(c => `${c.lat},${c.lng}`).join('/')}`
                : coords.length === 1 ? `https://www.google.com/maps/dir/?api=1&destination=${coords[0].lat},${coords[0].lng}` : null;
              return mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener" className="itin-maps-btn itin-maps-btn-sm">Open in Google Maps</a> : null;
            })()}
          </div>
          <DayMap stop={stop} mapItems={scheduled.filter(it => it.type !== 'transport')} transportItems={transportForMap} stayCoord={stayCoord} itemNumberMap={itemNumberMap} />
        </div>
        <div className="itin-schedule-col">
          <div className="itin-col-header">
            <div className="itin-section-title" style={{ margin: 0 }}>Schedule</div>
          </div>
          <div className="itin-schedule-scroll">
            {scheduled.length > 0 ? (<ScheduleList items={scheduled} stop={stop} onItemTap={onItemTap} selectedDate={selectedDate} livePrices={livePrices} expenseMap={expenseMap} itemNumberMap={itemNumberMap} />) : (
              <div className="itin-empty">
                <div className="itin-empty-text">No items scheduled{selectedDate ? ' for this date' : ` for ${stop.name}`}.</div>
                {addItem && <button className="itin-empty-action" onClick={() => setShowAddItem(true)}>Add an activity</button>}
              </div>
            )}
          </div>
        </div>
      </div>
      {tips && (<details className="today-section"><summary className="today-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>Travel tips</summary><ul className="detail-tips" style={{ marginTop: 6 }}>{tips.map((t, i) => <li key={i}>{t}</li>)}</ul></details>)}
      <PlanSection planItems={planItems} onItemTap={onItemTap} livePrices={livePrices} expenseMap={expenseMap} />
      {addItem && (<button className="itin-add-item-btn" onClick={() => setShowAddItem(true)}>+ Add item to {stop.name}</button>)}
      {showAddItem && (<AddItemModal onClose={() => setShowAddItem(false)} onAdd={(data) => addItem({ ...data, stop_ids: [stop.id] })} stops={stops} userEmail="" />)}
    </div>
  );
}
