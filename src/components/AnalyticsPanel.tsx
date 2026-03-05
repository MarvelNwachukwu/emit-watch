"use client";

import { useMemo } from "react";
import type { DecodedEvent } from "@/lib/types";
import { computeFullAnalytics } from "@/lib/analytics";
import { getEventColor } from "@/lib/utils";
import { PremiumGate } from "./PremiumGate";
import { FrequencyChart } from "./charts/FrequencyChart";
import { BreakdownChart } from "./charts/BreakdownChart";
import { TopAddressesChart } from "./charts/TopAddressesChart";
import { ActivityHeatmap } from "./charts/ActivityHeatmap";

type Props = {
  events: DecodedEvent[];
  isPaidUser: boolean;
  onUpgrade?: () => void;
};

export function AnalyticsPanel({ events, isPaidUser, onUpgrade }: Props) {
  const analytics = useMemo(() => computeFullAnalytics(events), [events]);

  const eventTypes = analytics.summary.breakdown.map((b) => b.eventName);
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const name of eventTypes) {
      map[name] = getEventColor(name);
    }
    return map;
  }, [eventTypes]);

  const charts = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-4">
        <FrequencyChart data={analytics.timeSeries} eventTypes={eventTypes} colorMap={colorMap} />
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
  );

  return (
    <div className="animate-fade-up">
      <PremiumGate isPaid={isPaidUser} feature="Full Analytics" onUpgrade={onUpgrade}>
        {charts}
      </PremiumGate>
    </div>
  );
}
