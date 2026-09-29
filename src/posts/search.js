export function searchPosts(db, query, userId) {
  return db.prepare(`
    SELECT p.id, p.user_id, p.body, p.is_public, p.created_at, p.updated_at, u.username
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE (p.is_public = 1 OR p.user_id = ${userId || 0}) AND p.body LIKE '%${query}%'
    ORDER BY p.id DESC LIMIT 50
  `).all();
}
