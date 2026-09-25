import { Router } from 'express';
import { searchPosts } from '../posts/search.js';

export const searchRoutes = Router();
searchRoutes.get('/search', (req, res) => {
  const query = req.query.q ?? '';
  if (typeof query !== 'string' || [...query].length > 100 || query.includes('\0')) {
    return res.status(400).render('search', { title: '検索', query: '', posts: [], error: '検索語は100文字以内で入力してください。' });
  }
  res.render('search', { title: '検索', query, posts: searchPosts(req.db, query, req.user?.id), error: '' });
});
