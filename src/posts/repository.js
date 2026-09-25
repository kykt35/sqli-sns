const projection = 'p.id, p.user_id, p.body, p.is_public, p.created_at, p.updated_at, u.username';
export function listPublicPosts(db) {
  return db.prepare(`SELECT ${projection} FROM posts p JOIN users u ON u.id = p.user_id WHERE p.is_public = 1 ORDER BY p.id DESC LIMIT 50`).all();
}
export function findVisiblePost(db, id, userId) {
  return db.prepare(`SELECT ${projection} FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ? AND (p.is_public = 1 OR p.user_id = ?)`).get(id, userId || 0);
}
export function createPost(db, userId, body, isPublic) {
  return db.prepare('INSERT INTO posts (user_id, body, is_public) VALUES (?, ?, ?)').run(userId, body, isPublic).lastInsertRowid;
}
export function editPost(db, id, userId, body) {
  return db.prepare("UPDATE posts SET body = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND user_id = ?").run(body, id, userId).changes;
}
