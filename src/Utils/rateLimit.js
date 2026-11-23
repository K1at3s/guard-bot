// Dolu kapasitede mevcut sayaçları silmez; yeni anahtarlar güvenli tarafta reddedilir.
export class WindowCounter {
  constructor({ capacity = 20000, maxHits = 1000, now = Date.now } = {}) {
    this.entries = new Map(); this.capacity = capacity; this.maxHits = maxHits; this.now = now;
  }
  hit(key, windowMs) {
    const now = this.now();
    let entry = this.entries.get(key);
    if (!entry && this.entries.size >= this.capacity) {
      for (const [id, item] of this.entries) if (item.expires <= now) this.entries.delete(id);
      if (this.entries.size >= this.capacity) return this.maxHits;
    }
    const hits = (entry?.hits ?? []).filter((time) => now - time < windowMs);
    if (hits.length < this.maxHits) hits.push(now);
    this.entries.set(key, { hits, expires: now + windowMs });
    return hits.length;
  }
}
