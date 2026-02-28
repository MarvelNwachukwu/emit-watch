"use client";

import { useState } from "react";
import type { Chain } from "@/lib/types";
import { isValidAddress } from "@/lib/utils";

const CHAIN_OPTIONS: { value: Chain; label: string }[] = [
  { value: "ethereum", label: "Ethereum" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "polygon", label: "Polygon" },
];

const POPULAR_CONTRACTS: { name: string; address: string; chain: Chain }[] = [
  { name: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", chain: "ethereum" },
  { name: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", chain: "ethereum" },
  { name: "Uniswap V3 Router", address: "0xE592427A0AEce92De3Edee1F18E0157C05861564", chain: "ethereum" },
  { name: "USDT (Polygon)", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", chain: "polygon" },
];

export function AddressInput({
  onSubmit,
  isLoading,
  initialAddress,
  initialChain,
}: {
  onSubmit: (address: string, chain: Chain) => void;
  isLoading: boolean;
  initialAddress?: string;
  initialChain?: Chain;
}) {
  const [address, setAddress] = useState(initialAddress ?? "");
  const [chain, setChain] = useState<Chain>(initialChain ?? "ethereum");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) {
      setError("Enter a contract address");
      return;
    }
    if (!isValidAddress(trimmed)) {
      setError("Invalid address format");
      return;
    }
    setError(null);
    onSubmit(trimmed, chain);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11.5 11.5L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste contract address (0x...)"
            className="focus-ring h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-4 font-mono text-[13px] text-foreground placeholder:text-muted/50 transition-colors hover:border-accent/30 focus:border-accent"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value as Chain)}
              className="focus-ring h-12 appearance-none rounded-xl border border-border bg-surface pl-4 pr-10 text-[13px] font-medium text-foreground transition-colors hover:border-accent/30 focus:border-accent"
            >
              {CHAIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="focus-ring relative flex h-12 min-w-[100px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent px-6 font-display text-[13px] font-semibold text-white shadow-[0_1px_12px_-2px] shadow-accent/30 transition-all hover:shadow-accent/50 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
          >
            {isLoading && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            {isLoading ? "Fetching..." : "Decode"}
          </button>
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-[12px] text-[#fb7185]">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5.5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}

      {/* Popular contracts */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted/60">Try:</span>
        {POPULAR_CONTRACTS.map((c) => (
          <button
            key={c.address}
            type="button"
            onClick={() => {
              setAddress(c.address);
              setChain(c.chain);
              setError(null);
              onSubmit(c.address, c.chain);
            }}
            className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted transition-all hover:border-accent/30 hover:text-foreground"
          >
            {c.name}
          </button>
        ))}
      </div>
    </form>
  );
}
