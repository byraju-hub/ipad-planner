// 반복 일정 펼치기. 일정은 하나만 저장하고, 보이는 기간에 해당하는 날짜를 계산한다.
import { addDays, parseKey, makeKey, daysInMonth } from './dates.js';
import { catRank } from './categories.js';

const MAX_SPAN = 60; // 며칠짜리 일정까지 허용할지(안전 장치)

function diffDays(a, b) {
  const pa = parseKey(a);
  const pb = parseKey(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86400000);
}

export function spanOf(ev) {
  return Math.min(MAX_SPAN, Math.max(0, diffDays(ev.start_date, ev.end_date || ev.start_date)));
}

// [from, to] 기간과 겹치는 반복 시작일 목록
export function occurrenceStarts(ev, from, to) {
  const base = ev.start_date;
  const span = spanOf(ev);
  const hits = (s) => s <= to && addDays(s, span) >= from;
  const out = [];
  const rule = ev.repeat_rule || 'none';

  if (rule === 'none') {
    if (hits(base)) out.push(base);
  } else if (rule === 'weekly') {
    const kmin = Math.max(0, Math.ceil((diffDays(base, from) - span) / 7));
    for (let s = addDays(base, 7 * kmin); s <= to; s = addDays(s, 7)) {
      if (hits(s)) out.push(s);
    }
  } else if (rule === 'monthly') {
    const b = parseKey(base);
    const f = parseKey(from);
    const t = parseKey(to);
    const idx = (y, m) => y * 12 + (m - 1);
    const lo = Math.max(idx(b.y, b.m), idx(f.y, f.m) - Math.ceil(span / 28) - 1);
    for (let i = lo; i <= idx(t.y, t.m); i++) {
      const y = Math.floor(i / 12);
      const m = (i % 12) + 1;
      if (b.d > daysInMonth(y, m)) continue; // 31일 같은 날짜가 없는 달은 건너뛴다
      const s = makeKey(y, m, b.d);
      if (s >= base && hits(s)) out.push(s);
    }
  } else if (rule === 'yearly') {
    const b = parseKey(base);
    const f = parseKey(from);
    const t = parseKey(to);
    for (let y = Math.max(b.y, f.y - 1 - Math.ceil(span / 365)); y <= t.y; y++) {
      if (b.d > daysInMonth(y, b.m)) continue; // 2월 29일은 윤년에만
      const s = makeKey(y, b.m, b.d);
      if (s >= base && hits(s)) out.push(s);
    }
  }
  return out;
}

// 하루 안의 순서: 분류(설교 → 교회 → 부서 → 미팅 → 개인)가 먼저, 같은 분류 안에서는 종일 → 시간순 → 제목
function sortKey(o) {
  const allDay = o.ev.all_day || !o.ev.start_time || o.span > 0;
  return String(catRank(o.ev.category)).padStart(2, '0') + '|' + (allDay ? '0' : '1') + (o.ev.start_time || '') + '|' + (o.ev.title || '');
}

// 날짜 → 그날의 일정 목록. 며칠짜리 일정은 각 날짜에 모두 들어간다.
export function buildDayMap(events, from, to) {
  const map = new Map();
  for (const ev of events) {
    if (ev.deleted) continue;
    const span = spanOf(ev);
    for (const s of occurrenceStarts(ev, from, to)) {
      for (let i = 0; i <= span; i++) {
        const day = addDays(s, i);
        if (day < from || day > to) continue;
        const list = map.get(day) || [];
        list.push({ ev, day, index: i, span, first: i === 0, last: i === span });
        map.set(day, list);
      }
    }
  }
  for (const list of map.values()) list.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));
  return map;
}

// 칩에 보여줄 글자
export function occLabel(o) {
  const timed = !o.ev.all_day && o.ev.start_time && o.span === 0;
  return timed ? `${o.ev.start_time} ${o.ev.title}` : o.ev.title;
}
