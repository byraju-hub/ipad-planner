// 노출 순서는 이 배열 순서가 기준이다(분류 선택 버튼, 하루 안의 일정 정렬). 저장 값(id)은 바꾸지 않는다.
export const CATEGORIES = [
  { id: 'sermon', label: '설교', bg: '#FFE9E7', fg: '#B3000F' }, // 빨강
  { id: 'worship', label: '교회', bg: '#E5F0FF', fg: '#004A9F' }, // 파랑
  { id: 'dept', label: '부서', bg: '#E3F4E8', fg: '#1B6B34' }, // 그린
  { id: 'visit', label: '미팅', bg: '#FFF1DF', fg: '#8A4500' }, // 주황 (예전 이름: 심방·미팅)
  { id: 'personal', label: '개인', bg: '#F1ECFB', fg: '#5A3EA8' }, // 보라
];

export const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES.at(-1);

// 정렬용 순서(모르는 값은 맨 뒤)
export const catRank = (id) => {
  const i = CATEGORIES.findIndex((c) => c.id === id);
  return i < 0 ? CATEGORIES.length : i;
};

export const REPEATS = [
  ['none', '안 함'],
  ['weekly', '매주'],
  ['monthly', '매월'],
  ['yearly', '매년'],
];

export const ALARMS = [
  ['none', '없음'],
  ['at', '정시'],
  ['10m', '10분 전'],
  ['1h', '1시간 전'],
  ['1d', '하루 전'],
];

// 의견 처리 상태. 누를 때마다 다음 상태로 넘어간다.
export const OPINION_STATUS = [
  { id: 'new', label: '새 의견', bg: '#E5F0FF', fg: '#004A9F' },
  { id: 'review', label: '검토 중', bg: '#FFF1DF', fg: '#8A4500' },
  { id: 'done', label: '반영', bg: '#E8E8ED', fg: '#1D1D1F' },
  { id: 'hold', label: '보류', bg: '#F2F2F7', fg: '#636366' },
];

export const statusOf = (id) => OPINION_STATUS.find((s) => s.id === id) || OPINION_STATUS[0];
