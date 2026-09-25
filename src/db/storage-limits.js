export function readStorageLimits({ maxPosts, maxUsers } = {}) {
  const limit = (value, fallback, min, max, name) => {
    const parsed = value === undefined ? fallback : Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(`Invalid ${name}`);
    return parsed;
  };
  return {
    maxPosts: limit(maxPosts, 1000, 4, 10000, 'MAX_POSTS_PER_ENVIRONMENT'),
    maxUsers: limit(maxUsers, 100, 2, 1000, 'MAX_USERS_PER_ENVIRONMENT'),
  };
}

export function isStorageLimit(error) {
  return error.code === 'SQLITE_FULL' ||
    (error.code === 'SQLITE_CONSTRAINT_TRIGGER' && ['environment_post_limit', 'environment_user_limit'].includes(error.message));
}
