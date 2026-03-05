"use client";

import { useState } from "react";
import type { Chain } from "@/lib/types";
import { truncateAddress } from "@/lib/utils";
import { CHAINS } from "@/lib/chains";
import { TelegramLinkFlow } from "./TelegramLinkFlow";

type WatchlistEntry = {
  address: string;
  chain: Chain;
  label: string;
};

type ConditionType = "any" | "specific_event" | "value_threshold" | "address_match";
type ChannelType = "telegram" | "webhook";

type Props = {
  watchlistEntries: WatchlistEntry[];
  onCreated: () => void;
  onCancel: () => void;
  getAccessToken: () => Promise<string | null>;
  userId: string;
};

export function AlertRuleBuilder({
  watchlistEntries,
  onCreated,
  onCancel,
  getAccessToken,
  userId,
}: Props) {
  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Contract selection
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Step 2: Condition
  const [conditionType, setConditionType] = useState<ConditionType>("any");
  const [eventName, setEventName] = useState("");
  const [thresholdField, setThresholdField] = useState("");
  const [thresholdOperator, setThresholdOperator] = useState<"gt" | "lt" | "eq">("gt");
  const [thresholdValue, setThresholdValue] = useState("");
  const [matchAddress, setMatchAddress] = useState("");

  // Step 3: Channel
  const [channelType, setChannelType] = useState<ChannelType>("telegram");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [showTelegramLink, setShowTelegramLink] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedEntry = selectedIndex !== null ? watchlistEntries[selectedIndex] : null;

  // Check Telegram status when channel step is reached
  async function checkTelegramStatus() {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch("/api/alerts/telegram/status", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTelegramLinked(!!data.linked);
      }
    } catch {
      // Silent fail
    }
  }

  function goToStep(step: number) {
    setCurrentStep(step);
    if (step === 3) {
      checkTelegramStatus();
    }
  }

  function buildConditionValue() {
    switch (conditionType) {
      case "any":
        return null;
      case "specific_event":
        return { event_name: eventName };
      case "value_threshold":
        return { field: thresholdField, operator: thresholdOperator, threshold: thresholdValue };
      case "address_match":
        return { field: "to", address: matchAddress.toLowerCase() };
    }
  }

  async function handleSubmit() {
    if (!selectedEntry) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Authentication required");
        setIsSubmitting(false);
        return;
      }

      const channelConfig = channelType === "webhook"
        ? { url: webhookUrl }
        : {};

      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-user-id": userId,
        },
        body: JSON.stringify({
          contractAddress: selectedEntry.address,
          chain: selectedEntry.chain,
          eventName: conditionType === "specific_event" ? eventName : null,
          conditionType,
          conditionValue: buildConditionValue(),
          channel: channelType,
          channelConfig,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create alert rule");
        setIsSubmitting(false);
        return;
      }

      onCreated();
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  const canProceedStep1 = selectedIndex !== null;
  const canProceedStep2 =
    conditionType === "any" ||
    (conditionType === "specific_event" && eventName.trim().length > 0) ||
    (conditionType === "value_threshold" &&
      thresholdField.trim().length > 0 &&
      thresholdValue.trim().length > 0) ||
    (conditionType === "address_match" && /^0x[0-9a-fA-F]{40}$/.test(matchAddress));
  const canSubmit =
    (channelType === "telegram" && telegramLinked) ||
    (channelType === "webhook" && webhookUrl.trim().startsWith("http"));

  const CONDITION_OPTIONS: { value: ConditionType; label: string; description: string }[] = [
    { value: "any", label: "Any Event", description: "Trigger on every emitted event" },
    { value: "specific_event", label: "Specific Event", description: "Match a named event (e.g. Transfer)" },
    { value: "value_threshold", label: "Value Threshold", description: "Trigger when a field exceeds a value" },
    { value: "address_match", label: "Address Match", description: "Trigger when an address appears in args" },
  ];

  return (
    <div className="animate-fade-up flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-muted transition-all hover:border-accent/30 hover:text-foreground"
            aria-label="Back to alerts"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="font-display text-[15px] font-semibold text-foreground">
            New Alert Rule
          </h2>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === currentStep
                  ? "w-4 bg-accent"
                  : s < currentStep
                    ? "w-1.5 bg-accent/40"
                    : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Select Contract */}
      {currentStep === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-[13px] font-medium text-foreground">Select Contract</h3>
            <p className="text-[11px] text-muted">Choose a contract from your watchlist to monitor</p>
          </div>

          {watchlistEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-background px-6 py-8">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="text-muted/40">
                <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-[12px] text-muted">
                Add contracts to your watchlist first
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {watchlistEntries.map((entry, idx) => (
                <button
                  key={`${entry.chain}:${entry.address}`}
                  onClick={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                    selectedIndex === idx
                      ? "border-accent/40 bg-accent/5"
                      : "border-border bg-surface hover:border-accent/20"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      selectedIndex === idx ? "bg-accent" : "bg-muted/30"
                    }`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[12px] font-medium text-foreground">
                      {entry.label}
                    </span>
                    <span className="font-mono text-[11px] text-muted">
                      {truncateAddress(entry.address)}
                    </span>
                  </div>
                  <span className="shrink-0 rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted">
                    {CHAINS[entry.chain].name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => goToStep(2)}
              disabled={!canProceedStep1}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[12px] font-medium text-white transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Condition */}
      {currentStep === 2 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-[13px] font-medium text-foreground">Set Condition</h3>
            <p className="text-[11px] text-muted">
              Define when this alert should fire for{" "}
              <span className="font-medium text-foreground">{selectedEntry?.label}</span>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            {CONDITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setConditionType(opt.value)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                  conditionType === opt.value
                    ? "border-accent/40 bg-accent/5"
                    : "border-border bg-surface hover:border-accent/20"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    conditionType === opt.value
                      ? "border-accent bg-accent"
                      : "border-muted/40"
                  }`}
                >
                  {conditionType === opt.value && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-medium text-foreground">{opt.label}</span>
                  <span className="text-[11px] text-muted">{opt.description}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Sub-fields based on condition type */}
          {conditionType === "specific_event" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event-name" className="text-[11px] font-medium text-muted">
                Event Name
              </label>
              <input
                id="event-name"
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Transfer"
                spellCheck={false}
                className="focus-ring h-9 rounded-lg border border-border bg-background px-3 text-[12px] text-foreground placeholder:text-muted/30 transition-colors hover:border-accent/30 focus:border-accent"
              />
            </div>
          )}

          {conditionType === "value_threshold" && (
            <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-background p-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="threshold-field" className="text-[11px] font-medium text-muted">
                  Field Name
                </label>
                <input
                  id="threshold-field"
                  type="text"
                  value={thresholdField}
                  onChange={(e) => setThresholdField(e.target.value)}
                  placeholder="value"
                  spellCheck={false}
                  className="focus-ring h-9 rounded-lg border border-border bg-surface px-3 text-[12px] text-foreground placeholder:text-muted/30 transition-colors hover:border-accent/30 focus:border-accent"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="threshold-op" className="text-[11px] font-medium text-muted">
                    Operator
                  </label>
                  <select
                    id="threshold-op"
                    value={thresholdOperator}
                    onChange={(e) => setThresholdOperator(e.target.value as "gt" | "lt" | "eq")}
                    className="focus-ring h-9 rounded-lg border border-border bg-surface px-2 text-[12px] text-foreground transition-colors hover:border-accent/30 focus:border-accent"
                  >
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                    <option value="eq">Equal to</option>
                  </select>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor="threshold-value" className="text-[11px] font-medium text-muted">
                    Value
                  </label>
                  <input
                    id="threshold-value"
                    type="text"
                    value={thresholdValue}
                    onChange={(e) => setThresholdValue(e.target.value)}
                    placeholder="1000000"
                    spellCheck={false}
                    className="focus-ring h-9 rounded-lg border border-border bg-surface px-3 font-mono text-[12px] text-foreground placeholder:text-muted/30 transition-colors hover:border-accent/30 focus:border-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {conditionType === "address_match" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="match-address" className="text-[11px] font-medium text-muted">
                Address to Match
              </label>
              <input
                id="match-address"
                type="text"
                value={matchAddress}
                onChange={(e) => setMatchAddress(e.target.value)}
                placeholder="0x..."
                spellCheck={false}
                className="focus-ring h-9 rounded-lg border border-border bg-background px-3 font-mono text-[12px] text-foreground placeholder:text-muted/30 transition-colors hover:border-accent/30 focus:border-accent"
              />
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => goToStep(1)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[12px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <button
              onClick={() => goToStep(3)}
              disabled={!canProceedStep2}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[12px] font-medium text-white transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Channel */}
      {currentStep === 3 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-[13px] font-medium text-foreground">Notification Channel</h3>
            <p className="text-[11px] text-muted">
              Choose how you want to be notified
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setChannelType("telegram")}
              className={`flex flex-1 items-center gap-2.5 rounded-lg border px-4 py-3 transition-all ${
                channelType === "telegram"
                  ? "border-accent/40 bg-accent/5"
                  : "border-border bg-surface hover:border-accent/20"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#229ED9]">
                <path d="M21.2 4.4L2.4 11.3c-.6.2-.6.7 0 .9l4.8 1.5 1.8 5.8c.2.5.7.5 1 .2l2.6-2.1 5.1 3.8c.5.4 1.1.1 1.2-.5L22 5.3c.2-.7-.3-1.2-.8-.9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[12px] font-medium text-foreground">Telegram</span>
                <span className="text-[10px] text-muted">Instant messages</span>
              </div>
            </button>
            <button
              onClick={() => setChannelType("webhook")}
              className={`flex flex-1 items-center gap-2.5 rounded-lg border px-4 py-3 transition-all ${
                channelType === "webhook"
                  ? "border-accent/40 bg-accent/5"
                  : "border-border bg-surface hover:border-accent/20"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent">
                <path d="M8 2v4M8 10v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 8h4M10 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-[12px] font-medium text-foreground">Webhook</span>
                <span className="text-[10px] text-muted">HTTP POST endpoint</span>
              </div>
            </button>
          </div>

          {/* Channel-specific content */}
          {channelType === "telegram" && (
            <div className="flex flex-col gap-3">
              {telegramLinked ? (
                <div className="flex items-center gap-2.5 rounded-lg border border-[#34d399]/20 bg-[#34d399]/5 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-[#34d399]" />
                  <span className="text-[12px] font-medium text-[#34d399]">
                    Telegram linked
                  </span>
                </div>
              ) : showTelegramLink ? (
                <TelegramLinkFlow
                  onLinked={() => {
                    setTelegramLinked(true);
                    setShowTelegramLink(false);
                  }}
                  getAccessToken={getAccessToken}
                  userId={userId}
                />
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-background px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-[#fb7185]/60" />
                    <span className="text-[12px] text-muted">Telegram not linked</span>
                  </div>
                  <button
                    onClick={() => setShowTelegramLink(true)}
                    className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-[11px] font-medium text-accent transition-all hover:bg-accent/10"
                  >
                    Link Now
                  </button>
                </div>
              )}
            </div>
          )}

          {channelType === "webhook" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="webhook-url" className="text-[11px] font-medium text-muted">
                Webhook URL
              </label>
              <input
                id="webhook-url"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                spellCheck={false}
                className="focus-ring h-9 rounded-lg border border-border bg-background px-3 font-mono text-[11px] text-foreground placeholder:text-muted/30 transition-colors hover:border-accent/30 focus:border-accent"
              />
              <p className="text-[10px] text-muted">
                We will send a POST request with event data as JSON.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-[#fb7185]/20 bg-[#fb7185]/5 px-3 py-2">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[#fb7185]">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-[11px] text-[#fb7185]">{error}</p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => goToStep(2)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[12px] font-medium text-muted transition-all hover:border-accent/30 hover:text-foreground"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[12px] font-medium text-white transition-all hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="animate-spin">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                    <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Create Alert
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
