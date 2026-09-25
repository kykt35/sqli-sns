import { Router } from 'express';
import { requireLogin } from '../middleware/current-user.js';
import { notFound } from '../middleware/errors.js';
import { validBody, postId } from '../posts/validation.js';
import { listPublicPosts, findVisiblePost, createPost, editPost } from '../posts/repository.js';

export const postsRoutes = Router();
postsRoutes.get('/', (req, res) => res.render('timeline', { title: 'タイムライン', posts: listPublicPosts(req.db) }));
postsRoutes.get('/posts/new', requireLogin, (_req, res) => res.render('posts/form', { title: '投稿する', editing: false, post: { body: '', is_public: 1 }, error: '' }));
postsRoutes.post('/posts', requireLogin, (req, res) => {
  const body = req.body.body, visibility = req.body.is_public;
  if (!validBody(body) || !['0', '1'].includes(visibility)) {
    return res.status(400).render('posts/form', { title: '投稿する', editing: false, post: { body: typeof body === 'string' ? body : '', is_public: visibility === '0' ? 0 : 1 }, error: '本文を1〜1,000文字で入力し、公開範囲を選んでください。' });
  }
  const id = createPost(req.db, req.user.id, body, Number(visibility));
  res.redirect(303, `/posts/${id}`);
});
postsRoutes.get('/posts/:id', (req, res) => {
  const id = postId(req.params.id);
  const post = id && findVisiblePost(req.db, id, req.user?.id);
  if (!post) return notFound(req, res);
  res.render('posts/show', { title: '投稿の詳細', post });
});
postsRoutes.get('/posts/:id/edit', requireLogin, (req, res) => {
  const id = postId(req.params.id);
  const post = id && findVisiblePost(req.db, id, req.user.id);
  if (!post || post.user_id !== req.user.id) return notFound(req, res);
  res.render('posts/form', { title: '投稿を編集', editing: true, post, error: '' });
});
postsRoutes.post('/posts/:id', requireLogin, (req, res) => {
  const id = postId(req.params.id);
  const post = id && findVisiblePost(req.db, id, req.user.id);
  if (!post || post.user_id !== req.user.id) return notFound(req, res);
  if (!validBody(req.body.body)) {
    return res.status(400).render('posts/form', { title: '投稿を編集', editing: true, post: { ...post, body: typeof req.body.body === 'string' ? req.body.body : '' }, error: '本文を1〜1,000文字で入力してください。' });
  }
  if (!editPost(req.db, id, req.user.id, req.body.body)) return notFound(req, res);
  res.redirect(303, `/posts/${id}`);
});
