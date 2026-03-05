// ---------------------------------------------------------------------------
// Emit Watch Worker – rule matcher
// ---------------------------------------------------------------------------

import type { AlertRule, DecodedEvent, RuleMatch } from "./types.js";

/**
 * Evaluate a list of alert rules against a list of decoded events.
 * Returns every (rule, event) pair where the rule's condition is satisfied.
 */
export function matchEvents(
  rules: AlertRule[],
  events: DecodedEvent[]
): RuleMatch[] {
  const matches: RuleMatch[] = [];

  for (const rule of rules) {
    for (const event of events) {
      if (evaluateCondition(rule, event)) {
        matches.push({ rule, event });
      }
    }
  }

  return matches;
}

// ---------------------------------------------------------------------------
// Condition evaluators
// ---------------------------------------------------------------------------

function evaluateCondition(rule: AlertRule, event: DecodedEvent): boolean {
  switch (rule.condition_type) {
    case "any":
      return true;

    case "specific_event":
      return matchSpecificEvent(rule, event);

    case "value_threshold":
      return matchValueThreshold(rule, event);

    case "address_match":
      return matchAddress(rule, event);

    default:
      console.warn(
        `[matcher] Unknown condition_type "${rule.condition_type}" on rule ${rule.id} — skipping`
      );
      return false;
  }
}

/**
 * `specific_event` – matches if the event name equals the rule's event_name.
 */
function matchSpecificEvent(rule: AlertRule, event: DecodedEvent): boolean {
  if (!rule.event_name) return false;
  return (
    event.eventName.toLowerCase() === rule.event_name.toLowerCase()
  );
}

/**
 * `value_threshold` – matches if the specified arg (parsed as BigInt) is
 * greater than or equal to the threshold.
 *
 * Expects `condition_value` to contain `{ field, threshold }`.
 */
function matchValueThreshold(rule: AlertRule, event: DecodedEvent): boolean {
  const cond = rule.condition_value;
  if (!cond?.field || !cond?.threshold) {
    console.warn(
      `[matcher] value_threshold rule ${rule.id} missing field/threshold — skipping`
    );
    return false;
  }

  const rawValue = event.args[cond.field];
  if (rawValue === undefined || rawValue === null) return false;

  try {
    const value = BigInt(String(rawValue));
    const threshold = BigInt(cond.threshold);
    return value >= threshold;
  } catch {
    console.warn(
      `[matcher] Could not parse value for field "${cond.field}" on rule ${rule.id}`
    );
    return false;
  }
}

/**
 * `address_match` – matches if the specified arg (lowercased) equals the
 * target address.
 *
 * Expects `condition_value` to contain `{ addressField, targetAddress }`.
 */
function matchAddress(rule: AlertRule, event: DecodedEvent): boolean {
  const cond = rule.condition_value;
  if (!cond?.addressField || !cond?.targetAddress) {
    console.warn(
      `[matcher] address_match rule ${rule.id} missing addressField/targetAddress — skipping`
    );
    return false;
  }

  const rawValue = event.args[cond.addressField];
  if (typeof rawValue !== "string") return false;

  return rawValue.toLowerCase() === cond.targetAddress.toLowerCase();
}
