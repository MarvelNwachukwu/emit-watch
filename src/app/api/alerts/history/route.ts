import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/alerts/history — paginated alert history for user's rules
export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request.headers.get("authorization"));

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
    );
    const offset = (page - 1) * limit;

    // Base filter: only history for rules owned by this user
    const conditions = ["ar.user_id = $1"];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    if (ruleId) {
      conditions.push(`ah.rule_id = $${paramIndex}`);
      values.push(ruleId);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM alert_history ah
       JOIN alert_rules ar ON ar.id = ah.rule_id
       WHERE ${whereClause}`,
      values
    );
    const total: number = countResult.rows[0].total;

    // Get paginated rows
    const dataValues = [...values, limit, offset];
    const result = await db.query(
      `SELECT
        ah.id, ah.rule_id, ah.transaction_hash, ah.event_name,
        ah.event_data, ah.delivered_at, ah.delivery_status,
        ar.contract_address, ar.chain, ar.event_name AS rule_event_name
      FROM alert_history ah
      JOIN alert_rules ar ON ar.id = ah.rule_id
      WHERE ${whereClause}
      ORDER BY ah.delivered_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      dataValues
    );

    return NextResponse.json({ history: result.rows, total, page });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
