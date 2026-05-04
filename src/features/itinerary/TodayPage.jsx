import { useState, useEffect, useRef, useMemo } from 'react';
import { $f, itemCost } from '../../shared/hooks/useItems';
import { useTrip } from '../../shared/hooks/TripContext';
import DetailModal from '../../shared/components/DetailModal';
import AddItemModal from '../../shared/modals/AddItemModal';
import { DayMap, RouteMap } from './MapComponents';
import {
  toDateStr, formatStopDate, calcNights, formatTime, formatRelativeTime,
  itemInStop, getStay, getTodayDayIndex, getDaysUntilTrip, getStopStats,
  getCalendarDates, TYPE_LABEL_SHORT,
} from './utils';

const TRANSPORT_ICON = { flight: '\u2708', train: '\u{1F686}', bus: '\u{1F68C}', drive: '\u{1F697}', taxi: '\u{1F695}', ferry: '\u26F4', walk: '\u{1F6B6}', bicycle: '\u{1F6B2}', rental: '\u{1F511}' };

// ═══ SCHEDULE LIST ═══
function ScheduleList({ items, stop, onItemTap }) {
  const nights = calcNights(stop);
  const startStr = toDateStr(stop.start_date);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const dateLabels = useMemo(() => {
    if (nights <= 1) return null;
    const labels = {};
    const [sy, sm, sd] = startStr.split('-').map(Number);
    for (let i = 0; i < nights; i++) {
      const d = new Date(sy, sm - 1, sd + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      labels[ds] = `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
    }
    return labels;
  }, [nights, startStr]);

  const groupedItems = useMemo(() => {
    if (!dateLabels || nights <= 1) return [{ label: null, items }];
    const dateKeys = Object.keys(dateLabels);
    // Group by actual start_time date if items have datetime-local values
    const byDate = {};
    const unassigned = [];
    items.forEach(it => {
      if (it.start_time && it.start_time.includes('T')) {
        const itemDate = it.start_time.split('T')[0];
        if (dateLabels[itemDate]) { (byDate[itemDate] = byDate[itemDate] || []).push(it); return; }
      }
      unassigned.push(it);
    });
    // If we have date-assigned items, use them; put unassigned in first day
    if (Object.keys(byDate).length > 0) {
      const groups = [];
      dateKeys.forEach(dk => {
        const dayItems = byDate[dk] || [];
        if (dk === dateKeys[0]) dayItems.push(...unassigned);
        if (dayItems.length > 0) groups.push({ label: dateLabels[dk], items: dayItems });
      });
      return groups.length > 0 ? groups : [{ label: null, items }];
    }
    // Fallback: distribute evenly if no items have dates
    const perDay = Math.ceil(items.length / nights);
    return dateKeys.map((dk, i) => {
      const dayItems = items.slice(i * perDay, (i + 1) * perDay);
      return dayItems.length > 0 ? { label: dateLabels[dk], items: dayItems } : null;
    }).filter(Boolean);
  }, [items, dateLabels, nights]);

  return (
    <div className="itin-schedule">
      {groupedItems.map((group, gi) => (
        <div key={gi}>
          {group.label && <div className="itin-sched-date">{group.label}</div>}
          {group.items.map(it => (
            <div key={it.id} className={`itin-sched-row ${it.status}`} onClick={() => onItemTap(it)}>
              <div className="itin-sched-time">
                {it.start_time ? formatTime(it.start_time) : ''}
                {it.end_time && <span className="itin-sched-end">{formatTime(it.end_time)}</span>}
              </div>
              <div className="itin-sched-dot-col"><div className={`itin-sched-dot ${it.status}`} /><div className="itin-sched-line" /></div>
              <div className="itin-sched-info">
                <div className="itin-sched-name">
                  {it.type === 'transport' && <span style={{ marginRight: 4 }}>{TRANSPORT_ICON[it.transport_mode] || '\u2708'}</span>}
                  {it.name}
                </div>
                <div className="itin-sched-sub">
                  {it.type === 'transport' ? (it.routeLabel || it.route || '') : it.dish ? it.dish : it.hrs ? `${it.hrs}h` : ''}
                </div>
              </div>
              <div className="itin-sched-actions">
                {it.status === 'conf' && <span className="itin-sched-check">Booked</span>}
                {it.coord && <a href={`https://www.google.com/maps/dir/?api=1&destination=${it.coord.lat},${it.coord.lng}`} target="_blank" rel="noopener" className="itin-action-sm" onClick={e => e.stopPropagation()}>Go</a>}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ═══ PLAN SECTION ═══
function PlanSection({ planItems, onItemTap }) {
  const [expanded, setExpanded] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const types = useMemo(() => { const set = new Set(planItems.map(it => it.type)); return ['all', ...Array.from(set)]; }, [planItems]);
  const filtered = useMemo(() => {
    let items = typeFilter === 'all' ? planItems : planItems.filter(it => it.type === typeFilter);
    return items.sort((a, b) => (a.start_time || 'zz').localeCompare(b.start_time || 'zz'));
  }, [planItems, typeFilter]);
  if (planItems.length === 0) return null;
  return (
    <details className="itin-plan-details" open={expanded} onToggle={e => setExpanded(e.target.open)}>
      <summary className="itin-plan-summary">Plan ({planItems.length})</summary>
      <div className="itin-plan-filters">
        {types.map(t => (<button key={t} className={`fp ${typeFilter === t ? 'fp-active' : ''}`} onClick={() => setTypeFilter(t)}>{t === 'all' ? 'All' : (TYPE_LABEL_SHORT[t] || t)}</button>))}
      </div>
      <div className="itin-plan-list">
        {filtered.map(it => (
          <div key={it.id} className={`item-card-compact ${it.status === 'conf' ? 'confirmed' : it.status === 'sel' ? 'selected' : ''}`} onClick={() => onItemTap(it)}>
            <div className="icc-left">
              <div className="icc-name">{it.name}</div>
              <div className="icc-sub">
                <span className="icc-type-badge">{TYPE_LABEL_SHORT[it.type] || it.type}</span>
                {it.start_time && <span> · {formatTime(it.start_time)}</span>}
                {it.end_time && <span> – {formatTime(it.end_time)}</span>}
              </div>
            </div>
            <div className="icc-right">
              <div className={`icc-status ${it.status}`}>{it.status === 'conf' ? 'Booked' : it.status === 'sel' ? 'Added' : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}



// ═══ STATUS FILTER ═══
function StatusFilter({ value, onChange }) {
  return (
    <div className="itin-filter">
      {[{ value: 'all', label: 'All' }, { value: 'sel', label: 'Selected' }, { value: 'conf', label: 'Confirmed' }].map(o => (
        <button key={o.value} className={`fp ${value === o.value ? 'fp-active' : ''}`} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

// ═══ OVERVIEW ═══
function OverviewView({ items, stops, expenses, onItemTap, visible, onDaySelect }) {
  const daysLeft = getDaysUntilTrip(stops);
  const stats = useMemo(() => {
    let selected = 0, booked = 0, estimated = 0, confirmed = 0;
    items.forEach(it => {
      if (it.status === 'sel' || it.status === 'conf') {
        selected++; estimated += itemCost(it);
        if (it.status === 'conf') {
          booked++;
          const exp = (expenses || []).filter(e => e.item_id === it.id).reduce((s, e) => s + Number(e.amount || 0), 0);
          confirmed += exp > 0 ? exp : itemCost(it);
        }
      }
    });
    return { selected, booked, estimated, confirmed };
  }, [items, expenses]);
  const pct = stats.selected ? Math.round((stats.booked / stats.selected) * 100) : 0;
  const recentItems = useMemo(() => items.filter(it => it.status && it.updated_by).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8), [items]);

  return (
    <>
      {daysLeft > 0 && (
        <div className="home-header">
          <div className="home-trip-name">{(() => {
            const tripStops = stops.filter(s => s.name !== 'Lima');
            return tripStops.length > 1 ? `${tripStops[0]?.name} to ${tripStops[tripStops.length - 1]?.name}` : (tripStops[0]?.name || 'Trip');
          })()}</div>
          <div className="home-countdown">{daysLeft} days away</div>
        </div>
      )}
      <div className="home-stats">
        <div className="home-stat"><div className="home-stat-num">{stats.booked}</div><div className="home-stat-label">Booked</div></div>
        <div className="home-stat"><div className="home-stat-num">{stats.selected - stats.booked}</div><div className="home-stat-label">To book</div></div>
        <div className="home-stat"><div className="home-stat-num">{$f(stats.estimated)}</div><div className="home-stat-label">Estimated</div></div>
        {stats.confirmed > 0 && <div className="home-stat"><div className="home-stat-num" style={{ color: 'var(--green)' }}>{$f(stats.confirmed)}</div><div className="home-stat-label">Confirmed</div></div>}
      </div>
      {recentItems.length > 0 && (
        <div className="itin-recent">
          <div className="itin-section-title">Recent activity</div>
          {recentItems.map(r => (
            <div key={r.id} className="itin-recent-row">
              <span className="itin-recent-who">{(r.updated_by || '').split('@')[0]}</span>
              <span className="itin-recent-action">{r.status === 'conf' ? 'booked' : r.status === 'sel' ? 'added' : 'updated'}</span>
              <span className="itin-recent-name">{r.name}</span>
              <span className="itin-recent-time">{formatRelativeTime(r.updated_at)}</span>
            </div>
          ))}
        </div>
      )}
      <RouteMap stops={stops} items={items} />
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

// ═══ STOP SECTION ═══
function StopSection({ stop, items, onItemTap, places, visible, statusFilter, updateStop, deleteStop, addItem, stops, showTitle }) {
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

  // Include transport items only in their departure stop (first stop_id)
  const scheduled = useMemo(() => {
    return items.filter(it => {
      if (!itemInStop(it, stop.id)) return false;
      if (it.type === 'transport' && it.stop_ids?.[0] !== stop.id) return false;
      return true;
    })
      .filter(it => { if (statusFilter === 'all') return it.status === 'sel' || it.status === 'conf'; return it.status === statusFilter; })
      .sort((a, b) => (a.start_time || 'zz').localeCompare(b.start_time || 'zz') || (a.sort_order || 0) - (b.sort_order || 0));
  }, [items, stop.id, statusFilter]);

  // Transport items for DayMap (departure from this stop)
  const transportForMap = useMemo(() => {
    return scheduled.filter(it => it.type === 'transport' && !it.is_rental && it.originCoord && it.destCoord);
  }, [scheduled]);

  const allStopItems = useMemo(() => items.filter(it => itemInStop(it, stop.id)), [items, stop.id]);
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
                const itemCount = items.filter(it => itemInStop(it, stop.id)).length;
                if (confirm(`Delete ${stop.name}? ${itemCount > 0 ? `This will unlink ${itemCount} items.` : ''} This cannot be undone.`)) { deleteStop(stop.id); setEditing(false); }
              }}>Delete this stop</button>
            )}
          </>
        ) : (
          <div className="itin-general-compact">
            <div className="itin-general-dates" onClick={startEdit} style={{ cursor: 'pointer' }}>
              <span>{formatStopDate(stop)}</span>
              {nights > 1 && <span className="itin-nights">{nights}n</span>}
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
        <div className="itin-map-col"><DayMap stop={stop} mapItems={scheduled.filter(it => it.type !== 'transport')} transportItems={transportForMap} stayCoord={stayCoord} /></div>
        <div className="itin-schedule-col">
          <div className="itin-section-title">Schedule</div>
          <div className="itin-schedule-scroll">
            {scheduled.length > 0 ? (<ScheduleList items={scheduled} stop={stop} onItemTap={onItemTap} />) : (
              <div className="itin-empty">
                <div className="itin-empty-text">No items scheduled for {stop.name}.</div>
                {addItem && <button className="itin-empty-action" onClick={() => setShowAddItem(true)}>Add an activity</button>}
              </div>
            )}
          </div>
        </div>
      </div>
      {tips && (<details className="today-section"><summary className="today-section-title" style={{ cursor: 'pointer', listStyle: 'none' }}>Travel tips</summary><ul className="detail-tips" style={{ marginTop: 6 }}>{tips.map((t, i) => <li key={i}>{t}</li>)}</ul></details>)}
      <PlanSection planItems={planItems} onItemTap={onItemTap} />
      {addItem && (<button className="itin-add-item-btn" onClick={() => setShowAddItem(true)}>+ Add item to {stop.name}</button>)}
      {showAddItem && (<AddItemModal onClose={() => setShowAddItem(false)} onAdd={(data) => addItem({ ...data, stop_ids: [stop.id] })} stops={stops} userEmail="" />)}
    </div>
  );
}

// ═══ MAIN ═══
export default function TodayPage({ active }) {
  const { items, stops, livePrices, expenses, updateItem, updateStop, deleteStop, setStatus, addExpense, updateExpense, addItem, files, setFile, removeFile, places, getPlaceData } = useTrip();
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectorMode, setSelectorMode] = useState('stops');
  const todayIdx = getTodayDayIndex(stops);
  const isDuringTrip = todayIdx !== null;
  const [view, setView] = useState(isDuringTrip ? { type: 'stop', idx: todayIdx } : 'overview');
  const selectorRef = useRef(null);
  const calendarDates = useMemo(() => getCalendarDates(stops), [stops]);
  const todayDateStr = new Date().toISOString().split('T')[0];

  const activeStops = useMemo(() => {
    if (view === 'overview') return [];
    if (view.type === 'stop') return stops[view.idx] ? [stops[view.idx]] : [];
    if (view.type === 'date') return stops.filter(s => view.date >= toDateStr(s.start_date) && view.date <= toDateStr(s.end_date));
    return [];
  }, [view, stops]);

  const isActive = (stopIdx) => view !== 'overview' && view.type === 'stop' && view.idx === stopIdx;
  const isDateActive = (date) => view !== 'overview' && view.type === 'date' && view.date === date;

  useEffect(() => {
    if (selectorRef.current && view !== 'overview') {
      const sel = selectorRef.current.querySelector('[data-active="true"]');
      if (sel) sel.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [view, selectorMode]);

  return (
    <div className={`page ${active ? 'active' : ''}`}>
      <div className="itin-mode-toggle">
        <button className={`fp ${selectorMode === 'stops' ? 'fp-active' : ''}`} onClick={() => setSelectorMode('stops')}>Stops</button>
        <button className={`fp ${selectorMode === 'dates' ? 'fp-active' : ''}`} onClick={() => setSelectorMode('dates')}>Dates</button>
      </div>
      <div className="today-selector" ref={selectorRef}>
        <button className={`itin-overview-pill ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>Overview</button>
        {isDuringTrip && !isActive(todayIdx) && <button className="today-sel-pill today-pill-accent" onClick={() => setView({ type: 'stop', idx: todayIdx })}>Today</button>}
        {selectorMode === 'stops' ? (
          stops.map((s, i) => (
            <button key={s.id} data-active={isActive(i) ? 'true' : 'false'}
              className={`today-sel-pill today-sel-pill-stop ${isActive(i) ? 'active' : ''} ${i === todayIdx ? 'is-today' : ''}`}
              onClick={() => setView({ type: 'stop', idx: i })} style={{ borderLeftColor: 'var(--accent)' }}>
              <span className="pill-stop-name" title={s.name}>{s.name}</span>
              <span className="pill-stop-date">{formatStopDate(s)}</span>
            </button>
          ))
        ) : (
          calendarDates.map(cd => {
            const isMulti = cd.overlapping.length > 1;
            return (
              <button key={cd.date} data-active={isDateActive(cd.date) ? 'true' : 'false'}
                className={`today-sel-pill today-sel-pill-stop ${isDateActive(cd.date) ? 'active' : ''} ${cd.date === todayDateStr ? 'is-today' : ''}`}
                onClick={() => cd.stopIdx >= 0 && setView({ type: 'date', date: cd.date })}
                style={{ borderLeftColor: 'var(--accent)', minWidth: isMulti ? 120 : undefined }}>
                <span className="pill-stop-name" title={cd.title} style={isMulti ? { whiteSpace: 'normal', lineHeight: 1.2, fontSize: 11 } : undefined}>{cd.title}</span>
                <span className="pill-stop-date">{cd.shortLabel}</span>
              </button>
            );
          })
        )}
      </div>
      {view !== 'overview' && <StatusFilter value={statusFilter} onChange={setStatusFilter} />}
      {view === 'overview' ? (
        <OverviewView items={items} stops={stops} expenses={expenses} onItemTap={setSelectedItem} visible={active && view === 'overview'} onDaySelect={(idx) => setView({ type: 'stop', idx })} />
      ) : (
        activeStops.map(stop => (
          <StopSection key={stop.id} stop={stop} items={items} onItemTap={setSelectedItem} places={places} visible={active} statusFilter={statusFilter}
            updateStop={updateStop} deleteStop={deleteStop} addItem={addItem} stops={stops} showTitle={activeStops.length > 1} />
        ))
      )}
      {activeStops.length === 0 && view !== 'overview' && (<div className="itin-empty"><div className="itin-empty-text">No stops for this date.</div></div>)}
      {selectedItem && (() => {
        const liveItem = items.find(i => i.id === selectedItem.id) || selectedItem;
        const itemExpenses = (expenses || []).filter(e => e.item_id === liveItem.id);
        const exp = itemExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        return <DetailModal key={liveItem.id + (liveItem.updated_at || '')}
          it={liveItem} status={liveItem.status || ''} setStatus={setStatus}
          updateItem={updateItem} stops={stops}
          files={files[selectedItem.id]} setFile={setFile} removeFile={removeFile}
          placeData={places?.[selectedItem.id]} getPlaceData={getPlaceData}
          livePrice={livePrices?.[selectedItem.id]?.perNight} livePriceRates={livePrices?.[selectedItem.id]?.allRates}
          expenseAmount={exp} itemExpenses={itemExpenses} addExpense={addExpense} updateExpense={updateExpense}
          onClose={() => setSelectedItem(null)}
        />;
      })()}
    </div>
  );
}
