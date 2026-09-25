export function validBody(body) {
  return typeof body === 'string' && body.trim().length > 0 && [...body].length <= 1000 && !body.includes('\0');
}
export function postId(value) {
  return /^[1-9][0-9]*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
}
