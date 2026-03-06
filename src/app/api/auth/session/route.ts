import { NextResponse } from "next/server";
import { verifyAuth, getPrivyUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { privyUserId } = await verifyAuth(
      request.headers.get("authorization")
    );

    // Get wallet address from Privy
    const privyUser = await getPrivyUser(privyUserId);
    const wallet = privyUser.wallet;
    if (!wallet?.address) {
      return NextResponse.json({ error: "No wallet linked" }, { status: 400 });
    }

    const address = wallet.address.toLowerCase();

    // Upsert user in our DB
    let userId: string;
    let tier = "free";

    try {
      const result = await db.query(
        `INSERT INTO users (wallet_address) VALUES ($1)
         ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = EXCLUDED.wallet_address
         RETURNING id`,
        [address]
      );
      userId = result.rows[0].id;

      // Check subscription
      const subResult = await db.query(
        `SELECT status FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
        [userId]
      );
      if (subResult.rows.length > 0) tier = "pro";
    } catch {
      // DB not connected — return with Privy ID only
      return NextResponse.json({
        address,
        userId: null,
        tier: "free",
      });
    }

    return NextResponse.json({ address, userId, tier });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
