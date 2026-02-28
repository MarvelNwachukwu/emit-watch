import type { Chain, ChainConfig } from "./types";

export const CHAINS: Record<Chain, ChainConfig> = {
  ethereum: {
    chainId: 1,
    explorerUrl: "https://etherscan.io",
    name: "Ethereum",
  },
  arbitrum: {
    chainId: 42161,
    explorerUrl: "https://arbiscan.io",
    name: "Arbitrum",
  },
  polygon: {
    chainId: 137,
    explorerUrl: "https://polygonscan.com",
    name: "Polygon",
  },
};

export const ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api";

export function getEtherscanUrl(chain: Chain, params: Record<string, string>): string {
  const config = CHAINS[chain];
  const searchParams = new URLSearchParams({
    chainid: String(config.chainId),
    apikey: process.env.ETHERSCAN_API_KEY ?? "",
    ...params,
  });
  return `${ETHERSCAN_V2_BASE}?${searchParams.toString()}`;
}
