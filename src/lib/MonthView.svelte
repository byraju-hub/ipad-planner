<script>
  import { DOW, parseKey, monthCells, today, MIN_DATE } from './dates.js';
  import { holidayName } from './holidays.js';

  let { key, go } = $props();

  let grid = $derived(monthCells(parseKey(key).y, parseKey(key).m));
  let now = today();

  function tone(cellKey, col) {
    if (holidayName(cellKey) || col === 0) return 'red';
    if (col === 6) return 'blue';
    return '';
  }
</script>

<section class="month">
  <div class="dow">
    {#each DOW as name, col}
      <div class={col === 0 ? 'red' : col === 6 ? 'blue' : ''}>{name}</div>
    {/each}
  </div>
  <div class="cells" style={`grid-template-rows: repeat(${grid.rows}, minmax(0, 1fr))`}>
    {#each grid.cells as cell, i}
      {@const usable = cell.key >= MIN_DATE}
      {@const name = holidayName(cell.key)}
      <button class="cell press" class:outside={!cell.inMonth} class:locked={!usable} disabled={!usable}
        aria-label={`${cell.key}${name ? ' ' + name : ''}`}
        onclick={() => go('week', cell.key)}>
        <span class="head">
          <span class={`num ${tone(cell.key, i % 7)}`} class:today={cell.key === now}>{cell.day}</span>
          {#if name}<span class="holiday">{name}</span>{/if}
        </span>
      </button>
    {/each}
  </div>
</section>

<style>
  .month {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column;
    background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
    overflow: hidden;
  }
  .dow {
    height: 40px; flex: none;
    display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
    align-items: center; border-bottom: 1px solid var(--line);
    font-size: 14px; font-weight: 500; color: var(--text-2);
  }
  .dow > div { padding-left: 14px; }
  .cells {
    flex: 1; min-height: 0;
    display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 1px; background: var(--line);
  }
  .cell {
    min-width: 0; padding: 8px 10px;
    border: 0; border-radius: 0; background: var(--surface);
    text-align: left; display: flex; align-items: flex-start;
  }
  .cell:active { transform: none; background: var(--bg); }
  .cell.outside { background: #fafafc; }
  .cell.outside .num { opacity: 0.45; }
  .cell.locked { cursor: default; }
  .cell.locked .num, .cell.locked .holiday { opacity: 0.3; }
  .head { display: flex; align-items: center; gap: 6px; height: 30px; min-width: 0; }
  .num {
    min-width: 30px; height: 30px; padding: 0 4px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 15px; font-size: 17px; font-weight: 500;
  }
  .num.today { background: var(--text); color: #fff; }
  .holiday { font-size: 12px; color: var(--red); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .red { color: var(--red); }
  .blue { color: var(--blue); }
  .num.today.red, .num.today.blue { color: #fff; }
</style>
