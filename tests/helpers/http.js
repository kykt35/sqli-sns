export function client(base) {
  let cookie = '';
  return {
    get cookie() { return cookie; },
    set cookie(value) { cookie = value; },
    async request(path, { method = 'GET', form, headers = {} } = {}) {
      const response = await fetch(base + path, {
        method, redirect: 'manual', headers: { ...(cookie ? { cookie } : {}), ...headers },
        ...(form ? { body: new URLSearchParams(form) } : {}),
      });
      const value = response.headers.get('set-cookie');
      if (value) cookie = value.split(';')[0];
      return { status: response.status, headers: response.headers, text: await response.text() };
    },
  };
}
