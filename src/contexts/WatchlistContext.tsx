"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
  type Dispatch,
} from "react";
import {
  type WatchlistEntry,
  type WatchlistState,
  loadWatchlist,
  saveWatchlist,
} from "@/lib/watchlist";

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
  const [state, dispatch] = useReducer(reducer, { entries: [], activeId: null });
  const hasLoaded = useRef(false);

  // Load from localStorage on mount
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
