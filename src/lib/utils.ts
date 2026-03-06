const NAMED_EVENT_COLORS: Record<string, string> = {
  Transfer: "var(--color-event-transfer)",
  Approval: "var(--color-event-approval)",
  ApprovalForAll: "var(--color-event-approval)",
  Swap: "var(--color-event-swap)",
  Mint: "var(--color-event-mint)",
  Burn: "var(--color-event-burn)",
  Sync: "var(--color-event-sync)",
  Deposit: "var(--color-event-deposit)",
  Withdrawal: "var(--color-event-withdraw)",
  Withdraw: "var(--color-event-withdraw)",
};

const EVENT_COLORS = [
  "var(--color-event-swap)",
  "var(--color-event-transfer)",
  "var(--color-event-approval)",
  "var(--color-event-mint)",
  "var(--color-event-burn)",
  "var(--color-event-sync)",
  "var(--color-event-deposit)",
  "var(--color-event-withdraw)",
] as const;

export function truncateAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatRelativeTime(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

export function getEventColor(eventName: string): string {
  if (NAMED_EVENT_COLORS[eventName]) return NAMED_EVENT_COLORS[eventName];
  // Hash fallback for unknown event types
  let hash = 0;
  for (let i = 0; i < eventName.length; i++) {
    hash = (hash * 31 + eventName.charCodeAt(i)) | 0;
  }
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

export function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a numeric string for display.
 * When `decimals` is provided, uses it directly. Otherwise falls back to heuristics.
 */
export function formatValue(value: string, decimals?: number): { display: string; isLargeNumber: boolean } {
  // Not a pure number string? Return as-is
  if (!/^-?\d+$/.test(value)) {
    return { display: value, isLargeNumber: false };
  }

  const num = BigInt(value);
  const abs = num < 0n ? -num : num;
  const sign = num < 0n ? "-" : "";

  // If decimals are known, use them directly
  if (decimals !== undefined && decimals > 0) {
    const divisor = 10n ** BigInt(decimals);
    const whole = abs / divisor;
    const frac = abs % divisor;
    const fracDigits = Math.min(decimals, 4);
    const fracStr = frac
      .toString()
      .padStart(decimals, "0")
      .slice(0, fracDigits)
      .replace(/0+$/, "");
    const wholeFormatted = whole.toLocaleString("en-US");
    const display = fracStr
      ? `${sign}${wholeFormatted}.${fracStr}`
      : `${sign}${wholeFormatted}`;
    if (abs >= divisor) {
      return { display: `${display} (${formatCompact(abs, decimals)})`, isLargeNumber: true };
    }
    return { display, isLargeNumber: abs > 0n };
  }

  // Heuristic: Likely wei (18 decimals) — values >= 1e15
  if (abs >= 1_000_000_000_000_000n) {
    const whole = abs / 1_000_000_000_000_000_000n;
    const frac = abs % 1_000_000_000_000_000_000n;
    const fracStr = frac.toString().padStart(18, "0").slice(0, 4).replace(/0+$/, "");
    const wholeFormatted = whole.toLocaleString("en-US");
    const display = fracStr
      ? `${sign}${wholeFormatted}.${fracStr}`
      : `${sign}${wholeFormatted}`;
    return { display: `${display} (${formatCompact(abs, 18)})`, isLargeNumber: true };
  }

  // Heuristic: Likely 6-decimal token (USDC/USDT) — values >= 1e8 that are exact multiples of 1e4
  if (abs >= 100_000_000n && abs % 10_000n === 0n) {
    const whole = abs / 1_000_000n;
    const frac = abs % 1_000_000n;
    const fracStr = frac.toString().padStart(6, "0").slice(0, 2).replace(/0+$/, "");
    const wholeFormatted = whole.toLocaleString("en-US");
    if (fracStr) {
      return { display: `${sign}${wholeFormatted}.${fracStr}`, isLargeNumber: true };
    }
    return { display: `${sign}${wholeFormatted}`, isLargeNumber: true };
  }

  // Regular number — add commas
  return { display: `${sign}${abs.toLocaleString("en-US")}`, isLargeNumber: false };
}

function formatCompact(abs: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = abs / divisor;
  if (whole >= 1_000_000n) return `${(Number(whole) / 1_000_000).toFixed(2)}M`;
  if (whole >= 1_000n) return `${(Number(whole) / 1_000).toFixed(2)}K`;
  return whole.toLocaleString("en-US");
}

/**
 * Export events as CSV string
 */
export function eventsToCsv(
  events: Array<{
    eventName: string;
    blockNumber: number;
    transactionHash: string;
    timestamp: number;
    args: Record<string, string>;
    logIndex: number;
  }>
): string {
  if (events.length === 0) return "";

  // Collect all unique arg keys
  const argKeys = new Set<string>();
  for (const e of events) {
    for (const key of Object.keys(e.args)) argKeys.add(key);
  }
  const argKeyCols = [...argKeys];

  const header = ["Event", "Block", "Tx Hash", "Timestamp", "Log Index", ...argKeyCols];
  const rows = events.map((e) => [
    e.eventName,
    String(e.blockNumber),
    e.transactionHash,
    new Date(e.timestamp * 1000).toISOString(),
    String(e.logIndex),
    ...argKeyCols.map((k) => e.args[k] ?? ""),
  ]);

  const escape = (s: string) => {
    let val = s;
    // Prevent CSV formula injection from on-chain data
    if (/^[=+\-@\t\r]/.test(val)) {
      val = `'${val}`;
    }
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  return [header.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}
