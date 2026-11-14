import { holidayName } from './holidays.js';

// 날짜 글자색: 주일·공휴일은 빨강, 토요일은 파랑
export function tone(key, col) {
  if (holidayName(key) || col === 0) return 'red';
  if (col === 6) return 'blue';
  return '';
}
