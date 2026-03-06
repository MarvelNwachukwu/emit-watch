"use client";

import { useEffect, useRef, useCallback } from "react";
import type { DecodedEvent, Chain } from "@/lib/types";
import { EventCard } from "./EventCard";
import { EventTable } from "./EventTable";
import { LoadingSkeleton } from "./LoadingSkeleton";

export type ViewMode = "card" | "table";

export function EventFeed({
  events,
  chain,
  isLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  contractDecimals,
  viewMode = "card",
}: {
  events: DecodedEvent[];
  chain: Chain;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  contractDecimals?: number;
  viewMode?: ViewMode;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0].isIntersecting) {
      onLoadMoreRef.current();
    }
  }, []);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, handleIntersect]);

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
      {viewMode === "table" ? (
        <EventTable events={events} chain={chain} contractDecimals={contractDecimals} />
      ) : (
        events.map((event, i) => (
          <EventCard
            key={`${event.transactionHash}-${event.logIndex}-${i}`}
            event={event}
            chain={event.chain ?? chain}
            index={i}
            contractDecimals={contractDecimals}
          />
        ))
      )}

      {hasMore && (
        <div ref={sentinelRef}>
          {isLoadingMore && <LoadingSkeleton count={3} />}
        </div>
      )}
    </div>
  );
}
