<script>
  import { DOW, parseKey, makeKey, monthCells, today, MIN_DATE } from './dates.js';
  import { holidayName } from './holidays.js';

  let { key, go } = $props();

  let year = $derived(parseKey(key).y);
  let months = $derived(
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const first = makeKey(year, m, 1);
      const lastDay = new Date(year, m, 0).getDate();
      const usable = makeKey(year, m, lastDay) >= MIN_DATE;
      return { m, first, usable, cells: monthCells(year, m).cells };
    }),
  );
  let now = today();

  function tone(cellKey, col) {
    if (holidayName(cellKey) || col === 0) return 'red';
    if (col === 6) return 'blue';
    return '';
  }
</script>

<section class="year">
  {#each months as month}
    <div class="month" class:locked={!month.usable}>
      <button class="title press" disabled={!month.usable} onclick={() => go('month', month.first)}>{month.m}월</button>
      <div class="grid">
        {#each DOW as name, col}
          <span class={`dow ${col === 0 ? 'red' : col === 6 ? 'blue' : ''}`}>{name === '주일' ? '일' : name}</span>
        {/each}
        {#each month.cells as cell, i}
          {#if cell.inMonth}
            <button class={`day press ${tone(cell.key, i % 7)}`} class:today={cell.key === now}
              disabled={cell.key < MIN_DATE} aria-label={cell.key}
              onclick={() => go('week', cell.key)}>{cell.day}</button>
          {:else}
            <span></span>
          {/if}
        {/each}
      </div>
    </div>
  {/each}
</section>

<style>
  .year {
    flex: 1; min-width: 0;
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 8px 28px; padding: 18px 24px;
    background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
  }
  .month { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .month.locked { opacity: 0.35; }
  .title {
    align-self: flex-start; height: 36px; padding: 0 8px; margin-left: -8px;
    border: 0; border-radius: 10px; background: transparent;
    font-size: 19px; font-weight: 700;
  }
  .title:disabled { cursor: default; }
  .grid {
    flex: 1; min-height: 0;
    display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-auto-rows: minmax(0, 1fr); justify-items: center; align-items: center;
  }
  .dow { font-size: 12px; color: var(--text-2); }
  .day {
    width: 30px; height: 30px; padding: 0;
    border: 0; border-radius: 15px; background: transparent;
    font-size: 14px;
  }
  .day:disabled { cursor: default; }
  .day.today { background: var(--text); color: #fff !important; font-weight: 600; }
  .red { color: var(--red); }
  .blue { color: var(--blue); }
</style>
