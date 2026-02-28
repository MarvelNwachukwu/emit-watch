"use client";

import { useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Abi } from "viem";
import type { Chain, ContractMeta, DecodedEvent } from "@/lib/types";
import { eventsToCsv, isValidAddress } from "@/lib/utils";
import { AddressInput } from "./AddressInput";
import { ManualAbiInput } from "./ManualAbiInput";
import { ContractHeader } from "./ContractHeader";
import { EventFilter } from "./EventFilter";
import { EventFeed } from "./EventFeed";

export function EventApp() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [contractMeta, setContractMeta] = useState<ContractMeta | null>(null);
  const [events, setEvents] = useState<DecodedEvent[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [addressSearch, setAddressSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsManualAbi, setNeedsManualAbi] = useState(false);
  const [oldestBlock, setOldestBlock] = useState<number | null>(null);
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [pendingChain, setPendingChain] = useState<Chain>("ethereum");

  // Live mode
  const [isLive, setIsLive] = useState(false);
  const [newEventCount, setNewEventCount] = useState(0);
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const newestBlockRef = useRef<number | null>(null);

  const [isFetchingAbi, startAbiTransition] = useTransition();
  const [isFetchingEvents, startEventsTransition] = useTransition();
  const [isLoadingMore, startLoadMoreTransition] = useTransition();

  const fetchEvents = useCallback(
    (meta: ContractMeta, toBlock?: number, retryCount = 0) => {
      const transition = toBlock ? startLoadMoreTransition : startEventsTransition;
      transition(async () => {
        try {
          const res = await fetch("/api/contract/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: meta.address,
              chain: meta.chain,
              abi: meta.abi,
              toBlock,
            }),
          });
          const data = await res.json();

          if (!res.ok) {
            // Auto-retry on rate limit (up to 2 times)
            if (res.status === 429 && retryCount < 2) {
              setTimeout(() => fetchEvents(meta, toBlock, retryCount + 1), 2000);
              return;
            }
            setError(data.error ?? "Failed to fetch events");
            return;
          }

          setEvents((prev) =>
            toBlock ? [...prev, ...data.events] : data.events
          );
          setOldestBlock(data.oldestBlock);
          setError(null);

          // Track newest block for live mode
          if (!toBlock && data.events.length > 0) {
            newestBlockRef.current = data.events[0].blockNumber;
          }
        } catch {
          setError("Network error — check your connection");
        }
      });
    },
    []
  );

  // Live mode polling
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
        setEvents((prev) => [...data.events, ...prev]);
        setNewEventCount((c) => c + data.events.length);
        newestBlockRef.current = data.events[0].blockNumber;
        // Clear "new" indicator after 3s
        setTimeout(() => setNewEventCount(0), 3000);
      }
    } catch {
      // Silent fail for live polling
    }
  }, [contractMeta]);

  useEffect(() => {
    if (isLive && contractMeta) {
      liveIntervalRef.current = setInterval(pollNewEvents, 12000);
      return () => {
        if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      };
    } else {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    }
  }, [isLive, contractMeta, pollNewEvents]);

  const handleSubmit = useCallback(
    (address: string, chain: Chain) => {
      setContractMeta(null);
      setEvents([]);
      setActiveFilter(null);
      setAddressSearch("");
      setError(null);
      setNeedsManualAbi(false);
      setOldestBlock(null);
      setIsLive(false);
      setNewEventCount(0);
      setPendingAddress(address);
      setPendingChain(chain);

      const params = new URLSearchParams();
      params.set("address", address);
      params.set("chain", chain);
      router.replace(`?${params.toString()}`, { scroll: false });

      startAbiTransition(async () => {
        try {
          const res = await fetch("/api/contract/abi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address, chain }),
          });
          const data = await res.json();

          if (!res.ok) {
            if (res.status === 404) {
              setNeedsManualAbi(true);
              return;
            }
            setError(data.error ?? "Failed to fetch ABI");
            return;
          }

          const meta: ContractMeta = {
            address,
            chain,
            abi: data.abi as Abi,
            name: data.name,
            eventNames: data.eventNames,
            isProxy: data.isProxy,
          };
          setContractMeta(meta);
          fetchEvents(meta);
        } catch {
          setError("Network error — check your connection");
        }
      });
    },
    [router, fetchEvents]
  );

  function handleManualAbi(abi: unknown[]) {
    if (!pendingAddress) return;
    const eventNames = (abi as Array<{ type?: string; name?: string }>)
      .filter((item) => item.type === "event")
      .map((item) => item.name ?? "Unknown");

    const meta: ContractMeta = {
      address: pendingAddress,
      chain: pendingChain,
      abi: abi as Abi,
      eventNames,
    };
    setContractMeta(meta);
    setNeedsManualAbi(false);
    fetchEvents(meta);
  }

  function handleLoadMore() {
    if (!contractMeta || !oldestBlock) return;
    fetchEvents(contractMeta, oldestBlock - 1);
  }

  function handleExportCsv() {
    const csv = eventsToCsv(filteredEvents);
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `events-${contractMeta?.name || contractMeta?.address?.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Auto-fetch from URL params on mount
  useEffect(() => {
    const address = searchParams.get("address");
    const chain = (searchParams.get("chain") as Chain) ?? "ethereum";
    if (address && /^0x[0-9a-fA-F]{40}$/.test(address)) {
      handleSubmit(address, chain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters
  let filteredEvents = activeFilter
    ? events.filter((e) => e.eventName === activeFilter)
    : events;

  // Address search filter
  if (addressSearch.trim()) {
    const searchLower = addressSearch.trim().toLowerCase();
    filteredEvents = filteredEvents.filter((e) =>
      Object.values(e.args).some((v) => v.toLowerCase().includes(searchLower))
    );
  }

  const isLoading = isFetchingAbi || isFetchingEvents;

  return (
    <div className="flex flex-col gap-6">
      <AddressInput
        onSubmit={handleSubmit}
        isLoading={isLoading}
        initialAddress={searchParams.get("address") ?? undefined}
        initialChain={(searchParams.get("chain") as Chain) ?? undefined}
      />

      {/* Error banner */}
      {error && (
        <div className="animate-fade-up flex items-center gap-3 rounded-xl border border-[#fb7185]/20 bg-[#fb7185]/5 px-5 py-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fb7185]/15">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#fb7185]">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="flex-1 text-[13px] text-[#fb7185]">{error}</p>
          <button
            onClick={() => {
              if (pendingAddress) handleSubmit(pendingAddress, pendingChain);
            }}
            className="rounded-lg border border-[#fb7185]/20 px-3 py-1 text-[11px] font-medium text-[#fb7185] transition-colors hover:bg-[#fb7185]/10"
          >
            Retry
          </button>
        </div>
      )}

      {needsManualAbi && <ManualAbiInput onSubmit={handleManualAbi} />}

      {contractMeta && !isFetchingAbi && (
        <div className="flex flex-col gap-5">
          <ContractHeader meta={contractMeta} events={events} />

          {/* Toolbar: filters, search, live toggle, export */}
          <div className="flex flex-col gap-3">
            {/* Row 1: Event type filter pills */}
            {contractMeta.eventNames.length > 0 && (
              <EventFilter
                eventNames={contractMeta.eventNames}
                activeFilter={activeFilter}
                onFilter={setActiveFilter}
              />
            )}

            {/* Row 2: Address search + live toggle + export */}
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
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Live toggle */}
                <button
                  onClick={() => {
                    setIsLive(!isLive);
                    setNewEventCount(0);
                  }}
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
                  {isLive ? "Live" : "Live"}
                  {newEventCount > 0 && (
                    <span className="rounded bg-[#34d399] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      +{newEventCount}
                    </span>
                  )}
                </button>

                {/* Export CSV */}
                <button
                  onClick={handleExportCsv}
                  disabled={filteredEvents.length === 0}
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
                Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""} matching &ldquo;{addressSearch}&rdquo;
              </p>
            )}
          </div>

          <EventFeed
            events={filteredEvents}
            chain={contractMeta.chain}
            isLoading={isFetchingEvents}
            isLoadingMore={isLoadingMore}
            hasMore={oldestBlock !== null && events.length > 0}
            onLoadMore={handleLoadMore}
          />
        </div>
      )}

      {/* Empty state */}
      {!contractMeta && !isLoading && !error && !needsManualAbi && (
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
              Ethereum, Arbitrum, and Base
            </p>
          </div>
        </div>
      )}

      {/* Loading skeleton during ABI fetch */}
      {isFetchingAbi && !contractMeta && (
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
  );
}
