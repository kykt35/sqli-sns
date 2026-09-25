// Search stays parameterized. A later exercise may change this module separately.
export function searchPosts(db, query, userId) {
  const literal = query.replace(/[\\%_]/g, char => '\\' + char);
  return db.prepare(`
    SELECT p.id, p.user_id, p.body, p.is_public, p.created_at, p.updated_at, u.username
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE (p.is_public = 1 OR p.user_id = ?) AND p.body LIKE ? ESCAPE '\\'
    ORDER BY p.id DESC LIMIT 50
  `).all(userId || 0, `%${literal}%`);
}
