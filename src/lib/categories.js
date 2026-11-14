export const CATEGORIES = [
  { id: 'sermon', label: '설교', bg: '#FFE9E7', fg: '#B3000F' },
  { id: 'worship', label: '교회', bg: '#E5F0FF', fg: '#004A9F' },
  { id: 'visit', label: '심방·미팅', bg: '#FFF1DF', fg: '#8A4500' },
  { id: 'personal', label: '개인', bg: '#E3F4E8', fg: '#1B6B34' },
];

export const catOf = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[3];

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
