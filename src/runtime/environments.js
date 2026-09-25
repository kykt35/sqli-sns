import { randomBytes } from 'node:crypto';

export class EnvironmentRegistry {
  #entries = new Map();
  constructor({ max, ttlMs, factory, now = Date.now }) { Object.assign(this, { max, ttlMs, factory, now }); }
  get size() { return this.#entries.size; }
  sweep() {
    for (const [id, entry] of this.#entries) {
      if (entry.active === 0 && entry.expires <= this.now()) {
        entry.db.close(); this.#entries.delete(id);
      }
    }
  }
  acquire(id) {
    this.sweep();
    let entry = this.#entries.get(id);
    if (!entry) {
      if (this.size >= this.max) throw Object.assign(new Error('利用できる環境がいっぱいです。しばらくしてからお試しください。'), { status: 503 });
      // The synchronous factory completes before a slot becomes visible.
      const db = this.factory();
      id = randomBytes(24).toString('hex');
      entry = { db, active: 0, expires: this.now() + this.ttlMs };
      this.#entries.set(id, entry);
    }
    entry.active++;
    entry.expires = this.now() + this.ttlMs;
    let released = false;
    return { id, db: entry.db, release: () => {
      if (released) return;
      released = true; entry.active--; entry.expires = this.now() + this.ttlMs;
    } };
  }
  close() { for (const entry of this.#entries.values()) entry.db.close(); this.#entries.clear(); }
}
