import { useMemo } from 'react';
import { ITEMS, $f, itemCost } from '../data/items';
import { TRIP } from '../data/trip';

// Destinations in trip order, with which ITEMS cities map to them
const DESTINATIONS = [
  { name: 'Madrid', cities: ['Spain'], dates: 'Jul 12–14', nights: 2, phase: 'spain' },
  { name: 'Menorca', cities: ['Spain'], dates: 'Jul 14–18', nights: 4, phase: 'spain' },
  { name: 'Malaga', cities: ['Spain'], dates: 'Jul 18–20', nights: 2, phase: 'spain' },
  { name: 'Rome', cities: ['Rome'], dates: 'Jul 20–24', nights: 4, phase: 'rome' },
  { name: 'Florence', cities: ['Florence'], dates: 'Jul 24–25', nights: 2, phase: 'roadtrip' },
  { name: 'Montepulciano', cities: ['Montepulciano', 'Tuscany'], dates: 'Jul 25–26', nights: 1, phase: 'roadtrip' },
  { name: "Val d'Orcia", cities: ["Val d'Orcia"], dates: 'Jul 26–27', nights: 1, phase: 'roadtrip' },
  { name: 'Lerici', cities: ['Lerici'], dates: 'Jul 27–28', nights: 1, phase: 'roadtrip' },
  { name: 'Bergamo', cities: ['Bergamo Alta'], dates: 'Jul 28–29', nights: 1, phase: 'roadtrip' },
  { name: 'Bellagio', cities: ['Bellagio'], dates: 'Jul 29–30', nights: 1, phase: 'roadtrip' },
  { name: 'Sirmione', cities: ['Sirmione'], dates: 'Jul 30–31', nights: 1, phase: 'roadtrip' },
  { name: 'Verona', cities: ['Verona'], dates: 'Jul 31', nights: 1, phase: 'roadtrip' },
  { name: 'Venice', cities: ['Venice'], dates: 'Aug 1–2', nights: 1, phase: 'venice' },
];

const PHASE_COLOR = { spain: '#D97706', rome: '#2563EB', roadtrip: '#7C3AED', venice: '#2563EB' };

function getDestStats(dest, S) {
  const items = ITEMS.filter(it => dest.cities.includes(it.city));
  const stays = items.filter(it => it.type === 'stay');
  const transport = ITEMS.filter(it => it.type === 'transport');
  const activities = items.filter(it => it.type === 'activity');
  const dining = items.filter(it => it.type === 'dining' || it.type === 'special');

  const stayBooked = stays.some(it => S[it.id] === 'conf');
  const staySelected = stays.some(it => S[it.id] === 'sel' || S[it.id] === 'conf');
  const actSelected = activities.filter(it => S[it.id] === 'sel' || S[it.id] === 'conf').length;
  const actTotal = activities.length;
  const diningSelected = dining.filter(it => S[it.id] === 'sel' || S[it.id] === 'conf').length;
  const diningTotal = dining.length;

  return { stayBooked, staySelected, actSelected, actTotal, diningSelected, diningTotal };
}

export default function HomePage({ active, S, paidPrices, onNavigatePlan }) {
  const daysLeft = useMemo(() => {
    return Math.ceil((new Date(TRIP.startDate) - new Date()) / 86400000);
  }, []);

  const totalStats = useMemo(() => {
    let selected = 0, booked = 0, estimated = 0;
    ITEMS.forEach(it => {
      const st = S[it.id] || '';
      if (st === 'sel' || st === 'conf') { selected++; estimated += itemCost(it); }
      if (st === 'conf') booked++;
    });
    return { selected, booked, estimated };
  }, [S]);

  const needsAttention = useMemo(() => {
    return ITEMS.filter(it => (S[it.id] === 'sel') && it.urgent);
  }, [S]);

  return (
    <div className={`page ${active ? 'active' : ''}`}>
      {/* Trip header */}
      {daysLeft > 0 && (
        <div className="home-header">
          <div className="home-trip-name">{TRIP.name}</div>
          <div className="home-countdown">{daysLeft} days away</div>
        </div>
      )}

      {/* Quick stats */}
      <div className="home-stats">
        <div className="home-stat">
          <div className="home-stat-num">{totalStats.booked}</div>
          <div className="home-stat-label">Booked</div>
        </div>
        <div className="home-stat">
          <div className="home-stat-num">{totalStats.selected - totalStats.booked}</div>
          <div className="home-stat-label">To book</div>
        </div>
        <div className="home-stat">
          <div className="home-stat-num">{$f(totalStats.estimated)}</div>
          <div className="home-stat-label">Estimated</div>
        </div>
      </div>

      {/* Alerts */}
      {needsAttention.length > 0 && (
        <div className="home-alerts">
          <div className="home-alerts-title">
            <span className="home-alerts-badge">{needsAttention.length}</span>
            Needs attention
          </div>
          {needsAttention.slice(0, 5).map(it => (
            <div key={it.id} className="home-alert-item" onClick={() => onNavigatePlan(it.city)}>
              <span className="home-alert-name">{it.name}</span>
              <span className="home-alert-arrow">→</span>
            </div>
          ))}
        </div>
      )}

      {/* Destination cards */}
      <div className="home-section-title">Your destinations</div>
      <div className="home-destinations">
        {DESTINATIONS.map(dest => {
          const stats = getDestStats(dest, S);
          return (
            <div key={dest.name} className="home-dest-card" onClick={() => onNavigatePlan(dest.cities[0])}>
              <div className="home-dest-top">
                <div>
                  <div className="home-dest-name">{dest.name}</div>
                  <div className="home-dest-dates">{dest.dates} · {dest.nights}n</div>
                </div>
                <span className="home-dest-phase" style={{ background: PHASE_COLOR[dest.phase] }} />
              </div>
              <div className="home-dest-statuses">
                <span className={`home-dest-status ${stats.stayBooked ? 'booked' : stats.staySelected ? 'selected' : ''}`}>
                  {stats.stayBooked ? '✓' : stats.staySelected ? '●' : '—'} Stay
                </span>
                <span className={`home-dest-status ${stats.actSelected > 0 ? 'selected' : ''}`}>
                  {stats.actSelected}/{stats.actTotal} Activities
                </span>
                <span className={`home-dest-status ${stats.diningSelected > 0 ? 'selected' : ''}`}>
                  {stats.diningSelected}/{stats.diningTotal} Dining
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
