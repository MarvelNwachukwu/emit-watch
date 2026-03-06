"use client";

import { useState } from "react";
import { useWatchlist } from "@/contexts/WatchlistContext";
import { WatchlistItem } from "./WatchlistItem";
import type { Chain } from "@/lib/types";
import { isValidAddress, truncateAddress } from "@/lib/utils";

export function WatchlistSidebar({
  eventCounts,
  onAddContract,
}: {
  eventCounts: Record<string, number>;
  onAddContract?: (address: string, chain: Chain) => void;
}) {
  const { state, dispatch } = useWatchlist();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newChain, setNewChain] = useState<Chain>("ethereum");
  const [newLabel, setNewLabel] = useState("");

  function handleAdd() {
    const address = newAddress.trim();
    if (!isValidAddress(address)) return;
    const label = newLabel.trim() || truncateAddress(address);
    const entry = {
      id: crypto.randomUUID(),
      address,
      chain: newChain,
      label,
      addedAt: Date.now(),
    };
    dispatch({ type: "ADD", entry });
    setNewAddress("");
    setNewLabel("");
    setShowAddForm(false);
    onAddContract?.(address, newChain);
  }

  if (state.entries.length === 0 && !showAddForm) {
    return null;
  }

  return (
    <div className="flex w-full shrink-0 flex-col gap-1 lg:w-[260px]">
      <div className="flex items-center justify-between px-3 pb-1">
        <h2 className="font-display text-[11px] font-semibold uppercase tracking-wider text-muted">
          Watchlist
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded p-1 text-muted transition-colors hover:text-accent"
          title="Add contract"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mx-1 mb-2 flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="0x..."
            className="h-8 w-full rounded border border-border bg-background px-2 font-mono text-[11px] text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none"
            spellCheck={false}
          />
          <div className="flex gap-2">
            <select
              value={newChain}
              onChange={(e) => setNewChain(e.target.value as Chain)}
              className="h-8 flex-1 appearance-none rounded border border-border bg-background px-2 text-[11px] text-foreground focus:border-accent focus:outline-none"
            >
              <option value="ethereum">Ethereum</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="polygon">Polygon</option>
            </select>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional)"
              className="h-8 flex-1 rounded border border-border bg-background px-2 text-[11px] text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!isValidAddress(newAddress.trim())}
              className="flex-1 rounded bg-accent px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
            >
              Add
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded border border-border px-3 py-1.5 text-[11px] text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* "All" option */}
      {state.entries.length > 1 && (
        <button
          type="button"
          onClick={() => dispatch({ type: "SET_ACTIVE", id: null })}
          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] transition-colors ${
            state.activeId === null
              ? "bg-accent/10 font-medium text-foreground"
              : "text-muted hover:bg-surface-elevated hover:text-foreground"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              state.activeId === null ? "bg-accent" : "bg-muted/30"
            }`}
          />
          <span>All Contracts</span>
          <span className="ml-auto text-[10px] text-muted">
            {state.entries.length}
          </span>
        </button>
      )}

      {/* Entries */}
      {state.entries.map((entry) => (
        <WatchlistItem
          key={entry.id}
          entry={entry}
          isActive={state.activeId === entry.id}
          eventCount={eventCounts[`${entry.chain}:${entry.address.toLowerCase()}`]}
          onSelect={() => dispatch({ type: "SET_ACTIVE", id: entry.id })}
          onRemove={() => dispatch({ type: "REMOVE", id: entry.id })}
          onRename={(label) => dispatch({ type: "UPDATE_LABEL", id: entry.id, label })}
        />
      ))}
    </div>
  );
}
