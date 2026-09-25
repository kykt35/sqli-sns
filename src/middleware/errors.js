import { isStorageLimit } from '../db/storage-limits.js';

export function notFound(_req, res) {
  res.status(404).render('error', { title: 'ページが見つかりません', message: 'ページが存在しないか、閲覧できません。' });
}
export function handleError(error, _req, res, _next) {
  if (res.headersSent) return _next(error);
  const status = isStorageLimit(error) ? 507 : [400, 413, 503].includes(error.status) ? error.status : 500;
  if (status === 500) console.error('SNS request failed:', error.code || error.name);
  const message = status === 507 ? 'SNSの保存容量の上限に達したため、保存できませんでした。保存済みの内容は引き続き閲覧できます。' :
    status === 503 ? '混み合っています。しばらくしてからお試しください。' :
    status === 400 || status === 413 ? '入力内容が正しくないか、長すぎます。' : '処理できませんでした。時間をおいてお試しください。';
  res.status(status).render('error', { title: '処理できませんでした', message });
}
