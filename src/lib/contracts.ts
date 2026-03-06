import type { Chain } from "./types";

export type PopularContract = {
  name: string;
  address: string;
  chain: Chain;
};

export const POPULAR_CONTRACTS: PopularContract[] = [
  // Ethereum
  { name: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", chain: "ethereum" },
  { name: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", chain: "ethereum" },
  { name: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", chain: "ethereum" },
  { name: "Uniswap V3 Router", address: "0xE592427A0AEce92De3Edee1F18E0157C05861564", chain: "ethereum" },
  { name: "Aave V3 Pool", address: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2", chain: "ethereum" },
  // Arbitrum
  { name: "USDC (Arb)", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", chain: "arbitrum" },
  { name: "WETH (Arb)", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", chain: "arbitrum" },
  // Polygon
  { name: "USDT (Poly)", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", chain: "polygon" },
];