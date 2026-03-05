import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/alerts/telegram/link — verify and link a Telegram linking code
export async function POST(request: Request) {
  try {
    await verifyAuth(request.headers.get("authorization"));
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const { code } = await request.json();
    if (!code) {
      return NextResponse.json(
        { error: "Missing linking code" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE telegram_links
       SET user_id = $1, linked_at = now()
       WHERE linking_code = $2 AND linked_at IS NULL
       RETURNING id, chat_id`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired linking code" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      chatId: result.rows[0].chat_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
