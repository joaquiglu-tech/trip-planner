const TABS = [
  { id: 'overview', icon: '🗺', label: 'Overview' },
  { id: 'itinerary', icon: '📅', label: 'Itinerary' },
  { id: 'roadtrip', icon: '🚗', label: 'Road Trip' },
  { id: 'select', icon: '☑️', label: 'Select & Price' },
];

export default function Sidebar({ open, setOpen, activeTab, setActiveTab }) {
  function navigate(id) {
    setActiveTab(id);
    setOpen(false);
  }

  return (
    <>
      {/* Overlay */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">🇪🇸🇮🇹 Trip Planner</span>
          <button className="sidebar-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`sidebar-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => navigate(t.id)}
            >
              <span className="sidebar-icon">{t.icon}</span>
              <span className="sidebar-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
