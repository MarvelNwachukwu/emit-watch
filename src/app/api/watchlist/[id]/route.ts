import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/watchlist/:id
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAuth(request.headers.get("authorization"));
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const { id } = await params;

    const result = await db.query(
      `DELETE FROM watchlist_entries WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// PATCH /api/watchlist/:id — rename
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAuth(request.headers.get("authorization"));
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const { id } = await params;
    const { label } = await request.json();

    const result = await db.query(
      `UPDATE watchlist_entries SET label = $1 WHERE id = $2 AND user_id = $3 RETURNING id, label`,
      [label ?? "", id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ entry: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
