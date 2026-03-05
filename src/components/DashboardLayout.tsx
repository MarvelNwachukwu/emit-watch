"use client";

import { useWatchlist } from "@/contexts/WatchlistContext";
import { WatchlistSidebar } from "./WatchlistSidebar";
import type { Chain } from "@/lib/types";
import type { ReactNode } from "react";

export function DashboardLayout({
  children,
  eventCounts,
  onAddContract,
}: {
  children: ReactNode;
  eventCounts: Record<string, number>;
  onAddContract?: (address: string, chain: Chain) => void;
}) {
  const { state } = useWatchlist();
  const hasWatchlist = state.entries.length > 0;

  if (!hasWatchlist) {
    return <div className="mx-auto w-full max-w-2xl">{children}</div>;
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <WatchlistSidebar eventCounts={eventCounts} onAddContract={onAddContract} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
