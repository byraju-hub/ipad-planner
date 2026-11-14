// 손가락으로 좌우로 밀기. 애플 펜슬과 마우스는 제외한다(펜슬은 글씨를 쓰는 데 쓴다).
// 밀기 시작이 가로로 확정되면 화면이 손가락을 따라 움직이고(ondrag), 손을 떼면 넘길지 되돌릴지 정한다(onend).
const LOCK_DISTANCE = 10; // px: 이만큼 움직이면 가로/세로를 정한다
const COMMIT_DISTANCE = 70; // px: 이만큼 밀면 넘어간다
const FLICK_DISTANCE = 28; // px: 빠르게 튕기면 이 정도만 밀어도 넘어간다
const FLICK_SPEED = 0.45; // px/ms
const DIRECTION_RATIO = 1.6; // 가로 이동이 세로 이동보다 이만큼 커야 가로로 본다

export function swipe(node, options) {
  let opts = options;
  let start = null; // { id, x, y, locked, last: {x, t}, v }
  let suppressClick = false;

  const down = (e) => {
    if (e.pointerType !== 'touch') return;
    if (!e.isPrimary) {
      end(false);
      start = null; // 두 손가락(확대 등)은 무시
      return;
    }
    if (!opts.enabled() || e.target.closest?.('input, textarea, select')) return;
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, locked: false, last: { x: e.clientX, t: performance.now() }, v: 0 };
  };

  const move = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!start.locked) {
      if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return;
      if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) {
        start = null; // 세로 움직임: 스크롤이나 다른 동작에 맡긴다
        return;
      }
      start.locked = true;
    }
    // 속도(최근 움직임 기준으로 부드럽게)
    const now = performance.now();
    const dt = now - start.last.t;
    if (dt > 0) start.v = 0.6 * start.v + 0.4 * ((e.clientX - start.last.x) / dt);
    start.last = { x: e.clientX, t: now };
    opts.ondrag?.(dx);
  };

  function end(allowCommit, dx = 0) {
    if (!start?.locked) return;
    const speed = start.v;
    const far = Math.abs(dx) >= COMMIT_DISTANCE;
    const flick = Math.abs(dx) >= FLICK_DISTANCE && Math.abs(speed) >= FLICK_SPEED && Math.sign(speed) === Math.sign(dx);
    // 밀기가 끝난 자리의 버튼이 눌리지 않게 한다
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 350);
    opts.onend?.({ commit: allowCommit && (far || flick), sign: dx < 0 ? -1 : 1 });
  }

  const up = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    end(true, dx);
    start = null;
  };

  const cancel = (e) => {
    if (!start || e.pointerId !== start.id) return;
    end(false);
    start = null;
  };

  const click = (e) => {
    if (!suppressClick) return;
    e.stopPropagation();
    e.preventDefault();
    suppressClick = false;
  };

  node.addEventListener('pointerdown', down, true);
  node.addEventListener('pointermove', move, true);
  node.addEventListener('pointerup', up, true);
  node.addEventListener('pointercancel', cancel, true);
  node.addEventListener('click', click, true);

  return {
    update(next) {
      opts = next;
    },
    destroy() {
      node.removeEventListener('pointerdown', down, true);
      node.removeEventListener('pointermove', move, true);
      node.removeEventListener('pointerup', up, true);
      node.removeEventListener('pointercancel', cancel, true);
      node.removeEventListener('click', click, true);
    },
  };
}
