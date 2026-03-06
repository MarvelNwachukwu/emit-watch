// ---------------------------------------------------------------------------
// Emit Watch Worker – Etherscan log poller
// ---------------------------------------------------------------------------

import { decodeEventLog, type Abi, type AbiEvent } from "viem";
import type { Chain, ChainConfig, DecodedEvent } from "./types.js";

// ---------------------------------------------------------------------------
// Chain configuration
// ---------------------------------------------------------------------------

const CHAIN_CONFIGS: Record<Chain, ChainConfig> = {
  ethereum: {
    name: "ethereum",
    apiBase: "https://api.etherscan.io/api",
    explorerUrl: "https://etherscan.io",
  },
  arbitrum: {
    name: "arbitrum",
    apiBase: "https://api.arbiscan.io/api",
    explorerUrl: "https://arbiscan.io",
  },
  polygon: {
    name: "polygon",
    apiBase: "https://api.polygonscan.com/api",
    explorerUrl: "https://polygonscan.com",
  },
};

export function getChainConfig(chain: Chain): ChainConfig {
  const config = CHAIN_CONFIGS[chain];
  if (!config) {
    throw new Error(`Unsupported chain: ${chain}`);
  }
  return config;
}

// ---------------------------------------------------------------------------
// Etherscan getLogs response types
// ---------------------------------------------------------------------------

interface EtherscanLogEntry {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  timeStamp: string;
  logIndex: string;
}

interface EtherscanResponse {
  status: string;
  message: string;
  result: EtherscanLogEntry[] | string;
}

// ---------------------------------------------------------------------------
// Poller
// ---------------------------------------------------------------------------

/**
 * Fetch new event logs from the Etherscan-compatible API for a given
 * contract, starting from `fromBlock`.
 *
 * Decodes every log against the supplied ABI using viem's `decodeEventLog`.
 * Logs that cannot be decoded (e.g. unknown topics) are silently skipped.
 */
export async function fetchNewEvents(
  chain: Chain,
  contractAddress: string,
  fromBlock: number,
  abi: object[]
): Promise<{ events: DecodedEvent[]; latestBlock: number }> {
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const { apiBase } = getChainConfig(chain);

  // Build Etherscan getLogs request URL
  const params = new URLSearchParams({
    module: "logs",
    action: "getLogs",
    address: contractAddress,
    fromBlock: String(fromBlock),
    toBlock: "latest",
    apikey: apiKey,
  });

  const url = `${apiBase}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Etherscan API error: ${response.status} ${response.statusText}`
    );
  }

  const body = (await response.json()) as EtherscanResponse;

  // Etherscan returns status "0" when there are no results or on error.
  // The "No records found" message is not an error — just no logs.
  if (body.status === "0") {
    if (
      typeof body.result === "string" &&
      body.result.toLowerCase().includes("no records found")
    ) {
      return { events: [], latestBlock: fromBlock };
    }

    // Rate-limit or other transient errors
    const msg =
      typeof body.result === "string" ? body.result : JSON.stringify(body.result);
    throw new Error(`Etherscan API returned error: ${msg}`);
  }

  if (!Array.isArray(body.result)) {
    return { events: [], latestBlock: fromBlock };
  }

  const logs = body.result as EtherscanLogEntry[];

  // Extract only ABI event items for decoding
  const eventAbi = (abi as Abi).filter(
    (item): item is AbiEvent => "type" in item && item.type === "event"
  );

  const events: DecodedEvent[] = [];
  let highestBlock = fromBlock;

  for (const log of logs) {
    const blockNumber = parseInt(log.blockNumber, 16);
    if (blockNumber > highestBlock) {
      highestBlock = blockNumber;
    }

    try {
      const decoded = decodeEventLog({
        abi: eventAbi,
        data: log.data as `0x${string}`,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });

      // Convert args to a plain Record, serialising BigInts as strings
      const args: Record<string, unknown> = {};
      if (decoded.args && typeof decoded.args === "object") {
        for (const [key, value] of Object.entries(
          decoded.args as Record<string, unknown>
        )) {
          args[key] = typeof value === "bigint" ? value.toString() : value;
        }
      }

      events.push({
        eventName: decoded.eventName,
        args,
        blockNumber,
        transactionHash: log.transactionHash,
        timestamp: parseInt(log.timeStamp, 16),
        logIndex: parseInt(log.logIndex, 16),
      });
    } catch {
      // Log could not be decoded against the supplied ABI — skip it
      continue;
    }
  }

  return { events, latestBlock: highestBlock };
}

// ---------------------------------------------------------------------------
// ABI fetcher (Etherscan getabi)
// ---------------------------------------------------------------------------

/**
 * Attempt to fetch a verified contract ABI from Etherscan.
 * Returns `null` if the contract is not verified.
 */
export async function fetchContractAbi(
  chain: Chain,
  contractAddress: string
): Promise<object[] | null> {
  const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
  const { apiBase } = getChainConfig(chain);

  const params = new URLSearchParams({
    module: "contract",
    action: "getabi",
    address: contractAddress,
    apikey: apiKey,
  });

  const url = `${apiBase}?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) return null;

  const body = (await response.json()) as {
    status: string;
    result: string;
  };

  if (body.status !== "1") return null;

  try {
    return JSON.parse(body.result) as object[];
  } catch {
    return null;
  }
}
