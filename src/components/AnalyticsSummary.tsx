"use client";

import { useMemo } from "react";
import type { DecodedEvent } from "@/lib/types";
import { computeEventSummary } from "@/lib/analytics";
import { truncateAddress } from "@/lib/utils";

type Props = {
  events: DecodedEvent[];
  analyticsOpen: boolean;
  onToggleAnalytics: () => void;
};

export function AnalyticsSummary({
  events,
  analyticsOpen,
  onToggleAnalytics,
}: Props) {
  const summary = useMemo(() => computeEventSummary(events), [events]);

  // Don't show until we have a meaningful sample
  if (summary.totalEvents < 10) return null;

  const topAddress = summary.topAddresses[0];

  return (
    <div className="animate-fade-up flex flex-col gap-3">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Total events */}
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Events
          </span>
          <span className="font-display text-xl font-semibold text-foreground tabular-nums">
            {summary.totalEvents.toLocaleString()}
          </span>
        </div>

        {/* Unique types */}
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Types
          </span>
          <span className="font-display text-xl font-semibold text-foreground tabular-nums">
            {summary.uniqueEventTypes}
          </span>
        </div>

        {/* Events per minute */}
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Events/min
          </span>
          <span className="font-display text-xl font-semibold text-foreground tabular-nums">
            {summary.eventsPerMinute < 0.01
              ? "<0.01"
              : summary.eventsPerMinute.toFixed(2)}
          </span>
        </div>

        {/* Top address */}
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface px-4 py-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Top Address
          </span>
          {topAddress ? (
            <span
              className="font-mono text-[13px] font-medium text-accent"
              title={topAddress.address}
            >
              {truncateAddress(topAddress.address)}
              <span className="ml-1 text-[10px] text-muted">
                ({topAddress.count})
              </span>
            </span>
          ) : (
            <span className="text-[13px] text-muted">—</span>
          )}
        </div>
      </div>

      {/* Breakdown bar */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            Event Breakdown
          </span>
          <button
            onClick={onToggleAnalytics}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-[10px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              className="text-accent"
            >
              <rect
                x="2"
                y="9"
                width="3"
                height="5"
                rx="0.5"
                fill="currentColor"
              />
              <rect
                x="6.5"
                y="5"
                width="3"
                height="9"
                rx="0.5"
                fill="currentColor"
              />
              <rect
                x="11"
                y="2"
                width="3"
                height="12"
                rx="0.5"
                fill="currentColor"
              />
            </svg>
            {analyticsOpen ? "Hide" : "View"} Analytics
            <svg
              width="8"
              height="8"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform ${analyticsOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Stacked bar */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-border-subtle">
          {summary.breakdown.map((item) => (
            <div
              key={item.eventName}
              className="h-full transition-all duration-500"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color,
                minWidth: item.percentage > 0 ? "2px" : "0",
              }}
              title={`${item.eventName}: ${item.count} (${item.percentage}%)`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {summary.breakdown.slice(0, 6).map((item) => (
            <div key={item.eventName} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-muted">
                {item.eventName}
                <span className="ml-1 tabular-nums text-foreground/60">
                  {item.percentage}%
                </span>
              </span>
            </div>
          ))}
          {summary.breakdown.length > 6 && (
            <span className="text-[10px] text-muted/50">
              +{summary.breakdown.length - 6} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
