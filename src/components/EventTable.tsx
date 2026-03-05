"use client";

import type { DecodedEvent, Chain } from "@/lib/types";
import { CHAINS } from "@/lib/chains";
import {
  truncateAddress,
  formatRelativeTime,
  getEventColor,
  formatValue,
} from "@/lib/utils";

export function EventTable({
  events,
  chain,
  contractDecimals,
}: {
  events: DecodedEvent[];
  chain: Chain;
  contractDecimals?: number;
}) {
  const hasMultipleContracts = events.some((e) => e.contractLabel);

  function getKeyArgs(event: DecodedEvent): string {
    const entries = Object.entries(event.args);
    if (entries.length === 0) return "—";
    // Show up to 2 key args, truncated
    return entries
      .slice(0, 2)
      .map(([key, val]) => {
        if (/^0x[0-9a-fA-F]{40}$/.test(val)) {
          return `${key}: ${truncateAddress(val)}`;
        }
        const isValueArg = /^(value|amount|wad|amount0|amount1|assets|shares)$/i.test(key);
        const { display } = formatValue(val, isValueArg ? contractDecimals : undefined);
        const truncated = display.length > 20 ? display.slice(0, 20) + "..." : display;
        return `${key}: ${truncated}`;
      })
      .join(", ");
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border-subtle text-left text-[11px] text-muted">
            <th className="px-4 py-2.5 font-medium">Event</th>
            {hasMultipleContracts && (
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Contract</th>
            )}
            <th className="px-4 py-2.5 font-medium">Block</th>
            <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Key Args</th>
            <th className="px-4 py-2.5 font-medium">Time</th>
            <th className="px-4 py-2.5 font-medium">Tx</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, i) => {
            const color = getEventColor(event.eventName);
            const eventChain = event.chain ?? chain;
            const explorerUrl = CHAINS[eventChain].explorerUrl;
            return (
              <tr
                key={`${event.transactionHash}-${event.logIndex}-${i}`}
                className="border-b border-border-subtle last:border-0 transition-colors hover:bg-surface-elevated"
              >
                <td className="px-4 py-2">
                  <span
                    className="inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: color }}
                  >
                    {event.eventName}
                  </span>
                </td>
                {hasMultipleContracts && (
                  <td className="hidden px-4 py-2 md:table-cell">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-accent bg-accent/10 border border-accent/20">
                      {event.contractLabel ?? truncateAddress(event.contractAddress ?? "")}
                    </span>
                  </td>
                )}
                <td className="px-4 py-2">
                  <a
                    href={`${explorerUrl}/block/${event.blockNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono tabular-nums text-muted transition-colors hover:text-accent"
                  >
                    #{event.blockNumber.toLocaleString()}
                  </a>
                </td>
                <td className="hidden max-w-[300px] truncate px-4 py-2 font-mono text-[11px] text-foreground/80 sm:table-cell">
                  {getKeyArgs(event)}
                </td>
                <td className="px-4 py-2 text-muted">
                  {formatRelativeTime(event.timestamp)}
                </td>
                <td className="px-4 py-2">
                  <a
                    href={`${explorerUrl}/tx/${event.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted transition-colors hover:text-accent"
                    title="View transaction"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="inline-block">
                      <path d="M5 3h8v8M13 3L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
