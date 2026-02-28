import type { ContractMeta, DecodedEvent } from "@/lib/types";
import { CHAINS } from "@/lib/chains";
import { truncateAddress } from "@/lib/utils";

export function ContractHeader({
  meta,
  events,
}: {
  meta: ContractMeta;
  events: DecodedEvent[];
}) {
  const chainConfig = CHAINS[meta.chain];
  const uniqueEvents = new Set(events.map((e) => e.eventName));

  return (
    <div className="animate-fade-up rounded-xl border border-border bg-surface px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* Contract icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 6h6M5 8.5h4M5 11h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="font-display text-[15px] font-semibold text-foreground">
              {meta.name || truncateAddress(meta.address)}
            </h2>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                {chainConfig.name}
              </span>
              {meta.isProxy && (
                <span className="rounded bg-[#f0b429]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f0b429]">
                  Proxy
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {events.length.toLocaleString()}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted">Events</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-right">
            <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {uniqueEvents.size}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted">Types</p>
          </div>
        </div>
      </div>
    </div>
  );
}
