import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './lib/useAuth';
import { useSelections } from './lib/useSelections';
import { useCustomItems } from './lib/useCustomItems';
import { usePlaceData } from './lib/usePlaceData';
import { useExpenses } from './lib/useExpenses';
import Login from './components/Login';
import TopBar from './components/TopBar';
import BottomTabs from './components/BottomTabs';
import HomePage from './components/HomePage';
import TodayPage from './components/TodayPage';
import SelectPage from './components/SelectPage';
import BudgetPage from './components/BudgetPage';
import ProfilePage from './components/ProfilePage';
import AddItemModal from './components/AddItemModal';
import Toast from './components/Toast';

export default function App() {
  const session = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [showFab, setShowFab] = useState(null); // null=closed, 'menu'=menu open
  const [showAddItem, setShowAddItem] = useState(false);
  const email = session?.user?.email || '';
  const { S, setStatus, loaded, paidPrices, setPaidPrice, notes, setNote, files, setFile, toast, refresh } = useSelections(email);
  const { customItems, addItem, deleteItem } = useCustomItems();
  const { places, getPlaceData } = usePlaceData();
  const { expenses, addExpense, deleteExpense } = useExpenses();

  const navigateTab = useCallback((tab) => {
    setActiveTab(tab);
    window.history.pushState({ tab }, '', '');
  }, []);

  const [filterCity, setFilterCity] = useState(null);

  // Navigate to Plan filtered by city (from Home destination cards)
  const navigatePlanCity = useCallback((city) => {
    setActiveTab('plan');
    setFilterCity(city);
    window.history.pushState({ tab: 'plan', city }, '', '');
  }, []);

  useEffect(() => {
    window.history.replaceState({ tab: 'home' }, '', '');
    function handlePopState(e) { if (e.state?.tab) setActiveTab(e.state.tab); }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (session === undefined) return <div className="loading-screen">Loading...</div>;
  if (!session) return <Login />;
  if (!loaded) return <div className="loading-screen">Loading...</div>;

  const isProfile = activeTab === 'profile';
  const detailProps = { S, setStatus, paidPrices, setPaidPrice, notes, setNote, files, setFile, places, getPlaceData };

  return (
    <div className="app-shell">
      <TopBar S={S} session={session} onProfileClick={() => navigateTab('profile')} />
      <div className="page-container">
        <HomePage active={activeTab === 'home'} S={S} paidPrices={paidPrices} onNavigatePlan={navigatePlanCity} />
        <SelectPage
          active={activeTab === 'plan'}
          S={S} setStatus={setStatus} onRefresh={refresh}
          customItems={customItems} addItem={addItem} deleteItem={deleteItem}
          userEmail={email} paidPrices={paidPrices} setPaidPrice={setPaidPrice}
          notes={notes} setNote={setNote} files={files} setFile={setFile}
          places={places} getPlaceData={getPlaceData}
          filterCity={filterCity} clearFilterCity={() => setFilterCity(null)}
        />
        <BudgetPage
          active={activeTab === 'expenses'}
          S={S} setStatus={setStatus} paidPrices={paidPrices} setPaidPrice={setPaidPrice}
          notes={notes} setNote={setNote} files={files} setFile={setFile}
          places={places} getPlaceData={getPlaceData}
          expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense}
          userEmail={email}
        />
        <TodayPage active={activeTab === 'itinerary'} {...detailProps} />
        <ProfilePage active={isProfile} session={session} />
      </div>
      <Toast message={toast} />

      {/* Global FAB */}
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
