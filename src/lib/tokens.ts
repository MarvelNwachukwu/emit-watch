/**
 * Well-known token decimals by address (lowercased).
 * Used to format raw uint256 values into human-readable amounts.
 */
export const KNOWN_TOKEN_DECIMALS: Record<string, number> = {
  // Ethereum mainnet
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": 18, // WETH
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": 6,  // USDC
  "0xdac17f958d2ee523a2206206994597c13d831ec7": 6,  // USDT
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": 8,  // WBTC
  "0x6b175474e89094c44da98b954eedeac495271d0f": 18, // DAI
  "0x514910771af9ca656af840dff83e8264ecf986ca": 18, // LINK
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": 18, // UNI

  // Arbitrum
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831": 6,  // USDC
  "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": 6,  // USDT
  "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": 18, // WETH
  "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f": 8,  // WBTC

  // Polygon
  "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": 6,  // USDC (bridged)
  "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359": 6,  // USDC (native)
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": 6,  // USDT
  "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619": 18, // WETH
  "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6": 8,  // WBTC
};

/**
 * Look up token decimals from the hardcoded map.
 * Returns undefined if the address is not a well-known token.
 */
export function getKnownDecimals(address: string): number | undefined {
  return KNOWN_TOKEN_DECIMALS[address.toLowerCase()];
}
