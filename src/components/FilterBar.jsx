import { useMemo } from 'react';
import { ITEMS } from '../data/items';

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'transport', label: 'Transport' },
  { value: 'stay', label: 'Stays' },
  { value: 'activity', label: 'Activities' },
  { value: 'special', label: 'Special' },
  { value: 'dining', label: 'Dining' },
];

const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'sel', label: 'Selected' },
  { value: 'conf', label: 'Booked' },
  { value: 'unbooked', label: 'To book' },
  { value: 'none', label: 'Not added' },
];

export default function FilterBar({ filters, setFilters }) {
  const cities = useMemo(() => ['all', ...new Set(ITEMS.map((i) => i.city))], []);

  const update = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  return (
    <div className="filter-bar">
      <div className="filter-pill-group">
        {TYPES.map((t) => (
          <button key={t.value} className={`fp ${filters.type === t.value ? 'fp-active' : ''}`} onClick={() => update('type', t.value)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="filter-pill-group">
        {STATUSES.map((s) => (
          <button key={s.value} className={`fp ${filters.status === s.value ? 'fp-active' : ''}`} onClick={() => update('status', s.value)}>
            {s.label}
          </button>
        ))}
      </div>
      <select id="f-city" value={filters.city} onChange={(e) => update('city', e.target.value)}>
        {cities.map((c) => <option key={c} value={c}>{c === 'all' ? 'All cities' : c}</option>)}
      </select>
      <button
        className={`fp fp-urgent ${filters.urgent ? 'fp-urgent-active' : ''}`}
        onClick={() => update('urgent', !filters.urgent)}
      >
        Must Book
      </button>
      <input
        id="f-search" type="search" placeholder="Search…"
        value={filters.search} onChange={(e) => update('search', e.target.value)}
      />
    </div>
  );
}
