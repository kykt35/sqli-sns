import session from 'express-session';

export class SessionStore extends session.Store {
  #entries = new Map();
  #revoked = new Map();
  constructor({ ttlMs, now = Date.now }) { super(); Object.assign(this, { ttlMs, now }); }
  sweep() {
    for (const [id, entry] of this.#entries) if (entry.expires <= this.now()) this.#entries.delete(id);
    for (const [id, expires] of this.#revoked) if (expires <= this.now()) this.#revoked.delete(id);
  }
  get(id, callback) {
    this.sweep();
    const entry = this.#entries.get(id);
    callback(null, entry ? JSON.parse(entry.json) : null);
  }
  set(id, value, callback = () => {}) {
    this.sweep();
    if (!this.#revoked.has(id)) this.#entries.set(id, { json: JSON.stringify(value), expires: this.now() + this.ttlMs });
    callback(null);
  }
  touch(id, _value, callback = () => {}) {
    const entry = this.#entries.get(id);
    if (entry) entry.expires = this.now() + this.ttlMs;
    callback(null);
  }
  destroy(id, callback = () => {}) {
    this.#entries.delete(id);
    this.#revoked.set(id, this.now() + this.ttlMs);
    callback(null);
  }
  close() { this.#entries.clear(); this.#revoked.clear(); }
}
