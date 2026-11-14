<script>
  import { onMount } from 'svelte';
  import { getInk, putInk, data } from './data.svelte.js';
  import { tool, inkState, registerInk } from './ink.svelte.js';
  import { ui } from './ui.svelte.js';

  // 부모 요소 전체에 손글씨를 쓴다. 좌표는 1366×1024 논리 좌표로 저장해 기기·방향이 달라도 칸에 맞는다.
  let { pageKey } = $props();

  const LW = 1366;
  const LH = 1024;
  const BASE_W = 2.2; // 논리 좌표 기준 기본 굵기
  const ERASE_R = 14;
  const MOVE_THRESHOLD = 4; // 이보다 덜 움직이면 쓰기가 아니라 '톡' 누른 것으로 본다

  let canvas;
  let host;
  let strokes = [];
  let loadedKey = '';
  let saveTimer = null;
  let dirty = false;
  let cur = null;
  let suppressClick = false;
  let cw = 0;
  let ch = 0;

  const ctx = () => canvas.getContext('2d');

  // ---- 그리기 ----
  function widthOf(s, pressure) {
    return s.w * (0.5 + pressure) * (cw / LW);
  }
  const px = (p) => [(p[0] / LW) * cw, (p[1] / LH) * ch];

  function drawSegment(c, s, i) {
    const p = s.p;
    c.strokeStyle = s.c;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.lineWidth = widthOf(s, p[i][2]);
    c.beginPath();
    if (i === 0) {
      const [x, y] = px(p[0]);
      c.moveTo(x, y);
      c.lineTo(x + 0.01, y);
    } else {
      const start = i === 1 ? p[0] : [(p[i - 1][0] + p[i - 2][0]) / 2, (p[i - 1][1] + p[i - 2][1]) / 2];
      const ctrl = p[i - 1];
      const end = [(p[i - 1][0] + p[i][0]) / 2, (p[i - 1][1] + p[i][1]) / 2];
      c.moveTo(...px(start));
      c.quadraticCurveTo(...px(ctrl), ...px(end));
    }
    c.stroke();
  }

  function drawTail(c, s) {
    const n = s.p.length;
    if (n < 2) return;
    c.strokeStyle = s.c;
    c.lineCap = 'round';
    c.lineWidth = widthOf(s, s.p[n - 1][2]);
    c.beginPath();
    c.moveTo(...px([(s.p[n - 1][0] + s.p[n - 2][0]) / 2, (s.p[n - 1][1] + s.p[n - 2][1]) / 2]));
    c.lineTo(...px(s.p[n - 1]));
    c.stroke();
  }

  function redraw() {
    if (!canvas) return;
    const c = ctx();
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.save();
    c.scale(canvas.width / cw, canvas.height / ch);
    for (const s of strokes) {
      for (let i = 0; i < s.p.length; i++) drawSegment(c, s, i);
      drawTail(c, s);
    }
    c.restore();
  }

  function resize() {
    const r = host.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cw = r.width;
    ch = r.height;
    canvas.width = Math.max(1, Math.round(cw * dpr));
    canvas.height = Math.max(1, Math.round(ch * dpr));
    redraw();
  }

  // ---- 저장 ----
  function scheduleSave() {
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => flush(loadedKey), 500);
  }
  function flush(key) {
    clearTimeout(saveTimer);
    if (dirty && key) {
      dirty = false;
      putInk(key, strokes);
    }
  }
  function syncUndo() {
    inkState.canUndo = strokes.length > 0;
  }

  function undo() {
    if (!strokes.length) return;
    strokes.pop();
    redraw();
    syncUndo();
    scheduleSave();
  }

  // ---- 입력 ----
  function toLogical(e) {
    const r = host.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * LW, ((e.clientY - r.top) / r.height) * LH];
  }
  const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

  function eraseAt(x, y) {
    const before = strokes.length;
    strokes = strokes.filter((s) => !s.p.some((q) => Math.hypot(q[0] - x, q[1] - y) < ERASE_R));
    if (strokes.length !== before) {
      redraw();
      syncUndo();
      scheduleSave();
    }
  }

  function onDown(e) {
    if (ui.sheet || cur) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const pen = e.pointerType === 'pen';
    const other = e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button === 0);
    if (!pen && !(tool.finger && other)) return;
    // 손가락·마우스로 쓰는 모드에서는 버튼·링크 위에서는 쓰지 않는다
    if (!pen && e.target.closest?.('button, a')) return;
    const [x, y] = toLogical(e);
    cur = {
      id: e.pointerId, cx: e.clientX, cy: e.clientY, started: false,
      stroke: { c: tool.color, w: BASE_W, p: [[round(x, 1), round(y, 1), round(e.pressure || 0.5, 2)]] },
    };
  }

  function addPoint(e) {
    const [x, y] = toLogical(e);
    const pr = e.pressure > 0 ? e.pressure : 0.5;
    if (tool.mode === 'eraser') return eraseAt(x, y);
    const s = cur.stroke;
    s.p.push([round(x, 1), round(y, 1), round(pr, 2)]);
    const c = ctx();
    const dpr = canvas.width / cw;
    c.save();
    c.scale(dpr, dpr);
    drawSegment(c, s, s.p.length - 1);
    c.restore();
  }

  function onMove(e) {
    if (!cur || e.pointerId !== cur.id) return;
    const events = e.getCoalescedEvents?.() ?? [];
    const list = events.length ? events : [e];
    if (!cur.started) {
      if (Math.hypot(e.clientX - cur.cx, e.clientY - cur.cy) < MOVE_THRESHOLD) return;
      cur.started = true;
      try {
        host.setPointerCapture(e.pointerId);
      } catch {
        /* 이미 해제됨 */
      }
    }
    e.preventDefault();
    for (const ev of list) addPoint(ev);
  }

  function onUp(e) {
    if (!cur || e.pointerId !== cur.id) return;
    const { started, stroke } = cur;
    cur = null;
    if (!started) return; // 톡 누름 → 클릭으로 전달
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 350);
    if (tool.mode === 'pen' && stroke.p.length >= 2) {
      strokes.push(stroke);
      drawTail(ctx(), stroke); // 마지막 구간까지 마무리
      syncUndo();
      scheduleSave();
    }
  }

  function onClick(e) {
    if (suppressClick) {
      e.stopPropagation();
      e.preventDefault();
      suppressClick = false;
    }
  }

  async function load(key) {
    const s = await getInk(key);
    if (key !== pageKey) return;
    strokes = s;
    loadedKey = key;
    syncUndo();
    redraw();
  }

  // 페이지가 바뀌거나 서버에서 손글씨가 갱신되면 다시 읽는다
  $effect(() => {
    const key = pageKey;
    void data.inkVersion;
    if (!host) return;
    if (dirty) flush(loadedKey);
    if (cur) return;
    load(key);
  });

  onMount(() => {
    host = canvas.parentElement;
    host.style.touchAction = 'none';
    host.style.userSelect = 'none';
    host.style.webkitUserSelect = 'none';
    host.style.webkitTouchCallout = 'none';
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    host.addEventListener('pointerdown', onDown, true);
    host.addEventListener('pointermove', onMove, true);
    host.addEventListener('pointerup', onUp, true);
    host.addEventListener('pointercancel', onUp, true);
    host.addEventListener('click', onClick, true);
    const unregister = registerInk({ undo });
    load(pageKey);
    return () => {
      flush(loadedKey);
      ro.disconnect();
      host.removeEventListener('pointerdown', onDown, true);
      host.removeEventListener('pointermove', onMove, true);
      host.removeEventListener('pointerup', onUp, true);
      host.removeEventListener('pointercancel', onUp, true);
      host.removeEventListener('click', onClick, true);
      unregister();
      inkState.canUndo = false;
    };
  });
</script>

<canvas bind:this={canvas} aria-label="손글씨 메모" data-page={pageKey}></canvas>

<style>
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; }
</style>
