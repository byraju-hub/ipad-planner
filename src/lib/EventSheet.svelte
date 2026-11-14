<script>
  import Sheet from './Sheet.svelte';
  import PickerField from './PickerField.svelte';
  import TimeField from './TimeField.svelte';
  import { endAfter } from './time.js';
  import { CATEGORIES, REPEATS, ALARMS } from './categories.js';
  import { saveEvent, removeEvent, newEvent } from './data.svelte.js';
  import { closeSheet } from './ui.svelte.js';
  import { MIN_DATE } from './dates.js';

  let { ev, date } = $props();

  // 창이 열릴 때의 값만 복사해 쓴다(App에서 {#key}로 새로 열린다)
  // svelte-ignore state_referenced_locally
  const editing = !!ev;
  // svelte-ignore state_referenced_locally
  let f = $state(ev ? { ...ev } : newEvent(date));
  let error = $state('');
  let confirmDelete = $state(false);

  // 시작 시간을 고르면 종료 시간은 2시간 뒤로 맞춘다(종료는 따로 고쳐도 된다)
  function autoEnd(start) {
    f.end_time = endAfter(start);
  }

  async function save() {
    const e = { ...f, title: f.title.trim() };
    if (!e.title) return (error = '제목을 입력하세요.');
    if (!e.start_date || e.start_date < MIN_DATE) return (error = '날짜를 확인하세요.');
    if (e.all_day) {
      e.start_time = null;
      e.end_time = null;
      if (!e.end_date || e.end_date < e.start_date) e.end_date = e.start_date;
    } else {
      e.end_date = e.start_date;
      if (!e.start_time) return (error = '시작 시간을 입력하세요.');
      if (e.end_time && e.end_time <= e.start_time) return (error = '종료 시간은 시작 시간보다 늦어야 합니다.');
      if (!e.end_time) e.end_time = null;
    }
    await saveEvent(e);
    closeSheet();
  }

  async function remove() {
    if (!confirmDelete) return (confirmDelete = true);
    await removeEvent(f);
    closeSheet();
  }
</script>

<Sheet title={editing ? '일정 수정' : '일정 등록'} onclose={closeSheet}>
  <form onsubmit={(e) => { e.preventDefault(); save(); }}>
    <div class="field">
      <label for="ev-title">제목</label>
      <input id="ev-title" type="text" bind:value={f.title} maxlength="200" autocomplete="off" />
    </div>

    <div class="row">
      <div class="field grow">
        <label for="ev-date">날짜</label>
        <PickerField id="ev-date" type="date" min={MIN_DATE} bind:value={f.start_date} />
      </div>
      <label class="check">
        <input type="checkbox" checked={!!f.all_day} onchange={(e) => (f.all_day = e.currentTarget.checked ? 1 : 0)} />
        <span>종일</span>
      </label>
    </div>

    {#if f.all_day}
      <div class="field">
        <label for="ev-end-date">종료일 (며칠짜리 일정이면)</label>
        <PickerField id="ev-end-date" type="date" min={f.start_date} bind:value={f.end_date} />
      </div>
    {:else}
      <div class="row">
        <div class="field grow">
          <label for="ev-start">시작</label>
          <TimeField id="ev-start" ariaLabel="시작 시간" bind:value={f.start_time} onpick={autoEnd} />
        </div>
        <div class="field grow">
          <label for="ev-end">종료</label>
          <TimeField id="ev-end" ariaLabel="종료 시간" clearable placeholder="없음" bind:value={f.end_time} />
        </div>
      </div>
    {/if}

    <div class="field">
      <span class="label" id="ev-cat">분류</span>
      <div class="chips" role="group" aria-labelledby="ev-cat">
        {#each CATEGORIES as c}
          <button type="button" class="chip press" aria-pressed={f.category === c.id}
            style={`--bg:${c.bg};--fg:${c.fg}`} onclick={() => (f.category = c.id)}>{c.label}</button>
        {/each}
      </div>
    </div>

    <div class="field">
      <span class="label" id="ev-rep">반복</span>
      <div class="seg" role="group" aria-labelledby="ev-rep">
        {#each REPEATS as [id, name]}
          <button type="button" class="press" aria-pressed={f.repeat_rule === id} onclick={() => (f.repeat_rule = id)}>{name}</button>
        {/each}
      </div>
      {#if editing && f.repeat_rule !== 'none'}<p class="note">반복 일정은 수정과 삭제가 모든 날짜에 적용됩니다.</p>{/if}
    </div>

    <div class="field">
      <span class="label" id="ev-alarm">알림</span>
      <div class="chips" role="group" aria-labelledby="ev-alarm">
        {#each ALARMS as [id, name]}
          <button type="button" class="chip plain press" aria-pressed={f.alarm === id} onclick={() => (f.alarm = id)}>{name}</button>
        {/each}
      </div>
      {#if f.alarm !== 'none'}<p class="note">알림은 iPad 캘린더에서 이 플래너를 구독하면 울립니다. 설정에서 구독 주소를 확인하세요.</p>{/if}
    </div>

    <div class="field">
      <label for="ev-memo">메모</label>
      <textarea id="ev-memo" rows="3" bind:value={f.memo} maxlength="5000" placeholder="장소, 준비물 등"></textarea>
    </div>

    {#if error}<p class="error" role="alert">{error}</p>{/if}

    <div class="actions">
      {#if editing}
        <button type="button" class="danger press" onclick={remove}>{confirmDelete ? '한 번 더 누르면 삭제' : '삭제'}</button>
      {/if}
      <button type="button" class="ghost press" onclick={closeSheet}>취소</button>
      <button type="submit" class="primary press">저장</button>
    </div>
  </form>
</Sheet>

<style>
  form { display: flex; flex-direction: column; gap: 16px; }
  .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .row { display: flex; gap: 12px; align-items: flex-end; min-width: 0; }
  .row > * { min-width: 0; }
  .grow { flex: 1 1 0; min-width: 0; }
  label, .label { font-size: 13px; font-weight: 500; color: var(--text-2); }
  input[type='text'], textarea {
    width: 100%; min-width: 0; height: 48px; padding: 0 14px; border: 1px solid #d1d1d6; border-radius: 12px;
    font: inherit; font-size: 17px; color: var(--text); background: var(--surface);
  }
  textarea { height: auto; padding: 12px 14px; line-height: 24px; resize: none; }
  input:focus-visible, textarea:focus-visible { outline: 2px solid var(--blue); outline-offset: -1px; border-color: transparent; }
  .check { display: flex; flex: none; align-items: center; gap: 8px; height: 48px; font-size: 16px; color: var(--text); font-weight: 400; white-space: nowrap; }
  .check input { width: 22px; height: 22px; margin: 0; flex: none; accent-color: var(--text); }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip {
    height: 44px; padding: 0 16px; border: 1.5px solid transparent; border-radius: 22px;
    background: var(--bg); color: var(--fg); font-size: 15px;
  }
  .chip[aria-pressed='true'] { border-color: var(--fg); font-weight: 600; }
  .chip.plain { background: var(--surface); border: 1px solid #d1d1d6; color: var(--text); }
  .chip.plain[aria-pressed='true'] { background: var(--fill); border-color: var(--text); }
  .seg { display: flex; gap: 4px; padding: 4px; background: var(--fill); border-radius: 14px; }
  .seg button { flex: 1; height: 40px; border: 0; border-radius: 10px; background: transparent; color: var(--text-2); font-size: 15px; }
  .seg button[aria-pressed='true'] { background: var(--surface); color: var(--text); font-weight: 600; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
  .note { margin: 0; font-size: 13px; color: var(--text-2); }
  .error { margin: 0; font-size: 14px; color: var(--red); }
  .actions { display: flex; gap: 10px; margin-top: 4px; }
  .actions button { height: 50px; border-radius: 14px; font-size: 16px; }
  .primary { flex: 2; border: 0; background: var(--text); color: #fff; font-weight: 600; }
  .ghost { flex: 1; border: 1px solid #d1d1d6; background: var(--surface); }
  .danger { flex: 1.4; border: 0; background: #fff1f0; color: var(--red); font-weight: 500; }
</style>
