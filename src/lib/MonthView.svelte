<script>
  import { DOW, parseKey, monthCells, today, MIN_DATE, periodRange } from './dates.js';
  import { holidayName } from './holidays.js';
  import { tone } from './tone.js';
  import { data } from './data.svelte.js';
  import { buildDayMap, occLabel } from './recur.js';
  import { catOf } from './categories.js';
  import { openEvent } from './ui.svelte.js';
  import InkLayer from './InkLayer.svelte';
  import TodoPanel from './TodoPanel.svelte';
  import OpinionPanel from './OpinionPanel.svelte';

  let { key, go } = $props();

  let ym = $derived(parseKey(key));
  let grid = $derived(monthCells(ym.y, ym.m));
  let range = $derived(periodRange('month', key));
  let dayMap = $derived(buildDayMap(data.events, grid.cells[0].key, grid.cells.at(-1).key));
  const MAX_CHIPS = 3; // 한 칸에는 3개까지만 보이고 나머지는 '+ 외 N개'
  let now = today();
  let pageKey = $derived(`month:${ym.y}-${String(ym.m).padStart(2, '0')}`);
</script>

<div class="layout">
  <section class="month">
    <div class="dow">
      {#each DOW as name, col}
        <div class={col === 0 ? 'red' : col === 6 ? 'blue' : ''}>{name}</div>
      {/each}
    </div>
    <div class="cells" style={`grid-template-rows: repeat(${grid.rows}, minmax(0, 1fr))`}>
      {#each grid.cells as cell, i (cell.key)}
        {@const usable = cell.key >= MIN_DATE}
        {@const name = holidayName(cell.key)}
        {@const occs = dayMap.get(cell.key) || []}
        <div class="cell" class:outside={!cell.inMonth} class:locked={!usable}>
          <button class="hit press" disabled={!usable} aria-label={`${cell.key}${name ? ' ' + name : ''} 주간 보기`}
            onclick={() => go('week', cell.key)}></button>
          <div class="head">
            <span class={`num ${tone(cell.key, i % 7)}`} class:today={cell.key === now}>{cell.day}</span>
            {#if name}<span class="holiday">{name}</span>{/if}
          </div>
          <div class="chips">
            {#each occs.slice(0, MAX_CHIPS) as o (o.ev.id + o.day)}
              {@const c = catOf(o.ev.category)}
              <button class="chip" style={`--bg:${c.bg};--fg:${c.fg}`} onclick={() => openEvent(o.ev, o.day)}>{occLabel(o)}</button>
            {/each}
            {#if occs.length > MAX_CHIPS}
              <button class="more" onclick={() => go('week', cell.key)}>+ 외 {occs.length - MAX_CHIPS}개</button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <aside>
    <div class="panel todo"><TodoPanel title="할 일" {range} /></div>
    <div class="panel opinion"><OpinionPanel title="메모" {range} /></div>
  </aside>

  <InkLayer {pageKey} />
</div>

<style>
  .layout { position: relative; flex: 1; min-width: 0; display: flex; gap: 20px; }
  .month {
    flex: 1; min-width: 0; display: flex; flex-direction: column;
    background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden;
  }
  .dow {
    height: 40px; flex: none; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
    align-items: center; border-bottom: 1px solid var(--line); font-size: 14px; font-weight: 500; color: var(--text-2);
  }
  .dow > div { padding-left: 14px; }
  .cells { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 1px; background: var(--line); }
  .cell { position: relative; min-width: 0; min-height: 0; padding: 8px 8px 4px; background: var(--surface); display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
  .cell.outside { background: #fafafc; }
  .cell.outside .num { opacity: 0.45; }
  .cell.locked .head, .cell.locked .chips { opacity: 0.3; }
  .hit { position: absolute; inset: 0; border: 0; border-radius: 0; background: transparent; padding: 0; }
  .hit:active { transform: none; background: var(--bg); }
  .hit:disabled { cursor: default; }
  .head { position: relative; display: flex; align-items: center; gap: 6px; height: 30px; min-width: 0; pointer-events: none; padding-left: 2px; }
  .num { min-width: 30px; height: 30px; padding: 0 4px; display: flex; align-items: center; justify-content: center; border-radius: 15px; font-size: 17px; font-weight: 500; }
  .num.today { background: var(--text); color: #fff; }
  .holiday { font-size: 12px; color: var(--red); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chips { position: relative; display: flex; flex-direction: column; gap: 3px; min-height: 0; }
  .chip {
    width: 100%; min-height: 24px; padding: 2px 7px; border: 0; border-radius: 7px; background: var(--bg); color: var(--fg);
    font-size: 13px; line-height: 20px; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .more { align-self: flex-start; min-height: 22px; padding: 0 4px; border: 0; background: transparent; font-size: 12px; color: var(--text-2); }
  .red { color: var(--red); }
  .blue { color: var(--blue); }
  .num.today.red, .num.today.blue { color: #fff; }

  aside { width: 288px; flex: none; display: flex; flex-direction: column; gap: 20px; min-height: 0; }
  .panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 16px 6px; min-height: 0; display: flex; flex-direction: column; }
  .todo { flex: 0 1 46%; }
  .opinion { flex: 1; }

  @media (max-width: 1000px) {
    .layout { flex-direction: column; }
    aside { width: auto; flex-direction: row; height: 300px; }
    .panel { flex: 1; }
  }
</style>
