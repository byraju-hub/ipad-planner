// 데모 모드(주소 끝에 ?demo). 소개 페이지에서 "플래너 열기"로 들어오면 쓴다.
// 실제 데이터를 절대 건드리지 않는다: 서버 연결과 로그인은 건너뛰고, 기기 저장소(IndexedDB) 대신 메모리만 쓰며,
// 샘플 일정은 열 때마다 오늘 날짜를 기준으로 새로 만든다. 탭을 닫으면 사라진다.
import { addDays, weekStart, today, parseKey, MIN_DATE } from './dates.js';
import { putMany, useMemoryOnly } from './idb.js';

export const isDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');

const ev = (id, title, date, category, o = {}) => ({
  id: `demo-${id}`, title, start_date: date, end_date: o.end || date,
  start_time: o.allDay ? null : o.start ?? '09:00', end_time: o.allDay ? null : o.end_time ?? null,
  all_day: o.allDay ? 1 : 0, category, repeat_rule: o.repeat || 'none', alarm: 'none', memo: o.memo || '',
  deleted: 0, updated: 1, dirty: 0,
});

export async function seedDemo() {
  useMemoryOnly();
  const t = today();
  const sun = weekStart(t);
  const d = (n) => addDays(sun, n);
  const { y, m } = parseKey(t);
  const mk = (day) => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const last = new Date(y, m, 0).getDate();
  const spread = (n) => Math.min(n, last);

  const events = [
    // 이번 주: 하루에 여러 개 쌓이는 날과 분류별 색을 보여 준다
    ev(1, '주일 예배', d(0), 'worship', { start: '11:00', end_time: '12:30' }),
    ev(2, '설교 준비', d(0), 'sermon', { start: '08:00', end_time: '10:00' }),
    ev(3, '교사 모임', d(0), 'dept', { start: '13:30', end_time: '14:30' }),
    ev(4, '점심 약속', d(0), 'visit', { start: '12:30', end_time: '13:30' }),
    ev(5, '운동', d(0), 'personal', { start: '18:00', end_time: '19:00' }),
    ev(6, '임원 회의', d(1), 'dept', { start: '10:00', end_time: '11:30' }),
    ev(7, '거래처 미팅', d(2), 'visit', { start: '15:00', end_time: '16:00' }),
    ev(8, '수요 기도회', d(3), 'worship', { start: '19:30', end_time: '21:00' }),
    ev(9, '치과 예약', d(4), 'personal', { start: '10:30', end_time: '11:30' }),
    ev(10, '금요 기도회', d(5), 'worship', { start: '20:00', end_time: '22:00' }),
    ev(11, '청년부 모임', d(6), 'dept', { start: '14:00', end_time: '16:00' }),
    // 이번 달과 앞뒤
    ev(12, '찬양 연습', mk(spread(5)), 'dept', { start: '19:00', end_time: '21:00' }),
    ev(13, '가족 모임', mk(spread(24)), 'personal', { allDay: true }),
    ev(14, '수련회', mk(spread(26)), 'worship', { allDay: true, end: mk(spread(28)) }),
    ev(15, '매주 새벽 기도', d(1), 'worship', { start: '05:30', end_time: '06:30', repeat: 'weekly' }),
    ev(16, '다음 주 심방', addDays(sun, 9), 'visit', { start: '14:00', end_time: '15:30' }),
    ev(17, '다음 주 설교', addDays(sun, 7), 'sermon', { start: '11:00', end_time: '12:00' }),
    ev(18, '가을 야외 예배', addDays(sun, 21), 'worship', { allDay: true }),
  ].filter((e) => e.start_date >= MIN_DATE);

  const todos = [
    ['설교 본문 정리', d(2), 0], ['교사 모임 자료 인쇄', d(0), 1], ['새가족 전화하기', d(4), 0],
    ['주보 원고 확인', d(5), 0], ['월간 예산 정리', null, 0], ['도서관 책 반납', null, 0],
  ].map(([title, due, done], i) => ({
    id: `demo-t${i}`, title, due: due && due >= MIN_DATE ? due : null, done, done_at: done ? 1 : null,
    sort: i, deleted: 0, updated: 1, dirty: 0,
  }));

  const opinions = [
    { id: 'demo-o1', content: '주보 글씨가 조금 더 크면 좋겠어요', source: '성도', status: 'new', heard_on: t },
    { id: 'demo-o2', content: '수요 예배 시작 시간을 10분 앞당기면 좋겠다', source: '집사', status: 'review', heard_on: addDays(t, -3) },
    { id: 'demo-o3', content: '주차 안내 표지판 추가', source: '안내팀', status: 'done', heard_on: addDays(t, -9) },
  ].map((o) => ({ ...o, memo: '', deleted: 0, updated: 1, dirty: 0 }));

  await putMany('events', events);
  await putMany('todos', todos);
  await putMany('opinions', opinions);
}
