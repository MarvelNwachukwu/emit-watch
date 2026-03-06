class TokenBucket {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly maxQueueSize: number;
  private readonly queueTimeout: number;
  private lastRefill: number;
  private pending: Array<() => void> = [];
  private draining = false;

  constructor(
    maxTokens: number,
    refillRate: number,
    maxQueueSize = 50,
    queueTimeout = 15_000
  ) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.maxQueueSize = maxQueueSize;
    this.queueTimeout = queueTimeout;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    if (this.pending.length >= this.maxQueueSize) {
      throw new Error("Rate limiter queue full — too many concurrent requests");
    }
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.pending.indexOf(wrappedResolve);
        if (idx !== -1) this.pending.splice(idx, 1);
        reject(new Error("Rate limiter timeout — request took too long to acquire a token"));
      }, this.queueTimeout);
      const wrappedResolve = () => {
        clearTimeout(timer);
        resolve();
      };
      this.pending.push(wrappedResolve);
      this.drain();
    });
  }

  private drain() {
    if (this.draining) return;
    this.draining = true;

    const tick = () => {
      this.refill();
      while (this.pending.length > 0 && this.tokens >= 1) {
        this.tokens -= 1;
        this.pending.shift()!();
      }
      if (this.pending.length > 0) {
        const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
        setTimeout(tick, waitTime);
      } else {
        this.draining = false;
      }
    };

    tick();
  }
}

// Module-level singleton — persists across API requests in the same process
// Etherscan V2 free tier: 3 calls/sec — use 2 max to leave headroom
export const rateLimiter = new TokenBucket(2, 2.5);
