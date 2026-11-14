// 손바닥 무시. 애플 펜슬로 쓰는 동안(그리고 직후)에 닿는 손가락 터치는 모두 버린다.
// 손바닥이 닿아 일정이 열리거나, 화면이 넘어가거나, 글씨가 끊기는 것을 막는다.
const GRACE = 800; // 펜슬이 떨어진 뒤에도 이 시간(ms) 동안은 손바닥으로 본다
const CLICK_BLOCK = 500;

const penDown = new Set();
const palmIds = new Set();
let lastPen = -Infinity;
let blockClickUntil = -Infinity;
let lastDownType = '';

const now = () => performance.now();
export const penNear = () => penDown.size > 0 || now() - lastPen < GRACE;

function swallow(e) {
  e.stopImmediatePropagation();
  if (e.cancelable) e.preventDefault();
}

function markPalm(e) {
  palmIds.add(e.pointerId);
  swallow(e);
}

function onPointer(e) {
  const end = e.type === 'pointerup' || e.type === 'pointercancel';

  if (e.pointerType === 'pen') {
    lastPen = now();
    if (e.type === 'pointerdown') penDown.add(e.pointerId);
    if (end) penDown.delete(e.pointerId);
    if (e.type === 'pointerdown') lastDownType = 'pen';
    return;
  }
  if (e.pointerType !== 'touch') {
    if (e.type === 'pointerdown') lastDownType = e.pointerType;
    return;
  }

  if (e.type === 'pointerdown') {
    lastDownType = 'touch';
    // 펜슬이 가까이 있거나, 접촉 면적이 큰 터치(손바닥)
    if (penNear() || e.width > 48 || e.height > 48) markPalm(e);
    return;
  }

  // 먼저 닿아 있던 손가락도 펜슬이 쓰기 시작하면 손바닥으로 본다
  if (!palmIds.has(e.pointerId) && (penDown.size > 0 || (e.type === 'pointerup' && penNear()))) {
    palmIds.add(e.pointerId);
  }
  if (palmIds.has(e.pointerId)) {
    if (end) {
      palmIds.delete(e.pointerId);
      blockClickUntil = now() + CLICK_BLOCK;
    }
    swallow(e);
  }
}

// 손바닥을 뗄 때 생기는 클릭(버튼·칸이 눌리는 것)을 막는다. 펜슬로 톡 누른 클릭은 통과시킨다
function onClick(e) {
  if (now() < blockClickUntil && lastDownType !== 'pen' && e.pointerType !== 'pen') {
    swallow(e);
  }
}

export function installPalmRejection() {
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    window.addEventListener(type, onPointer, true);
  }
  window.addEventListener('click', onClick, true);
}
