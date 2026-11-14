// 손가락으로 좌우로 밀기. 애플 펜슬과 마우스는 제외한다(펜슬은 글씨를 쓰는 데 쓴다).
const MIN_DISTANCE = 70; // px
const MAX_DURATION = 700; // ms
const DIRECTION_RATIO = 1.6; // 가로 이동이 세로 이동보다 이만큼 커야 한다

export function swipe(node, options) {
  let opts = options;
  let start = null;
  let suppressClick = false;

  const down = (e) => {
    if (e.pointerType !== 'touch') return;
    if (!e.isPrimary) {
      start = null; // 두 손가락(확대 등)은 무시
      return;
    }
    if (!opts.enabled() || e.target.closest?.('input, textarea, select')) return;
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
  };

  const up = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dt = performance.now() - start.t;
    start = null;
    if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO || dt > MAX_DURATION) return;
    // 밀기가 끝난 자리의 버튼이 눌리지 않게 한다
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 350);
    if (dx < 0) opts.onnext();
    else opts.onprev();
  };

  const cancel = () => {
    start = null;
  };

  const click = (e) => {
    if (!suppressClick) return;
    e.stopPropagation();
    e.preventDefault();
    suppressClick = false;
  };

  node.addEventListener('pointerdown', down, true);
  node.addEventListener('pointerup', up, true);
  node.addEventListener('pointercancel', cancel, true);
  node.addEventListener('click', click, true);

  return {
    update(next) {
      opts = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', down, true);
      node.removeEventListener('pointerup', up, true);
      node.removeEventListener('pointercancel', cancel, true);
      node.removeEventListener('click', click, true);
    },
  };
}
