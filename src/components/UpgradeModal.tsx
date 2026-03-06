"use client";

import { useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { buildCheckoutUrl } from "@/lib/lemonsqueezy";

type Props = {
  open: boolean;
  onClose: () => void;
};

const BENEFITS = [
  { icon: "∞", text: "Unlimited contract watches" },
  { icon: "📊", text: "Full analytics dashboard with charts" },
  { icon: "🔔", text: "Telegram & webhook alerts" },
  { icon: "⚡", text: "Faster polling intervals" },
];

export function UpgradeModal({ open, onClose }: Props) {
  const { userId, address } = useAuth();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleUpgrade = useCallback(() => {
    if (!userId || !address) return;
    const url = buildCheckoutUrl(userId, address);
    window.open(url, "_blank");
  }, [userId, address]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-fade-up mx-4 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" />
            </svg>
          </div>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Upgrade to Pro
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            Unlock the full power of Event Watch
          </p>
        </div>

        {/* Benefits */}
        <div className="mb-5 flex flex-col gap-2.5">
          {BENEFITS.map((b) => (
            <div key={b.text} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2">
              <span className="text-sm">{b.icon}</span>
              <span className="text-[12px] text-foreground/80">{b.text}</span>
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="mb-4 text-center">
          <span className="font-display text-2xl font-bold text-foreground">$3</span>
          <span className="text-[12px] text-muted">/month</span>
        </div>

        <button
          onClick={handleUpgrade}
          className="w-full rounded-xl bg-accent py-2.5 text-[13px] font-semibold text-background transition-opacity hover:opacity-90"
        >
          Upgrade Now
        </button>

        <button
          onClick={onClose}
          className="mt-2 w-full py-2 text-center text-[11px] text-muted transition-colors hover:text-foreground"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
