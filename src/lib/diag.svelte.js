// 펜 진단: 설정에서 켜면 화면 구석에 펜슬 입력 상태가 숫자로 보인다(끊김의 원인을 기기에서 확인하는 용도)
function load() {
  try {
    return localStorage.getItem('ip-diag') === '1';
  } catch {
    return false;
  }
}

export const diag = $state({
  on: load(),
  down: 0, // 펜슬이 닿은 횟수
  move: 0, // 펜슬 이동 이벤트
  coalesced: 0, // 묶음 이벤트 중 합쳐 받은 수
  up: 0, // 펜슬이 떨어진 횟수
  cancel: 0, // 브라우저가 입력을 취소한 횟수(많으면 끊김의 원인)
  strokes: 0, // 저장된 획
  stale: 0, // 끝나지 않은 입력을 정리한 횟수
  stitched: 0, // 취소로 끊긴 획을 이어 붙인 횟수
  dust: 0, // 짧고 약해서 버린 접촉(먼지)
  palm: 0, // 손바닥으로 무시한 터치
  maxGap: 0, // 이동 이벤트 사이 가장 긴 간격(ms)
  lastCancel: '', // 마지막 취소 때 눌려 있던 요소
});

export function setDiag(on) {
  diag.on = on;
  try {
    localStorage.setItem('ip-diag', on ? '1' : '0');
  } catch {
    /* 저장 불가 환경 */
  }
}

export function resetDiag() {
  Object.assign(diag, { down: 0, move: 0, coalesced: 0, up: 0, cancel: 0, strokes: 0, stale: 0, stitched: 0, dust: 0, palm: 0, maxGap: 0, lastCancel: '' });
}
