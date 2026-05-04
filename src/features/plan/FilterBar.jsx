import { useMemo } from 'react';

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'food', label: 'Food' },
  { value: 'stay', label: 'Stays' },
  { value: 'activity', label: 'Activities' },
  { value: 'transport', label: 'Transport' },
];

const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'sel', label: 'Selected' },
  { value: 'conf', label: 'Booked' },
  { value: 'none', label: 'Not added' },
];

const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'name-asc', label: 'Name: A → Z' },
  { value: 'name-desc', label: 'Name: Z → A' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
  { value: 'date-asc', label: 'Date: Soonest' },
  { value: 'date-desc', label: 'Date: Latest' },
  { value: 'status', label: 'Status' },
];

export default function FilterBar({ filters, setFilters, items, sortBy, setSortBy }) {
  const cities = useMemo(() => {
    const set = new Set((items || []).map(i => i.city).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const update = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  return (
    <div className="plan-filters">
      {/* Row 1: Search + Sort */}
      <div className="plan-filter-row plan-filter-row-top">
        <input
          type="search" className="plan-search" placeholder="Search items..."
          value={filters.search} onChange={(e) => update('search', e.target.value)}
        />
        <select className="plan-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Row 2: Type */}
      <div className="plan-filter-row">
        <span className="plan-filter-label">Type</span>
        <div className="plan-filter-pills">
          {TYPES.map((t) => (
            <button key={t.value} className={`fp ${filters.type === t.value ? 'fp-active' : ''}`} onClick={() => update('type', t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: Status */}
      <div className="plan-filter-row">
        <span className="plan-filter-label">Status</span>
        <div className="plan-filter-pills">
          {STATUSES.map((s) => (
            <button key={s.value} className={`fp ${filters.status === s.value ? 'fp-active' : ''}`} onClick={() => update('status', s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 4: City */}
      <div className="plan-filter-row">
        <span className="plan-filter-label">City</span>
        <select className="plan-filter-select" value={filters.city} onChange={(e) => update('city', e.target.value)}>
          {cities.map((c) => <option key={c} value={c}>{c === 'all' ? 'All cities' : c}</option>)}
        </select>
      </div>
    </div>
  );
}
