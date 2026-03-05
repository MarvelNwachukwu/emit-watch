import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/lemonsqueezy";
import { db } from "@/lib/db";

type LemonSqueezyEvent = {
  meta: {
    event_name: string;
    custom_data?: {
      user_id?: string;
      wallet_address?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      status: string;
      renews_at: string | null;
      ends_at: string | null;
    };
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event: LemonSqueezyEvent = JSON.parse(rawBody);
  const { event_name, custom_data } = event.meta;
  const subscriptionId = event.data.id;
  const attrs = event.data.attributes;

  const userId = custom_data?.user_id;
  if (!userId) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  // Map Lemon Squeezy status to our status
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    cancelled: "cancelled",
    expired: "expired",
    paused: "cancelled",
    unpaid: "past_due",
  };

  const dbStatus = statusMap[attrs.status] ?? "inactive";
  const periodEnd = attrs.renews_at ?? attrs.ends_at;

  switch (event_name) {
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed":
      await db.query(
        `INSERT INTO subscriptions (user_id, lemon_squeezy_subscription_id, status, current_period_end)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (lemon_squeezy_subscription_id) DO UPDATE
         SET status = EXCLUDED.status, current_period_end = EXCLUDED.current_period_end`,
        [userId, subscriptionId, dbStatus, periodEnd]
      );
      break;

    case "subscription_cancelled":
    case "subscription_expired":
      await db.query(
        `UPDATE subscriptions SET status = $1, current_period_end = $2
         WHERE lemon_squeezy_subscription_id = $3`,
        [dbStatus, periodEnd, subscriptionId]
      );
      break;
  }

  return NextResponse.json({ ok: true });
}
