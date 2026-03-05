import type { Abi } from "viem";

export type Chain = "ethereum" | "arbitrum" | "polygon";

export type ChainConfig = {
  chainId: number;
  explorerUrl: string;
  name: string;
};

export type DecodedEvent = {
  eventName: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  args: Record<string, string>;
  logIndex: number;
  contractAddress?: string;
  contractLabel?: string;
  chain?: Chain;
};

export type ContractMeta = {
  address: string;
  name?: string;
  chain: Chain;
  abi: Abi;
  eventNames: string[];
  isProxy?: boolean;
};

export type RawLog = {
  address: string;
  topics: [string, ...string[]];
  data: string;
  blockNumber: string;
  transactionHash: string;
  timeStamp: string;
  logIndex: string;
  gasPrice: string;
  gasUsed: string;
};
