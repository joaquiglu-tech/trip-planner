import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTripData, useTripActions } from '../../shared/hooks/TripContext';
import DetailModal from '../../shared/components/DetailModal';
import OverviewView from './OverviewView';
import StopSection from './StopSection';
import StatusFilter from './StatusFilter';
import { toDateStr, formatStopDate, getTodayDayIndex, getCalendarDates } from './utils';

export default function TodayPage() {
  const { items, stops, livePrices, expenses, files, places, expenseMap } = useTripData();
  const { updateItem, deleteItem, updateStop, deleteStop, setStatus, addExpense, updateExpense, addItem, setFile, removeFile, getPlaceData } = useTripActions();
  const [selectedItem, setSelectedItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectorMode, setSelectorMode] = useState('stops');
  const todayIdx = getTodayDayIndex(stops);
  const isDuringTrip = todayIdx !== null;
  const [view, setView] = useState(isDuringTrip ? { type: 'stop', idx: todayIdx } : 'overview');
  const selectorRef = useRef(null);
  const calendarDates = useMemo(() => getCalendarDates(stops), [stops]);
  const todayDateStr = new Date().toISOString().split('T')[0];
  const handleCloseDetail = useCallback(() => setSelectedItem(null), []);

  // Resolve which stops to display based on view
  const activeStops = useMemo(() => {
    if (view === 'overview') return [];
    if (view.type === 'stop') return stops[view.idx] ? [stops[view.idx]] : [];
    if (view.type === 'date') return stops.filter(s => view.date >= toDateStr(s.start_date) && view.date <= toDateStr(s.end_date));
    return [];
  }, [view, stops]);

  // Selected date for date-mode filtering (null in stop mode)
  const selectedDate = view !== 'overview' && view.type === 'date' ? view.date : null;

  const isActive = (stopIdx) => view !== 'overview' && view.type === 'stop' && view.idx === stopIdx;
  const isDateActive = (date) => view !== 'overview' && view.type === 'date' && view.date === date;

  useEffect(() => {
    if (stops.length > 0 && view === 'overview') {
      const idx = getTodayDayIndex(stops);
      if (idx !== null) setView({ type: 'stop', idx });
    }
  }, [stops.length]); // only run when stops first load

  useEffect(() => {
    if (selectorRef.current && view !== 'overview') {
      const sel = selectorRef.current.querySelector('[data-active="true"]');
      if (sel) sel.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [view, selectorMode]);

  return (
    <div className="page active">
      {/* Stops/Dates toggle */}
      <div className="itin-mode-toggle">
        <button className={`fp ${selectorMode === 'stops' ? 'fp-active' : ''}`} onClick={() => setSelectorMode('stops')}>Stops</button>
        <button className={`fp ${selectorMode === 'dates' ? 'fp-active' : ''}`} onClick={() => setSelectorMode('dates')}>Dates</button>
      </div>

      {/* Pills: stops or dates */}
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

      {/* Status filter (not shown on overview) */}
      {view !== 'overview' && <StatusFilter value={statusFilter} onChange={setStatusFilter} />}

      {/* Content: overview or stop sections */}
      {view === 'overview' ? (
        <OverviewView items={items} stops={stops} expenses={expenses} onItemTap={setSelectedItem} onDaySelect={(idx) => setView({ type: 'stop', idx })} />
      ) : selectedDate && activeStops.length > 1 ? (
        /* Date mode with overlapping stops: single combined view */
        <StopSection
          stop={activeStops[0]} items={items} onItemTap={setSelectedItem} places={places}
          statusFilter={statusFilter} selectedDate={selectedDate}
          combinedStopIds={activeStops.map(s => s.id)}
          updateStop={updateStop} deleteStop={deleteStop} updateItem={updateItem} addItem={addItem} stops={stops} showTitle={false} />
      ) : (
        activeStops.map(stop => (
          <StopSection key={stop.id} stop={stop} items={items} onItemTap={setSelectedItem} places={places}
            statusFilter={statusFilter} selectedDate={selectedDate}
            updateStop={updateStop} deleteStop={deleteStop} updateItem={updateItem} addItem={addItem} stops={stops} showTitle={activeStops.length > 1}
            livePrices={livePrices} expenseMap={expenseMap} />
        ))
      )}
      {activeStops.length === 0 && view !== 'overview' && (<div className="itin-empty"><div className="itin-empty-text">No stops for this date.</div></div>)}

      {/* DetailModal */}
      {selectedItem && (() => {
        const liveItem = items.find(i => i.id === selectedItem.id) || selectedItem;
        const itemExpenses = (expenses || []).filter(e => e.item_id === liveItem.id);
        const exp = itemExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
        return <DetailModal
          it={liveItem} status={liveItem.status || ''} setStatus={setStatus}
          updateItem={updateItem} stops={stops}
          files={files[selectedItem.id]} setFile={setFile} removeFile={removeFile}
          placeData={places?.[selectedItem.id]} getPlaceData={getPlaceData}
          livePrice={livePrices?.[selectedItem.id]?.perNight} livePriceRates={livePrices?.[selectedItem.id]?.allRates}
          expenseAmount={exp} itemExpenses={itemExpenses} addExpense={addExpense} updateExpense={updateExpense}
          onClose={handleCloseDetail}
          onDelete={() => { deleteItem(liveItem.id); setSelectedItem(null); }}
        />;
      })()}
    </div>
  );
}
