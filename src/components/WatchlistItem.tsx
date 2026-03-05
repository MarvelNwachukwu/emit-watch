"use client";

import { useState } from "react";
import type { WatchlistEntry } from "@/lib/watchlist";
import { CHAINS } from "@/lib/chains";

export function WatchlistItem({
  entry,
  isActive,
  eventCount,
  onSelect,
  onRemove,
  onRename,
}: {
  entry: WatchlistEntry;
  isActive: boolean;
  eventCount?: number;
  onSelect: () => void;
  onRemove: () => void;
  onRename: (label: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.label);

  function handleRename() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== entry.label) {
      onRename(trimmed);
    }
    setIsEditing(false);
  }

  return (
    <button
      type="button"
      className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] transition-colors cursor-pointer ${
        isActive
          ? "bg-accent/10 text-foreground"
          : "text-muted hover:bg-surface-elevated hover:text-foreground"
      }`}
      onClick={onSelect}
    >
      {/* Active indicator */}
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          isActive ? "bg-accent" : "bg-muted/30"
        }`}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded border border-accent/30 bg-background px-1.5 py-0.5 text-[12px] font-medium text-foreground outline-none"
          />
        ) : (
          <span
            className="truncate font-medium"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            {entry.label}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[10px] text-muted">
          <span className="rounded bg-surface px-1 py-px font-mono">
            {CHAINS[entry.chain].name}
          </span>
          {eventCount !== undefined && (
            <span>{eventCount.toLocaleString()} events</span>
          )}
        </span>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="shrink-0 rounded p-0.5 text-muted opacity-0 transition-all hover:text-[#fb7185] group-hover:opacity-100"
        aria-label={`Remove ${entry.label} from watchlist`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </button>
  );
}
