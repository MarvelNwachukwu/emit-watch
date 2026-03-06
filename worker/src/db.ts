// ---------------------------------------------------------------------------
// Emit Watch Worker – database helpers
// ---------------------------------------------------------------------------

import pg from "pg";
import type {
  AlertRule,
  Chain,
  GroupedRules,
  WorkerState,
} from "./types.js";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Singleton pool
// ---------------------------------------------------------------------------

let pool: pg.Pool | undefined;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    pool = new Pool({
      connectionString,
      max: 5,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return pool;
}

/** Gracefully close the pool (called on shutdown). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetch all enabled alert rules and group them by (chain, contract_address).
 * Each group shares one poller call.
 */
export async function getEnabledRules(): Promise<GroupedRules[]> {
  const { rows } = await getPool().query<AlertRule>(
    `SELECT id, user_id, contract_address, chain, event_name,
            condition_type, condition_value, channel, channel_config, enabled
       FROM alert_rules
      WHERE enabled = true
      ORDER BY chain, contract_address`
  );

  const map = new Map<string, GroupedRules>();

  for (const rule of rows) {
    const key = `${rule.chain}:${rule.contract_address.toLowerCase()}`;
    let group = map.get(key);
    if (!group) {
      group = {
        chain: rule.chain as Chain,
        contractAddress: rule.contract_address.toLowerCase(),
        rules: [],
      };
      map.set(key, group);
    }
    group.rules.push(rule);
  }

  return Array.from(map.values());
}

/**
 * Get the last-checked block number and cached ABI for a contract key.
 * Returns `null` if no state exists yet (first poll).
 */
export async function getWorkerState(
  contractKey: string
): Promise<WorkerState | null> {
  const { rows } = await getPool().query<WorkerState>(
    `SELECT contract_key, last_checked_block, abi, updated_at
       FROM worker_state
      WHERE contract_key = $1`,
    [contractKey]
  );
  return rows[0] ?? null;
}

/**
 * Upsert worker_state for a contract key.
 * Optionally update the cached ABI.
 */
export async function updateWorkerState(
  contractKey: string,
  lastCheckedBlock: number,
  abi?: object[]
): Promise<void> {
  if (abi !== undefined) {
    await getPool().query(
      `INSERT INTO worker_state (contract_key, last_checked_block, abi, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (contract_key)
       DO UPDATE SET last_checked_block = $2, abi = $3, updated_at = now()`,
      [contractKey, lastCheckedBlock, JSON.stringify(abi)]
    );
  } else {
    await getPool().query(
      `INSERT INTO worker_state (contract_key, last_checked_block, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (contract_key)
       DO UPDATE SET last_checked_block = $2, updated_at = now()`,
      [contractKey, lastCheckedBlock]
    );
  }
}

/**
 * Record a dispatched (or failed) alert in alert_history.
 */
export async function recordAlert(
  ruleId: string,
  txHash: string,
  eventName: string,
  eventData: Record<string, unknown>,
  status: string
): Promise<void> {
  await getPool().query(
    `INSERT INTO alert_history (rule_id, transaction_hash, event_name, event_data, delivered_at, delivery_status)
     VALUES ($1, $2, $3, $4, now(), $5)`,
    [ruleId, txHash, eventName, JSON.stringify(eventData), status]
  );
}

/**
 * Look up the Telegram chat_id linked to a given user.
 * Returns `null` if the user has not linked Telegram yet.
 */
export async function getTelegramChatId(
  userId: string
): Promise<string | null> {
  const { rows } = await getPool().query<{ chat_id: string }>(
    `SELECT chat_id
       FROM telegram_links
      WHERE user_id = $1
        AND linked_at IS NOT NULL
      ORDER BY linked_at DESC
      LIMIT 1`,
    [userId]
  );
  return rows[0]?.chat_id ?? null;
}
