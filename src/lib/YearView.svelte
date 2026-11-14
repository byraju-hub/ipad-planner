<script>
  import { DOW, parseKey, makeKey, monthCells, today, MIN_DATE, addDays } from './dates.js';
  import { holidayName } from './holidays.js';
  import { tone } from './tone.js';
  import { data } from './data.svelte.js';
  import { buildDayMap, occLabel } from './recur.js';
  import { catOf } from './categories.js';
  import { openEvent } from './ui.svelte.js';
  import InkLayer from './InkLayer.svelte';
  import { scrollable } from './scrollable.js';

  let { key, go } = $props();

  let year = $derived(parseKey(key).y);
  let dayMap = $derived(buildDayMap(data.events, makeKey(year, 1, 1), makeKey(year, 12, 31)));
  let months = $derived(
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const lastDay = new Date(year, m, 0).getDate();
      return { m, first: makeKey(year, m, 1), usable: makeKey(year, m, lastDay) >= MIN_DATE, cells: monthCells(year, m).cells };
    }),
  );
  let now = today();

  // 올해 일정: 앞으로 남은 일정(오늘 이후, 없으면 연초부터) 최대 8개
  let upcoming = $derived.by(() => {
    const from = now >= makeKey(year, 1, 1) && now <= makeKey(year, 12, 31) ? now : makeKey(year, 1, 1);
    const out = [];
    for (const [day, list] of [...dayMap.entries()].sort()) {
      if (day < from || day < MIN_DATE) continue;
      for (const o of list) if (o.first && o.ev.repeat_rule === 'none') out.push(o);
    }
    return out.slice(0, 8);
  });
  const fmt = (d) => `${parseKey(d).m}.${parseKey(d).d}`;
</script>

<div class="layout">
  <section class="year">
    {#each months as month (month.m)}
      <div class="month" class:locked={!month.usable}>
        <button class="title press" disabled={!month.usable} onclick={() => go('month', month.first)}>{month.m}월</button>
        <div class="grid">
          {#each DOW as name, col}
            <span class={`dow ${col === 0 ? 'red' : col === 6 ? 'blue' : ''}`}>{name === '주일' ? '일' : name}</span>
          {/each}
          {#each month.cells as cell, i (cell.key)}
            {#if cell.inMonth}
              <button class={`day press ${tone(cell.key, i % 7)}`} class:today={cell.key === now}
                class:has={dayMap.has(cell.key)} disabled={cell.key < MIN_DATE} aria-label={cell.key}
                onclick={() => go('week', cell.key)}>{cell.day}</button>
            {:else}
              <span></span>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </section>

  <aside>
    <section class="panel list">
      <h2>올해 일정</h2>
      <ul use:scrollable>
        {#each upcoming as o (o.ev.id + o.day)}
          {@const c = catOf(o.ev.category)}
          <li>
            <button class="row press" onclick={() => openEvent(o.ev, o.day)}>
              <span class="when">{fmt(o.day)}</span>
              <span class="bar" style={`background:${c.fg}`}></span>
              <span class="name">{occLabel(o)}</span>
            </button>
          </li>
        {:else}
          <li class="empty">남은 일정이 없습니다.</li>
        {/each}
      </ul>
    </section>
    <section class="panel memo"><h2>연간 메모</h2><p>펜슬로 화면 어디에나 쓸 수 있습니다.</p></section>
  </aside>

  <InkLayer pageKey={`year:${year}`} />
</div>

<style>
  .layout { position: relative; flex: 1; min-width: 0; display: flex; gap: 20px; }
  .year {
    flex: 1; min-width: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 8px 28px; padding: 18px 24px; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
  }
  .month { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .month.locked { opacity: 0.35; }
  .title { align-self: flex-start; height: 36px; padding: 0 8px; margin-left: -8px; border: 0; border-radius: 10px; background: transparent; font-size: 19px; font-weight: 700; }
  .title:disabled { cursor: default; }
  .grid { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); justify-items: center; align-items: center; }
  .dow { font-size: 12px; color: var(--text-2); }
  .day { position: relative; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 15px; background: transparent; font-size: 14px; }
  .day:disabled { cursor: default; }
  .day.has::after { content: ''; position: absolute; left: 50%; top: 1px; width: 4px; height: 4px; margin-left: -2px; border-radius: 2px; background: var(--text-3); }
  .day.today { background: var(--text); color: #fff !important; font-weight: 600; }
  .day.today.has::after { background: #fff; }
  .red { color: var(--red); }
  .blue { color: var(--blue); }

  aside { width: 288px; flex: none; display: flex; flex-direction: column; gap: 20px; min-height: 0; }
  .panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 16px 8px; min-height: 0; }
  .list { flex: 1; display: flex; flex-direction: column; }
  h2 { margin: 0 0 4px; font-size: 17px; font-weight: 600; }
  ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; }
  li { border-top: 1px solid #f2f2f7; }
  li.empty { min-height: 46px; display: flex; align-items: center; color: var(--text-3); font-size: 14px; }
  .row { width: 100%; min-height: 46px; padding: 0; border: 0; background: transparent; display: flex; align-items: center; gap: 10px; text-align: left; }
  .when { width: 44px; flex: none; font-size: 14px; color: var(--text-2); }
  .bar { width: 3px; height: 20px; border-radius: 2px; flex: none; }
  .name { font-size: 15px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .memo {
    height: 220px; flex: none; padding-bottom: 16px;
    background-image: radial-gradient(#d1d1d6 1px, transparent 1px); background-size: 20px 20px; background-position: 10px 10px;
  }
  .memo p { margin: 6px 0 0; font-size: 13px; color: var(--text-3); }

  @media (max-width: 1000px) {
    .layout { flex-direction: column; }
    aside { width: auto; flex-direction: row; height: 240px; }
    .panel { flex: 1; }
    .memo { height: auto; }
  }
</style>
