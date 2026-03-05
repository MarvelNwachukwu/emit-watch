"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { usePrivy } from "@privy-io/react-auth";

export type AuthStatus = "loading" | "unauthenticated" | "authenticated";
export type Tier = "free" | "pro";

type AuthState = {
  status: AuthStatus;
  address: string | null;
  userId: string | null;
  tier: Tier;
  signIn: () => void;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

type DbState = { userId: string | null; tier: Tier };
type DbAction =
  | { type: "SET"; userId: string; tier: Tier }
  | { type: "RESET" };

function dbReducer(_state: DbState, action: DbAction): DbState {
  switch (action.type) {
    case "SET":
      return { userId: action.userId, tier: action.tier };
    case "RESET":
      return { userId: null, tier: "free" };
  }
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const [dbState, dbDispatch] = useReducer(dbReducer, { userId: null, tier: "free" });

  const wallet = user?.wallet;
  const address = wallet?.address?.toLowerCase() ?? null;

  // Sync Privy user to our DB + fetch tier
  useEffect(() => {
    if (!authenticated || !address) {
      dbDispatch({ type: "RESET" });
      return;
    }

    let cancelled = false;
    getAccessToken().then((token) => {
      if (cancelled || !token) return;
      fetch("/api/auth/session", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (cancelled) return;
          dbDispatch({
            type: "SET",
            userId: data.userId ?? null,
            tier: data.tier ?? "free",
          });
        })
        .catch(() => {});
    });

    return () => { cancelled = true; };
  }, [authenticated, address, getAccessToken]);

  const handleSignOut = useCallback(async () => {
    await logout();
    dbDispatch({ type: "RESET" });
  }, [logout]);

  const status: AuthStatus = !ready
    ? "loading"
    : authenticated
      ? "authenticated"
      : "unauthenticated";

  return (
    <AuthContext.Provider
      value={{
        status,
        address,
        userId: dbState.userId,
        tier: dbState.tier,
        signIn: login,
        signOut: handleSignOut,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
