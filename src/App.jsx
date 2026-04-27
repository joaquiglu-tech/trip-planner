import { useState } from 'react';
import { useAuth } from './lib/useAuth';
import { useSelections } from './lib/useSelections';
import Login from './components/Login';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import OverviewPage from './components/OverviewPage';
import ItineraryPage from './components/ItineraryPage';
import RoadTripPage from './components/RoadTripPage';
import SelectPage from './components/SelectPage';
import ProfilePage from './components/ProfilePage';
import Toast from './components/Toast';

export default function App() {
  const session = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const email = session?.user?.email || '';
  const { S, setStatus, loaded, updatedBy, toast, refresh } = useSelections(email);

  if (session === undefined) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!session) return <Login />;

  if (!loaded) {
    return <div className="loading-screen">Loading trip data...</div>;
  }

  return (
    <div className="app-shell">
      <TopBar
        S={S}
        session={session}
        onMenuClick={() => setSidebarOpen(true)}
        onProfileClick={() => setActiveTab('profile')}
      />
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="page-container">
        <OverviewPage active={activeTab === 'overview'} />
        <ItineraryPage active={activeTab === 'itinerary'} setActiveTab={setActiveTab} />
        <RoadTripPage active={activeTab === 'roadtrip'} />
        <SelectPage active={activeTab === 'select'} S={S} setStatus={setStatus} updatedBy={updatedBy} onRefresh={refresh} />
        <ProfilePage active={activeTab === 'profile'} session={session} />
      </div>
      <Toast message={toast} />
    </div>
  );
}
