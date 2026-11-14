<script>
  import { onMount } from 'svelte';
  import { getInk, putInk, data } from './data.svelte.js';
  import { tool, inkState, registerInk } from './ink.svelte.js';
  import { ui } from './ui.svelte.js';
  import { diag } from './diag.svelte.js';

  // 부모 요소 전체에 손글씨를 쓴다. 좌표는 1366×1024 논리 좌표로 저장해 기기·방향이 달라도 칸에 맞는다.
  let { pageKey } = $props();

  const LW = 1366;
  const LH = 1024;
  const BASE_W = 2.2; // 논리 좌표 기준 기본 굵기
  const ERASE_R = 14;
  const PEN_THRESHOLD = 1.5; // 펜슬: 이보다 덜 움직이면 '톡' 누른 것(클릭)으로 본다. 작은 글씨도 쓰이도록 작게
  const OTHER_THRESHOLD = 4; // 손가락·마우스
  // 먼지: 글씨 사이에 펜슬이 유리를 살짝 스칠 때 생기는 아주 짧고 약한 접촉은 획으로 남기지 않는다(논리 좌표 기준)
  const DUST_LEN = 5; // 이보다 짧으면 어떤 압력이든 먼지
  const DUST_LIGHT_LEN = 14; // 이보다 짧으면서
  const DUST_LIGHT_PRESSURE = 0.2; // 가장 센 압력도 이보다 약하면 먼지

  let canvas;
  let host;
  let strokes = [];
  let loadedKey = '';
  let saveTimer = null;
  let dirty = false;
  let cur = null;
  let edits = 0; // 이 기기에서 획을 더하거나 지운 횟수(다시 읽기가 쓴 내용을 덮어쓰지 않게 확인용)
  let rect = null;
  let suppressClick = false;
  let lastMoveAt = 0;
  let lastCancelled = null; // 브라우저가 취소해서 끊긴 획의 끝점과 시각(곧바로 이어지는 입력과 이어 붙이는 용도)
  const STITCH_MS = 250;
  let cw = 0;
  let ch = 0;

  const ctx = () => canvas.getContext('2d');

  // 펜슬은 압력 0도 '아주 약함'으로 본다(0.5로 바꾸면 스친 접촉이 보통 압력의 획이 된다)
  const pressureOf = (e) => (e.pressure > 0 ? e.pressure : e.pointerType === 'pen' ? 0.05 : 0.5);

  function isDust(stroke) {
    const p = stroke.p;
    let len = 0;
    let maxP = 0;
    for (let i = 0; i < p.length; i++) {
      if (i) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (p[i][2] > maxP) maxP = p[i][2];
    }
    return len < DUST_LEN || (len < DUST_LIGHT_LEN && maxP < DUST_LIGHT_PRESSURE);
  }

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
    // 쓰는 중인 획도 함께 그린다(다시 그리기가 중간에 끼어들어도 끊기지 않게)
    if (cur?.started && tool.mode === 'pen') {
      for (let i = 0; i < cur.stroke.p.length; i++) drawSegment(c, cur.stroke, i);
    }
    c.restore();
  }

  function resize() {
    const r = host.getBoundingClientRect();
    rect = r;
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
    edits++;
    strokes.pop();
    redraw();
    syncUndo();
    scheduleSave();
  }

  // ---- 입력 ----
  function toLogical(e) {
    const r = rect || host.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * LW, ((e.clientY - r.top) / r.height) * LH];
  }
  const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

  function eraseAt(x, y) {
    const before = strokes.length;
    strokes = strokes.filter((s) => !s.p.some((q) => Math.hypot(q[0] - x, q[1] - y) < ERASE_R));
    if (strokes.length !== before) {
      edits++;
      redraw();
      syncUndo();
      scheduleSave();
    }
  }

  function onDown(e) {
    if (ui.sheet) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const pen = e.pointerType === 'pen';
    const other = e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button === 0);
    if (!pen && !(tool.finger && other)) return;
    // 손가락·마우스로 쓰는 모드에서는 버튼·링크 위에서는 쓰지 않는다
    if (!pen && e.target.closest?.('button, a')) return;
    // 끝나지 않고 남은 입력(놓친 pointerup 등)이 있으면 마무리하고 새로 시작한다
    if (cur) {
      if (!pen) return;
      if (diag.on) diag.stale++;
      finishStroke();
    }
    if (diag.on && pen) {
      diag.down++;
      lastMoveAt = 0;
    }
    rect = host.getBoundingClientRect(); // 쓰기 시작할 때 한 번만 잰다(움직일 때마다 재지 않는다)
    const [x, y] = toLogical(e);
    const first = [round(x, 1), round(y, 1), round(pressureOf(e), 2)];
    const points = [first];
    let drawn = 1;
    let stitched = false;
    // 직전 획이 브라우저의 취소로 끊겼고 바로 이어 쓰는 거라면, 끊긴 끝점에서 이어 붙여 선이 끊겨 보이지 않게 한다
    if (pen && lastCancelled && performance.now() - lastCancelled.at < STITCH_MS && lastCancelled.color === tool.color && tool.mode === 'pen') {
      points.unshift(lastCancelled.pt);
      stitched = true;
      if (diag.on) diag.stitched++;
    }
    lastCancelled = null;
    cur = {
      id: e.pointerId, cx: e.clientX, cy: e.clientY, started: false, threshold: pen ? PEN_THRESHOLD : OTHER_THRESHOLD, drawn,
      stroke: { c: tool.color, w: BASE_W, p: points, stitched },
    };
  }

  // 한 번에 받은 점들을 모아 그린다(점마다 그리기 설정을 바꾸지 않는다)
  function addPoints(list) {
    if (tool.mode === 'eraser') {
      for (const e of list) {
        const [x, y] = toLogical(e);
        eraseAt(x, y);
      }
      return;
    }
    const s = cur.stroke;
    for (const e of list) {
      const [x, y] = toLogical(e);
      s.p.push([round(x, 1), round(y, 1), round(pressureOf(e), 2)]);
    }
    const c = ctx();
    const dpr = canvas.width / cw;
    c.save();
    c.scale(dpr, dpr);
    for (let i = Math.max(cur.drawn, 1); i < s.p.length; i++) drawSegment(c, s, i);
    c.restore();
    cur.drawn = s.p.length;
  }

  function onMove(e) {
    if (!cur || e.pointerId !== cur.id) return;
    const events = e.getCoalescedEvents?.() ?? [];
    const list = events.length ? events : [e];
    if (!cur.started) {
      if (Math.hypot(e.clientX - cur.cx, e.clientY - cur.cy) < cur.threshold) return;
      cur.started = true;
      try {
        host.setPointerCapture(e.pointerId); // 되면 좋고, 안 돼도 창 전체에서 이벤트를 받으므로 괜찮다
      } catch {
        /* 이미 해제됨 */
      }
    }
    e.preventDefault();
    if (diag.on) {
      diag.move++;
      if (events.length > 1) diag.coalesced += events.length - 1;
      const t = performance.now();
      if (lastMoveAt) diag.maxGap = Math.max(diag.maxGap, t - lastMoveAt);
      lastMoveAt = t;
    }
    addPoints(list);
  }

  // 진행 중인 획을 끝낸다. 움직인 입력만 획으로 남기고, 톡 누른 것은 클릭으로 넘긴다
  function finishStroke() {
    if (!cur) return;
    const { started, stroke } = cur;
    cur = null;
    if (!started) return;
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 350);
    if (tool.mode === 'pen' && stroke.p.length >= 2 && isDust(stroke) && !stroke.stitched) {
      if (diag.on) diag.dust++;
      redraw(); // 쓰는 동안 화면에 잠깐 그려진 점을 지운다
      return;
    }
    delete stroke.stitched; // 저장하는 획에는 넣지 않는다
    if (tool.mode === 'pen' && stroke.p.length >= 2) {
      if (diag.on) diag.strokes++;
      edits++;
      strokes.push(stroke);
      drawTail(ctx(), stroke); // 마지막 구간까지 마무리
      syncUndo();
      scheduleSave();
    }
  }

  function onUp(e) {
    if (!cur || e.pointerId !== cur.id) return;
    if (e.type === 'pointercancel' && e.pointerType === 'pen' && cur.started && tool.mode === 'pen') {
      const pts = cur.stroke.p;
      lastCancelled = { at: performance.now(), pt: pts[pts.length - 1], color: cur.stroke.c };
    }
    if (diag.on && e.pointerType === 'pen') {
      if (e.type === 'pointercancel') {
        diag.cancel++;
        diag.lastCancel = (e.target?.className?.baseVal ?? e.target?.className ?? e.target?.tagName ?? '').toString().slice(0, 24);
      } else diag.up++;
    }
    finishStroke();
  }

  function onClick(e) {
    if (suppressClick) {
      e.stopPropagation();
      e.preventDefault();
      suppressClick = false;
    }
  }

  async function load(key) {
    const editsBefore = edits;
    const s = await getInk(key);
    if (key !== pageKey) return;
    if (key === loadedKey) {
      // 같은 페이지를 다시 읽는 경우: 읽는 동안 쓰기가 시작됐거나 획이 바뀌었으면 쓴 내용이 우선이다
      if (cur || edits !== editsBefore) return;
    } else if (edits !== editsBefore || cur) {
      // 페이지를 막 넘긴 직후 바로 쓴 획은 새 페이지의 것이므로 읽은 내용 뒤에 붙인다
      const mine = strokes;
      strokes = s.concat(mine);
      loadedKey = key;
      syncUndo();
      redraw();
      scheduleSave();
      return;
    }
    strokes = s.filter((st) => !(st.p.length <= 4 && isDust(st)));
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
    // 다른 페이지로 넘어갔으면 이전 페이지 획을 비운다(새 페이지에 쓴 획과 섞이지 않게)
    if (loadedKey && loadedKey !== key) {
      strokes = [];
      loadedKey = '';
      syncUndo();
      redraw();
    }
    if (cur) return;
    load(key);
  });

  onMount(() => {
    host = canvas.parentElement;
    host.classList.add('ink-host');
    host.style.touchAction = 'none';
    host.style.userSelect = 'none';
    host.style.webkitUserSelect = 'none';
    host.style.webkitTouchCallout = 'none';
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    host.addEventListener('pointerdown', onDown, true);
    // 이동·끝남은 창 전체에서 받는다: 글씨가 영역 밖으로 나가거나 아래 요소가 바뀌어도 획이 끊기지 않는다
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    host.addEventListener('click', onClick, true);
    const unregister = registerInk({ undo });
    load(pageKey);
    return () => {
      flush(loadedKey);
      ro.disconnect();
      host.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      host.removeEventListener('click', onClick, true);
      unregister();
      host.classList.remove('ink-host');
      inkState.canUndo = false;
    };
  });
</script>

<canvas bind:this={canvas} aria-label="손글씨 메모" data-page={pageKey}></canvas>

<style>
  canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5; }
</style>
