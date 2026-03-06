import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/watchlist/sync — merge localStorage entries into DB on first sign-in
export async function POST(request: Request) {
  try {
    const userId = await resolveUserId(request.headers.get("authorization"));

    const { entries } = await request.json();
    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: "Invalid entries" }, { status: 400 });
    }

    let synced = 0;
    for (const entry of entries) {
      if (!entry.address || !entry.chain) continue;
      const result = await db.query(
        `INSERT INTO watchlist_entries (user_id, address, chain, label)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, lower(address), chain) DO NOTHING
         RETURNING id`,
        [userId, entry.address.toLowerCase(), entry.chain, entry.label ?? ""]
      );
      if (result.rows.length > 0) synced++;
    }

    return NextResponse.json({ synced });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
