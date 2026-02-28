import { decodeEventLog } from "viem";
import type { Abi } from "viem";
import type { DecodedEvent, RawLog } from "./types";

function argsToStrings(args: Record<string, unknown> | readonly unknown[] | undefined): Record<string, string> {
  if (!args) return {};

  const result: Record<string, string> = {};
  const entries = Array.isArray(args)
    ? args.map((v, i) => [String(i), v] as const)
    : Object.entries(args);

  for (const [key, val] of entries) {
    if (typeof val === "bigint") {
      result[key] = val.toString();
    } else if (typeof val === "boolean") {
      result[key] = String(val);
    } else if (typeof val === "string") {
      result[key] = val;
    } else if (val === null || val === undefined) {
      result[key] = "";
    } else {
      result[key] = JSON.stringify(val, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v
      );
    }
  }
  return result;
}

const debug =
  process.env.NODE_ENV !== "production" ? console.log : () => {};

export function decodeEvents(abi: Abi, rawLogs: RawLog[]): DecodedEvent[] {
  debug(`[decoder] decoding ${rawLogs.length} raw logs with ${abi.length} ABI entries`);

  const decoded: DecodedEvent[] = [];
  let skipped = 0;

  for (const log of rawLogs) {
    try {
      const result = decodeEventLog({
        abi,
        data: log.data as `0x${string}`,
        topics: log.topics as [
          `0x${string}`,
          ...`0x${string}`[],
        ],
        strict: false,
      });

      if (!result.eventName) {
        skipped++;
        continue;
      }

      decoded.push({
        eventName: result.eventName,
        blockNumber: parseInt(log.blockNumber, 16),
        transactionHash: log.transactionHash,
        timestamp: parseInt(log.timeStamp, 16),
        logIndex: parseInt(log.logIndex, 16),
        args: argsToStrings(result.args as unknown as Record<string, unknown>),
      });
    } catch {
      skipped++;
    }
  }

  debug(`[decoder] result: ${decoded.length} decoded, ${skipped} skipped`);
  return decoded;
}
