// 목록 스크롤. 화면 전체가 touch-action: none 이라(펜슬로 쓸 때 브라우저가 스크롤로 가로채지 않게)
// 아이패드 Safari 는 목록 안에서도 손가락 스크롤을 막는다. 그래서 손가락으로 위아래로 끄는 것을 직접 스크롤로 바꿔 준다.
// 애플 펜슬과 마우스는 건드리지 않는다. 손가락으로 쓰기 모드에서는 글씨가 우선이다.
import { tool } from './ink.svelte.js';

const SLOP = 6; // px: 이만큼 움직이면 끌기로 본다
const FRICTION = 0.0035; // 관성: 클수록 빨리 멈춘다

export function scrollable(node) {
  let drag = null; // { id, y, top, moved, last: {y, t}, v }
  let raf = 0;
  let suppressClick = false;

  node.style.touchAction = 'none';

  const stopInertia = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const canScroll = () => node.scrollHeight > node.clientHeight + 1;

  const down = (e) => {
    if (e.pointerType !== 'touch' || !e.isPrimary || tool.finger) return;
    if (e.target.closest?.('input, textarea, select')) return;
    stopInertia();
    drag = { id: e.pointerId, y: e.clientY, x: e.clientX, top: node.scrollTop, moved: false, last: { y: e.clientY, t: performance.now() }, v: 0 };
  };

  const move = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dy) < SLOP && Math.abs(dx) < SLOP) return;
      if (Math.abs(dx) > Math.abs(dy) || !canScroll()) {
        drag = null; // 가로로 밀기(이전·다음 기간)나 넘치지 않는 목록은 그대로 둔다
        return;
      }
      drag.moved = true;
    }
    node.scrollTop = drag.top - dy;
    const now = performance.now();
    const dt = now - drag.last.t;
    if (dt > 0) drag.v = 0.6 * drag.v + 0.4 * ((e.clientY - drag.last.y) / dt);
    drag.last = { y: e.clientY, t: now };
  };

  const up = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    // 끌고 난 자리의 항목이 눌리지 않게 한다
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 350);
    // 관성
    let v = -d.v; // px/ms, 스크롤 방향
    if (Math.abs(v) < 0.1 || performance.now() - d.last.t > 80) return;
    let prev = performance.now();
    const step = (now) => {
      const dt = now - prev;
      prev = now;
      const before = node.scrollTop;
      node.scrollTop = before + v * dt;
      v *= Math.exp(-FRICTION * dt);
      if (Math.abs(v) < 0.02 || node.scrollTop === before) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };

  const cancel = (e) => {
    if (drag && e.pointerId === drag.id) drag = null;
  };

  const click = (e) => {
    if (!suppressClick) return;
    e.stopPropagation();
    e.preventDefault();
    suppressClick = false;
  };

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('click', click, true);

  return {
    destroy() {
      stopInertia();
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', cancel);
      node.removeEventListener('click', click, true);
    },
  };
}
