import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { purgeDataCache } from "../../services/swCache";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session))
      .catch((err) => {
        console.error("Auth session error:", err);
        setSession(null);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "TOKEN_REFRESHED") {
        console.log("Session refreshed");
      }
      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        // Session expired or refresh failed — force re-auth
        setSession(null);
        // M43: drop cached private data so it isn't served while logged out.
        purgeDataCache();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(
      () => {
        supabase.auth
          .getSession()
          .then(({ data: { session } }) => {
            if (!session) setSession(null);
          })
          .catch(() => setSession(null));
      },
      10 * 60 * 1000,
    ); // check every 10 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
