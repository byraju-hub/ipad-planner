// 한국 공휴일. 음력 공휴일(설날, 부처님오신날, 추석)은 한국천문연구원 자료 기반의 음력 변환 라이브러리로
// 계산하고(2050년까지), 대체공휴일 규칙을 적용한다. 선거일 같은 임시공휴일은 미리 알 수 없어 포함하지 않는다.
// 2050년 이후는 브라우저 내장 음력(Intl)으로 대신하며 하루 차이가 날 수 있다.
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { addDays, dayOfWeek, makeKey } from './dates.js';

const LIB_LAST_YEAR = 2050;
const lunarFormat = new Intl.DateTimeFormat('en-u-ca-chinese', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' });

// 음력 (해, 월, 일) → 양력 날짜 키
function lunarToSolar(year, month, day) {
  if (year <= LIB_LAST_YEAR) {
    try {
      const cal = new KoreanLunarCalendar();
      if (cal.setLunarDate(year, month, day, false)) {
        const s = cal.getSolarCalendar();
        return makeKey(s.year, s.month, s.day);
      }
    } catch {
      /* 아래 대체 계산으로 */
    }
  }
  const from = month <= 1 ? makeKey(year, 1, 1) : month <= 4 ? makeKey(year, 4, 1) : makeKey(year, 8, 1);
  const to = month <= 1 ? makeKey(year, 3, 1) : month <= 4 ? makeKey(year, 6, 15) : makeKey(year, 10, 31);
  for (let k = from; k <= to; k = addDays(k, 1)) {
    const [y, m, d] = k.split('-').map(Number);
    const parts = lunarFormat.formatToParts(new Date(Date.UTC(y, m - 1, d, 3)));
    const mo = parts.find((p) => p.type === 'month')?.value ?? '';
    const da = parts.find((p) => p.type === 'day')?.value ?? '';
    if (/^\d+$/.test(mo) && Number(mo) === month && Number(da) === day) return k;
  }
  return null;
}

const cache = new Map();

export function holidaysOf(year) {
  if (cache.has(year)) return cache.get(year);

  // 날짜 → { name, rule, group, overlap }
  //  rule: 'weekend' = 토·일과 겹치면 대체, 'sunday' = 일요일과 겹칠 때만 대체, 'none' = 대체 없음
  //  group: 설날·추석은 연휴 3일을 한 묶음으로 본다
  const base = new Map();
  const add = (key, name, rule, group = null) => {
    if (!key) return;
    const ex = base.get(key);
    if (!ex) {
      base.set(key, { name, rule, group, overlap: false });
      return;
    }
    // 다른 공휴일과 겹침(예: 2028년 추석 연휴와 개천절). 설·추석 연휴가 겹치면 대체공휴일이 생긴다
    ex.name = `${name}·${ex.name}`;
    ex.overlap = true;
    if (group) ex.group = group;
  };

  add(makeKey(year, 1, 1), '신정', 'none');
  add(makeKey(year, 3, 1), '삼일절', 'weekend');
  add(makeKey(year, 5, 5), '어린이날', 'weekend');
  add(makeKey(year, 6, 6), '현충일', 'none');
  add(makeKey(year, 8, 15), '광복절', 'weekend');
  add(makeKey(year, 10, 3), '개천절', 'weekend');
  add(makeKey(year, 10, 9), '한글날', 'weekend');
  add(makeKey(year, 12, 25), '성탄절', 'weekend');

  const seol = lunarToSolar(year, 1, 1);
  if (seol) {
    add(addDays(seol, -1), '설날 연휴', 'sunday', '설날');
    add(seol, '설날', 'sunday', '설날');
    add(addDays(seol, 1), '설날 연휴', 'sunday', '설날');
  }
  const chuseok = lunarToSolar(year, 8, 15);
  if (chuseok) {
    add(addDays(chuseok, -1), '추석 연휴', 'sunday', '추석');
    add(chuseok, '추석', 'sunday', '추석');
    add(addDays(chuseok, 1), '추석 연휴', 'sunday', '추석');
  }
  add(lunarToSolar(year, 4, 8), '부처님오신날', 'weekend');

  const result = new Map([...base].map(([k, v]) => [k, v.name]));

  // 대체공휴일이 필요한 묶음(날짜 순). 설·추석 연휴는 묶음당 1일
  const needs = [];
  const seen = new Set();
  for (const k of [...base.keys()].sort()) {
    const v = base.get(k);
    const dow = dayOfWeek(k);
    const hit =
      (v.rule === 'weekend' && (dow === 0 || dow === 6)) ||
      (v.rule === 'sunday' && dow === 0) ||
      (v.group && v.overlap);
    if (!hit) continue;
    const id = v.group || k;
    if (seen.has(id)) continue;
    seen.add(id);
    needs.push(k);
  }
  for (const k of needs) {
    // 그날 이후 첫 번째 평일(공휴일이 아닌 날)
    let next = addDays(k, 1);
    while (result.has(next) || dayOfWeek(next) === 0 || dayOfWeek(next) === 6) next = addDays(next, 1);
    result.set(next, '대체공휴일');
  }

  cache.set(year, result);
  return result;
}

export function holidayName(key) {
  return holidaysOf(Number(key.slice(0, 4))).get(key) ?? '';
}
