import { useMemo, useState } from 'react';

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

function SortSheet({ sortBy, setSortBy, onClose }) {
  return (
    <div className="bsheet-overlay" onClick={onClose}>
      <div className="bsheet" onClick={(e) => e.stopPropagation()}>
        <div className="bsheet-header">
          <span className="bsheet-title">Sort by</span>
          <button className="bsheet-close" onClick={onClose}>✕</button>
        </div>
        <div className="bsheet-body">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              className={`bsheet-option${sortBy === o.value ? ' bsheet-option-active' : ''}`}
              onClick={() => { setSortBy(o.value); onClose(); }}
            >
              {o.label}
              {sortBy === o.value && <span className="bsheet-check">✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterSheet({ filters, setFilters, cities, onClose }) {
  const update = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const hasActive = filters.type !== 'all' || filters.status !== 'all' || filters.city !== 'all';

  const clearAll = () => {
    setFilters((f) => ({ ...f, type: 'all', status: 'all', city: 'all' }));
  };

  return (
    <div className="bsheet-overlay" onClick={onClose}>
      <div className="bsheet" onClick={(e) => e.stopPropagation()}>
        <div className="bsheet-header">
          <span className="bsheet-title">Filter</span>
          <button className="bsheet-close" onClick={onClose}>✕</button>
        </div>
        <div className="bsheet-body">
          <div className="bsheet-section">
            <div className="bsheet-section-label">Type</div>
            <div className="plan-filter-pills">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  className={`fp${filters.type === t.value ? ' fp-active' : ''}`}
                  onClick={() => update('type', t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bsheet-section">
            <div className="bsheet-section-label">Status</div>
            <div className="plan-filter-pills">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  className={`fp${filters.status === s.value ? ' fp-active' : ''}`}
                  onClick={() => update('status', s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bsheet-section">
            <div className="bsheet-section-label">City</div>
            <select
              className="plan-filter-select"
              value={filters.city}
              onChange={(e) => update('city', e.target.value)}
            >
              {cities.map((c) => (
                <option key={c} value={c}>{c === 'all' ? 'All cities' : c}</option>
              ))}
            </select>
          </div>

          {hasActive && (
            <button className="bsheet-reset" onClick={clearAll}>Clear all filters</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FilterBar({ filters, setFilters, items, sortBy, setSortBy }) {
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const cities = useMemo(() => {
    const set = new Set((items || []).map(i => i.city).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [items]);

  const update = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  const activeFilterCount = [
    filters.type !== 'all',
    filters.status !== 'all',
    filters.city !== 'all',
  ].filter(Boolean).length;

  const activeSortLabel = sortBy !== 'default'
    ? SORT_OPTIONS.find(o => o.value === sortBy)?.label
    : null;

  return (
    <>
      <div className="plan-filters-compact">
        <input
          type="search"
          className="plan-search"
          placeholder="Search items..."
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
        />
        <div className="plan-filter-btns">
          <button
            className={`plan-filter-btn${sortBy !== 'default' ? ' plan-filter-btn-active' : ''}`}
            onClick={() => setShowSort(true)}
          >
            {activeSortLabel ? `Sort: ${activeSortLabel}` : 'Sort'}
          </button>
          <button
            className={`plan-filter-btn${activeFilterCount > 0 ? ' plan-filter-btn-active' : ''}`}
            onClick={() => setShowFilter(true)}
          >
            {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}
          </button>
        </div>
      </div>

      {showSort && (
        <SortSheet sortBy={sortBy} setSortBy={setSortBy} onClose={() => setShowSort(false)} />
      )}
      {showFilter && (
        <FilterSheet
          filters={filters}
          setFilters={setFilters}
          cities={cities}
          onClose={() => setShowFilter(false)}
        />
      )}
    </>
  );
}
