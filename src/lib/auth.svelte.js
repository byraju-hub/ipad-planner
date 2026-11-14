// 관리자 로그인 상태
import { api, setCsrf, ApiError } from './api.js';
import { getAll, clearAll } from './idb.js';
import { data } from './data.svelte.js';

// status: checking(확인 중) | in(로그인됨) | offline(이전에 로그인했고 서버에 연결 안 됨)
//         | out(로그인 필요) | local(개발 전용: 서버 없이 기기 안에서만 동작)
export const auth = $state({ status: 'checking', error: '' });

const HINT = 'ip-authed';
const hasHint = () => {
  try {
    return localStorage.getItem(HINT) === '1';
  } catch {
    return false;
  }
};
const setHint = (on) => {
  try {
    if (on) localStorage.setItem(HINT, '1');
    else localStorage.removeItem(HINT);
  } catch {
    /* 저장 불가 환경 */
  }
};

export async function checkAuth() {
  try {
    const r = await api('me.php');
    setCsrf(r.csrf);
    auth.status = 'in';
    auth.error = '';
    setHint(true);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      auth.status = 'out';
    } else if (hasHint()) {
      auth.status = 'offline';
    } else if (import.meta.env.DEV) {
      auth.status = 'local';
    } else {
      auth.status = 'out';
      auth.error = '서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.';
    }
  }
}

export async function login(password) {
  auth.error = '';
  try {
    const r = await api('login.php', { method: 'POST', body: { password } });
    setCsrf(r.csrf);
    auth.status = 'in';
    setHint(true);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'invalid') auth.error = '비밀번호가 맞지 않습니다.';
    else if (e instanceof ApiError && e.code === 'locked') {
      auth.error = `로그인 시도가 너무 많습니다. ${Math.ceil((e.data.retry || 900) / 60)}분 뒤에 다시 시도하세요.`;
    } else if (e instanceof ApiError && e.status === 0) auth.error = '서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.';
    else auth.error = '로그인하지 못했습니다. 잠시 뒤에 다시 시도하세요.';
  }
}

// 로그아웃: 서버에 올리지 못한 변경이 있으면 막고, 끝나면 이 기기의 데이터를 지운다.
export async function logout(syncNow) {
  await syncNow();
  const stores = ['events', 'todos', 'opinions', 'ink'];
  for (const s of stores) {
    if ((await getAll(s)).some((r) => r.dirty)) {
      return '서버에 저장되지 않은 변경이 있어 로그아웃할 수 없습니다. 인터넷에 연결한 뒤 다시 시도하세요.';
    }
  }
  try {
    await api('logout.php', { method: 'POST', body: {} });
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401)) return '로그아웃하지 못했습니다. 잠시 뒤에 다시 시도하세요.';
  }
  await clearAll();
  data.events = [];
  data.todos = [];
  data.opinions = [];
  data.ready = false;
  setCsrf('');
  setHint(false);
  auth.status = 'out';
  return '';
}
