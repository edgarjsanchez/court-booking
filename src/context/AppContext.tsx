import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "../domain/types";
import { authService, bookingService } from "../services";

interface Toast {
  id: number;
  kind: "success" | "error";
  text: string;
}

interface AppState {
  user: User | null;
  authReady: boolean;
  authMode: "demo" | "neon";
  signInDemo: (userId: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Bumps whenever bookings may have changed, so screens know to reload. */
  dataVersion: number;
  refreshData: () => void;
  toast: Toast | null;
  notify: (kind: Toast["kind"], text: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    authService
      .currentUser()
      .catch(() => null)
      .then((u) => {
        setUser(u);
        setAuthReady(true);
      });
  }, []);

  const refreshData = useCallback(() => setDataVersion((v) => v + 1), []);

  // Pick up bookings made elsewhere.
  useEffect(() => bookingService.subscribe(refreshData), [refreshData]);

  const notify = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now();
    setToast({ id, kind, text });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4000);
  }, []);

  const afterSignIn = useCallback(
    (u: User) => {
      setUser(u);
      refreshData();
    },
    [refreshData],
  );

  const signInDemo = useCallback(
    async (userId: string) => afterSignIn(await authService.signInAsDemoUser!(userId)),
    [afterSignIn],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => afterSignIn(await authService.signInWithEmail!(email, password)),
    [afterSignIn],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => afterSignIn(await authService.signUp!(name, email, password)),
    [afterSignIn],
  );

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
    refreshData();
  }, [refreshData]);

  return (
    <AppContext.Provider
      value={{
        user,
        authReady,
        authMode: authService.mode,
        signInDemo,
        signInWithEmail,
        signUp,
        signOut,
        dataVersion,
        refreshData,
        toast,
        notify,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
