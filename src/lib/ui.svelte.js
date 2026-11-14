import { today, clampKey, periodRange } from './dates.js';

// 열려 있는 창(일정 등록, 설정)
export const ui = $state({ sheet: null });

export function openEvent(ev = null, date = null) {
  ui.sheet = { type: 'event', ev, date: clampKey(date || today()) };
}
export const openSettings = () => {
  ui.sheet = { type: 'settings' };
};
export const closeSheet = () => {
  ui.sheet = null;
};

// 새 일정의 기본 날짜: 지금 보는 기간 안에 오늘이 있으면 오늘, 아니면 기간의 첫날
export function defaultDate(view, key) {
  const t = today();
  const { start, end } = periodRange(view, key);
  return t >= start && t <= end ? clampKey(t) : clampKey(start);
}
