import { getEtherscanUrl } from "./chains";
import { rateLimiter } from "./rate-limiter";
import { cache, TTL } from "./cache";
import type { Chain, RawLog } from "./types";

type EtherscanResponse<T> = {
  status: "0" | "1";
  message: string;
  result: T | string;
};

type SourceCodeEntry = {
  ContractName: string;
  Implementation: string;
  Proxy: string;
};

async function etherscanFetch<T>(url: string): Promise<T> {
  await rateLimiter.acquire();
  const urlObj = new URL(url);
  const action = urlObj.searchParams.get("action");
  const module = urlObj.searchParams.get("module");
  console.log(`[etherscan] ${module}/${action} → (live)`);

  const res = await fetch(url);
  const data: EtherscanResponse<T> = await res.json();

  console.log(`[etherscan] ${module}/${action} ← status=${data.status} message="${data.message}" resultType=${typeof data.result} ${Array.isArray(data.result) ? `len=${data.result.length}` : typeof data.result === "string" ? `"${data.result.slice(0, 80)}"` : ""}`);

  if (data.status === "0") {
    throw new Error(typeof data.result === "string" ? data.result : data.message);
  }

  return data.result as T;
}

// ---------------------------------------------------------------------------
//  Cached low-level fetchers
// ---------------------------------------------------------------------------

/** Fetch ABI string for a single address (no proxy logic). Cached 1h. */
async function fetchAbiRaw(
  address: string,
  chain: Chain
): Promise<string | null> {
  const key = `abi:${chain}:${address.toLowerCase()}`;
  const cached = cache.get<string | null>(key);
  if (cached !== undefined) {
    console.log(`[cache] HIT ${key}`);
    return cached;
  }

  try {
    const result = await etherscanFetch<string>(
      getEtherscanUrl(chain, {
        module: "contract",
        action: "getabi",
        address,
      })
    );
    cache.set(key, result, TTL.ABI);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("not verified")) {
      cache.set(key, null, TTL.ABI);
      return null;
    }
    throw err;
  }
}

/** Fetch source code info — contract name, proxy flag, implementation address. Cached 1h. */
async function fetchSourceInfo(
  address: string,
  chain: Chain
): Promise<SourceCodeEntry | null> {
  const key = `src:${chain}:${address.toLowerCase()}`;
  const cached = cache.get<SourceCodeEntry | null>(key);
  if (cached !== undefined) {
    console.log(`[cache] HIT ${key}`);
    return cached;
  }

  try {
    const result = await etherscanFetch<SourceCodeEntry[]>(
      getEtherscanUrl(chain, {
        module: "contract",
        action: "getsourcecode",
        address,
      })
    );
    const entry = Array.isArray(result) && result[0] ? result[0] : null;
    cache.set(key, entry, TTL.SOURCE_INFO);
    return entry;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------------

export async function fetchAbiWithProxyFallback(
  address: string,
  chain: Chain
): Promise<{ abi: string; name: string; isProxy: boolean } | null> {
  // Fetch ABI and source info in parallel
  const [abiRaw, sourceInfo] = await Promise.all([
    fetchAbiRaw(address, chain),
    fetchSourceInfo(address, chain),
  ]);

  const name = sourceInfo?.ContractName || "";
  const implAddress = sourceInfo?.Implementation || "";

  console.log(`[proxy] address=${address} name="${name}" proxy=${sourceInfo?.Proxy} implementation="${implAddress}"`);

  // If Etherscan identifies a proxy with an implementation, fetch the real ABI
  if (implAddress && /^0x[0-9a-fA-F]{40}$/.test(implAddress)) {
    console.log(`[proxy] fetching implementation ABI from ${implAddress}`);
    const implAbi = await fetchAbiRaw(implAddress, chain);
    if (implAbi) {
      console.log(`[proxy] implementation ABI found: name="${name}" abiLen=${implAbi.length}`);
      return { abi: implAbi, name, isProxy: true };
    }
    console.log(`[proxy] implementation ABI not found, falling back to direct`);
  }

  if (abiRaw) {
    console.log(`[proxy] using direct ABI: name="${name}" abiLen=${abiRaw.length}`);
    return { abi: abiRaw, name, isProxy: false };
  }

  console.log(`[proxy] no ABI found at all`);
  return null;
}

/** Latest block number — cached 12s (one block time). */
export async function fetchLatestBlockNumber(chain: Chain): Promise<number> {
  const key = `block:${chain}`;
  const cached = cache.get<number>(key);
  if (cached !== undefined) {
    console.log(`[cache] HIT ${key} → ${cached}`);
    return cached;
  }

  const result = await etherscanFetch<string>(
    getEtherscanUrl(chain, {
      module: "proxy",
      action: "eth_blockNumber",
    })
  );
  const blockNum = parseInt(result, 16);
  cache.set(key, blockNum, TTL.BLOCK_NUMBER);
  return blockNum;
}

/** Fetch raw event logs — cached 30s per address+chain+range. */
export async function fetchEventLogs(
  address: string,
  chain: Chain,
  fromBlock?: number,
  toBlock?: number
): Promise<RawLog[]> {
  // Resolve effective fromBlock
  let effectiveFromBlock = fromBlock;
  if (effectiveFromBlock === undefined) {
    const latest = await fetchLatestBlockNumber(chain);
    effectiveFromBlock = Math.max(0, latest - 10000);
  }

  const effectiveToBlock = toBlock ? String(toBlock) : "latest";
  const key = `logs:${chain}:${address.toLowerCase()}:${effectiveFromBlock}:${effectiveToBlock}`;
  const cached = cache.get<RawLog[]>(key);
  if (cached !== undefined) {
    console.log(`[cache] HIT ${key} → ${cached.length} logs`);
    return cached;
  }

  const params: Record<string, string> = {
    module: "logs",
    action: "getLogs",
    address,
    fromBlock: String(effectiveFromBlock),
    toBlock: effectiveToBlock,
  };

  try {
    const result = await etherscanFetch<RawLog[]>(
      getEtherscanUrl(chain, params)
    );
    const logs = Array.isArray(result) ? result : [];
    cache.set(key, logs, TTL.EVENT_LOGS);
    return logs;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("No records found") || message.includes("No logs found")) {
      cache.set(key, [], TTL.EVENT_LOGS);
      return [];
    }
    throw err;
  }
}
