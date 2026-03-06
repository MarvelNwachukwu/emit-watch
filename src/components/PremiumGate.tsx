"use client";

import { type ReactNode } from "react";

type Props = {
  isPaid: boolean;
  children: ReactNode;
  feature?: string;
  onUpgrade?: () => void;
};

export function PremiumGate({ isPaid, children, feature, onUpgrade }: Props) {
  if (isPaid) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-foreground">
              {feature ?? "Premium Feature"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              Upgrade to Pro to unlock
            </p>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="rounded-lg bg-accent px-4 py-1.5 text-[11px] font-semibold text-background transition-opacity hover:opacity-90"
            >
              Upgrade — $3/mo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
