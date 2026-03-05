"use client";

import { useState } from "react";

type Props = {
  onLinked: () => void;
  getAccessToken: () => Promise<string | null>;
  userId: string;
};

type Step = "instructions" | "input" | "verifying" | "success" | "error";

export function TelegramLinkFlow({ onLinked, getAccessToken, userId }: Props) {
  const [step, setStep] = useState<Step>("instructions");
  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleVerify() {
    const trimmed = code.trim();
    if (trimmed.length !== 6) return;

    setStep("verifying");
    setErrorMsg("");

    try {
      const token = await getAccessToken();
      if (!token) {
        setErrorMsg("Authentication required");
        setStep("error");
        return;
      }

      const res = await fetch("/api/alerts/telegram/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
        body: JSON.stringify({ code: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Invalid or expired code");
        setStep("error");
        return;
      }

      setStep("success");
      onLinked();
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStep("error");
    }
  }

  if (step === "success") {
    return (
      <div className="animate-fade-up flex flex-col items-center gap-4 rounded-xl border border-[#34d399]/20 bg-[#34d399]/5 px-6 py-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#34d399]/15">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#34d399]">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-display text-[15px] font-semibold text-foreground">
            Telegram linked!
          </p>
          <p className="mt-1 text-[12px] text-muted">
            You will receive alert notifications via Telegram.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up flex flex-col gap-5 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#229ED9]/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#229ED9]">
            <path d="M21.2 4.4L2.4 11.3c-.6.2-.6.7 0 .9l4.8 1.5 1.8 5.8c.2.5.7.5 1 .2l2.6-2.1 5.1 3.8c.5.4 1.1.1 1.2-.5L22 5.3c.2-.7-.3-1.2-.8-.9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.2 13.7L18.8 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h3 className="font-display text-[13px] font-semibold text-foreground">
            Link Telegram
          </h3>
          <p className="text-[11px] text-muted">
            Connect your Telegram account to receive alerts
          </p>
        </div>
      </div>

      {/* Step 1: Instructions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-background px-4 py-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
            1
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-medium text-foreground">
              Open Telegram and message our bot
            </p>
            <p className="text-[11px] text-muted">
              Send <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] text-accent">/start</span> to{" "}
              <span className="font-medium text-foreground">@EventWatchBot</span> on Telegram
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border-subtle bg-background px-4 py-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
            2
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-medium text-foreground">
              Get your linking code
            </p>
            <p className="text-[11px] text-muted">
              The bot will reply with a 6-character code. Enter it below.
            </p>
          </div>
        </div>
      </div>

      {/* Step 2: Code input */}
      <div className="flex flex-col gap-2">
        <label htmlFor="telegram-code" className="text-[11px] font-medium text-muted">
          Linking Code
        </label>
        <div className="flex gap-2">
          <input
            id="telegram-code"
            type="text"
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
              setCode(val);
              if (step === "error") setStep("input");
            }}
            onFocus={() => {
              if (step === "instructions") setStep("input");
            }}
            placeholder="ABC123"
            maxLength={6}
            spellCheck={false}
            autoComplete="off"
            className="focus-ring h-9 flex-1 rounded-lg border border-border bg-background px-3 font-mono text-[13px] uppercase tracking-widest text-foreground placeholder:text-muted/30 transition-colors hover:border-accent/30 focus:border-accent"
          />
          <button
            onClick={handleVerify}
            disabled={code.trim().length !== 6 || step === "verifying"}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[12px] font-medium text-white transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === "verifying" ? (
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="animate-spin">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                  <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Verifying
              </>
            ) : (
              "Verify"
            )}
          </button>
        </div>

        {/* Error message */}
        {step === "error" && errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-[#fb7185]/20 bg-[#fb7185]/5 px-3 py-2">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[#fb7185]">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-[11px] text-[#fb7185]">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
