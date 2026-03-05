import { PrivyClient } from "@privy-io/server-auth";

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
