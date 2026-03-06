import { PrivyClient } from "@privy-io/server-auth";
import { db } from "@/lib/db";

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function verifyAuth(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.slice(7);
  const { userId } = await privy.verifyAuthToken(token);
  return { privyUserId: userId };
}

export async function getPrivyUser(privyUserId: string) {
  return privy.getUser(privyUserId);
}

/**
 * Verify JWT and resolve the database user ID server-side.
 * This prevents IDOR attacks — the userId is derived from the token,
 * never from client-supplied headers.
 */
export async function resolveUserId(authHeader: string | null): Promise<string> {
  const { privyUserId } = await verifyAuth(authHeader);
  const privyUser = await getPrivyUser(privyUserId);
  const wallet = privyUser.wallet;
  if (!wallet?.address) {
    throw new Error("No wallet linked");
  }
  const address = wallet.address.toLowerCase();
  const result = await db.query<{ id: string }>(
    `SELECT id FROM users WHERE wallet_address = $1`,
    [address]
  );
  if (result.rows.length === 0) {
    throw new Error("User not found");
  }
  return result.rows[0].id;
}
