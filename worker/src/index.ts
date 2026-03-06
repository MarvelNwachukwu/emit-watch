// ---------------------------------------------------------------------------
// Emit Watch Worker – main entry point
// ---------------------------------------------------------------------------

import {
  getEnabledRules,
  getWorkerState,
  updateWorkerState,
  recordAlert,
  getTelegramChatId,
  closePool,
} from "./db.js";
import { fetchNewEvents, fetchContractAbi } from "./poller.js";
import { matchEvents } from "./matcher.js";
import { sendTelegramAlert, sendWebhookAlert } from "./notifier.js";
import { startTelegramBot, stopTelegramBot } from "./telegram-bot.js";
import type { AlertRule, DecodedEvent, GroupedRules } from "./types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 15_000; // 15 seconds between cycles
const BLOCK_LOOKBACK = 50; // safety margin on first poll

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

let running = true;

function log(msg: string): void {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function logError(msg: string, err?: unknown): void {
  const ts = new Date().toISOString();
  console.error(`[${ts}] ${msg}`, err ?? "");
}

// ---------------------------------------------------------------------------
// Alert dispatch
// ---------------------------------------------------------------------------

async function dispatchAlert(
  rule: AlertRule,
  event: DecodedEvent
): Promise<string> {
  try {
    if (rule.channel === "telegram") {
      const chatId = rule.channel_config?.chat_id
        ?? await getTelegramChatId(rule.user_id);

      if (!chatId) {
        log(`  [dispatch] No Telegram chat_id for user ${rule.user_id} — skipping`);
        return "skipped_no_chat_id";
      }

      const ok = await sendTelegramAlert(chatId, event, rule);
      return ok ? "sent" : "failed";
    }

    if (rule.channel === "webhook") {
      const url = rule.channel_config?.url;
      if (!url) {
        log(`  [dispatch] No webhook URL in channel_config for rule ${rule.id}`);
        return "skipped_no_url";
      }

      const ok = await sendWebhookAlert(url, event, rule);
      return ok ? "sent" : "failed";
    }

    log(`  [dispatch] Unknown channel "${rule.channel}" for rule ${rule.id}`);
    return "skipped_unknown_channel";
  } catch (err) {
    logError(`  [dispatch] Unexpected error for rule ${rule.id}:`, err);
    return "failed";
  }
}

// ---------------------------------------------------------------------------
// Process one contract group
// ---------------------------------------------------------------------------

async function processGroup(group: GroupedRules): Promise<void> {
  const contractKey = `${group.chain}:${group.contractAddress}`;

  // 1. Get worker state
  const state = await getWorkerState(contractKey);
  let fromBlock = state?.last_checked_block ?? 0;
  let abi = state?.abi as object[] | null;

  // 2. If no ABI cached, try to fetch from Etherscan
  if (!abi || (Array.isArray(abi) && abi.length === 0)) {
    log(`  Fetching ABI for ${contractKey}...`);
    const fetchedAbi = await fetchContractAbi(group.chain, group.contractAddress);
    if (!fetchedAbi) {
      log(`  Could not fetch ABI for ${contractKey} — skipping this cycle`);
      return;
    }
    abi = fetchedAbi;
    // Persist the ABI so we don't fetch it again
    await updateWorkerState(contractKey, fromBlock, abi);
    log(`  Cached ABI for ${contractKey} (${abi.length} items)`);
  }

  // 3. Apply lookback safety margin on very first poll
  if (fromBlock === 0) {
    // Start from a recent block rather than genesis.
    // The first poll will return nothing (or very little) and set the baseline.
    log(`  First poll for ${contractKey} — starting from latest minus ${BLOCK_LOOKBACK}`);
    fromBlock = 0; // Etherscan will return latest results; we rely on latestBlock from response
  } else {
    // Start one block after the last checked to avoid duplicates
    fromBlock = fromBlock + 1;
  }

  // 4. Fetch new events
  const { events, latestBlock } = await fetchNewEvents(
    group.chain,
    group.contractAddress,
    fromBlock,
    abi
  );

  if (events.length > 0) {
    log(`  Found ${events.length} event(s) for ${contractKey} (blocks ${fromBlock}–${latestBlock})`);
  }

  // 5. Match events against rules
  const matches = matchEvents(group.rules, events);

  if (matches.length > 0) {
    log(`  ${matches.length} alert match(es) for ${contractKey}`);
  }

  // 6. Dispatch alerts and record history
  for (const { rule, event } of matches) {
    const status = await dispatchAlert(rule, event);

    await recordAlert(
      rule.id,
      event.transactionHash,
      event.eventName,
      event.args,
      status
    );

    log(
      `  Alert: rule=${rule.id} event=${event.eventName} tx=${event.transactionHash.slice(0, 10)}... status=${status}`
    );
  }

  // 7. Update worker state with the highest block we've seen
  const newBlock = Math.max(latestBlock, fromBlock);
  if (newBlock > (state?.last_checked_block ?? 0)) {
    await updateWorkerState(contractKey, newBlock);
  }
}

// ---------------------------------------------------------------------------
// Main polling loop
// ---------------------------------------------------------------------------

async function pollCycle(): Promise<void> {
  try {
    const groups = await getEnabledRules();

    if (groups.length === 0) {
      log("No enabled alert rules — waiting...");
      return;
    }

    log(`Processing ${groups.length} contract group(s)...`);

    for (const group of groups) {
      const contractKey = `${group.chain}:${group.contractAddress}`;
      try {
        await processGroup(group);
      } catch (err) {
        logError(`Error processing ${contractKey}:`, err);
        // Continue with other groups — don't let one failure stop the cycle
      }
    }
  } catch (err) {
    logError("Poll cycle failed:", err);
  }
}

async function startPolling(): Promise<void> {
  log("Starting polling loop (interval: 15s)...");

  while (running) {
    await pollCycle();

    // Sleep between cycles
    if (running) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, POLL_INTERVAL_MS);
        // Allow the timer to be garbage collected on shutdown
        if (typeof timer === "object" && "unref" in timer) {
          timer.unref();
        }
      });
    }
  }

  log("Polling loop stopped");
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

async function shutdown(signal: string): Promise<void> {
  log(`Received ${signal} — shutting down gracefully...`);
  running = false;

  try {
    await stopTelegramBot();
    await closePool();
    log("Cleanup complete — exiting");
  } catch (err) {
    logError("Error during shutdown:", err);
  }

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log("===========================================");
  log("  Emit Watch Worker starting");
  log("===========================================");

  // Validate required env vars
  if (!process.env.DATABASE_URL) {
    logError("DATABASE_URL is required");
    process.exit(1);
  }

  if (!process.env.ETHERSCAN_API_KEY) {
    log("WARNING: ETHERSCAN_API_KEY not set — API calls may be rate-limited");
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    log("WARNING: TELEGRAM_BOT_TOKEN not set — Telegram features disabled");
  }

  // Start the Telegram linking bot
  startTelegramBot();

  // Start the polling loop (runs forever until shutdown)
  await startPolling();
}

main().catch((err) => {
  logError("Fatal error:", err);
  process.exit(1);
});
