import { hashPassword } from './password.js';

export function findUser(db, username) {
  return db.prepare('SELECT id, username, password_digest FROM users WHERE username = ?').get(username);
}
export async function registerUser(db, username, password) {
  const digest = await hashPassword(password);
  return db.prepare('INSERT INTO users (username, password_digest) VALUES (?, ?)').run(username, digest);
}
