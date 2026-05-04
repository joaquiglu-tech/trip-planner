import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './shared/hooks/useAuth';
import { useItems } from './shared/hooks/useItems';
import { useStops } from './shared/hooks/useStops';
import { usePlaceData } from './shared/hooks/usePlaceData';
import { useExpenses } from './shared/hooks/useExpenses';
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
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [showFab, setShowFab] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddStop, setShowAddStop] = useState(false);
  const email = session?.user?.email || '';
  const { items, loaded, files, livePrices, toast, updateItem, setStatus, addItem, deleteItem, setFile, removeFile } = useItems(email);
  const { stops, loaded: stopsLoaded, updateStop, addStop, deleteStop } = useStops();
  const { places, getPlaceData } = usePlaceData();
  const { expenses, addExpense, deleteExpense } = useExpenses();

  const navigateTab = useCallback((tab) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  }, []);

  const [filterCity, setFilterCity] = useState(null);

  useEffect(() => {
    if (!window.location.hash) window.location.hash = `#/${activeTab}`;
    function handleHashChange() { setActiveTab(getTabFromHash()); }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (session === undefined) return <div className="loading-screen">Loading...</div>;
  if (!session) return <Login />;
  if (!loaded || !stopsLoaded) return <div className="loading-screen">Loading...</div>;

  const isProfile = activeTab === 'profile';

  return (
    <div className="app-shell">
      <TopBar items={items} stops={stops} session={session} onProfileClick={() => navigateTab('profile')} />
      <div className="page-container">
        <SelectPage
          active={activeTab === 'plan'}
          items={items} livePrices={livePrices} expenses={expenses}
          updateItem={updateItem} setStatus={setStatus}
          addItem={addItem} deleteItem={deleteItem}
          userEmail={email} stops={stops} files={files} setFile={setFile} removeFile={removeFile}
          places={places} getPlaceData={getPlaceData}
          filterCity={filterCity} clearFilterCity={() => setFilterCity(null)}
        />
        <BudgetPage
          active={activeTab === 'expenses'}
          items={items} stops={stops} livePrices={livePrices}
          updateItem={updateItem} setStatus={setStatus}
          files={files} setFile={setFile} removeFile={removeFile}
          places={places} getPlaceData={getPlaceData}
          expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense}
          userEmail={email}
        />
        <TodayPage
          active={activeTab === 'itinerary'}
          items={items} stops={stops} livePrices={livePrices} expenses={expenses}
          updateItem={updateItem} updateStop={updateStop} deleteStop={deleteStop} setStatus={setStatus} addExpense={addExpense} addItem={addItem}
          files={files} setFile={setFile} removeFile={removeFile}
          places={places} getPlaceData={getPlaceData}
        />
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
