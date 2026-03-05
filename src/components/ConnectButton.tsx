"use client";

import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

export function ConnectButton() {
  const auth = useContext(AuthContext);

  // No auth provider (Privy not configured) — don't render
  if (!auth) return null;

  const { status, address, signIn, signOut } = auth;

  if (status === "loading") {
    return <div className="h-8 w-20 rounded-lg animate-shimmer" />;
  }

  if (status === "unauthenticated") {
    return (
      <button
        onClick={signIn}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 text-[11px] font-medium text-accent transition-all hover:bg-accent/10"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 9.5a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
          <path d="M4 4V3a1 1 0 011-1h6a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        Connect
      </button>
    );
  }

  return (
    <button
      onClick={signOut}
      className="flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[11px] font-medium text-foreground transition-all hover:border-accent/30"
    >
      <span className="h-2 w-2 rounded-full bg-[#34d399]" />
      <span className="font-mono">
        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connected"}
      </span>
    </button>
  );
}
