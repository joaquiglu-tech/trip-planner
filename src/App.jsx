import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './lib/useAuth';
import { useSelections } from './lib/useSelections';
import { useCustomItems } from './lib/useCustomItems';
import { usePlaceData } from './lib/usePlaceData';
import Login from './components/Login';
import TopBar from './components/TopBar';
import BottomTabs from './components/BottomTabs';
import ItineraryPage from './components/ItineraryPage';
import SelectPage from './components/SelectPage';
import MapPage from './components/MapPage';
import BudgetPage from './components/BudgetPage';
import ProfilePage from './components/ProfilePage';
import Toast from './components/Toast';

export default function App() {
  const session = useAuth();
  const [activeTab, setActiveTab] = useState('itinerary');
  const email = session?.user?.email || '';
  const { S, setStatus, loaded, paidPrices, setPaidPrice, toast, refresh } = useSelections(email);
  const { customItems, addItem, deleteItem } = useCustomItems();
  const { places, getPlaceData } = usePlaceData();
  const [files] = useState({});

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
  if (!loaded) return <div className="loading-screen">Loading trip data...</div>;

  const isProfile = activeTab === 'profile';

  return (
    <div className="app-shell">
      <TopBar S={S} session={session} onProfileClick={() => navigateTab('profile')} />
      <div className="page-container">
        <ItineraryPage active={activeTab === 'itinerary'} S={S} />
        <SelectPage
          active={activeTab === 'planner'}
          S={S} setStatus={setStatus} onRefresh={refresh}
          customItems={customItems} addItem={addItem} deleteItem={deleteItem}
          userEmail={email} paidPrices={paidPrices} setPaidPrice={setPaidPrice}
          places={places} getPlaceData={getPlaceData}
        />
        <MapPage active={activeTab === 'map'} S={S} />
        <BudgetPage active={activeTab === 'budget'} S={S} paidPrices={paidPrices} files={files} />
        <ProfilePage active={isProfile} session={session} />
      </div>
      <Toast message={toast} />
      {!isProfile && <BottomTabs activeTab={activeTab} setActiveTab={navigateTab} />}
    </div>
  );
}
