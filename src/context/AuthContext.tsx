import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, attempt to restore a persisted session.
  // restoreSession() silently refreshes the access token if it has expired,
  // so the app is always ready to make API calls.
  useEffect(() => {
    window.auth
      .restoreSession()
      .then((u) => setUser(u))
      .catch((err) => console.error('[auth] Session restore failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async () => {
    const u = await window.auth.signIn();
    if (u) setUser(u);
  };

  const signOut = async () => {
    await window.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
