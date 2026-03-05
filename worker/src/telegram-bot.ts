// ---------------------------------------------------------------------------
// Emit Watch Worker – Telegram bot for account linking
// ---------------------------------------------------------------------------

import TelegramBot from "node-telegram-bot-api";
import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | undefined;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    pool = new Pool({
      connectionString,
      max: 2,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Linking code generation
// ---------------------------------------------------------------------------

/**
 * Generate a 6-character alphanumeric linking code.
 */
function generateLinkingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ---------------------------------------------------------------------------
// Bot initialisation
// ---------------------------------------------------------------------------

let bot: TelegramBot | null = null;

/**
 * Start the Telegram bot in polling mode.
 * Handles the `/start` command to generate and store a linking code.
 */
export function startTelegramBot(): TelegramBot | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn(
      "[telegram-bot] TELEGRAM_BOT_TOKEN not set — Telegram linking disabled"
    );
    return null;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log("[telegram-bot] Bot started in polling mode");

  // Handle /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = String(msg.chat.id);
    const code = generateLinkingCode();

    try {
      // Upsert a telegram_links row with the chat_id and linking code.
      // The user_id will be set later when they paste the code in the web app.
      // We store a NULL user_id for now; the web app will match by code.
      await getPool().query(
        `INSERT INTO telegram_links (chat_id, linking_code, created_at)
         VALUES ($1, $2, now())
         ON CONFLICT (linking_code) DO UPDATE
           SET chat_id = $1, created_at = now()`,
        [chatId, code]
      );

      await bot!.sendMessage(
        chatId,
        `Your linking code is: \`${code}\`\n\nPaste this in Event Watch to connect alerts.`,
        { parse_mode: "Markdown" }
      );

      console.log(`[telegram-bot] Issued linking code ${code} for chat ${chatId}`);
    } catch (err) {
      console.error("[telegram-bot] Error handling /start:", err);
      await bot!.sendMessage(
        chatId,
        "Something went wrong. Please try again later."
      );
    }
  });

  // Handle unknown commands
  bot.on("message", (msg) => {
    // Only respond to non-command text messages
    if (msg.text && !msg.text.startsWith("/")) {
      bot!.sendMessage(
        msg.chat.id,
        "Send /start to get a linking code for Event Watch."
      );
    }
  });

  // Log polling errors without crashing
  bot.on("polling_error", (err) => {
    console.error("[telegram-bot] Polling error:", err.message);
  });

  return bot;
}

/**
 * Stop the Telegram bot polling gracefully.
 */
export async function stopTelegramBot(): Promise<void> {
  if (bot) {
    await bot.stopPolling();
    bot = null;
    console.log("[telegram-bot] Bot polling stopped");
  }
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
