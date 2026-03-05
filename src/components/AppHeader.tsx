"use client";

import { ThemeToggle } from "./ThemeToggle";
import { ConnectButton } from "./ConnectButton";
import { TierBadge } from "./TierBadge";

export function AppHeader() {
  return (
    <header className="mx-auto mb-10 flex w-full max-w-2xl items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-accent">
            <path d="M9 1v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M1 9h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <circle cx="9" cy="9" r="1" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            Event Watch
          </h1>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted">
            Contract Event Listener
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TierBadge />
        <ConnectButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
