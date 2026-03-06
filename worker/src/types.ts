// ---------------------------------------------------------------------------
// Emit Watch Worker – shared types
// ---------------------------------------------------------------------------

/** Supported blockchain networks */
export type Chain = "ethereum" | "arbitrum" | "polygon";

/** Notification delivery channels */
export type Channel = "telegram" | "webhook";

/** How an alert rule decides whether an event is relevant */
export type ConditionType =
  | "any"
  | "specific_event"
  | "value_threshold"
  | "address_match";

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

export interface AlertRule {
  id: string;
  user_id: string;
  contract_address: string;
  chain: Chain;
  event_name: string | null;
  condition_type: ConditionType;
  condition_value: AlertCondition | null;
  channel: Channel;
  channel_config: Record<string, string>;
  enabled: boolean;
}

/** The JSON stored in `alert_rules.condition_value` */
export interface AlertCondition {
  /** For value_threshold – the ABI arg name to inspect */
  field?: string;
  /** For value_threshold – the minimum value (stored as string for BigInt compat) */
  threshold?: string;
  /** For address_match – the ABI arg name to inspect */
  addressField?: string;
  /** For address_match – the target address to compare against */
  targetAddress?: string;
}

export interface WorkerState {
  contract_key: string;
  last_checked_block: number;
  abi: object[] | null;
  updated_at: Date;
}

// ---------------------------------------------------------------------------
// Runtime types
// ---------------------------------------------------------------------------

/** A decoded on-chain event ready for matching / alerting */
export interface DecodedEvent {
  eventName: string;
  args: Record<string, unknown>;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  logIndex: number;
}

/** Per-chain configuration consumed by the poller */
export interface ChainConfig {
  name: Chain;
  apiBase: string;
  explorerUrl: string;
}

/** A successful match between a rule and an event */
export interface RuleMatch {
  rule: AlertRule;
  event: DecodedEvent;
}

/** Rules grouped by contract key (chain:address) */
export interface GroupedRules {
  chain: Chain;
  contractAddress: string;
  rules: AlertRule[];
}
