// 날짜 계산. 날짜는 'YYYY-MM-DD' 문자열(키)로 다룬다. 한 주는 주일(일요일)에 시작한다.

// 사용 시작일. 이 날짜 이전은 이동할 수 없다.
export const MIN_DATE = '2026-11-01';

export const DOW = ['주일', '월', '화', '수', '목', '금', '토'];

const pad = (n) => String(n).padStart(2, '0');

export function makeKey(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

function toDate(key) {
  const { y, m, d } = parseKey(key);
  return new Date(y, m - 1, d, 12); // 정오 기준으로 시간대·서머타임 오차를 피한다
}

function fromDate(date) {
  return makeKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function isValidKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const { y, m, d } = parseKey(key);
  const dt = new Date(y, m - 1, d, 12);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function addDays(key, n) {
  const dt = toDate(key);
  dt.setDate(dt.getDate() + n);
  return fromDate(dt);
}

export function dayOfWeek(key) {
  return toDate(key).getDay(); // 0 = 주일
}

export function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

export function today() {
  return fromDate(new Date());
}

export function clampKey(key) {
  return key < MIN_DATE ? MIN_DATE : key;
}

export function weekStart(key) {
  return addDays(key, -dayOfWeek(key));
}

export function weekDays(key) {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// 월간 달력 칸. 앞뒤 달의 날짜로 주 단위를 채운다.
export function monthCells(y, m) {
  const first = makeKey(y, m, 1);
  const last = makeKey(y, m, daysInMonth(y, m));
  const start = weekStart(first);
  const end = addDays(weekStart(last), 6);
  const cells = [];
  for (let k = start; k <= end; k = addDays(k, 1)) {
    const p = parseKey(k);
    cells.push({ key: k, day: p.d, inMonth: p.y === y && p.m === m });
  }
  return { cells, rows: cells.length / 7 };
}

// 화면별 기간(시작, 끝)
export function periodRange(view, key) {
  const { y, m } = parseKey(key);
  if (view === 'year') return { start: makeKey(y, 1, 1), end: makeKey(y, 12, 31) };
  if (view === 'month') return { start: makeKey(y, m, 1), end: makeKey(y, m, daysInMonth(y, m)) };
  const start = weekStart(key);
  return { start, end: addDays(start, 6) };
}

export function prevKey(view, key) {
  const { y, m } = parseKey(key);
  if (view === 'year') return makeKey(y - 1, 1, 1);
  if (view === 'month') return m === 1 ? makeKey(y - 1, 12, 1) : makeKey(y, m - 1, 1);
  return addDays(weekStart(key), -7);
}

export function nextKey(view, key) {
  const { y, m } = parseKey(key);
  if (view === 'year') return makeKey(y + 1, 1, 1);
  if (view === 'month') return m === 12 ? makeKey(y + 1, 1, 1) : makeKey(y, m + 1, 1);
  return addDays(weekStart(key), 7);
}

// 이전 기간이 사용 시작일 이후에 걸쳐 있을 때만 이동할 수 있다.
export function canGoPrev(view, key) {
  return periodRange(view, prevKey(view, key)).end >= MIN_DATE;
}

// 화면을 바꿀 때 기준 날짜. 오늘이 그 기간 안에 있으면 오늘로 맞춘다.
export function switchKey(view, key) {
  const t = today();
  const { start, end } = periodRange(view, key);
  return t >= MIN_DATE && t >= start && t <= end ? t : key;
}

export function periodTitle(view, key) {
  const { y, m } = parseKey(key);
  if (view === 'year') return { main: `${y}년`, sub: '' };
  if (view === 'month') return { main: `${y}년 ${m}월`, sub: '' };
  const { start, end } = periodRange('week', key);
  const a = parseKey(start);
  const b = parseKey(end);
  let main;
  if (a.y !== b.y) main = `${a.y}년 ${a.m}월 ${a.d}일 – ${b.y}년 ${b.m}월 ${b.d}일`;
  else if (a.m !== b.m) main = `${a.m}월 ${a.d}일 – ${b.m}월 ${b.d}일`;
  else main = `${a.m}월 ${a.d}일 – ${b.d}일`;
  return { main, sub: a.y === b.y ? `${a.y}년` : '' };
}

// 주소의 # 부분 ↔ 화면 상태
export function toHash(view, key) {
  const { y, m } = parseKey(key);
  if (view === 'year') return `#/year/${y}`;
  if (view === 'month') return `#/month/${y}-${pad(m)}`;
  return `#/week/${key}`;
}

export function parseHash(hash) {
  const fallback = { view: 'week', key: clampKey(today()) };
  const match = /^#\/(year|month|week)\/([\d-]+)$/.exec(hash || '');
  if (!match) return fallback;
  const [, view, value] = match;
  let key;
  if (view === 'year' && /^\d{4}$/.test(value)) key = `${value}-01-01`;
  else if (view === 'month' && /^\d{4}-\d{2}$/.test(value)) key = `${value}-01`;
  else if (view === 'week') key = value;
  if (!key || !isValidKey(key)) return fallback;
  return { view, key: clampKey(key) };
}
