"use client";

import { useState } from "react";
import type { DecodedEvent, Chain } from "@/lib/types";
import { CHAINS } from "@/lib/chains";
import {
  truncateAddress,
  formatRelativeTime,
  getEventColor,
  copyToClipboard,
  formatValue,
} from "@/lib/utils";

const ExternalIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="inline-block shrink-0 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5">
    <path d="M5 3h8v8M13 3L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function EventCard({
  event,
  chain,
  index = 0,
}: {
  event: DecodedEvent;
  chain: Chain;
  index?: number;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const explorerUrl = CHAINS[chain].explorerUrl;
  const color = getEventColor(event.eventName);

  async function handleCopy(key: string, value: string) {
    await copyToClipboard(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  const isAddress = (val: string) => /^0x[0-9a-fA-F]{40}$/.test(val);

  function renderValue(key: string, value: string) {
    if (isAddress(value)) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <a
            href={`${explorerUrl}/address/${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link font-mono text-accent transition-colors hover:underline"
            title={value}
          >
            {truncateAddress(value)}
            <ExternalIcon />
          </a>
          <button
            onClick={() => handleCopy(key, value)}
            className="rounded p-0.5 text-muted opacity-0 transition-all hover:text-accent group-hover/arg:opacity-100"
            title="Copy full address"
          >
            {copiedKey === key ? <CheckIcon /> : <CopyIcon />}
          </button>
        </span>
      );
    }

    // Format numeric values
    const { display, isLargeNumber } = formatValue(value);
    if (isLargeNumber) {
      return (
        <span className="font-mono text-foreground" title={value}>
          {display}
        </span>
      );
    }

    // Boolean values
    if (value === "true" || value === "false") {
      return (
        <span className={`font-mono ${value === "true" ? "text-[#34d399]" : "text-muted"}`}>
          {value}
        </span>
      );
    }

    return <span className="font-mono text-foreground">{display}</span>;
  }

  return (
    <div
      className="event-card animate-fade-up overflow-hidden rounded-xl border border-border bg-surface"
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: color,
        boxShadow: `inset 3px 0 12px -6px ${color}40`,
        animationDelay: `${Math.min(index, 10) * 50}ms`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-3">
        <span
          className="rounded-md px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: color }}
        >
          {event.eventName}
        </span>
        <a
          href={`${explorerUrl}/block/${event.blockNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link font-mono text-[11px] tabular-nums text-muted transition-colors hover:text-accent"
        >
          #{event.blockNumber.toLocaleString()}
          <ExternalIcon />
        </a>
        <span className="ml-auto text-[11px] text-muted">
          {formatRelativeTime(event.timestamp)}
        </span>
      </div>

      {/* Args */}
      <div className="px-5 py-4">
        {Object.entries(event.args).length === 0 ? (
          <span className="text-[12px] italic text-muted">No arguments</span>
        ) : (
          <div className="flex flex-col gap-2">
            {Object.entries(event.args).map(([key, value]) => (
              <div key={key} className="group/arg flex items-baseline gap-3 text-[12px]">
                <span className="shrink-0 font-mono text-muted/70">{key}</span>
                <span className="h-px flex-1 bg-border-subtle" />
                <div className="flex shrink-0 items-center gap-1.5">
                  {renderValue(key, value)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border-subtle px-5 py-2.5">
        <a
          href={`${explorerUrl}/tx/${event.transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link inline-flex items-center gap-1.5 text-[11px] text-muted transition-colors hover:text-accent"
        >
          View on {CHAINS[chain].name}
          <ExternalIcon />
        </a>
      </div>
    </div>
  );
}
