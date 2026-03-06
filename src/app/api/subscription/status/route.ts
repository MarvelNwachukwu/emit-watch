import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request.headers.get("authorization"));

    const result = await db.query(
      `SELECT status, current_period_end FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY current_period_end DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ tier: "free", expiresAt: null });
    }

    return NextResponse.json({
      tier: "pro",
      expiresAt: result.rows[0].current_period_end,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
