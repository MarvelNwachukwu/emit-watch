import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/alerts/telegram/status — check if user has a linked Telegram account
export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request.headers.get("authorization"));

    const result = await db.query(
      `SELECT chat_id FROM telegram_links
       WHERE user_id = $1 AND linked_at IS NOT NULL
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ linked: false });
    }

    return NextResponse.json({
      linked: true,
      chatId: result.rows[0].chat_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
