<script>
  import { DOW, weekDays, parseKey, today, MIN_DATE, periodRange } from './dates.js';
  import { holidayName } from './holidays.js';
  import { tone } from './tone.js';
  import { data } from './data.svelte.js';
  import { buildDayMap, occLabel } from './recur.js';
  import { catOf } from './categories.js';
  import { openEvent } from './ui.svelte.js';
  import { scrollable } from './scrollable.js';
  import Icon from './Icon.svelte';
  import InkLayer from './InkLayer.svelte';
  import TodoPanel from './TodoPanel.svelte';

  let { key } = $props();

  let days = $derived(weekDays(key));
  let range = $derived(periodRange('week', key));
  let dayMap = $derived(buildDayMap(data.events, days[0], days[6]));
  let now = today();
  let pageKey = $derived(`week:${days[0]}`);
</script>

<div class="layout">
  <section class="week" data-ink-zone="main" data-ink-fixy>
    {#each days as dayKey, col (dayKey)}
      {@const usable = dayKey >= MIN_DATE}
      {@const name = holidayName(dayKey)}
      <div class="day" class:locked={!usable}>
        <div class="head">
          <span class={`num ${tone(dayKey, col)}`} class:today={dayKey === now}>{parseKey(dayKey).d}</span>
          <span class={`dow ${col === 0 ? 'red' : col === 6 ? 'blue' : ''}`}>{DOW[col]}</span>
          {#if usable}
            <button class="plus press" aria-label={`${dayKey} 일정 추가`} onclick={() => openEvent(null, dayKey)}><Icon name="plus" size={16} /></button>
          {/if}
        </div>
        {#if name}<div class="holiday">{name}</div>{/if}
        <div class="list" use:scrollable>
        {#each dayMap.get(dayKey) || [] as o (o.ev.id + o.day)}
          {@const c = catOf(o.ev.category)}
          <button class="card press" style={`--bg:${c.bg};--fg:${c.fg}`} onclick={() => openEvent(o.ev, o.day)}>
            {#if o.ev.start_time && !o.ev.all_day && o.span === 0}<span class="time">{o.ev.start_time}</span>{/if}
            <span class="title">{o.ev.title}</span>
          </button>
        {/each}
        </div>
      </div>
    {/each}
  </section>

  <div class="bottom">
    <div class="panel todo" data-ink-zone="p1"><TodoPanel title="이번 주 할 일" {range} /></div>
    <div class="panel memo" data-ink-zone="p2"><h2>메모</h2></div>
  </div>

  <InkLayer {pageKey} />
</div>

<style>
  .layout { position: relative; flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 20px; }
  .week {
    flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden;
  }
  .day { background: var(--surface); padding: 12px 10px; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
  .day.locked { background: #fafafc; }
  .day.locked .head, .day.locked .holiday { opacity: 0.35; }
  .head { display: flex; align-items: center; gap: 8px; height: 40px; flex: none; }
  /* 일정이 많으면 이 안에서 스크롤 */
  .list { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; }
  .list::-webkit-scrollbar { display: none; }
  .num { min-width: 40px; height: 40px; padding: 0 6px; display: flex; align-items: center; justify-content: center; border-radius: 20px; font-size: 22px; font-weight: 600; }
  .num.today { background: var(--text); color: #fff; }
  .dow { font-size: 15px; font-weight: 500; color: var(--text-2); }
  .plus { margin-left: auto; width: 44px; height: 44px; margin-right: -8px; border: 0; border-radius: 22px; background: transparent; color: var(--text-3); display: flex; align-items: center; justify-content: center; }
  .holiday { font-size: 13px; color: var(--red); padding-left: 4px; flex: none; }
  .card {
    display: flex; flex-direction: column; gap: 1px; min-height: 48px; padding: 6px 10px; border: 0; border-radius: 10px;
    background: var(--bg); color: var(--fg); text-align: left; flex: none;
  }
  .time { font-size: 12px; font-weight: 500; }
  .title { font-size: 15px; line-height: 20px; font-weight: 500; overflow-wrap: anywhere; }
  .red { color: var(--red); }
  .blue { color: var(--blue); }
  .num.today.red, .num.today.blue { color: #fff; }

  .bottom { height: 250px; flex: none; display: flex; gap: 20px; }
  .panel { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 16px 6px; min-height: 0; display: flex; flex-direction: column; }
  .todo { width: 400px; flex: none; }
  .memo {
    flex: 1; min-width: 0; padding-bottom: 16px;
    background-image: radial-gradient(#d1d1d6 1px, transparent 1px); background-size: 20px 20px; background-position: 10px 10px;
  }
  .memo h2 { margin: 0; font-size: 17px; font-weight: 600; }

  @media (max-width: 1000px) {
    .todo { width: 50%; }
    /* 좁은 세로 화면: 일요일 칸에서 '주일'이 두 줄로 꺾이지 않게 줄인다 */
    .head { gap: 4px; }
    .num { min-width: 30px; height: 36px; padding: 0 4px; font-size: 19px; }
    .dow { font-size: 12px; white-space: nowrap; }
    .plus { width: 32px; }
    .card { padding: 5px 7px; }
    .title { font-size: 14px; }
  }
</style>
