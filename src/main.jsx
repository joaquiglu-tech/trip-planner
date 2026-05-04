import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AuthProvider } from './shared/hooks/useAuth';
import { SettingsProvider } from './shared/hooks/useSettings';
import { GOOGLE_MAPS_API_KEY } from './services/supabase';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <SettingsProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SettingsProvider>
    </APIProvider>
  </StrictMode>,
);
