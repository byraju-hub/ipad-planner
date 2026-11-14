// 손글씨 도구 상태와, 헤더의 되돌리기 버튼이 현재 페이지의 캔버스를 부르는 연결 고리
export const COLORS = ['#1d1d1f', '#1f3fa6', '#d70015'];

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
  finger: !!saved.finger, // 손가락·마우스로도 쓰기(애플 펜슬은 항상 쓰기)
});

export function setTool(patch) {
  Object.assign(tool, patch);
  try {
    localStorage.setItem('ip-tool', JSON.stringify({ color: tool.color, finger: tool.finger }));
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
