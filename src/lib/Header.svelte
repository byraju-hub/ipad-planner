<script>
  import { periodTitle, prevKey, nextKey, canGoPrev, switchKey, today, clampKey } from './dates.js';
  import { tool, setTool, COLORS, WIDTHS, WIDTH_NAMES, inkState, undoInk } from './ink.svelte.js';
  import { openEvent, openSettings, defaultDate } from './ui.svelte.js';
  import { sync } from './sync.svelte.js';
  import { auth } from './auth.svelte.js';
  import Icon from './Icon.svelte';

  let { view, key, go } = $props();

  const tabs = [
    ['year', 'Yearly', '연간'],
    ['month', 'Monthly', '월간'],
    ['week', 'Weekly', '주간'],
  ];
  const label = { year: '해', month: '달', week: '주' };
  const widthIdx = $derived(WIDTHS.indexOf(tool.width));
  const nextWidth = () => setTool({ mode: 'pen', width: WIDTHS[(widthIdx + 1) % WIDTHS.length] });
  const colorName = { '#1d1d1f': '검정', '#1f3fa6': '파랑', '#d70015': '빨강' };

  let title = $derived(periodTitle(view, key));
  let prevOk = $derived(canGoPrev(view, key));
  let syncLabel = $derived(
    auth.status === 'local' ? '개발 모드'
    : sync.status === 'syncing' ? '동기화 중'
    : sync.status === 'offline' ? '오프라인'
    : sync.status === 'error' ? '동기화 오류'
    : '동기화됨',
  );
  let syncTone = $derived(sync.status === 'error' ? 'bad' : sync.status === 'offline' || sync.status === 'syncing' ? 'warn' : 'ok');
</script>

<header>
  <div class="left">
    <h1>
      {title.main}
      {#if title.sub}<span class="sub">{title.sub}</span>{/if}
    </h1>
    <button class="icon press" aria-label={`이전 ${label[view]}`} disabled={!prevOk}
      onclick={() => go(view, prevKey(view, key))}><Icon name="left" size={20} /></button>
    <button class="icon press" aria-label={`다음 ${label[view]}`}
      onclick={() => go(view, nextKey(view, key))}><Icon name="right" size={20} /></button>
    <button class="today press" onclick={() => go(view, clampKey(today()))} aria-label="오늘">Today</button>
  </div>

  <nav aria-label="보기 전환">
    {#each tabs as [id, name, ko]}
      <button class="tab press" class:active={view === id} aria-label={ko} aria-current={view === id ? 'page' : undefined}
        onclick={() => go(id, switchKey(id, key))}>{name}</button>
    {/each}
  </nav>

  <div class="right">
    <div class="tools" role="group" aria-label="손글씨 도구">
      {#each COLORS as c}
        <button class="dot" aria-label={`${colorName[c]} 펜`} aria-pressed={tool.mode === 'pen' && tool.color === c}
          onclick={() => setTool({ mode: 'pen', color: c })}>
          <span style={`background:${c}`}></span>
        </button>
      {/each}
      <button class="icon press" aria-label={`펜 두께: ${WIDTH_NAMES[widthIdx]} (누르면 바뀜)`} title={`펜 두께: ${WIDTH_NAMES[widthIdx]}`} onclick={nextWidth}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-linecap="round">
          <path d="M4 16 L18 6" stroke-width={[1.6, 3, 5][widthIdx]} />
        </svg>
      </button>
      <button class="icon press" class:on={tool.mode === 'eraser'} aria-label="지우개" aria-pressed={tool.mode === 'eraser'}
        onclick={() => setTool({ mode: tool.mode === 'eraser' ? 'pen' : 'eraser' })}><Icon name="eraser" /></button>
      <button class="icon press" aria-label="되돌리기" disabled={!inkState.canUndo} onclick={undoInk}><Icon name="undo" /></button>
      <button class="icon press" class:on={tool.finger} aria-label="손가락으로도 쓰기" aria-pressed={tool.finger}
        title="손가락·마우스로도 쓰기 (애플 펜슬은 항상 쓰기)" onclick={() => setTool({ finger: !tool.finger })}><Icon name="touch" /></button>
    </div>
    <button class="sync" aria-label={syncLabel} title={syncLabel} onclick={openSettings}><span class={syncTone}></span></button>
    <button class="add press" aria-label="일정 추가" onclick={() => openEvent(null, defaultDate(view, key))}><Icon name="plus" size={18} /></button>
    <button class="icon press" aria-label="설정" onclick={openSettings}><Icon name="gear" /></button>
  </div>
</header>

<style>
  header {
    flex: none; min-height: 76px;
    display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px 16px;
  }
  .left { display: flex; align-items: center; gap: 6px; min-width: 0; }
  h1 {
    margin: 0 10px 0 0; font-size: 30px; font-weight: 700; letter-spacing: -0.02em;
    white-space: nowrap; display: flex; align-items: baseline; gap: 10px;
  }
  .sub { font-size: 17px; font-weight: 500; color: var(--text-3); letter-spacing: 0; }

  .icon {
    width: 44px; height: 44px; flex: none; border: 0; border-radius: 22px; background: transparent;
    display: flex; align-items: center; justify-content: center;
  }
  .icon:disabled { color: var(--text-3); opacity: 0.4; cursor: default; }
  .icon.on { background: var(--fill); }

  .today {
    height: 44px; padding: 0 16px; margin-left: 4px; border: 1px solid #d1d1d6;
    border-radius: 22px; background: var(--surface); font-size: 13px; letter-spacing: 0.01em; flex: none; white-space: nowrap;
  }

  nav { display: flex; gap: 4px; padding: 4px; background: var(--fill); border-radius: 24px; }
  .tab { min-width: 76px; height: 40px; padding: 0 12px; border: 0; border-radius: 20px; background: transparent; font-size: 13px; letter-spacing: 0.01em; color: var(--text-2); }
  .tab.active { background: var(--surface); color: var(--text); font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }

  .right { display: flex; align-items: center; justify-content: flex-end; gap: 2px; min-width: 0; }
  .tools { display: flex; align-items: center; gap: 0; }
  .dot { width: 40px; height: 44px; border: 0; background: transparent; padding: 0; display: flex; align-items: center; justify-content: center; }
  .dot span { width: 20px; height: 20px; border-radius: 10px; display: block; transition: box-shadow 160ms var(--ease-out); }
  .dot[aria-pressed='true'] span { box-shadow: 0 0 0 3px var(--bg), 0 0 0 5px currentColor; }
  .dot:nth-child(1) { color: #1d1d1f; }
  .dot:nth-child(2) { color: #1f3fa6; }
  .dot:nth-child(3) { color: #d70015; }

  .sync { width: 28px; height: 44px; border: 0; background: transparent; padding: 0; display: flex; align-items: center; justify-content: center; }
  .sync span { width: 9px; height: 9px; border-radius: 5px; background: #34c759; }
  .sync .warn { background: #ff9f0a; }
  .sync .bad { background: var(--red); }

  .add {
    width: 44px; height: 44px; padding: 0; margin: 0 4px 0 6px; border: 0; border-radius: 22px;
    background: var(--text); color: #fff;
    display: flex; align-items: center; justify-content: center; flex: none; white-space: nowrap;
  }

  @media (hover: hover) and (pointer: fine) {
    .icon:not(:disabled):hover, .today:hover { background: var(--fill); }
  }

  /* 세로 화면 등 좁은 폭: 보기 전환을 두 번째 줄로 */
  @media (max-width: 1100px) {
    header { grid-template-columns: 1fr auto; padding-bottom: 8px; }
    nav { grid-column: 1 / -1; grid-row: 2; justify-self: center; }
  }

  /* 11인치 가로 화면(약 1180px) 등: 날짜가 두 자리가 되어도 '오늘'이 줄바꿈되지 않도록 글자·여백을 줄인다 */
  @media (max-width: 1280px) {
    header { gap: 8px 10px; }
    h1 { font-size: 22px; margin-right: 2px; gap: 6px; }
    .sub { font-size: 13px; }
    .left { gap: 2px; }
    .icon { width: 38px; }
    .today { padding: 0 12px; margin-left: 2px; font-size: 13px; }
    .tab { min-width: 64px; }
    .add { margin: 0 2px 0 4px; }
    .dot { width: 34px; }
  }
</style>
