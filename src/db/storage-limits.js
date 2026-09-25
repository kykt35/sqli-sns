export function readStorageLimits({ maxPosts, maxUsers } = {}) {
  const limit = (value, fallback, min, max, name) => {
    const parsed = value === undefined ? fallback : Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`Invalid ${name}`);
    return parsed;
  };
  return {
    maxPosts: limit(maxPosts, 1000, 4, 10000, 'MAX_POSTS'),
    maxUsers: limit(maxUsers, 100, 2, 1000, 'MAX_USERS'),
  };
}

export function isStorageLimit(error) {
  return error.code === 'SQLITE_FULL' ||
    (error.code === 'SQLITE_CONSTRAINT_TRIGGER' && ['database_post_limit', 'database_user_limit'].includes(error.message));
}
