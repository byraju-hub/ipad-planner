// 서버(api/*.php) 호출. 쓰기 요청에는 CSRF 토큰을 붙인다.
export class ApiError extends Error {
  constructor(status, code, data) {
    super(code);
    this.status = status; // 0 = 네트워크 오류
    this.code = code;
    this.data = data || {};
  }
}

let csrf = '';
export const setCsrf = (token) => {
  csrf = token || '';
};

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-Token'] = csrf;
  }
  let res;
  try {
    res = await fetch(`./api/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* 본문이 JSON이 아님 */
  }
  if (!res.ok) throw new ApiError(res.status, json?.error || 'http', json);
  if (!json) throw new ApiError(res.status, 'bad_response');
  return json;
}
