// 손바닥 무시. 애플 펜슬이 화면에 닿아 쓰는 동안(그리고 직후)에 닿는 손가락 터치는 버린다.
// 판정은 보수적으로 한다: 펜슬이 실제로 닿은 기록이 있을 때만 손바닥으로 본다.
// (접촉 면적 같은 추정은 쓰지 않는다. 아이패드 Safari는 손가락도 크게 보고해 모든 터치를 막을 수 있다)
import { diag } from './diag.svelte.js';

const GRACE = 600; // 펜슬이 떨어진 뒤에도 이 시간(ms) 동안은 손바닥으로 본다
const STALE = 2500; // 펜슬 닿음 기록이 이보다 오래 갱신되지 않으면 놓친 것으로 보고 버린다
const CLICK_WINDOW = 120; // 손바닥을 뗀 직후 이 시간(ms) 안에 오는 클릭만 막는다
const TAP_SLOP = 8; // px. 이보다 덜 움직인 터치는 '톡' 누른 것이므로 스크롤 차단을 하지 않는다(차단하면 클릭이 안 생긴다)

const penDown = new Map(); // pointerId → 마지막 이벤트 시각
const palmIds = new Set();
const touchStart = new Map(); // touch identifier → 시작 좌표
let lastContact = -Infinity;
let lastUp = { at: -Infinity, palm: false };

const now = () => performance.now();

function activePens() {
  const t = now();
  for (const [id, at] of penDown) if (t - at > STALE) penDown.delete(id);
  return penDown.size;
}
export const penNear = () => activePens() > 0 || now() - lastContact < GRACE;

function swallow(e, prevent = true) {
  e.stopImmediatePropagation();
  if (prevent && e.cancelable) e.preventDefault();
  if (diag.on) diag.palm++;
}

function onPointer(e) {
  const end = e.type === 'pointerup' || e.type === 'pointercancel';

  if (e.pointerType === 'pen') {
    // 화면에 닿아 있을 때만 센다(공중에 떠 있는 hover 이동은 제외)
    const contact = e.type === 'pointerdown' || e.buttons > 0 || e.pressure > 0;
    if (e.type === 'pointerdown') {
      penDown.set(e.pointerId, now());
    } else if (end) {
      penDown.delete(e.pointerId);
      lastContact = now();
      lastUp = { at: now(), palm: false };
    } else if (contact && penDown.has(e.pointerId)) {
      penDown.set(e.pointerId, now());
    }
    if (contact) lastContact = now();
    return;
  }
  if (e.pointerType !== 'touch') return;

  if (e.type === 'pointerdown') {
    if (penNear()) {
      palmIds.add(e.pointerId);
      swallow(e, false); // 포인터 이벤트는 앱에만 전달하지 않는다(기본 동작을 막으면 iOS 가 입력 처리를 바꿀 수 있다)
    }
    return;
  }

  // 먼저 닿아 있던 손가락도 펜슬이 쓰는 동안이면 손바닥으로 본다
  if (!palmIds.has(e.pointerId) && activePens() > 0) palmIds.add(e.pointerId);
  if (palmIds.has(e.pointerId)) {
    if (end) {
      palmIds.delete(e.pointerId);
      lastUp = { at: now(), palm: true };
    }
    swallow(e, false);
  } else if (end) {
    lastUp = { at: now(), palm: false };
  }
}

// 손바닥을 뗄 때 생기는 클릭(버튼·칸이 눌리는 것)만 막는다. 직전에 뗀 것이 펜슬이나 손가락이면 통과시킨다
function onClick(e) {
  if (lastUp.palm && now() - lastUp.at < CLICK_WINDOW) swallow(e);
}

// ---- iOS 는 손바닥·손가락의 움직임을 스크롤이나 확대로 처리하면서 진행 중인 펜슬 입력을 취소하기도 한다 ----
// 펜슬이 쓰이는 동안(또는 스타일러스 터치)에는 touchmove 의 기본 동작을 막아 그런 처리를 시작하지 못하게 한다.
// 단, 거의 움직이지 않은 터치(탭)는 막지 않는다: 막으면 iOS 가 클릭을 만들지 않아 버튼이 눌리지 않는다.
// 스크롤이 필요한 곳(창, 넘치는 목록, 입력칸)도 제외한다. 손가락만 쓸 때는 건드리지 않는다.
function onTouchStart(e) {
  for (const t of e.changedTouches) touchStart.set(t.identifier, { x: t.clientX, y: t.clientY });
}
function onTouchEnd(e) {
  for (const t of e.changedTouches) touchStart.delete(t.identifier);
}
function onTouchMove(e) {
  if (!e.cancelable) return;
  const t = e.changedTouches && e.changedTouches[0];
  if (!t) return;
  if (t.touchType !== 'stylus' && !penNear()) return;
  const s = touchStart.get(t.identifier);
  if (s && Math.hypot(t.clientX - s.x, t.clientY - s.y) < TAP_SLOP) return; // 탭
  if (e.target?.closest?.('.sheet, input, textarea, select, ul[style*="pan-y"]')) return;
  e.preventDefault();
}

export function installPalmRejection() {
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    window.addEventListener(type, onPointer, true);
  }
  window.addEventListener('click', onClick, true);
  document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
  document.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
}
