import React from "react";
import { createSupabaseBrowserClientFrom, loadSupabaseBrowserConfig } from "./supabaseClient.js";

const AuthContext = React.createContext(null);
const ACCESS_TOKEN_KEY = "hermes.auth.accessToken";

function writeAccessToken(session) {
  if (typeof window === "undefined") return;
  if (session?.access_token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function AuthProvider({ children }) {
  const [supabase, setSupabase] = React.useState(null);
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    let subscription = null;

    async function load() {
      const config = await loadSupabaseBrowserConfig();
      if (!mounted) {
        return;
      }

      const client = createSupabaseBrowserClientFrom(config);
      setSupabase(client);

      if (!client) {
        setSession(null);
        setLoading(false);
        return;
      }

      const { data } = await client.auth.getSession();
      if (mounted) {
        setSession(data.session || null);
        writeAccessToken(data.session || null);
        const authState = client.auth.onAuthStateChange((_event, nextSession) => {
          if (mounted) {
            setSession(nextSession || null);
            writeAccessToken(nextSession || null);
            setLoading(false);
          }
        });
        subscription = authState?.data?.subscription || null;
        setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signOut = React.useCallback(async () => {
    if (!supabase) {
      setSession(null);
      writeAccessToken(null);
      return { error: null };
    }

    const result = await supabase.auth.signOut();
    setSession(null);
    writeAccessToken(null);
    return result;
  }, [supabase]);

  const value = React.useMemo(() => ({ supabase, session, loading, signOut }), [supabase, session, loading, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
