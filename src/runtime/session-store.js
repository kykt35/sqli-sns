import { randomBytes } from 'node:crypto';
import session from 'express-session';

export class SessionStore extends session.Store {
  #entries = new Map();
  constructor({ ttlMs, now = Date.now }) { super(); Object.assign(this, { ttlMs, now }); }
  sweep() {
    for (const [id, entry] of this.#entries) if (entry.expires <= this.now()) this.#entries.delete(id);
  }
  createId() {
    this.sweep();
    const id = randomBytes(32).toString('hex');
    this.#entries.set(id, { json: null, expires: this.now() + this.ttlMs });
    return id;
  }
  discardUnused(id) { if (this.#entries.get(id)?.json === null) this.#entries.delete(id); }
  get(id, callback) {
    this.sweep();
    const entry = this.#entries.get(id);
    callback(null, entry?.json ? JSON.parse(entry.json) : null);
  }
  set(id, value, callback = () => {}) {
    this.sweep();
    // Only IDs issued by createId and still alive may be saved. Delayed writes
    // cannot resurrect a destroyed/expired session, however long they take.
    if (this.#entries.has(id)) this.#entries.set(id, { json: JSON.stringify(value), expires: this.now() + this.ttlMs });
    callback(null);
  }
  touch(id, _value, callback = () => {}) {
    this.sweep();
    const entry = this.#entries.get(id);
    if (entry) entry.expires = this.now() + this.ttlMs;
    callback(null);
  }
  destroy(id, callback = () => {}) { this.#entries.delete(id); callback(null); }
  close() { this.#entries.clear(); }
}
