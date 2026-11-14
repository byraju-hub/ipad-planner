// 기기 안 저장소(IndexedDB). 사용할 수 없는 환경이면 메모리에 임시 저장한다.
const NAME = 'ip-planner';
const VERSION = 1;
const KEYS = { events: 'id', todos: 'id', opinions: 'id', ink: 'page_key', meta: 'k' };

const mem = Object.fromEntries(Object.keys(KEYS).map((s) => [s, new Map()]));
let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    let req;
    try {
      req = indexedDB.open(NAME, VERSION);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [store, keyPath] of Object.entries(KEYS)) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAll(store) {
  const db = await open();
  if (!db) return [...mem[store].values()];
  return wrap(db.transaction(store).objectStore(store).getAll());
}

export async function get(store, key) {
  const db = await open();
  if (!db) return mem[store].get(key);
  return wrap(db.transaction(store).objectStore(store).get(key));
}

export async function putMany(store, records) {
  if (!records.length) return;
  const db = await open();
  if (!db) {
    for (const r of records) mem[store].set(r[KEYS[store]], r);
    return;
  }
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const r of records) os.put(r);
  await done(tx);
}

export const put = (store, record) => putMany(store, [record]);

export async function clearAll() {
  const db = await open();
  if (!db) {
    for (const m of Object.values(mem)) m.clear();
    return;
  }
  const tx = db.transaction(Object.keys(KEYS), 'readwrite');
  for (const s of Object.keys(KEYS)) tx.objectStore(s).clear();
  await done(tx);
}

export async function getMeta(key) {
  const row = await get('meta', key);
  return row ? row.v : undefined;
}

export const setMeta = (key, v) => put('meta', { k: key, v });
