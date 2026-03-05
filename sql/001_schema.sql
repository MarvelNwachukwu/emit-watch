-- Event Watch V2 Schema
-- Run against Railway Postgres: psql $DATABASE_URL -f sql/001_schema.sql

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE watchlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  added_at TIMESTAMPTZ DEFAULT now(),
);
CREATE UNIQUE INDEX idx_watchlist_unique ON watchlist_entries (user_id, lower(address), chain);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lemon_squeezy_subscription_id TEXT UNIQUE,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active','cancelled','expired','past_due','inactive')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contract_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  event_name TEXT,
  condition_type TEXT DEFAULT 'any' CHECK (condition_type IN ('any','specific_event','value_threshold','address_match')),
  condition_value JSONB,
  channel TEXT DEFAULT 'telegram' CHECK (channel IN ('telegram','webhook')),
  channel_config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  transaction_hash TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_data JSONB,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  delivery_status TEXT DEFAULT 'sent'
);

CREATE TABLE worker_state (
  contract_key TEXT PRIMARY KEY,
  last_checked_block BIGINT DEFAULT 0,
  abi JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE telegram_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  linking_code TEXT UNIQUE,
  linked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_watchlist_user ON watchlist_entries(user_id);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_alert_rules_user ON alert_rules(user_id);
CREATE INDEX idx_alert_rules_contract ON alert_rules(contract_address, chain) WHERE enabled = true;
CREATE INDEX idx_alert_history_rule ON alert_history(rule_id);
CREATE INDEX idx_telegram_links_user ON telegram_links(user_id);
