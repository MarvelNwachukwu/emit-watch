"use client";

import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

export function TierBadge() {
  const auth = useContext(AuthContext);
  if (!auth || auth.status !== "authenticated") return null;

  const isPro = auth.tier === "pro";

  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
        isPro
          ? "bg-accent/15 text-accent"
          : "bg-border text-muted"
      }`}
    >
      {isPro ? "Pro" : "Free"}
    </span>
  );
}
