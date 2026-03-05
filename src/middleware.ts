import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute per IP

const ipRequests = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [ip, entry] of ipRequests) {
    if (entry.resetAt <= now) ipRequests.delete(ip);
  }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(request: NextRequest) {
  cleanup();

  const ip = getClientIp(request);
  const now = Date.now();
  const entry = ipRequests.get(ip);

  if (!entry || entry.resetAt <= now) {
    ipRequests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/contract/:path*",
    "/api/auth/:path*",
    "/api/watchlist/:path*",
    "/api/alerts/:path*",
  ],
};
