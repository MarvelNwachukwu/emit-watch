// ---------------------------------------------------------------------------
// Emit Watch Worker – notification dispatchers
// ---------------------------------------------------------------------------

import type { AlertRule, Chain, DecodedEvent } from "./types.js";
import { getChainConfig } from "./poller.js";

// ---------------------------------------------------------------------------
// Telegram
// ---------------------------------------------------------------------------

const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Send a formatted Telegram alert message to the given chat_id.
 * Uses the HTTP API directly to avoid importing the full bot library here.
 */
export async function sendTelegramAlert(
  chatId: string,
  event: DecodedEvent,
  rule: AlertRule
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[notifier] TELEGRAM_BOT_TOKEN is not set — skipping Telegram alert");
    return false;
  }

  const { explorerUrl } = getChainConfig(rule.chain as Chain);
  const shortAddress = `${rule.contract_address.slice(0, 6)}...${rule.contract_address.slice(-4)}`;

  // Build formatted args list
  const argsLines = Object.entries(event.args)
    .map(([key, value]) => {
      const display = typeof value === "string" && value.length > 42
        ? `${value.slice(0, 6)}...${value.slice(-4)}`
        : String(value);
      return `  • *${escapeMarkdown(key)}*: \`${escapeMarkdown(display)}\``;
    })
    .join("\n");

  const text = [
    "\u{1F514} *Event Watch Alert*",
    "",
    `\u{1F4CB} *${escapeMarkdown(event.eventName)}* on \`${escapeMarkdown(shortAddress)}\` \\(${escapeMarkdown(rule.chain)}\\)`,
    argsLines,
    "",
    `\u{1F517} [View Tx](${explorerUrl}/tx/${event.transactionHash})`,
    `\u{23F0} Block ${event.blockNumber}`,
  ].join("\n");

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "MarkdownV2",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[notifier] Telegram API error ${response.status}: ${body}`
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error("[notifier] Telegram send failed:", err);
    return false;
  }
}

/**
 * Escape special MarkdownV2 characters.
 * See https://core.telegram.org/bots/api#markdownv2-style
 */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

/**
 * POST alert data as JSON to a user-supplied webhook URL.
 */
export async function sendWebhookAlert(
  url: string,
  event: DecodedEvent,
  rule: AlertRule
): Promise<boolean> {
  const payload = {
    alert: {
      ruleId: rule.id,
      chain: rule.chain,
      contractAddress: rule.contract_address,
      conditionType: rule.condition_type,
    },
    event: {
      name: event.eventName,
      args: event.args,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      timestamp: event.timestamp,
    },
    deliveredAt: new Date().toISOString(),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(
        `[notifier] Webhook returned ${response.status} for ${url}`
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[notifier] Webhook POST to ${url} failed:`, err);
    return false;
  }
}
