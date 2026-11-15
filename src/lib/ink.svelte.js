// 손글씨 도구 상태와, 헤더의 되돌리기 버튼이 현재 페이지의 캔버스를 부르는 연결 고리
export const COLORS = ['#1d1d1f', '#1f3fa6', '#d70015'];
// 펜 굵기 3단계(논리 좌표 기준, 필압에 따라 이보다 얇거나 굵어진다): 가늘게 · 보통 · 굵게
export const WIDTHS = [1.3, 2.2, 3.8];
export const WIDTH_NAMES = ['가늘게', '보통', '굵게'];

function load() {
  try {
    return JSON.parse(localStorage.getItem('ip-tool') || '{}');
  } catch {
    return {};
  }
}
const saved = load();

export const tool = $state({
  mode: 'pen', // 'pen' | 'eraser'
  color: COLORS.includes(saved.color) ? saved.color : COLORS[0],
  width: WIDTHS.includes(saved.width) ? saved.width : WIDTHS[1],
  finger: !!saved.finger, // 손가락·마우스로도 쓰기(애플 펜슬은 항상 쓰기)
});

export function setTool(patch) {
  Object.assign(tool, patch);
  try {
    localStorage.setItem('ip-tool', JSON.stringify({ color: tool.color, width: tool.width, finger: tool.finger }));
  } catch {
    /* 저장 불가 환경 */
  }
}

export const inkState = $state({ canUndo: false });

let active = null;
export function registerInk(handle) {
  active = handle;
  return () => {
    if (active === handle) active = null;
  };
}
export const undoInk = () => active?.undo();
