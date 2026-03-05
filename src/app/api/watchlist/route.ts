import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/watchlist — list user's watchlist
export async function GET(request: Request) {
  try {
    await verifyAuth(request.headers.get("authorization"));
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const result = await db.query(
      `SELECT id, address, chain, label, added_at FROM watchlist_entries
       WHERE user_id = $1 ORDER BY added_at DESC`,
      [userId]
    );

    return NextResponse.json({ entries: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// POST /api/watchlist — add entry
export async function POST(request: Request) {
  try {
    await verifyAuth(request.headers.get("authorization"));
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const { address, chain, label } = await request.json();
    if (!address || !chain) {
      return NextResponse.json({ error: "Missing address or chain" }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO watchlist_entries (user_id, address, chain, label)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, lower(address), chain) DO NOTHING
       RETURNING id, address, chain, label, added_at`,
      [userId, address.toLowerCase(), chain, label ?? ""]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Already in watchlist" }, { status: 409 });
    }

    return NextResponse.json({ entry: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
