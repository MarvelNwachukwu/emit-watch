"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";
import {
  type WatchlistEntry,
  type WatchlistState,
  loadWatchlist,
  saveWatchlist,
} from "@/lib/watchlist";
import { AuthContext } from "@/contexts/AuthContext";

type WatchlistAction =
  | { type: "LOAD"; state: WatchlistState }
  | { type: "ADD"; entry: WatchlistEntry }
  | { type: "REMOVE"; id: string }
  | { type: "SET_ACTIVE"; id: string | null }
  | { type: "UPDATE_LABEL"; id: string; label: string };

function reducer(state: WatchlistState, action: WatchlistAction): WatchlistState {
  switch (action.type) {
    case "LOAD":
      return action.state;
    case "ADD":
      return {
        ...state,
        entries: [...state.entries, action.entry],
        activeId: action.entry.id,
      };
    case "REMOVE": {
      const entries = state.entries.filter((e) => e.id !== action.id);
      return {
        entries,
        activeId: state.activeId === action.id ? null : state.activeId,
      };
    }
    case "SET_ACTIVE":
      return { ...state, activeId: action.id };
    case "UPDATE_LABEL":
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.id ? { ...e, label: action.label } : e
        ),
      };
    default:
      return state;
  }
}

type WatchlistContextValue = {
  state: WatchlistState;
  dispatch: Dispatch<WatchlistAction>;
};

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const isAuthenticated = auth?.status === "authenticated";
  const userId = auth?.userId;
  const getAccessToken = auth?.getAccessToken;

  const [state, dispatch] = useReducer(reducer, { entries: [], activeId: null });
  const hasLoaded = useRef(false);
  const hasSynced = useRef(false);

  // Load from localStorage on mount (always — it's the starting point)
  useEffect(() => {
    dispatch({ type: "LOAD", state: loadWatchlist() });
    hasLoaded.current = true;
  }, []);

  // Persist to localStorage on every change (skip before initial load)
  useEffect(() => {
    if (hasLoaded.current) {
      saveWatchlist(state);
    }
  }, [state]);

  // Sync localStorage → DB on first sign-in
  const syncToDb = useCallback(async () => {
    if (!userId || !getAccessToken || hasSynced.current) return;
    hasSynced.current = true;

    const token = await getAccessToken();
    if (!token) return;

    const localState = loadWatchlist();
    if (localState.entries.length === 0) return;

    try {
      await fetch("/api/watchlist/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entries: localState.entries.map((e) => ({
            address: e.address,
            chain: e.chain,
            label: e.label,
          })),
        }),
      });
    } catch {
      // Sync failed — localStorage remains the source of truth
      hasSynced.current = false;
    }
  }, [userId, getAccessToken]);

  useEffect(() => {
    if (isAuthenticated && userId) {
      syncToDb();
    }
  }, [isAuthenticated, userId, syncToDb]);

  return (
    <WatchlistContext.Provider value={{ state, dispatch }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error("useWatchlist must be used within WatchlistProvider");
  return ctx;
}
