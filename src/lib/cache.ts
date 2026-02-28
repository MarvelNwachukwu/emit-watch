type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/** Simple in-memory TTL cache. Module-level — persists across requests in the same Next.js process. */
class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });

    // Lazy cleanup: if cache grows large, prune expired entries
    if (this.store.size > 500) {
      this.prune();
    }
  }

  private prune() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
    // Hard cap: evict oldest entries if still too large
    if (this.store.size > 400) {
      const entries = [...this.store.entries()]
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toRemove = this.store.size - 300;
      for (let i = 0; i < toRemove; i++) {
        this.store.delete(entries[i][0]);
      }
    }
  }
}

export const cache = new MemoryCache();

// TTL constants
export const TTL = {
  ABI: 60 * 60 * 1000,         // 1 hour — ABIs never change
  SOURCE_INFO: 60 * 60 * 1000, // 1 hour — proxy/name info is stable
  BLOCK_NUMBER: 12 * 1000,     // 12 seconds — one Ethereum block
  EVENT_LOGS: 30 * 1000,       // 30 seconds — short freshness for live feel
};
