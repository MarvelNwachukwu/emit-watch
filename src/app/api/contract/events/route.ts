import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { fetchEventLogs } from "@/lib/explorer";
import { decodeEvents } from "@/lib/decoder";
import type { Abi } from "viem";
import type { Chain } from "@/lib/types";

const bodySchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  chain: z.enum(["ethereum", "arbitrum", "polygon"]),
  abi: z.array(z.record(z.string(), z.unknown())),
  fromBlock: z.number().optional(),
  toBlock: z.number().optional(),
});

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
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { address, chain, fromBlock, toBlock } = parsed.data;
  const abi = parsed.data.abi as unknown as Abi;

  try {
    const rawLogs = await fetchEventLogs(address, chain, fromBlock, toBlock);
    const events = decodeEvents(abi, rawLogs);

    // Sort newest first
    events.sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex);

    const oldestBlock = events.length > 0
      ? events[events.length - 1].blockNumber
      : null;

    return NextResponse.json({ events, oldestBlock });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[events-route] error: ${message}`);
    if (message.toLowerCase().includes("rate limit")) {
      return NextResponse.json(
        { error: "Rate limited by Etherscan. Try again in a few seconds." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "An internal error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
