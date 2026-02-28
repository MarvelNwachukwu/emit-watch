"use client";

import { useState } from "react";

export function ManualAbiInput({
  onSubmit,
}: {
  onSubmit: (abi: unknown[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setError("ABI must be a JSON array");
        return;
      }
      setError(null);
      onSubmit(parsed);
    } catch {
      setError("Invalid JSON — paste a valid ABI array");
    }
  }

  return (
    <div className="animate-fade-up rounded-xl border border-[#f0b429]/20 bg-[#f0b429]/5 p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f0b429]/15">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-[#f0b429]">
            <path d="M8 1.5L1 13.5h14L8 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 6.5v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-medium text-foreground">
            ABI not found
          </p>
          <p className="text-[11px] text-muted">
            Contract may be unverified. Paste the ABI manually to decode events.
          </p>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
        placeholder='[{"type":"event","name":"Transfer",...}]'
        className="focus-ring mb-3 h-32 w-full resize-none rounded-lg border border-border bg-background p-3 font-mono text-[12px] text-foreground placeholder:text-muted/40 transition-colors hover:border-accent/30 focus:border-accent"
        spellCheck={false}
      />
      {error && (
        <p className="mb-2.5 flex items-center gap-1.5 text-[12px] text-[#fb7185]">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5.5v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="focus-ring rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white shadow-[0_1px_8px_-2px] shadow-accent/30 transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
      >
        Use This ABI
      </button>
    </div>
  );
}
