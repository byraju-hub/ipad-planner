// 서버 동기화. 변경분을 올리고, 서버에서 바뀐 것을 받아 합친다(나중에 바꾼 쪽이 이긴다).
import { api, ApiError } from './api.js';
import { getAll, get, putMany, getMeta, setMeta } from './idb.js';
import { auth, checkAuth } from './auth.svelte.js';
import { data, loadAll, setChangeHook } from './data.svelte.js';

export const sync = $state({ status: 'idle', lastAt: 0, error: '' }); // idle | syncing | offline | error

const STORES = { events: 'id', todos: 'id', opinions: 'id', ink: 'page_key' };

let running = false;
let again = false;
let timer = null;

export function scheduleSync(delay = 1500) {
  clearTimeout(timer);
  timer = setTimeout(syncNow, delay);
}
setChangeHook(() => scheduleSync());

async function collectDirty() {
  const changes = {};
  for (const store of Object.keys(STORES)) {
    changes[store] = (await getAll(store)).filter((r) => r.dirty).map(({ dirty, ...rest }) => rest);
  }
  return changes;
}

// 반환: 화면에 영향을 주는 실제 변경이 있었는지(서버가 방금 올린 것을 그대로 돌려준 것은 변경이 아니다)
async function applyRemote(r) {
  const changed = { data: false, ink: false };
  for (const [store, keyName] of Object.entries(STORES)) {
    const puts = [];
    for (const remote of r[store] || []) {
      const local = await get(store, remote[keyName]);
      // 이 기기에서 더 나중에 바꾼 미전송 변경은 그대로 둔다
      if (local && local.dirty && local.updated > remote.updated) continue;
      if (local && local.updated === remote.updated) {
        // 올린 것이 그대로 돌아옴: 내용은 같으니 전송 완료 표시만 한다
        if (local.dirty) puts.push({ ...local, dirty: 0 });
        continue;
      }
      puts.push({ ...remote, dirty: 0 });
      changed[store === 'ink' ? 'ink' : 'data'] = true;
    }
    // 서버가 거절한 항목은 다시 보내지 않는다
    for (const [s, id] of r.rejected || []) {
      if (s !== store) continue;
      const local = await get(store, id);
      if (local && local.dirty) puts.push({ ...local, dirty: 0 });
    }
    await putMany(store, puts);
  }
  return changed;
}

export async function pendingCount() {
  let n = 0;
  for (const store of Object.keys(STORES)) n += (await getAll(store)).filter((r) => r.dirty).length;
  return n;
}

export async function syncNow() {
  if (auth.status !== 'in' && auth.status !== 'offline') return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  sync.status = 'syncing';
  try {
    if (auth.status === 'offline') {
      await checkAuth();
      if (auth.status !== 'in') throw new ApiError(0, 'network');
    }
    const since = (await getMeta('since')) || 0;
    const changes = await collectDirty();
    const r = await api('sync.php', { method: 'POST', body: { since, changes } });
    const changed = await applyRemote(r);
    await setMeta('since', Math.max(0, r.now - 5000));
    if (changed.data) await loadAll();
    if (changed.ink) data.inkVersion++;
    sync.status = 'idle';
    sync.lastAt = Date.now();
    sync.error = '';
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      auth.status = 'out'; // 로그인이 풀림 → 로그인 화면. 기기 데이터는 그대로 둔다
      sync.status = 'idle';
    } else if (e instanceof ApiError && e.status === 0) {
      sync.status = 'offline';
    } else {
      sync.status = 'error';
      sync.error = e instanceof ApiError ? `서버 오류(${e.code})` : '동기화하지 못했습니다.';
    }
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleSync(300);
    }
  }
}
