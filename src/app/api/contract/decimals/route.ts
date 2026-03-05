import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { getKnownDecimals } from "@/lib/tokens";
import { getEtherscanUrl } from "@/lib/chains";
import { rateLimiter } from "@/lib/rate-limiter";
import { cache, TTL } from "@/lib/cache";

const ONE_HOUR = TTL.ABI; // 1 hour — decimals never change
import type { Chain } from "@/lib/types";

const bodySchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  chain: z.enum(["ethereum", "arbitrum", "polygon"]),
});

// ERC-20 decimals() function selector: 0x313ce567
const DECIMALS_SELECTOR = "0x313ce567";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues.map((i) => ({ field: i.path.map(String).join("."), message: i.message })) },
      { status: 400 }
    );
  }

  const { address, chain } = parsed.data as { address: string; chain: Chain };

  // 1. Check hardcoded map first
  const known = getKnownDecimals(address);
  if (known !== undefined) {
    return NextResponse.json({ decimals: known });
  }

  // 2. Check cache
  const cacheKey = `decimals:${chain}:${address.toLowerCase()}`;
  const cached = cache.get<number | null>(cacheKey);
  if (cached !== undefined) {
    return NextResponse.json({ decimals: cached });
  }

  // 3. Try on-chain call via Etherscan proxy
  try {
    await rateLimiter.acquire();
    const url = getEtherscanUrl(chain, {
      module: "proxy",
      action: "eth_call",
      to: address,
      data: DECIMALS_SELECTOR,
      tag: "latest",
    });

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      throw new Error(`Etherscan responded with ${res.status}`);
    }
    const data = await res.json();

    if (data.result && data.result !== "0x" && data.result.length > 2) {
      const decimals = parseInt(data.result, 16);
      if (decimals >= 0 && decimals <= 77) {
        cache.set(cacheKey, decimals, ONE_HOUR);
        return NextResponse.json({ decimals });
      }
    }

    // Contract doesn't have decimals() or returned invalid value
    cache.set(cacheKey, null, ONE_HOUR);
    return NextResponse.json({ decimals: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[decimals-route] error: ${message}`);
    return NextResponse.json({ decimals: null });
  }
}
