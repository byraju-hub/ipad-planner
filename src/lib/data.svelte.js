// 앱 데이터(일정·할 일·의견·손글씨). 기기 안 저장소에 먼저 저장하고, 서버 동기화는 따로 한다.
import { getAll, get, put } from './idb.js';
import { today } from './dates.js';

export const data = $state({ ready: false, events: [], todos: [], opinions: [], inkVersion: 0 });

let changeHook = () => {};
export const setChangeHook = (fn) => {
  changeHook = fn;
};

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const alive = (r) => !r.deleted;

export async function loadAll() {
  const [events, todos, opinions] = await Promise.all([getAll('events'), getAll('todos'), getAll('opinions')]);
  data.events = events.filter(alive);
  data.todos = todos.filter(alive).sort((a, b) => a.sort - b.sort);
  data.opinions = opinions.filter(alive).sort((a, b) => (b.heard_on || '').localeCompare(a.heard_on || '') || b.updated - a.updated);
  data.ready = true;
}

async function save(store, list, rec) {
  rec.updated = Date.now();
  rec.dirty = 1;
  await put(store, rec);
  const i = list.findIndex((x) => x.id === rec.id);
  if (rec.deleted) {
    if (i >= 0) list.splice(i, 1);
  } else if (i >= 0) {
    list[i] = rec;
  } else {
    list.push(rec);
  }
  changeHook();
}

// ---- 일정 ----
export function newEvent(date) {
  return {
    id: uid(), title: '', start_date: date, end_date: date, start_time: '09:00', end_time: '11:00',
    all_day: 0, category: 'personal', repeat_rule: 'none', alarm: 'none', memo: '', deleted: 0,
  };
}
export const saveEvent = (ev) => save('events', data.events, { ...ev, deleted: 0 });
export const removeEvent = (ev) => save('events', data.events, { ...ev, deleted: 1 });

// ---- 할 일 ----
export const newTodo = () => ({ id: uid(), title: '', due: null, done: 0, done_at: null, sort: Date.now(), deleted: 0 });
export const saveTodo = (t) => save('todos', data.todos, { ...t, deleted: 0 });
export const removeTodo = (t) => save('todos', data.todos, { ...t, deleted: 1 });
export const toggleTodo = (t) => saveTodo({ ...t, done: t.done ? 0 : 1, done_at: t.done ? null : Date.now() });

// ---- 의견 ----
export const newOpinion = () => ({
  id: uid(), content: '', source: '', heard_on: today(), status: 'new', memo: '', deleted: 0,
});
export const saveOpinion = (o) => save('opinions', data.opinions, { ...o, deleted: 0 });
export const removeOpinion = (o) => save('opinions', data.opinions, { ...o, deleted: 1 });

// ---- 손글씨(페이지별 획 목록) ----
export async function getInk(pageKey) {
  const rec = await get('ink', pageKey);
  return rec && !rec.deleted ? rec.strokes : [];
}
export async function putInk(pageKey, strokes) {
  await put('ink', { page_key: pageKey, strokes, updated: Date.now(), deleted: 0, dirty: 1 });
  changeHook();
}
