import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { APIProvider } from "@vis.gl/react-google-maps";
import { AuthProvider } from "./shared/hooks/useAuth";
import { SettingsProvider } from "./shared/hooks/useSettings";
import { GOOGLE_MAPS_API_KEY } from "./services/supabase";
import ErrorBoundary from "./shared/components/ErrorBoundary";
import "./index.css";
import App from "./App.jsx";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found"); // M51: clear error
createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <SettingsProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </SettingsProvider>
      </APIProvider>
    </ErrorBoundary>
  </StrictMode>,
);
// Signals to the index.html boot fallback that the bundle loaded and mounted
// (a module-load crash would prevent reaching this line → fallback stays).
window.__APP_MOUNTED__ = true;
