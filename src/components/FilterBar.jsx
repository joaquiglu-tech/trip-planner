import { useMemo } from 'react';
import { ITEMS } from '../data/items';

export default function FilterBar({ filters, setFilters }) {
  const cities = useMemo(() => ['all', ...new Set(ITEMS.map((i) => i.city))], []);

  const update = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  return (
    <div className="filter-bar">
      <select id="f-type" value={filters.type} onChange={(e) => update('type', e.target.value)}>
        <option value="all">All types</option>
        <option value="transport">Transport</option>
        <option value="stay">Stays</option>
        <option value="activity">Activities</option>
        <option value="special">Special Meals</option>
        <option value="dining">Restaurants & Bars</option>
      </select>
      <select id="f-city" value={filters.city} onChange={(e) => update('city', e.target.value)}>
        {cities.map((c) => <option key={c} value={c}>{c === 'all' ? 'All cities' : c}</option>)}
      </select>
      <select id="f-status" value={filters.status} onChange={(e) => update('status', e.target.value)}>
        <option value="all">All statuses</option>
        <option value="sel">Selected only</option>
        <option value="conf">Confirmed only</option>
        <option value="none">Not selected</option>
      </select>
      <button
        className="fp"
        onClick={() => update('urgent', !filters.urgent)}
        style={{
          background: filters.urgent ? '#ef4444' : '#fee2e2',
          borderColor: filters.urgent ? '#ef4444' : '#fca5a5',
          color: filters.urgent ? '#fff' : '#991b1b',
        }}
      >
        ⚠️ Must Book
      </button>
      <input
        id="f-search" type="search" placeholder="Search…"
        value={filters.search} onChange={(e) => update('search', e.target.value)}
        style={{ flex: 1, minWidth: 100 }}
      />
    </div>
  );
}
