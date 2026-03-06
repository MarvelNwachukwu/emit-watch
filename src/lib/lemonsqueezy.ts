const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID ?? "";
const CHECKOUT_URL = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL ?? "";

export function buildCheckoutUrl(userId: string, walletAddress: string): string {
  const url = new URL(CHECKOUT_URL);
  url.searchParams.set("checkout[custom][user_id]", userId);
  url.searchParams.set("checkout[custom][wallet_address]", walletAddress);
  return url.toString();
}

export function getStoreId(): string {
  return STORE_ID;
}

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ?? "";
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === signature;
}
