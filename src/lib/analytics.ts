import type { DecodedEvent } from "./types";
import { getEventColor } from "./utils";

// ──────────── Types ────────────

export type EventBreakdown = {
  eventName: string;
  count: number;
  percentage: number;
  color: string;
};

export type AddressActivity = {
  address: string;
  count: number;
  lastSeen: number;
  eventNames: string[];
};

export type EventSummary = {
  totalEvents: number;
  uniqueEventTypes: number;
  breakdown: EventBreakdown[];
  topAddresses: AddressActivity[];
  eventsPerMinute: number;
};

export type TimeBucket = {
  timestamp: number;
  label: string;
  total: number;
  byEvent: Record<string, number>;
};

export type HeatmapCell = {
  day: number; // 0=Sun, 6=Sat
  hour: number; // 0-23
  count: number;
};

export type FullAnalytics = {
  summary: EventSummary;
  timeSeries: TimeBucket[];
  heatmap: HeatmapCell[];
  allAddresses: AddressActivity[];
};

// ──────────── Pure functions ────────────

export function computeEventSummary(events: DecodedEvent[]): EventSummary {
  const total = events.length;
  if (total === 0) {
    return {
      totalEvents: 0,
      uniqueEventTypes: 0,
      breakdown: [],
      topAddresses: [],
      eventsPerMinute: 0,
    };
  }

  // Breakdown by event type
  const breakdown = breakdownByType(events);

  // Top addresses from args
  const allAddresses = extractAddresses(events);
  const topAddresses = allAddresses.slice(0, 5);

  // Events per minute
  const oldest = events[events.length - 1].timestamp;
  const newest = events[0].timestamp;
  const spanMinutes = Math.max((newest - oldest) / 60, 1);
  const eventsPerMinute = Math.round((total / spanMinutes) * 100) / 100;

  return {
    totalEvents: total,
    uniqueEventTypes: breakdown.length,
    breakdown,
    topAddresses,
    eventsPerMinute,
  };
}

export function breakdownByType(events: DecodedEvent[]): EventBreakdown[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.eventName, (counts.get(e.eventName) ?? 0) + 1);
  }

  const total = events.length;
  return [...counts.entries()]
    .map(([eventName, count]) => ({
      eventName,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
      color: getEventColor(eventName),
    }))
    .sort((a, b) => b.count - a.count);
}

export function extractAddresses(events: DecodedEvent[]): AddressActivity[] {
  const map = new Map<
    string,
    { count: number; lastSeen: number; eventNames: Set<string> }
  >();

  for (const e of events) {
    for (const val of Object.values(e.args)) {
      if (/^0x[0-9a-fA-F]{40}$/.test(val)) {
        const lower = val.toLowerCase();
        const existing = map.get(lower);
        if (existing) {
          existing.count++;
          existing.lastSeen = Math.max(existing.lastSeen, e.timestamp);
          existing.eventNames.add(e.eventName);
        } else {
          map.set(lower, {
            count: 1,
            lastSeen: e.timestamp,
            eventNames: new Set([e.eventName]),
          });
        }
      }
    }
  }

  return [...map.entries()]
    .map(([address, data]) => ({
      address,
      count: data.count,
      lastSeen: data.lastSeen,
      eventNames: [...data.eventNames],
    }))
    .sort((a, b) => b.count - a.count);
}

export function bucketByTime(events: DecodedEvent[]): TimeBucket[] {
  if (events.length === 0) return [];

  const oldest = events[events.length - 1].timestamp;
  const newest = events[0].timestamp;
  const span = newest - oldest;

  // Pick bucket size based on time span
  let bucketSeconds: number;
  let formatLabel: (ts: number) => string;

  if (span < 3600) {
    // < 1 hour → 5-min buckets
    bucketSeconds = 300;
    formatLabel = (ts) =>
      new Date(ts * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
  } else if (span < 86400) {
    // < 1 day → 1-hour buckets
    bucketSeconds = 3600;
    formatLabel = (ts) =>
      new Date(ts * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
  } else if (span < 604800) {
    // < 1 week → 6-hour buckets
    bucketSeconds = 21600;
    formatLabel = (ts) => {
      const d = new Date(ts * 1000);
      return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit" })}`;
    };
  } else {
    // >= 1 week → 1-day buckets
    bucketSeconds = 86400;
    formatLabel = (ts) =>
      new Date(ts * 1000).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
  }

  const bucketStart = Math.floor(oldest / bucketSeconds) * bucketSeconds;
  const bucketEnd = Math.ceil(newest / bucketSeconds) * bucketSeconds;

  // Initialize buckets
  const buckets = new Map<number, TimeBucket>();
  for (let ts = bucketStart; ts <= bucketEnd; ts += bucketSeconds) {
    buckets.set(ts, {
      timestamp: ts,
      label: formatLabel(ts),
      total: 0,
      byEvent: {},
    });
  }

  // Fill buckets
  for (const e of events) {
    const key = Math.floor(e.timestamp / bucketSeconds) * bucketSeconds;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.total++;
      bucket.byEvent[e.eventName] = (bucket.byEvent[e.eventName] ?? 0) + 1;
    }
  }

  return [...buckets.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function buildHeatmap(events: DecodedEvent[]): HeatmapCell[] {
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0) as number[]
  );

  for (const e of events) {
    const d = new Date(e.timestamp * 1000);
    grid[d.getDay()][d.getHours()]++;
  }

  const cells: HeatmapCell[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({ day, hour, count: grid[day][hour] });
    }
  }
  return cells;
}

export function computeFullAnalytics(events: DecodedEvent[]): FullAnalytics {
  return {
    summary: computeEventSummary(events),
    timeSeries: bucketByTime(events),
    heatmap: buildHeatmap(events),
    allAddresses: extractAddresses(events),
  };
}
