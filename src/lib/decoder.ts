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

export function decodeEvents(abi: Abi, rawLogs: RawLog[]): DecodedEvent[] {
  console.log(`[decoder] decoding ${rawLogs.length} raw logs with ABI containing ${abi.length} entries`);
  const eventEntries = abi.filter((item) => "type" in item && item.type === "event");
  console.log(`[decoder] ABI has ${eventEntries.length} event definitions:`, eventEntries.map((e) => ("name" in e ? e.name : "?")).join(", "));

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
    } catch (err) {
      skipped++;
      if (skipped <= 3) {
        console.log(`[decoder] failed to decode log topic0=${log.topics[0]?.slice(0, 18)}... err=${err instanceof Error ? err.message.slice(0, 80) : "unknown"}`);
      }
    }
  }

  console.log(`[decoder] result: ${decoded.length} decoded, ${skipped} skipped`);
  return decoded;
}
