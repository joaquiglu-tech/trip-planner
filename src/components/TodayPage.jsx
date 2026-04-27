import { useState, useEffect, useRef, useMemo } from 'react';
import { ALL_DAYS } from '../data/allDays';
import { ITEMS, TYPE_LABEL, $f, usd, itemCost } from '../data/items';
import { ITEM_COORDS } from '../data/coords';
import { ROUTE_STOPS, ROUTE_LINES } from '../data/routes';
import { TRIP } from '../data/trip';
import DetailModal from './DetailModal';

const PHASE_COLOR = { spain: '#D97706', rome: '#2563EB', roadtrip: '#7C3AED', venice: '#2563EB' };
const TYPE_ICON = { stay: '🏨', activity: '🎟️', special: '⭐', dining: '🍝' };

function getSelectedForCity(city, S) {
  return ITEMS.filter((it) => {
    if (it.type === 'transport') return false;
    const st = S[it.id] || '';
    if (st !== 'sel' && st !== 'conf') return false;
    if (it.city === city) return true;
    if (city === 'Montepulciano' && it.city === 'Tuscany') return true;
    return false;
  });
}

function getTodayDayIndex() {
  const start = new Date(TRIP.startDate);
  const now = new Date();
  const diff = Math.floor((now - start) / (86400000));
  if (diff >= 0 && diff < ALL_DAYS.length) return diff;
  return null;
}

function getDaysUntilTrip() {
  const start = new Date(TRIP.startDate);
  const now = new Date();
  return Math.ceil((start - now) / 86400000);
}

// ═══ PRE-TRIP MODE ═══
function PreTripView({ S, paidPrices, onItemTap }) {
  const daysLeft = getDaysUntilTrip();

  const stats = useMemo(() => {
    let selected = 0, booked = 0, estimated = 0, confirmed = 0;
    const needsAttention = [];
    ITEMS.forEach((it) => {
      const st = S[it.id] || '';
      if (st === 'sel' || st === 'conf') {
        selected++;
        estimated += itemCost(it);
        if (st === 'conf') { booked++; confirmed += paidPrices[it.id] || itemCost(it); }
        if (st === 'sel' && it.urgent) needsAttention.push(it);
      }
    });
    return { selected, booked, estimated, confirmed, needsAttention };
  }, [S, paidPrices]);

  const pct = stats.selected ? Math.round((stats.booked / stats.selected) * 100) : 0;

  const upcomingBookings = useMemo(() => {
    return ITEMS.filter((it) => S[it.id] === 'conf').slice(0, 8);
  }, [S]);

  return (
    <>
      {/* Countdown */}
      {daysLeft > 0 && (
        <div className="today-countdown">
          <div className="today-countdown-num">{daysLeft}</div>
          <div className="today-countdown-label">days until your trip</div>
        </div>
      )}

      {/* Progress */}
      <div className="today-progress-card">
        <div className="today-progress-ring">
          <svg viewBox="0 0 36 36" className="today-ring-svg">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border)" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--green)" strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
          </svg>
          <span className="today-ring-text">{pct}%</span>
        </div>
        <div className="today-progress-info">
          <div className="today-progress-title">{stats.booked} of {stats.selected} items booked</div>
          <div className="today-progress-sub">Estimated: {$f(stats.estimated)} · Confirmed: {$f(stats.confirmed)}</div>
        </div>
      </div>

      {/* Needs Attention */}
      {stats.needsAttention.length > 0 && (
        <div className="today-section">
          <div className="today-section-title">Needs attention</div>
          {stats.needsAttention.map((it) => (
            <div key={it.id} className="today-attention-item" onClick={() => onItemTap(it)}>
              <span className="today-attention-badge">Book now</span>
              <span className="today-attention-name">{it.name}</span>
              <span className="today-attention-arrow">→</span>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <div className="today-section">
          <div className="today-section-title">Confirmed bookings</div>
          {upcomingBookings.map((it) => (
            <div key={it.id} className="today-booking-item" onClick={() => onItemTap(it)}>
              <span className="today-booking-icon">{TYPE_ICON[it.type] || '📌'}</span>
              <div className="today-booking-info">
                <div className="today-booking-name">{it.name}</div>
                <div className="today-booking-city">{it.city}</div>
              </div>
              <span className="today-booking-check">✓</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ═══ DURING-TRIP MODE ═══
function DuringTripView({ day, S, paidPrices, onItemTap, places }) {
  const selections = useMemo(() => getSelectedForCity(day.city, S), [day.city, S]);
  const stay = selections.find((it) => it.type === 'stay');
  const activities = selections.filter((it) => it.type === 'activity');
  const dining = selections.filter((it) => it.type === 'dining' || it.type === 'special');

  return (
    <>
      {/* Day header */}
      <div className="today-day-header">
        <div className="today-day-badge" style={{ background: PHASE_COLOR[day.phase] }}>Day {day.n}</div>
        <div>
          <div className="today-day-date">{day.date}</div>
          <div className="today-day-title">{day.title}</div>
        </div>
      </div>

      {/* Stay card */}
      {stay && (
        <div className="today-stay-card" onClick={() => onItemTap(stay)}>
          <div className="today-stay-label">Where you're sleeping</div>
          <div className="today-stay-name">{stay.name}</div>
          {stay.address && <div className="today-stay-address">{stay.address}</div>}
          <div className="today-stay-actions">
            {ITEM_COORDS[stay.id] && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${ITEM_COORDS[stay.id].lat},${ITEM_COORDS[stay.id].lng}`} target="_blank" rel="noopener" className="today-action-btn" onClick={(e) => e.stopPropagation()}>Directions</a>
            )}
            {places?.[stay.id]?.phone && (
              <a href={`tel:${places[stay.id].phone}`} className="today-action-btn" onClick={(e) => e.stopPropagation()}>Call</a>
            )}
          </div>
          <div className={`today-stay-status ${S[stay.id] === 'conf' ? 'booked' : ''}`}>{S[stay.id] === 'conf' ? '✓ Booked' : 'Not booked yet'}</div>
        </div>
      )}

      {/* Plan */}
      <div className="today-section">
        <div className="today-section-title">Plan</div>
        {day.plan.map((p, i) => (
          <div key={i} className="today-plan-step">
            <span className="today-step-num">{i + 1}</span>
            <span>{p}</span>
          </div>
        ))}
      </div>

      {/* Activities */}
      {activities.length > 0 && (
        <div className="today-section">
          <div className="today-section-title">Activities</div>
          {activities.map((it) => (
            <div key={it.id} className="today-item" onClick={() => onItemTap(it)}>
              <span className="today-item-icon">{TYPE_ICON[it.type]}</span>
              <div className="today-item-info">
                <div className="today-item-name">{it.name}</div>
                {it.hrs && <div className="today-item-sub">{it.hrs}h</div>}
              </div>
              <div className="today-item-actions">
                {ITEM_COORDS[it.id] && <a href={`https://www.google.com/maps/dir/?api=1&destination=${ITEM_COORDS[it.id].lat},${ITEM_COORDS[it.id].lng}`} target="_blank" rel="noopener" className="today-action-btn-sm" onClick={(e) => e.stopPropagation()}>🧭</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restaurants */}
      {dining.length > 0 && (
        <div className="today-section">
          <div className="today-section-title">Eat & Drink</div>
          {dining.map((it) => (
            <div key={it.id} className="today-item" onClick={() => onItemTap(it)}>
              <span className="today-item-icon">{TYPE_ICON[it.type]}</span>
              <div className="today-item-info">
                <div className="today-item-name">{it.name}</div>
                {it.dish && <div className="today-item-sub">{it.dish}</div>}
              </div>
              <div className="today-item-actions">
                {places?.[it.id]?.phone && <a href={`tel:${places[it.id].phone}`} className="today-action-btn-sm" onClick={(e) => e.stopPropagation()}>📞</a>}
                {ITEM_COORDS[it.id] && <a href={`https://www.google.com/maps/dir/?api=1&destination=${ITEM_COORDS[it.id].lat},${ITEM_COORDS[it.id].lng}`} target="_blank" rel="noopener" className="today-action-btn-sm" onClick={(e) => e.stopPropagation()}>🧭</a>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Day suggestions */}
      {day.eat.length > 0 && (
        <div className="today-section">
          <div className="today-section-title">Also recommended</div>
          {day.eat.map((e, i) => <div key={i} className="eat-line">{e}</div>)}
        </div>
      )}

      {selections.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Nothing planned yet</div>
          <div className="empty-state-text">Go to the Plan tab to pick stays, restaurants, and activities for {day.city}.</div>
        </div>
      )}
    </>
  );
}

// ═══ MAIN EXPORT ═══
export default function TodayPage({ active, S, setStatus, paidPrices, setPaidPrice, notes, setNote, files, setFile, places, getPlaceData }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const todayIdx = getTodayDayIndex();
  const daysLeft = getDaysUntilTrip();
  const isDuringTrip = todayIdx !== null;

  // Day selector for during-trip
  const [dayOffset, setDayOffset] = useState(0);
  const viewIdx = isDuringTrip ? (todayIdx + dayOffset) : 0;
  const day = ALL_DAYS[Math.min(viewIdx, ALL_DAYS.length - 1)];

  return (
    <div className={`page ${active ? 'active' : ''}`}>
      {isDuringTrip ? (
        <>
          {/* Day selector strip */}
          <div className="today-day-selector">
            {dayOffset > 0 && <button className="today-day-nav" onClick={() => setDayOffset(dayOffset - 1)}>←</button>}
            <button className={`today-day-pill ${dayOffset === 0 ? 'active' : ''}`} onClick={() => setDayOffset(0)}>Today</button>
            <button className={`today-day-pill ${dayOffset === 1 ? 'active' : ''}`} onClick={() => setDayOffset(1)}>Tomorrow</button>
            {dayOffset > 1 && <span className="today-day-label">Day {day.n}</span>}
            {(todayIdx + dayOffset) < ALL_DAYS.length - 1 && <button className="today-day-nav" onClick={() => setDayOffset(dayOffset + 1)}>→</button>}
          </div>
          <DuringTripView day={day} S={S} paidPrices={paidPrices} onItemTap={setSelectedItem} places={places} />
        </>
      ) : (
        <PreTripView S={S} paidPrices={paidPrices} onItemTap={setSelectedItem} />
      )}

      {selectedItem && (
        <DetailModal
          it={selectedItem}
          status={S[selectedItem.id] || ''}
          setStatus={setStatus}
          paidPrice={paidPrices?.[selectedItem.id]}
          setPaidPrice={setPaidPrice}
          note={notes?.[selectedItem.id]}
          setNote={setNote}
          existingFile={files?.[selectedItem.id]}
          onFileChange={setFile}
          placeData={places?.[selectedItem.id]}
          getPlaceData={getPlaceData}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
