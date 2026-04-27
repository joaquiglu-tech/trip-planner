import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { useAuth } from './lib/useAuth';
import { useSelections } from './lib/useSelections';
import { useCustomItems } from './lib/useCustomItems';
import { usePlaceData } from './lib/usePlaceData';
import { useExpenses } from './lib/useExpenses';
import Login from './components/Login';
import TopBar from './components/TopBar';
import BottomTabs from './components/BottomTabs';
import ItineraryPage from './components/ItineraryPage';
import Toast from './components/Toast';

// Lazy-load non-initial tabs
const SelectPage = lazy(() => import('./components/SelectPage'));
const BudgetPage = lazy(() => import('./components/BudgetPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));

export default function App() {
  const session = useAuth();
  const [activeTab, setActiveTab] = useState('itinerary');
  const email = session?.user?.email || '';
  const { S, setStatus, loaded, paidPrices, setPaidPrice, notes, setNote, files, setFile, toast, refresh } = useSelections(email);
  const { customItems, addItem, deleteItem } = useCustomItems();
  const { places, getPlaceData } = usePlaceData();
  const { expenses, addExpense, deleteExpense } = useExpenses();

  const navigateTab = useCallback((tab) => {
    setActiveTab(tab);
    window.history.pushState({ tab }, '', '');
  }, []);

  useEffect(() => {
    window.history.replaceState({ tab: 'itinerary' }, '', '');
    function handlePopState(e) { if (e.state?.tab) setActiveTab(e.state.tab); }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (session === undefined) return <div className="loading-screen">Loading...</div>;
  if (!session) return <Login />;
  if (!loaded) return <div className="loading-screen">Loading...</div>;

  const isProfile = activeTab === 'profile';

  return (
    <div className="app-shell">
      <TopBar S={S} session={session} onProfileClick={() => navigateTab('profile')} />
      <div className="page-container">
        {activeTab === 'itinerary' && <ItineraryPage active S={S} />}
        <Suspense fallback={<div className="loading-screen">Loading...</div>}>
          {activeTab === 'planner' && (
            <SelectPage
              active
              S={S} setStatus={setStatus} onRefresh={refresh}
              customItems={customItems} addItem={addItem} deleteItem={deleteItem}
              userEmail={email} paidPrices={paidPrices} setPaidPrice={setPaidPrice}
              notes={notes} setNote={setNote} files={files} setFile={setFile}
              places={places} getPlaceData={getPlaceData}
            />
          )}
          {activeTab === 'budget' && (
            <BudgetPage
              active
              S={S} paidPrices={paidPrices} files={files}
              expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense}
              userEmail={email}
            />
          )}
          {isProfile && <ProfilePage active session={session} />}
        </Suspense>
      </div>
      <Toast message={toast} />
      {!isProfile && <BottomTabs activeTab={activeTab} setActiveTab={navigateTab} />}
    </div>
  );
}
