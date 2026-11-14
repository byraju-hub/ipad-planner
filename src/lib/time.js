// 시작 시간(HH:MM) 2시간 뒤. 자정을 넘으면 종료 시간 없음(null)
export function endAfter(start, hours = 2) {
  if (!start) return null;
  const [h, m] = start.split(':').map(Number);
  const t = h * 60 + m + hours * 60;
  if (t >= 24 * 60) return null;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
