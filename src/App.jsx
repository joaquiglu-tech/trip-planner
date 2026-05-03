import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './lib/useAuth';
import { useItems } from './lib/useItems';
import { useStops } from './lib/useStops';
import { usePlaceData } from './lib/usePlaceData';
import { useExpenses } from './lib/useExpenses';
import Login from './components/Login';
import TopBar from './components/TopBar';
import BottomTabs from './components/BottomTabs';
import TodayPage from './components/TodayPage';
import SelectPage from './components/SelectPage';
import BudgetPage from './components/BudgetPage';
import ProfilePage from './components/ProfilePage';
import AddItemModal from './components/AddItemModal';
import Toast from './components/Toast';

export default function App() {
  const session = useAuth();
  const [activeTab, setActiveTab] = useState('itinerary');
  const [showFab, setShowFab] = useState(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const email = session?.user?.email || '';
  const { items, loaded, files, livePrices, toast, updateItem, setStatus, addItem, deleteItem, setFile, removeFile } = useItems(email);
  const { stops, loaded: stopsLoaded } = useStops();
  const { places, getPlaceData } = usePlaceData();
  const { expenses, addExpense, deleteExpense } = useExpenses();

  const navigateTab = useCallback((tab) => {
    setActiveTab(tab);
    window.history.pushState({ tab }, '', '');
  }, []);

  const [filterCity, setFilterCity] = useState(null);

  useEffect(() => {
    window.history.replaceState({ tab: 'itinerary' }, '', '');
    function handlePopState(e) { if (e.state?.tab) setActiveTab(e.state.tab); }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (session === undefined) return <div className="loading-screen">Loading...</div>;
  if (!session) return <Login />;
  if (!loaded || !stopsLoaded) return <div className="loading-screen">Loading...</div>;

  const isProfile = activeTab === 'profile';

  return (
    <div className="app-shell">
      <TopBar items={items} session={session} onProfileClick={() => navigateTab('profile')} />
      <div className="page-container">
        <SelectPage
          active={activeTab === 'plan'}
          items={items} livePrices={livePrices} expenses={expenses}
          updateItem={updateItem} setStatus={setStatus}
          addItem={addItem} deleteItem={deleteItem}
          userEmail={email} files={files} setFile={setFile} removeFile={removeFile}
          places={places} getPlaceData={getPlaceData}
          filterCity={filterCity} clearFilterCity={() => setFilterCity(null)}
        />
        <BudgetPage
          active={activeTab === 'expenses'}
          items={items} updateItem={updateItem} setStatus={setStatus}
          files={files} setFile={setFile} removeFile={removeFile}
          places={places} getPlaceData={getPlaceData}
          expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense}
          userEmail={email}
        />
        <TodayPage
          active={activeTab === 'itinerary'}
          items={items} stops={stops} livePrices={livePrices} expenses={expenses}
          updateItem={updateItem} setStatus={setStatus} addExpense={addExpense}
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
                <button className="fab-option" onClick={() => { setShowFab(null); setShowAddItem(true); }}>Add reservation</button>
                <button className="fab-option" onClick={() => { setShowFab(null); setActiveTab('expenses'); }}>Add expense</button>
              </div>
            </div>
          )}
          <button className="fab" onClick={() => setShowFab(showFab ? null : 'menu')} aria-label="Add">+</button>
        </>
      )}

      {showAddItem && <AddItemModal onClose={() => setShowAddItem(false)} onAdd={addItem} userEmail={email} />}

      {!isProfile && <BottomTabs activeTab={activeTab} setActiveTab={navigateTab} />}
    </div>
  );
}
