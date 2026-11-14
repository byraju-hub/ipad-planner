// 한국 공휴일. 음력 공휴일은 브라우저의 음력 변환(Intl)으로 계산하고, 대체공휴일 규칙을 적용한다.
// 선거일 같은 임시공휴일은 미리 알 수 없어 포함하지 않는다.
import { addDays, dayOfWeek, makeKey } from './dates.js';

const lunarFormat = new Intl.DateTimeFormat('en-u-ca-chinese', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' });

// 한국 시간(KST) 기준. 음력 월/일에 해당하는 양력 날짜를 범위 안에서 찾는다. 윤달은 제외한다.
function findLunar(from, to, lunarMonth, lunarDay) {
  for (let k = from; k <= to; k = addDays(k, 1)) {
    const [y, m, d] = k.split('-').map(Number);
    const parts = lunarFormat.formatToParts(new Date(Date.UTC(y, m - 1, d, 3)));
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const day = parts.find((p) => p.type === 'day')?.value ?? '';
    if (/^\d+$/.test(month) && Number(month) === lunarMonth && Number(day) === lunarDay) return k;
  }
  return null;
}

const cache = new Map();

export function holidaysOf(year) {
  if (cache.has(year)) return cache.get(year);

  const base = new Map(); // 날짜 → { name, rule }
  const add = (key, name, rule) => {
    if (key && !base.has(key)) base.set(key, { name, rule });
  };

  // rule: 'weekend' = 토·일과 겹치면 대체, 'sunday' = 일요일과 겹칠 때만 대체, 'none' = 대체 없음
  add(makeKey(year, 1, 1), '신정', 'none');
  add(makeKey(year, 3, 1), '삼일절', 'weekend');
  add(makeKey(year, 5, 5), '어린이날', 'weekend');
  add(makeKey(year, 6, 6), '현충일', 'none');
  add(makeKey(year, 8, 15), '광복절', 'weekend');
  add(makeKey(year, 10, 3), '개천절', 'weekend');
  add(makeKey(year, 10, 9), '한글날', 'weekend');
  add(makeKey(year, 12, 25), '성탄절', 'weekend');

  const seol = findLunar(makeKey(year, 1, 1), makeKey(year, 3, 1), 1, 1);
  if (seol) {
    add(addDays(seol, -1), '설날 연휴', 'sunday');
    add(seol, '설날', 'sunday');
    add(addDays(seol, 1), '설날 연휴', 'sunday');
  }
  const chuseok = findLunar(makeKey(year, 8, 1), makeKey(year, 10, 31), 8, 15);
  if (chuseok) {
    add(addDays(chuseok, -1), '추석 연휴', 'sunday');
    add(chuseok, '추석', 'sunday');
    add(addDays(chuseok, 1), '추석 연휴', 'sunday');
  }
  add(findLunar(makeKey(year, 4, 1), makeKey(year, 6, 15), 4, 8), '부처님오신날', 'weekend');

  const result = new Map([...base].map(([k, v]) => [k, v.name]));

  // 대체공휴일: 겹친 날 이후 첫 번째 평일(공휴일 아닌 날)
  const needs = [...base]
    .filter(([k, v]) => {
      const dow = dayOfWeek(k);
      return (v.rule === 'weekend' && (dow === 0 || dow === 6)) || (v.rule === 'sunday' && dow === 0);
    })
    .map(([k]) => k)
    .sort();
  // 설·추석은 연휴 3일 중 하루만 겹쳐도 대체 1일이므로 묶음별로 한 번만 센다
  const counted = new Set();
  for (const k of needs) {
    const group = base.get(k).name.startsWith('설날') || base.get(k).name.startsWith('추석')
      ? base.get(k).name.slice(0, 2)
      : k;
    if (counted.has(group)) continue;
    counted.add(group);
    let next = addDays(k, 1);
    while (result.has(next) || dayOfWeek(next) === 0 || dayOfWeek(next) === 6) next = addDays(next, 1);
    result.set(next, '대체공휴일');
  }

  cache.set(year, result);
  return result;
}

export function holidayName(key) {
  const year = Number(key.slice(0, 4));
  return holidaysOf(year).get(key) ?? '';
}
