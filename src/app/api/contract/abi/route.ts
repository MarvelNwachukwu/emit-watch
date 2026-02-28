import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { fetchAbiWithProxyFallback } from "@/lib/explorer";
import type { Chain } from "@/lib/types";

const bodySchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  chain: z.enum(["ethereum", "arbitrum", "polygon"]),
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

  const { address, chain } = parsed.data as { address: string; chain: Chain };

  try {
    const result = await fetchAbiWithProxyFallback(address, chain);

    if (!result) {
      return NextResponse.json({ error: "ABI not found" }, { status: 404 });
    }

    let abi: unknown[];
    try {
      abi = JSON.parse(result.abi);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse ABI from Etherscan" },
        { status: 502 }
      );
    }

    const eventNames = [
      ...new Set(
        abi
          .filter((item: unknown) => (item as { type: string }).type === "event")
          .map((item: unknown) => (item as { name: string }).name)
      ),
    ];

    return NextResponse.json({
      abi,
      name: result.name,
      isProxy: result.isProxy,
      eventNames,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[abi-route] error: ${message}`);
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
