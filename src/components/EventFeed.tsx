"use client";

import type { DecodedEvent, Chain } from "@/lib/types";
import { EventCard } from "./EventCard";
import { LoadingSkeleton } from "./LoadingSkeleton";

export function EventFeed({
  events,
  chain,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
}: {
  events: DecodedEvent[];
  chain: Chain;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (events.length === 0) {
    return (
      <div className="animate-fade-up flex flex-col items-center gap-4 py-16 text-center">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 9h18M7 13h10M7 16h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-muted" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-muted">No events found</p>
          <p className="mt-1 text-[11px] text-muted/60">Try a wider block range or check the contract address</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event, i) => (
        <EventCard
          key={`${event.transactionHash}-${event.logIndex}-${i}`}
          event={event}
          chain={chain}
          index={i}
        />
      ))}

      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="group mx-auto mt-2 flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-[12px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground disabled:opacity-50"
        >
          {isLoadingMore ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Fetching older events...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-y-0.5">
                <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Load Older Events
            </>
          )}
        </button>
      )}
    </div>
  );
}
