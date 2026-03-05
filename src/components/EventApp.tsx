"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Abi } from "viem";
import type { Chain, ContractMeta, DecodedEvent } from "@/lib/types";
import { eventsToCsv, truncateAddress } from "@/lib/utils";
import { getContractLabel } from "@/lib/contracts";
import { useWatchlist } from "@/contexts/WatchlistContext";
import {
  useContractAbi,
  useContractEvents,
  useContractDecimals,
} from "@/hooks/useContractData";
import { AddressInput } from "./AddressInput";
import { ManualAbiInput } from "./ManualAbiInput";
import { ContractHeader } from "./ContractHeader";
import { EventFilter } from "./EventFilter";
import { EventFeed } from "./EventFeed";
import { DashboardLayout } from "./DashboardLayout";
import type { ViewMode } from "./EventFeed";

export function EventApp() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state: watchlist, dispatch: wlDispatch } = useWatchlist();

  // Active contract address/chain (set from URL, address input, or watchlist)
  const [activeAddress, setActiveAddress] = useState<string | null>(null);
  const [activeChain, setActiveChain] = useState<Chain>("ethereum");
  const [manualAbi, setManualAbi] = useState<Abi | null>(null);

  // UI state
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [addressSearch, setAddressSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "card";
    return (localStorage.getItem("eventwatch:viewMode") as ViewMode) || "card";
  });

  // Live mode (kept for P1, P2 will enhance)
  const [isLive, setIsLive] = useState(false);
  const [newEventCount, setNewEventCount] = useState(0);
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const newestBlockRef = useRef<number | null>(null);
  const [liveEvents, setLiveEvents] = useState<DecodedEvent[]>([]);

  // Events cache for unified timeline (key: "chain:address")
  const [eventsMap, setEventsMap] = useState<Record<string, DecodedEvent[]>>({});

  // ──────────── TanStack Query hooks ────────────

  // Disable ABI query when manual ABI is provided
  const abiQuery = useContractAbi(manualAbi ? null : activeAddress, activeChain);
  const decimalsQuery = useContractDecimals(activeAddress, activeChain);

  // Build contractMeta from ABI data or manual ABI
  const contractMeta: ContractMeta | null = useMemo(() => {
    if (manualAbi && activeAddress) {
      const items = manualAbi as unknown as Array<{ type?: string; name?: string }>;
      const eventNames = items
        .filter((item) => item.type === "event")
        .map((item) => item.name ?? "Unknown");
      return { address: activeAddress, chain: activeChain, abi: manualAbi, eventNames };
    }
    if (abiQuery.data && activeAddress) {
      return {
        address: activeAddress,
        chain: activeChain,
        abi: abiQuery.data.abi,
        name: getContractLabel(activeAddress, activeChain) ?? abiQuery.data.name,
        eventNames: abiQuery.data.eventNames,
        isProxy: abiQuery.data.isProxy,
      };
    }
    return null;
  }, [activeAddress, activeChain, abiQuery.data, manualAbi]);

  // Events infinite query (paginated historical events)
  const eventsQuery = useContractEvents(contractMeta);

  // Flatten infinite query pages
  const paginatedEvents = useMemo(
    () => eventsQuery.data?.pages.flatMap((p) => p.events) ?? [],
    [eventsQuery.data]
  );

  // Combined events: live (newest) + paginated (older)
  const events = useMemo(
    () => [...liveEvents, ...paginatedEvents],
    [liveEvents, paginatedEvents]
  );

  // Track newest block for live polling
  useEffect(() => {
    if (events.length > 0) {
      newestBlockRef.current = events[0].blockNumber;
    }
  }, [events]);

  // Update eventsMap for unified timeline (only when event count changes)
  const eventsLengthRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (contractMeta && events.length > 0) {
      const key = `${contractMeta.chain}:${contractMeta.address.toLowerCase()}`;
      if (eventsLengthRef.current[key] !== events.length) {
        eventsLengthRef.current[key] = events.length;
        setEventsMap((prev) => ({ ...prev, [key]: events }));
      }
    }
  }, [contractMeta, events]);

  // ──────────── Unified timeline ────────────

  const isAllMode = watchlist.entries.length > 1 && watchlist.activeId === null;

  const unifiedEvents = useMemo(() => {
    if (!isAllMode) return [];
    const all: DecodedEvent[] = [];
    for (const entry of watchlist.entries) {
      const key = `${entry.chain}:${entry.address.toLowerCase()}`;
      const cached = eventsMap[key];
      if (cached) {
        all.push(
          ...cached.map((e) => ({
            ...e,
            contractAddress: entry.address,
            contractLabel: entry.label,
            chain: entry.chain,
          }))
        );
      }
    }
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }, [isAllMode, watchlist.entries, eventsMap]);

  // Event counts for sidebar
  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of watchlist.entries) {
      const key = `${entry.chain}:${entry.address.toLowerCase()}`;
      counts[key] = eventsMap[key]?.length ?? 0;
    }
    return counts;
  }, [watchlist.entries, eventsMap]);

  // ──────────── Error handling ────────────

  const needsManualAbi = abiQuery.error?.message === "ABI_NOT_FOUND";
  const displayError = useMemo(() => {
    if (abiQuery.error && !needsManualAbi) return abiQuery.error.message;
    if (eventsQuery.error) return eventsQuery.error.message;
    return null;
  }, [abiQuery.error, needsManualAbi, eventsQuery.error]);

  // ──────────── Live polling ────────────

  const pollNewEvents = useCallback(async () => {
    if (!contractMeta || !newestBlockRef.current) return;
    try {
      const res = await fetch("/api/contract/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: contractMeta.address,
          chain: contractMeta.chain,
          abi: contractMeta.abi,
          fromBlock: newestBlockRef.current + 1,
        }),
      });
      const data = await res.json();
      if (res.ok && data.events.length > 0) {
        setLiveEvents((prev) => [...data.events, ...prev].slice(0, 500));
        newestBlockRef.current = data.events[0].blockNumber;
        setNewEventCount((c) => c + data.events.length);
        setTimeout(() => setNewEventCount(0), 3000);
      }
    } catch {
      // Silent fail for live polling
    }
  }, [contractMeta]);

  useEffect(() => {
    if (!isLive || !contractMeta) return;
    const id = setInterval(pollNewEvents, 12000);
    return () => clearInterval(id);
  }, [isLive, contractMeta, pollNewEvents]);

  // ──────────── Handlers ────────────

  const handleSubmit = useCallback(
    (address: string, chain: Chain) => {
      setActiveAddress(address);
      setActiveChain(chain);
      setManualAbi(null);
      setActiveFilter(null);
      setAddressSearch("");
      setIsLive(false);
      setNewEventCount(0);
      setLiveEvents([]);
      newestBlockRef.current = null;

      const params = new URLSearchParams(searchParams.toString());
      params.set("address", address);
      params.set("chain", chain);
      params.delete("event");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Load contract when watchlist active entry changes
  const activeEntry = useMemo(
    () => watchlist.entries.find((e) => e.id === watchlist.activeId) ?? null,
    [watchlist.entries, watchlist.activeId]
  );
  useEffect(() => {
    if (activeEntry) {
      const isSame =
        activeEntry.address.toLowerCase() === activeAddress?.toLowerCase() &&
        activeEntry.chain === activeChain;
      if (!isSame) {
        handleSubmit(activeEntry.address, activeEntry.chain);
      }
    }
  }, [activeEntry, activeAddress, activeChain, handleSubmit]);

  function handleManualAbi(abi: unknown[]) {
    if (!activeAddress) return;
    setManualAbi(abi as Abi);
  }

  function handleLoadMore() {
    if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
      eventsQuery.fetchNextPage();
    }
  }

  function handleAddToWatchlist() {
    if (!contractMeta) return;
    const already = watchlist.entries.some(
      (e) =>
        e.address.toLowerCase() === contractMeta.address.toLowerCase() &&
        e.chain === contractMeta.chain
    );
    if (already) return;
    wlDispatch({
      type: "ADD",
      entry: {
        id: crypto.randomUUID(),
        address: contractMeta.address,
        chain: contractMeta.chain,
        label: contractMeta.name || truncateAddress(contractMeta.address),
        addedAt: Date.now(),
      },
    });
  }

  const isInWatchlist = contractMeta
    ? watchlist.entries.some(
        (e) =>
          e.address.toLowerCase() === contractMeta.address.toLowerCase() &&
          e.chain === contractMeta.chain
      )
    : false;

  const handleFilterChange = useCallback(
    (filter: string | null) => {
      setActiveFilter(filter);
      const params = new URLSearchParams(searchParams.toString());
      if (filter) params.set("event", filter);
      else params.delete("event");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  function handleExportCsv() {
    const csv = eventsToCsv(displayEvents);
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `events-${contractMeta?.name || contractMeta?.address?.slice(0, 10) || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Auto-fetch from URL params on mount
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const address = searchParams.get("address");
    const rawChain = searchParams.get("chain");
    const eventParam = searchParams.get("event");
    const chain: Chain = (["ethereum", "arbitrum", "polygon"] as Chain[]).includes(
      rawChain as Chain
    )
      ? (rawChain as Chain)
      : "ethereum";
    if (address && /^0x[0-9a-fA-F]{40}$/.test(address)) {
      if (eventParam) setActiveFilter(eventParam);
      setActiveAddress(address);
      setActiveChain(chain);
    }
  }, [searchParams]);

  // ──────────── Derived display state ────────────

  const rawEvents = isAllMode ? unifiedEvents : events;
  const filterEventNames = isAllMode
    ? [...new Set(unifiedEvents.map((e) => e.eventName))]
    : contractMeta?.eventNames ?? [];

  const displayEvents = useMemo(() => {
    let result = activeFilter
      ? rawEvents.filter((e) => e.eventName === activeFilter)
      : rawEvents;
    if (addressSearch.trim()) {
      const searchLower = addressSearch.trim().toLowerCase();
      result = result.filter((e) =>
        Object.values(e.args).some((v) => v.toLowerCase().includes(searchLower))
      );
    }
    return result;
  }, [rawEvents, activeFilter, addressSearch]);

  const isLoading = abiQuery.isLoading || eventsQuery.isLoading;
  const contractDecimals = decimalsQuery.data ?? undefined;
  const showContractView = contractMeta && !abiQuery.isLoading && !isAllMode;
  const showContent = showContractView || isAllMode;

  return (
    <DashboardLayout eventCounts={eventCounts}>
      <div className="flex flex-col gap-6">
        <AddressInput
          onSubmit={handleSubmit}
          isLoading={isLoading}
          initialAddress={searchParams.get("address") ?? undefined}
          initialChain={(searchParams.get("chain") as Chain) ?? undefined}
        />

        {/* Error banner */}
        {displayError && (
          <div className="animate-fade-up flex items-center gap-3 rounded-xl border border-[#fb7185]/20 bg-[#fb7185]/5 px-5 py-3.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fb7185]/15">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#fb7185]">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="flex-1 text-[13px] text-[#fb7185]">{displayError}</p>
            <button
              onClick={() => {
                if (abiQuery.error) abiQuery.refetch();
                else if (eventsQuery.error) eventsQuery.refetch();
              }}
              className="rounded-lg border border-[#fb7185]/20 px-3 py-1 text-[11px] font-medium text-[#fb7185] transition-colors hover:bg-[#fb7185]/10"
            >
              Retry
            </button>
          </div>
        )}

        {needsManualAbi && (
          <ManualAbiInput onSubmit={handleManualAbi} address={activeAddress ?? undefined} />
        )}

        {showContent && (
          <div className="flex flex-col gap-5">
            {/* Header — single contract or unified */}
            {showContractView && (
              <div className="flex items-start justify-between gap-3">
                <ContractHeader meta={contractMeta} events={events} />
                {!isInWatchlist && (
                  <button
                    onClick={handleAddToWatchlist}
                    className="mt-1 flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground"
                    title="Add to watchlist"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Watch
                  </button>
                )}
              </div>
            )}

            {isAllMode && (
              <div className="flex items-center gap-3">
                <h2 className="font-display text-[15px] font-semibold text-foreground">
                  All Contracts
                </h2>
                <span className="text-[12px] text-muted">
                  {unifiedEvents.length} event{unifiedEvents.length !== 1 ? "s" : ""} from{" "}
                  {watchlist.entries.length} contracts
                </span>
              </div>
            )}

            {/* Toolbar: filters, search, live toggle, view mode, export */}
            <div className="flex flex-col gap-3">
              {filterEventNames.length > 0 && (
                <EventFilter
                  eventNames={filterEventNames}
                  activeFilter={activeFilter}
                  onFilter={handleFilterChange}
                />
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {/* Address search */}
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted/50">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M11.5 11.5L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={addressSearch}
                    onChange={(e) => setAddressSearch(e.target.value)}
                    placeholder="Filter by address in args..."
                    className="focus-ring h-9 w-full rounded-lg border border-border bg-surface pl-8 pr-3 font-mono text-[11px] text-foreground placeholder:text-muted/40 transition-colors hover:border-accent/30 focus:border-accent"
                    spellCheck={false}
                  />
                  {addressSearch && (
                    <button
                      onClick={() => setAddressSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Live toggle (single contract only) */}
                  {!isAllMode && (
                    <button
                      onClick={() => {
                        setIsLive(!isLive);
                        setNewEventCount(0);
                      }}
                      aria-label={isLive ? "Disable live polling" : "Enable live polling"}
                      className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[11px] font-medium transition-all ${
                        isLive
                          ? "border border-[#34d399]/30 bg-[#34d399]/10 text-[#34d399]"
                          : "border border-border bg-surface text-muted hover:border-accent/30 hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isLive ? "animate-pulse bg-[#34d399]" : "bg-muted/40"
                        }`}
                      />
                      Live
                      {newEventCount > 0 && (
                        <span className="rounded bg-[#34d399] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          +{newEventCount}
                        </span>
                      )}
                    </button>
                  )}

                  {/* View mode toggle */}
                  <div className="flex h-9 items-center rounded-lg border border-border bg-surface">
                    <button
                      onClick={() => {
                        setViewMode("card");
                        localStorage.setItem("eventwatch:viewMode", "card");
                      }}
                      className={`flex h-full items-center gap-1 rounded-l-lg px-2.5 text-[11px] transition-colors ${
                        viewMode === "card"
                          ? "bg-accent/10 text-accent"
                          : "text-muted hover:text-foreground"
                      }`}
                      aria-label="Card view"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setViewMode("table");
                        localStorage.setItem("eventwatch:viewMode", "table");
                      }}
                      className={`flex h-full items-center gap-1 rounded-r-lg px-2.5 text-[11px] transition-colors ${
                        viewMode === "table"
                          ? "bg-accent/10 text-accent"
                          : "text-muted hover:text-foreground"
                      }`}
                      aria-label="Table view"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  {/* Export CSV */}
                  <button
                    onClick={handleExportCsv}
                    disabled={displayEvents.length === 0}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[11px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground disabled:opacity-40"
                    title="Export filtered events as CSV"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v8M4 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    CSV
                  </button>
                </div>
              </div>

              {/* Active search indicator */}
              {addressSearch && (
                <p className="text-[11px] text-muted">
                  Showing {displayEvents.length} event{displayEvents.length !== 1 ? "s" : ""}{" "}
                  matching &ldquo;{addressSearch}&rdquo;
                </p>
              )}
            </div>

            <EventFeed
              events={displayEvents}
              chain={contractMeta?.chain ?? activeChain}
              isLoading={showContractView ? eventsQuery.isLoading : false}
              isLoadingMore={showContractView ? eventsQuery.isFetchingNextPage : false}
              hasMore={showContractView ? (eventsQuery.hasNextPage ?? false) : false}
              onLoadMore={handleLoadMore}
              contractDecimals={isAllMode ? undefined : contractDecimals}
              viewMode={viewMode}
            />
          </div>
        )}

        {/* Empty state */}
        {!contractMeta && !isLoading && !displayError && !needsManualAbi && !isAllMode && (
          <div className="flex flex-col items-center gap-6 py-24 text-center">
            <div className="relative">
              <div className="animate-float h-20 w-20 rounded-3xl bg-gradient-to-br from-accent/20 via-accent/5 to-transparent p-[1px]">
                <div className="flex h-full w-full items-center justify-center rounded-3xl bg-background">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-accent">
                    <path d="M16 4v24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M4 16h24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1" opacity="0.2" />
                    <circle cx="16" cy="16" r="2" fill="currentColor" opacity="0.8" />
                  </svg>
                </div>
              </div>
              <div className="absolute inset-0 -z-10 blur-2xl">
                <div className="h-full w-full rounded-full bg-accent/10" />
              </div>
            </div>
            <div>
              <p className="font-display text-[15px] font-medium text-foreground">
                Paste a contract address to begin
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                Decode and explore smart contract events on
                <br />
                Ethereum, Arbitrum, and Polygon
              </p>
            </div>
          </div>
        )}

        {/* Loading skeleton during ABI fetch */}
        {abiQuery.isLoading && !contractMeta && (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border bg-surface"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-3">
                  <div className="h-5 w-16 rounded-md animate-shimmer" />
                  <div className="h-4 w-28 rounded-md animate-shimmer" />
                </div>
                <div className="flex flex-col gap-2.5 px-5 py-4">
                  <div className="h-3.5 w-3/4 rounded animate-shimmer" />
                  <div className="h-3.5 w-1/2 rounded animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
