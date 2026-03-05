"use client";

import { useMemo } from "react";
import type { DecodedEvent } from "@/lib/types";
import { computeFullAnalytics } from "@/lib/analytics";
import { getEventColor } from "@/lib/utils";
import { FrequencyChart } from "./charts/FrequencyChart";
import { BreakdownChart } from "./charts/BreakdownChart";
import { TopAddressesChart } from "./charts/TopAddressesChart";
import { ActivityHeatmap } from "./charts/ActivityHeatmap";

type Props = {
  events: DecodedEvent[];
  isPaidUser: boolean;
};

export function AnalyticsPanel({ events, isPaidUser }: Props) {
  const analytics = useMemo(() => computeFullAnalytics(events), [events]);

  // Build color map for charts
  const eventTypes = analytics.summary.breakdown.map((b) => b.eventName);
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const name of eventTypes) {
      map[name] = getEventColor(name);
    }
    return map;
  }, [eventTypes]);

  return (
    <div className="relative animate-fade-up">
      {/* Premium gate overlay */}
      {!isPaidUser && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect
                  x="5"
                  y="11"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 11V7a4 4 0 118 0v4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                Full Analytics
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                Upgrade to Pro for detailed charts and insights
              </p>
            </div>
            <button className="rounded-lg bg-accent px-4 py-1.5 text-[11px] font-semibold text-background transition-opacity hover:opacity-90">
              Upgrade — $3/mo
            </button>
          </div>
        </div>
      )}

      {/* Charts grid */}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${!isPaidUser ? "pointer-events-none select-none" : ""}`}>
        <div className="rounded-xl border border-border bg-surface p-4">
          <FrequencyChart
            data={analytics.timeSeries}
            eventTypes={eventTypes}
            colorMap={colorMap}
          />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <BreakdownChart data={analytics.summary.breakdown} />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <TopAddressesChart data={analytics.allAddresses} />
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <ActivityHeatmap data={analytics.heatmap} />
        </div>
      </div>
    </div>
  );
}
