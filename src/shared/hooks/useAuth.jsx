import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../services/supabase";
import { purgeDataCache } from "../../services/swCache";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    let mounted = true; // L02: don't setState after unmount
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (mounted) setSession(session);
      })
      .catch((err) => {
        console.error("Auth session error:", err);
        if (mounted) setSession(null);
      });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
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
    return () => {
      mounted = false;
      data?.subscription?.unsubscribe(); // guard: may be absent on error
    };
    // L36: dropped the 10-min getSession poll — onAuthStateChange already
    // fires SIGNED_OUT/TOKEN_REFRESHED, and the poll only read local storage.
  }, []);

  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
