import type { Chain } from "./types";

export type WatchlistEntry = {
  id: string;
  address: string;
  chain: Chain;
  label: string;
  addedAt: number;
};

export type WatchlistState = {
  entries: WatchlistEntry[];
  activeId: string | null; // null = "All" (unified feed)
};

const STORAGE_KEY = "eventwatch:watchlist";

export function loadWatchlist(): WatchlistState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], activeId: null };
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.entries)) {
      return parsed as WatchlistState;
    }
  } catch {
    // Corrupted data
  }
  return { entries: [], activeId: null };
}

export function saveWatchlist(state: WatchlistState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}
