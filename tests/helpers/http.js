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

export function csrf(page) {
  const match = page.text.match(/name="_csrf" value="([^"]+)"/);
  if (!match) throw new Error(`No CSRF token in ${page.status} response`);
  return match[1];
}
export async function submit(browser, path, form, pagePath = path) {
  const page = await browser.request(pagePath);
  return browser.request(path, { method: 'POST', form: { ...form, _csrf: csrf(page) } });
}
