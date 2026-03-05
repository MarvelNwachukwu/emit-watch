"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { truncateAddress } from "@/lib/utils";
import { CHAINS } from "@/lib/chains";
import type { Chain } from "@/lib/types";
import { AlertRuleBuilder } from "./AlertRuleBuilder";
import { AlertHistory } from "./AlertHistory";

type WatchlistEntry = {
  address: string;
  chain: Chain;
  label: string;
};

type AlertRule = {
  id: string;
  contract_address: string;
  chain: Chain;
  event_name: string | null;
  condition_type: string;
  condition_value: Record<string, string> | null;
  channel: string;
  channel_config: Record<string, string>;
  enabled: boolean;
  history_count: number;
};

type SubView = "list" | "builder" | "history";

type Props = {
  watchlistEntries: WatchlistEntry[];
};

export function AlertsPanel({ watchlistEntries }: Props) {
  const { getAccessToken, userId } = useAuth();

  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subView, setSubView] = useState<SubView>("list");
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    if (!userId) return;
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Authentication required");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/alerts", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to load alert rules");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      setRules(data.rules ?? []);
      setError(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, userId]);

  const checkTelegramStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch("/api/alerts/telegram/status", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramLinked(!!data.linked);
      }
    } catch {
      // Silent fail
    }
  }, [getAccessToken, userId]);

  useEffect(() => {
    fetchRules();
    checkTelegramStatus();
  }, [fetchRules, checkTelegramStatus]);

  async function handleToggleEnabled(ruleId: string, currentEnabled: boolean) {
    if (!userId) return;
    setTogglingId(ruleId);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`/api/alerts/${ruleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (res.ok) {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, enabled: !currentEnabled } : r))
        );
      }
    } catch {
      // Silent fail
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(ruleId: string) {
    if (!userId) return;
    setDeletingId(ruleId);
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`/api/alerts/${ruleId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
      });

      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
      }
    } catch {
      // Silent fail
    } finally {
      setDeletingId(null);
    }
  }

  function getConditionLabel(rule: AlertRule) {
    const cv = rule.condition_value;
    switch (rule.condition_type) {
      case "any":
        return "Any event";
      case "specific_event":
        return rule.event_name || "Specific event";
      case "value_threshold":
        return `${cv?.field ?? "value"} >= ${cv?.threshold ?? "?"}`;
      case "address_match":
        return `Address: ${truncateAddress(cv?.address || "")}`;
      default:
        return rule.condition_type;
    }
  }

  // Sub-views
  if (subView === "builder") {
    return (
      <AlertRuleBuilder
        watchlistEntries={watchlistEntries}
        onCreated={() => {
          setSubView("list");
          fetchRules();
        }}
        onCancel={() => setSubView("list")}
        getAccessToken={getAccessToken}
        userId={userId!}
      />
    );
  }

  if (subView === "history") {
    return (
      <div className="animate-fade-up flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSubView("list")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-all hover:border-accent/30 hover:text-foreground"
            aria-label="Back to alerts"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="font-display text-[15px] font-semibold text-foreground">
            Alert History
          </h2>
        </div>
        <AlertHistory getAccessToken={getAccessToken} userId={userId!} />
      </div>
    );
  }

  // Main list view
  return (
    <div className="animate-fade-up flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-[15px] font-semibold text-foreground">
            Alerts
          </h2>
          {rules.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent/10 px-1.5 text-[10px] font-bold text-accent">
              {rules.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubView("history")}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[11px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            History
          </button>
          <button
            onClick={() => setSubView("builder")}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[11px] font-medium text-white transition-all hover:bg-accent/90"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New Alert
          </button>
        </div>
      </div>

      {/* Telegram status indicator */}
      <div
        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
          telegramLinked
            ? "border-[#34d399]/20 bg-[#34d399]/5"
            : "border-border-subtle bg-background"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={telegramLinked ? "text-[#34d399]" : "text-muted/50"}>
          <path d="M21.2 4.4L2.4 11.3c-.6.2-.6.7 0 .9l4.8 1.5 1.8 5.8c.2.5.7.5 1 .2l2.6-2.1 5.1 3.8c.5.4 1.1.1 1.2-.5L22 5.3c.2-.7-.3-1.2-.8-.9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {telegramLinked ? (
          <span className="flex items-center gap-1.5 text-[11px] text-[#34d399]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
            Telegram linked
          </span>
        ) : (
          <span className="text-[11px] text-muted">
            Telegram not linked —{" "}
            <button
              onClick={() => setSubView("builder")}
              className="text-accent transition-colors hover:text-accent/80"
            >
              set up alerts
            </button>{" "}
            to connect
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="h-4 w-24 rounded animate-shimmer" />
              <div className="h-4 w-16 rounded animate-shimmer" />
              <div className="ml-auto h-4 w-12 rounded animate-shimmer" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
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
              fetchRules();
            }}
            className="rounded-lg border border-[#fb7185]/20 px-3 py-1 text-[11px] font-medium text-[#fb7185] transition-colors hover:bg-[#fb7185]/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && rules.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-background py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted/40">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-display text-[13px] font-medium text-foreground">
              No alert rules yet
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Create your first alert to get notified of contract events
            </p>
          </div>
          <button
            onClick={() => setSubView("builder")}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-4 text-[11px] font-medium text-white transition-all hover:bg-accent/90"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Create Alert
          </button>
        </div>
      )}

      {/* Rules list */}
      {!isLoading && !error && rules.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`group flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                rule.enabled
                  ? "border-border bg-surface"
                  : "border-border-subtle bg-background opacity-60"
              }`}
            >
              {/* Contract address */}
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[12px] font-medium text-foreground">
                    {watchlistEntries.find((e) => e.address.toLowerCase() === rule.contract_address)?.label || truncateAddress(rule.contract_address)}
                  </span>
                  <span className="shrink-0 rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-muted">
                    {CHAINS[rule.chain]?.name ?? rule.chain}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted">
                  {truncateAddress(rule.contract_address)}
                </span>
              </div>

              {/* Condition badge */}
              <span className="shrink-0 rounded bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                {getConditionLabel(rule)}
              </span>

              {/* Channel badge */}
              <span className="shrink-0 rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-muted">
                {rule.channel === "telegram" ? (
                  <span className="flex items-center gap-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-[#229ED9]">
                      <path d="M21.2 4.4L2.4 11.3c-.6.2-.6.7 0 .9l4.8 1.5 1.8 5.8c.2.5.7.5 1 .2l2.6-2.1 5.1 3.8c.5.4 1.1.1 1.2-.5L22 5.3c.2-.7-.3-1.2-.8-.9z" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    Telegram
                  </span>
                ) : (
                  "Webhook"
                )}
              </span>

              {/* Spacer */}
              <span className="flex-1" />

              {/* Enabled toggle */}
              <button
                onClick={() => handleToggleEnabled(rule.id, rule.enabled)}
                disabled={togglingId === rule.id}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  rule.enabled ? "bg-accent" : "bg-border"
                } ${togglingId === rule.id ? "opacity-50" : ""}`}
                aria-label={rule.enabled ? "Disable alert" : "Enable alert"}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    rule.enabled ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(rule.id)}
                disabled={deletingId === rule.id}
                className="shrink-0 rounded p-1 text-muted opacity-0 transition-all hover:text-[#fb7185] group-hover:opacity-100 disabled:opacity-30"
                aria-label="Delete alert rule"
              >
                {deletingId === rule.id ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="animate-spin">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                    <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M4.5 4l.5 9a1 1 0 001 1h4a1 1 0 001-1l.5-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
