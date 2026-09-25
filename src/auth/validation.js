export function credentials(body) {
  const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const valid = /^[a-z0-9_]{3,32}$/.test(username) && [...password].length >= 8 && [...password].length <= 128;
  return { username, password, valid };
}
