<script>
  import { DOW, weekDays, parseKey, today, MIN_DATE } from './dates.js';
  import { holidayName } from './holidays.js';

  let { key } = $props();

  let days = $derived(weekDays(key));
  let now = today();

  function tone(dayKey, col) {
    if (holidayName(dayKey) || col === 0) return 'red';
    if (col === 6) return 'blue';
    return '';
  }
</script>

<section class="week">
  {#each days as dayKey, col}
    {@const usable = dayKey >= MIN_DATE}
    {@const name = holidayName(dayKey)}
    <div class="day" class:locked={!usable}>
      <div class="head">
        <span class={`num ${tone(dayKey, col)}`} class:today={dayKey === now}>{parseKey(dayKey).d}</span>
        <span class={`dow ${col === 0 ? 'red' : col === 6 ? 'blue' : ''}`}>{DOW[col]}</span>
      </div>
      {#if name}<div class="holiday">{name}</div>{/if}
    </div>
  {/each}
</section>

<style>
  .week {
    flex: 1; min-width: 0;
    display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 1px; background: var(--line);
    border: 1px solid var(--line); border-radius: var(--radius);
    overflow: hidden;
  }
  .day { background: var(--surface); padding: 14px 12px; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .day.locked { background: #fafafc; }
  .day.locked .head, .day.locked .holiday { opacity: 0.35; }
  .head { display: flex; align-items: center; gap: 8px; height: 40px; }
  .num {
    min-width: 40px; height: 40px; padding: 0 6px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 20px; font-size: 22px; font-weight: 600;
  }
  .num.today { background: var(--text); color: #fff; }
  .dow { font-size: 15px; font-weight: 500; color: var(--text-2); }
  .holiday { font-size: 13px; color: var(--red); padding-left: 4px; }
  .red { color: var(--red); }
  .blue { color: var(--blue); }
  .num.today.red, .num.today.blue { color: #fff; }
</style>
