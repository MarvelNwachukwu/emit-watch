import { NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/alerts — list user's alert rules with history count
export async function GET(request: Request) {
  try {
    const userId = await resolveUserId(request.headers.get("authorization"));

    const result = await db.query(
      `SELECT
        ar.id, ar.contract_address, ar.chain, ar.event_name,
        ar.condition_type, ar.condition_value, ar.channel,
        ar.channel_config, ar.enabled, ar.created_at,
        COUNT(ah.id)::int AS history_count
      FROM alert_rules ar
      LEFT JOIN alert_history ah ON ah.rule_id = ar.id
      WHERE ar.user_id = $1
      GROUP BY ar.id
      ORDER BY ar.created_at DESC`,
      [userId]
    );

    return NextResponse.json({ rules: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

// POST /api/alerts — create new alert rule
export async function POST(request: Request) {
  try {
    const userId = await resolveUserId(request.headers.get("authorization"));

    const {
      contractAddress,
      chain,
      eventName,
      conditionType,
      conditionValue,
      channel,
      channelConfig,
    } = await request.json();

    if (!contractAddress || !chain) {
      return NextResponse.json(
        { error: "Missing contractAddress or chain" },
        { status: 400 }
      );
    }
    if (!channelConfig) {
      return NextResponse.json(
        { error: "Missing channelConfig" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO alert_rules
        (user_id, contract_address, chain, event_name, condition_type, condition_value, channel, channel_config)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, contract_address, chain, event_name, condition_type,
        condition_value, channel, channel_config, enabled, created_at`,
      [
        userId,
        contractAddress.toLowerCase(),
        chain,
        eventName ?? null,
        conditionType ?? "any",
        conditionValue ? JSON.stringify(conditionValue) : null,
        channel ?? "telegram",
        JSON.stringify(channelConfig),
      ]
    );

    return NextResponse.json({ rule: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
