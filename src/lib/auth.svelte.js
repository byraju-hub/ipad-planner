// 관리자 로그인 상태
import { api, setCsrf, ApiError } from './api.js';
import { getAll, clearAll, getMeta, setMeta } from './idb.js';
import { data } from './data.svelte.js';

// status: checking(확인 중) | in(로그인됨) | offline(이전에 로그인했고 서버에 연결 안 됨)
//         | out(로그인 필요) | local(개발 전용: 서버 없이 기기 안에서만 동작)
export const auth = $state({ status: 'checking', error: '', user: null }); // user: { id, username, display_name, is_admin }

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

// 이 기기에 저장된 데이터가 다른 사람의 것이면 비운다(로그인이 만료된 뒤 다른 사람이 같은 기기로 들어올 때 섞이지 않게).
// 주인 표시가 없는 기기는 예전 한 사람용 시절의 데이터이므로 관리자의 것으로 본다.
async function claimDevice(user) {
  const owner = await getMeta('owner');
  const foreign = owner === undefined ? !user.is_admin : owner !== user.id;
  if (foreign) {
    await clearAll();
    data.events = [];
    data.todos = [];
    data.opinions = [];
    data.ready = false;
  }
  await setMeta('owner', user.id);
}

export async function checkAuth() {
  try {
    const r = await api('me.php');
    setCsrf(r.csrf);
    if (r.user) {
      await claimDevice(r.user);
      auth.user = r.user;
    }
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

export async function login(username, password) {
  auth.error = '';
  try {
    const r = await api('login.php', { method: 'POST', body: { username, password } });
    setCsrf(r.csrf);
    await claimDevice(r.user);
    auth.user = r.user;
    auth.status = 'in';
    setHint(true);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'invalid') auth.error = '아이디 또는 비밀번호가 맞지 않습니다.';
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
  auth.user = null;
  auth.status = 'out';
  return '';
}
