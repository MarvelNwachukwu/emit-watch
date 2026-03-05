import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/alerts/:id — update alert rule
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
    const body = await request.json();

    // Build dynamic SET clause from allowed mutable fields
    const allowedFields: Record<string, string> = {
      eventName: "event_name",
      conditionType: "condition_type",
      conditionValue: "condition_value",
      channel: "channel",
      channelConfig: "channel_config",
      enabled: "enabled",
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [bodyKey, dbColumn] of Object.entries(allowedFields)) {
      if (bodyKey in body) {
        const value =
          bodyKey === "conditionValue" || bodyKey === "channelConfig"
            ? JSON.stringify(body[bodyKey])
            : body[bodyKey];
        setClauses.push(`${dbColumn} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    values.push(id, userId);

    const result = await db.query(
      `UPDATE alert_rules
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING id, contract_address, chain, event_name, condition_type,
         condition_value, channel, channel_config, enabled, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ rule: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// DELETE /api/alerts/:id — delete alert rule
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
      `DELETE FROM alert_rules WHERE id = $1 AND user_id = $2 RETURNING id`,
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
