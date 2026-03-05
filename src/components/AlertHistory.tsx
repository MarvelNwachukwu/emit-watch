"use client";

import { useState, useEffect, useCallback } from "react";
import { CHAINS } from "@/lib/chains";
import { truncateAddress, formatRelativeTime } from "@/lib/utils";
import type { Chain } from "@/lib/types";

type Props = {
  getAccessToken: () => Promise<string | null>;
  userId: string;
};

type AlertHistoryEntry = {
  id: string;
  rule_id: string;
  event_name: string;
  contract_address: string;
  chain: Chain;
  transaction_hash: string;
  delivered_at: string;
  delivery_status: string;
};

type AlertRule = {
  id: string;
  contract_address: string;
};

export function AlertHistory({ getAccessToken, userId }: Props) {
  const [entries, setEntries] = useState<AlertHistoryEntry[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterRuleId, setFilterRuleId] = useState<string>("");

  const fetchHistory = useCallback(
    async (pageNum: number, ruleId: string, append: boolean) => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setError("Authentication required");
          setIsLoading(false);
          return;
        }

        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "20",
        });
        if (ruleId) params.set("ruleId", ruleId);

        const res = await fetch(`/api/alerts/history?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": userId,
          },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to load alert history");
          return;
        }

        const data = await res.json();
        const newEntries: AlertHistoryEntry[] = data.history ?? [];

        if (append) {
          setEntries((prev) => [...prev, ...newEntries]);
        } else {
          setEntries(newEntries);
        }
        setHasMore(newEntries.length === 20);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [getAccessToken, userId]
  );

  // Fetch rules for filter dropdown
  useEffect(() => {
    let cancelled = false;
    async function fetchRules() {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        const res = await fetch("/api/alerts", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": userId,
          },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setRules(data.rules ?? []);
        }
      } catch {
        // Silent fail for filter dropdown
      }
    }
    fetchRules();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, userId]);

  // Fetch history on mount and when filter changes
  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    setEntries([]);
    fetchHistory(1, filterRuleId, false);
  }, [filterRuleId, fetchHistory]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    setIsLoadingMore(true);
    fetchHistory(nextPage, filterRuleId, true);
  }

  function getExplorerTxUrl(chain: Chain, hash: string) {
    return `${CHAINS[chain].explorerUrl}/tx/${hash}`;
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "delivered":
        return (
          <span className="flex items-center gap-1 rounded bg-[#34d399]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#34d399]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
            Delivered
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1 rounded bg-[#fb7185]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#fb7185]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#fb7185]" />
            Failed
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Pending
          </span>
        );
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="h-4 w-20 rounded animate-shimmer" />
            <div className="h-4 w-32 rounded animate-shimmer" />
            <div className="ml-auto h-4 w-16 rounded animate-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#fb7185]/20 bg-[#fb7185]/5 px-5 py-3.5">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[#fb7185]">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p className="flex-1 text-[13px] text-[#fb7185]">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setIsLoading(true);
            fetchHistory(1, filterRuleId, false);
          }}
          className="rounded-lg border border-[#fb7185]/20 px-3 py-1 text-[11px] font-medium text-[#fb7185] transition-colors hover:bg-[#fb7185]/10"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up flex flex-col gap-4">
      {/* Filter */}
      {rules.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="rule-filter" className="text-[11px] font-medium text-muted">
            Filter by rule:
          </label>
          <select
            id="rule-filter"
            value={filterRuleId}
            onChange={(e) => setFilterRuleId(e.target.value)}
            className="focus-ring h-8 rounded-lg border border-border bg-surface px-2 text-[11px] text-foreground transition-colors hover:border-accent/30 focus:border-accent"
          >
            <option value="">All rules</option>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {truncateAddress(rule.contract_address)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* History list */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted/40">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-display text-[13px] font-medium text-foreground">
              No alert history yet
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Triggered alerts will appear here
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 transition-colors hover:border-border-subtle"
            >
              {/* Event name */}
              <span className="shrink-0 rounded bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                {entry.event_name}
              </span>

              {/* Contract */}
              <span className="hidden font-mono text-[11px] text-muted sm:inline" title={entry.contract_address}>
                {truncateAddress(entry.contract_address)}
              </span>

              {/* Chain badge */}
              <span className="hidden shrink-0 rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-muted sm:inline">
                {CHAINS[entry.chain]?.name ?? entry.chain}
              </span>

              {/* Tx hash linked to explorer */}
              <a
                href={getExplorerTxUrl(entry.chain, entry.transaction_hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-[11px] text-accent transition-colors hover:text-accent/80"
                title={entry.transaction_hash}
              >
                {truncateAddress(entry.transaction_hash)}
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <path d="M6 3H3v10h10v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 2h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </a>

              {/* Spacer */}
              <span className="flex-1" />

              {/* Timestamp */}
              <span className="shrink-0 text-[10px] text-muted tabular-nums">
                {formatRelativeTime(new Date(entry.delivered_at).getTime())}
              </span>

              {/* Delivery status */}
              {getStatusBadge(entry.delivery_status)}
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && entries.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-[11px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground disabled:opacity-40"
          >
            {isLoadingMore ? (
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="animate-spin">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                  <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
