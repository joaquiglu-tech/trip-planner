import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './shared/hooks/useAuth';
import { TripProvider, useTrip } from './shared/hooks/TripContext';
import Login from './features/auth/Login';
import TopBar from './shared/components/TopBar';
import BottomTabs from './shared/components/BottomTabs';
import TodayPage from './features/itinerary/TodayPage';
import SelectPage from './features/plan/SelectPage';
import BudgetPage from './features/expenses/BudgetPage';
import ProfilePage from './features/auth/ProfilePage';
import AddItemModal from './shared/modals/AddItemModal';
import AddExpenseModal from './shared/modals/AddExpenseModal';
import AddStopModal from './shared/modals/AddStopModal';
import Toast from './shared/components/Toast';

function getTabFromHash() {
  const hash = window.location.hash.replace('#/', '').split('/')[0];
  if (['plan', 'expenses', 'itinerary', 'profile'].includes(hash)) return hash;
  return 'itinerary';
}

export default function App() {
  const session = useAuth();
  if (session === undefined) return <div className="loading-screen">Loading...</div>;
  if (!session) return <Login />;
  return (
    <TripProvider email={session.user?.email || ''}>
      <AppShell session={session} />
    </TripProvider>
  );
}

function AppShell({ session }) {
  const { items, loaded, stops, stopsLoaded, toast, addItem, addStop, addExpense, expenses, email } = useTrip();
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [showFab, setShowFab] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddStop, setShowAddStop] = useState(false);
  const [filterCity, setFilterCity] = useState(null);

  const navigateTab = useCallback((tab) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  }, []);

  useEffect(() => {
    if (!window.location.hash) window.location.hash = `#/${activeTab}`;
    function handleHashChange() { setActiveTab(getTabFromHash()); }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!loaded || !stopsLoaded) return <div className="loading-screen">Loading...</div>;

  const isProfile = activeTab === 'profile';

  return (
    <div className="app-shell">
      <TopBar items={items} stops={stops} session={session} onProfileClick={() => navigateTab('profile')} />
      <div className="page-container">
        <SelectPage active={activeTab === 'plan'} filterCity={filterCity} clearFilterCity={() => setFilterCity(null)} />
        <BudgetPage active={activeTab === 'expenses'} />
        <TodayPage active={activeTab === 'itinerary'} />
        <ProfilePage active={isProfile} session={session} />
      </div>
      <Toast message={toast} />

      {!isProfile && (
        <>
          {showFab === 'menu' && (
            <div className="fab-overlay" onClick={() => setShowFab(null)}>
              <div className="fab-menu" onClick={(e) => e.stopPropagation()}>
                <button className="fab-option" onClick={() => { setShowFab(null); setShowAddStop(true); }}>Add stop</button>
                <button className="fab-option" onClick={() => { setShowFab(null); setShowAddItem(true); }}>Add item</button>
                <button className="fab-option" onClick={() => { setShowFab(null); setShowAddExpense(true); }}>Add expense</button>
              </div>
            </div>
          )}
          <button className="fab" onClick={() => setShowFab(showFab ? null : 'menu')} aria-label="Add">+</button>
        </>
      )}

      {showAddStop && <AddStopModal onAdd={addStop} onClose={() => setShowAddStop(false)} />}
      {showAddItem && <AddItemModal onClose={() => setShowAddItem(false)} onAdd={addItem} stops={stops} userEmail={email} />}
      {showAddExpense && <AddExpenseModal items={items} stops={stops} onAdd={addExpense} onClose={() => setShowAddExpense(false)} userEmail={email} />}

      {!isProfile && <BottomTabs activeTab={activeTab} setActiveTab={navigateTab} />}
    </div>
  );
}
