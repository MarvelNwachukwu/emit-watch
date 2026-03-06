import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { Abi } from "viem";
import type { Chain, ContractMeta, DecodedEvent } from "@/lib/types";

type AbiData = {
  abi: Abi;
  name?: string;
  eventNames: string[];
  isProxy?: boolean;
};

type EventsPage = {
  events: DecodedEvent[];
  oldestBlock: number | null;
};

/** Fetches and caches contract ABI. Checks localStorage first (manual ABI cache). */
export function useContractAbi(address: string | null, chain: Chain) {
  return useQuery<AbiData>({
    queryKey: ["contract-abi", chain, address?.toLowerCase()],
    queryFn: async () => {
      if (!address) throw new Error("No address");

      // Check localStorage for cached manual ABI
      try {
        const cached = localStorage.getItem(`eventwatch:abi:${address}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const eventNames = (parsed as Array<{ type?: string; name?: string }>)
              .filter((item) => item.type === "event")
              .map((item) => item.name ?? "Unknown");
            return { abi: parsed as Abi, eventNames };
          }
        }
      } catch {
        // Invalid cache, continue to API
      }

      const res = await fetch("/api/contract/abi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chain }),
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("ABI_NOT_FOUND");
        const data = await res.json();
        throw new Error(data.error ?? "Failed to fetch ABI");
      }

      return res.json();
    },
    enabled: !!address,
    staleTime: 60 * 60 * 1000, // 1 hour — ABIs don't change
    retry: false,
  });
}

/** Fetches contract events with infinite scroll pagination via oldestBlock. */
export function useContractEvents(meta: ContractMeta | null) {
  return useInfiniteQuery<EventsPage>({
    queryKey: ["contract-events", meta?.chain, meta?.address?.toLowerCase()],
    queryFn: async ({ pageParam }) => {
      if (!meta) throw new Error("No contract meta");

      const res = await fetch("/api/contract/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: meta.address,
          chain: meta.chain,
          abi: meta.abi,
          toBlock: pageParam || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to fetch events");
      }

      return res.json();
    },
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) =>
      lastPage.oldestBlock ? lastPage.oldestBlock - 1 : undefined,
    enabled: !!meta,
  });
}

/** Fetches token decimals (hardcoded map → on-chain call). */
export function useContractDecimals(address: string | null, chain: Chain) {
  return useQuery<number | null>({
    queryKey: ["contract-decimals", chain, address?.toLowerCase()],
    queryFn: async () => {
      if (!address) return null;

      const res = await fetch("/api/contract/decimals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chain }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to fetch decimals");
      }
      const data = await res.json();
      return data.decimals ?? null;
    },
    enabled: !!address,
    staleTime: 60 * 60 * 1000,
  });
}
