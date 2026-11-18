// 개발용 가짜 서버: node scripts/mock-api.mjs  (포트 5175, vite 개발 서버가 /api 를 여기로 넘긴다)
// 실제 서버와 같은 방식으로 동기화한다(나중에 바꾼 쪽이 이김, since 이후 변경을 돌려줌 → 올린 것도 되돌려줌).
import { createServer } from 'node:http';
const PORT = Number(process.env.MOCK_PORT || 5175);

const store = { events: new Map(), todos: new Map(), opinions: new Map(), ink: new Map() };
const keys = { events: 'id', todos: 'id', opinions: 'id', ink: 'page_key' };
let syncCount = 0;
const users = [{ id: 1, username: 'admin', display_name: '관리자', is_admin: 1, disabled: 0 }];

createServer((req, res) => {
  const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  const url = req.url.split('?')[0];
  if (url.endsWith('/me.php')) return send(200, { ok: true, csrf: 'mock-csrf', user: users[0] });
  if (url.endsWith('/users.php')) {
    if (req.method === 'GET') return send(200, { ok: true, users });
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const b = JSON.parse(raw || '{}');
      if (b.action === 'create') {
        if (users.some((u) => u.username === b.username)) return send(409, { error: 'exists' });
        users.push({ id: users.length + 1, username: b.username, display_name: b.display_name || b.username, is_admin: 0, disabled: 0 });
      } else if (b.action === 'set_disabled') {
        const u = users.find((x) => x.id === b.id);
        if (u.id === 1) return send(400, { error: 'self' });
        u.disabled = b.disabled ? 1 : 0;
      }
      send(200, { ok: true, users });
    });
    return;
  }
  if (url.endsWith('/_stats')) return send(200, { syncCount, ink: [...store.ink.values()].map((r) => ({ key: r.page_key, strokes: r.strokes.length })) });
  if (url.endsWith('/sync.php') && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const { since = 0, changes = {} } = JSON.parse(raw || '{}');
      const now = Date.now();
      syncCount++;
      for (const name of Object.keys(store)) {
        for (const rec of changes[name] || []) {
          const ex = store[name].get(rec[keys[name]]);
          if (!ex || ex.updated < rec.updated) store[name].set(rec[keys[name]], { ...rec, synced_at: now });
        }
      }
      const out = { now, rejected: [] };
      for (const name of Object.keys(store)) {
        out[name] = [...store[name].values()].filter((r) => r.synced_at >= since).map(({ synced_at, ...r }) => r);
      }
      send(200, out);
    });
    return;
  }
  send(404, { error: 'not_found' });
}).listen(PORT, () => console.log('mock api on ' + PORT));
