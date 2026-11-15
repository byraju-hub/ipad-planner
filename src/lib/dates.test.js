import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_DATE, dayOfWeek, weekStart, monthCells, canGoPrev, prevKey, nextKey,
  parseHash, toHash, periodTitle, clampKey, startKey, switchKey,
} from './dates.js';
import { holidayName, holidaysOf } from './holidays.js';

test('처음 켜면 금요일까지는 그 주, 토요일은 다음 주', () => {
  assert.equal(weekStart(startKey('2027-01-03')), '2027-01-03'); // 주일
  assert.equal(weekStart(startKey('2027-01-08')), '2027-01-03'); // 금요일
  assert.equal(weekStart(startKey('2027-01-09')), '2027-01-10'); // 토요일 → 다음 주
});

test('한 주는 주일에 시작한다', () => {
  assert.equal(dayOfWeek('2027-01-03'), 0); // 2027-01-03은 주일
  assert.equal(weekStart('2027-01-06'), '2027-01-03');
  assert.equal(weekStart('2027-01-03'), '2027-01-03');
});

test('2026년 12월 달력은 11월 29일(주일)에 시작하고 5줄이다', () => {
  const { cells, rows } = monthCells(2026, 12);
  assert.equal(cells[0].key, '2026-11-29');
  assert.equal(cells[0].inMonth, false);
  assert.equal(rows, 5);
  assert.equal(cells.at(-1).key, '2027-01-02');
});

test('사용 시작일 이전으로는 갈 수 없다', () => {
  assert.equal(MIN_DATE, '2026-11-01');
  assert.equal(clampKey('2026-10-14'), '2026-11-01');
  assert.equal(clampKey('2026-11-14'), '2026-11-14');
  assert.equal(canGoPrev('month', '2026-11-01'), false);
  assert.equal(canGoPrev('month', '2026-12-01'), true);
  assert.equal(canGoPrev('year', '2026-11-01'), false);
  assert.equal(canGoPrev('year', '2027-03-01'), true);
  assert.equal(canGoPrev('week', '2026-11-01'), false); // 10/25–10/31 주는 전부 이전
  assert.equal(canGoPrev('week', '2026-11-08'), true); // 11/1–11/7 주
});

test('이동: 연말·연초', () => {
  assert.equal(nextKey('month', '2026-12-01'), '2027-01-01');
  assert.equal(prevKey('month', '2027-01-01'), '2026-12-01');
  assert.equal(nextKey('week', '2026-12-27'), '2027-01-03');
});

test('주소(#) 해석', () => {
  assert.deepEqual(parseHash('#/month/2027-01'), { view: 'month', key: '2027-01-01' });
  assert.deepEqual(parseHash('#/year/2027'), { view: 'year', key: '2027-01-01' });
  assert.deepEqual(parseHash('#/week/2027-01-06'), { view: 'week', key: '2027-01-06' });
  assert.equal(parseHash('#/month/2020-01').key, MIN_DATE); // 시작일 이전은 시작일로
  assert.equal(parseHash('#/month/2027-13').view, 'week'); // 잘못된 값은 기본 화면(이번 주 주간)
  assert.equal(parseHash('').view, 'week'); // 처음 켜면 이번 주 주간
  assert.equal(toHash('month', '2027-01-15'), '#/month/2027-01');
});

test('주간 제목', () => {
  assert.deepEqual(periodTitle('week', '2027-01-06'), { main: '1/3 - 9', sub: '2027' });
  assert.deepEqual(periodTitle('week', '2026-12-01'), { main: '11/29 - 12/5', sub: '2026' });
  assert.deepEqual(periodTitle('week', '2027-01-01'), { main: '12/27 - 1/2', sub: '2026 - 2027' });
});

test('공휴일 2026년 12월 ~ 2027년', () => {
  assert.equal(holidayName('2026-12-25'), '성탄절');
  assert.equal(holidayName('2027-01-01'), '신정');
  // 2027년 설날은 한국 기준 2월 7일(일요일). 삭이 한국 시간 2/7 0시대라 중국(2/6)과 하루 다르다
  assert.equal(holidayName('2027-02-06'), '설날 연휴');
  assert.equal(holidayName('2027-02-07'), '설날');
  assert.equal(holidayName('2027-02-08'), '설날 연휴');
  assert.equal(holidayName('2027-02-09'), '대체공휴일'); // 설날이 일요일, 연휴 다음 첫 평일
  assert.equal(holidayName('2027-03-01'), '삼일절');
  assert.equal(holidayName('2027-05-05'), '어린이날');
  assert.equal(holidayName('2027-05-13'), '부처님오신날');
  assert.equal(holidayName('2027-06-06'), '현충일');
  assert.equal(holidayName('2027-06-07'), ''); // 현충일은 대체공휴일 없음
  assert.equal(holidayName('2027-08-16'), '대체공휴일'); // 광복절이 일요일
  assert.equal(holidayName('2027-09-15'), '추석');
  assert.equal(holidayName('2027-10-04'), '대체공휴일'); // 개천절이 일요일
  assert.equal(holidayName('2027-10-11'), '대체공휴일'); // 한글날이 토요일
  assert.equal(holidayName('2027-12-27'), '대체공휴일'); // 성탄절이 토요일
  assert.equal(holidaysOf(2027).size, 20);
});

test('2028년 이후도 계산된다: 음력 공휴일과 겹침', () => {
  assert.equal(holidayName('2028-01-27'), '설날'); // 한국 기준 1/27(중국은 1/26)
  assert.equal(holidayName('2028-05-02'), '부처님오신날');
  // 추석(10/3)이 개천절과 겹쳐 대체공휴일이 생긴다
  assert.equal(holidayName('2028-10-03'), '추석·개천절');
  assert.equal(holidayName('2028-10-02'), '추석 연휴');
  assert.equal(holidayName('2028-10-04'), '추석 연휴');
  assert.equal(holidayName('2028-10-05'), '대체공휴일');
  assert.equal(holidayName('2029-02-13'), '설날');
  assert.equal(holidayName('2029-09-22'), '추석');
  assert.equal(holidayName('2030-02-03'), '설날'); // 일요일 → 연휴 다음 날 대체
  assert.equal(holidayName('2030-02-05'), '대체공휴일');
  assert.equal(holidayName('2030-09-12'), '추석');
});

test('Weekly로 바꾸면 금요일까지는 이번 주, 토요일부터는 다음 주', () => {
  // 오늘이 금요일(2027-01-08): 이번 달/올해에서 주간으로 → 이번 주
  assert.equal(weekStart(switchKey('month', 'week', '2027-01-01', '2027-01-08')), '2027-01-03');
  assert.equal(weekStart(switchKey('year', 'week', '2027-01-01', '2027-01-08')), '2027-01-03');
  // 오늘이 토요일(2027-01-09): 다음 주
  assert.equal(weekStart(switchKey('month', 'week', '2027-01-01', '2027-01-09')), '2027-01-10');
  // 오늘이 없는 달에서는 그 달의 첫 주
  assert.equal(weekStart(switchKey('month', 'week', '2027-02-01', '2027-01-08')), '2027-01-31');
  // 월간·연간으로는 오늘 기준
  assert.equal(switchKey('week', 'month', '2027-01-10', '2027-01-09'), '2027-01-09');
});
