<script>
  import { periodTitle, prevKey, nextKey, canGoPrev, switchKey, today, clampKey } from './dates.js';

  let { view, key, go } = $props();

  const tabs = [
    ['year', '연간'],
    ['month', '월간'],
    ['week', '주간'],
  ];
  const label = { year: '해', month: '달', week: '주' };

  let title = $derived(periodTitle(view, key));
  let prevOk = $derived(canGoPrev(view, key));
</script>

<header>
  <div class="left">
    <h1>
      {title.main}
      {#if title.sub}<span class="sub">{title.sub}</span>{/if}
    </h1>
    <button class="icon press" aria-label={`이전 ${label[view]}`} disabled={!prevOk}
      onclick={() => go(view, prevKey(view, key))}>
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 4 6.5 10l6 6" /></svg>
    </button>
    <button class="icon press" aria-label={`다음 ${label[view]}`}
      onclick={() => go(view, nextKey(view, key))}>
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 4l6 6-6 6" /></svg>
    </button>
    <button class="today press" onclick={() => go(view, clampKey(today()))}>오늘</button>
  </div>

  <nav aria-label="보기 전환">
    {#each tabs as [id, name]}
      <button class="tab press" class:active={view === id} aria-current={view === id ? 'page' : undefined}
        onclick={() => go(id, switchKey(id, key))}>{name}</button>
    {/each}
  </nav>

  <div class="right"></div>
</header>

<style>
  header {
    height: 76px;
    flex: none;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 16px;
  }
  .left { display: flex; align-items: center; gap: 6px; min-width: 0; }
  h1 {
    margin: 0 10px 0 0;
    font-size: 30px;
    font-weight: 700;
    letter-spacing: -0.02em;
    white-space: nowrap;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .sub { font-size: 17px; font-weight: 500; color: var(--text-3); letter-spacing: 0; }

  .icon {
    width: 44px; height: 44px; flex: none;
    border: 0; border-radius: 22px; background: transparent;
    display: flex; align-items: center; justify-content: center;
  }
  .icon svg { width: 20px; height: 20px; }
  .icon:disabled { color: var(--text-3); opacity: 0.4; cursor: default; }

  .today {
    height: 44px; padding: 0 16px; margin-left: 4px;
    border: 1px solid #d1d1d6; border-radius: 22px; background: var(--surface);
    font-size: 15px;
  }

  nav { display: flex; gap: 4px; padding: 4px; background: var(--fill); border-radius: 24px; }
  .tab {
    min-width: 76px; height: 40px; padding: 0 12px;
    border: 0; border-radius: 20px; background: transparent;
    font-size: 15px; color: var(--text-2);
  }
  .tab.active {
    background: var(--surface); color: var(--text); font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  }

  @media (hover: hover) and (pointer: fine) {
    .icon:not(:disabled):hover, .today:hover { background: var(--fill); }
  }
</style>
