import test from 'node:test';
import assert from 'node:assert/strict';
import { occurrenceStarts, buildDayMap, occLabel } from './recur.js';

const ev = (o) => ({
  id: 'e1', title: '일정', start_date: '2026-12-06', end_date: '2026-12-06',
  start_time: '11:00', end_time: '12:00', all_day: 0, repeat_rule: 'none', deleted: 0, ...o,
});

test('반복 없음: 기간 안에 있을 때만', () => {
  assert.deepEqual(occurrenceStarts(ev({}), '2026-12-01', '2026-12-31'), ['2026-12-06']);
  assert.deepEqual(occurrenceStarts(ev({}), '2027-01-01', '2027-01-31'), []);
});

test('매주: 주일예배는 매주 주일', () => {
  const r = occurrenceStarts(ev({ repeat_rule: 'weekly' }), '2026-12-27', '2027-01-16');
  assert.deepEqual(r, ['2026-12-27', '2027-01-03', '2027-01-10']);
  // 시작일 이전에는 나타나지 않는다
  assert.deepEqual(occurrenceStarts(ev({ repeat_rule: 'weekly' }), '2026-11-01', '2026-12-05'), []);
});

test('매월: 31일은 31일이 있는 달에만', () => {
  const r = occurrenceStarts(ev({ start_date: '2026-12-31', end_date: '2026-12-31', repeat_rule: 'monthly' }), '2026-12-01', '2027-04-30');
  assert.deepEqual(r, ['2026-12-31', '2027-01-31', '2027-03-31']);
});

test('매년: 2월 29일은 윤년에만', () => {
  const e = ev({ start_date: '2028-02-29', end_date: '2028-02-29', repeat_rule: 'yearly' });
  assert.deepEqual(occurrenceStarts(e, '2028-01-01', '2032-12-31'), ['2028-02-29', '2032-02-29']);
  const b = ev({ start_date: '2026-12-25', end_date: '2026-12-25', repeat_rule: 'yearly' });
  assert.deepEqual(occurrenceStarts(b, '2026-12-01', '2028-12-31'), ['2026-12-25', '2027-12-25', '2028-12-25']);
});

test('며칠짜리 일정은 걸쳐 있는 기간에도 잡힌다', () => {
  const e = ev({ start_date: '2027-01-29', end_date: '2027-02-02', all_day: 1, start_time: null, end_time: null });
  assert.deepEqual(occurrenceStarts(e, '2027-02-01', '2027-02-28'), ['2027-01-29']);
  const map = buildDayMap([e], '2027-02-01', '2027-02-28');
  assert.deepEqual([...map.keys()], ['2027-02-01', '2027-02-02']);
  assert.equal(map.get('2027-02-02')[0].last, true);
});

test('날짜별 정렬: 종일이 먼저, 그다음 시간순', () => {
  const list = [
    ev({ id: 'a', title: '저녁', start_time: '19:30' }),
    ev({ id: 'b', title: '종일', all_day: 1, start_time: null }),
    ev({ id: 'c', title: '아침', start_time: '07:00' }),
  ];
  const day = buildDayMap(list, '2026-12-06', '2026-12-06').get('2026-12-06');
  assert.deepEqual(day.map((o) => o.ev.title), ['종일', '아침', '저녁']);
  assert.equal(occLabel(day[1]), '07:00 아침');
  assert.equal(occLabel(day[0]), '종일');
});

test('삭제된 일정은 나오지 않는다', () => {
  assert.equal(buildDayMap([ev({ deleted: 1 })], '2026-12-01', '2026-12-31').size, 0);
});
