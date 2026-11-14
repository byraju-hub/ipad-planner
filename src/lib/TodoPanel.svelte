<script>
  import { data, newTodo, saveTodo, removeTodo, toggleTodo } from './data.svelte.js';
  import Icon from './Icon.svelte';
  import { parseKey } from './dates.js';

  // range: 이 기간에 기한이 있는 할 일 + 기한 없는 미완료 할 일을 보여준다
  let { title = '할 일', range } = $props();

  let adding = $state('');
  let editId = $state(null);
  let edit = $state(null);

  const items = $derived(
    data.todos
      .filter((t) => (t.due ? t.due >= range.start && t.due <= range.end : !t.done))
      .sort((a, b) => a.done - b.done || (a.due || '9999').localeCompare(b.due || '9999') || a.sort - b.sort),
  );
  const doneCount = $derived(items.filter((t) => t.done).length);

  const dueLabel = (d) => (d ? `${parseKey(d).m}/${parseKey(d).d}` : '');

  async function add(e) {
    e.preventDefault();
    const text = adding.trim();
    if (!text) return;
    await saveTodo({ ...newTodo(), title: text });
    adding = '';
  }

  function startEdit(t) {
    editId = t.id;
    edit = { ...t };
  }
  async function finishEdit() {
    if (edit && edit.title.trim()) await saveTodo({ ...edit, title: edit.title.trim() });
    editId = null;
  }
  async function del() {
    await removeTodo(edit);
    editId = null;
  }
</script>

<section class="panel">
  <header>
    <h2>{title}</h2>
    <span class="count">{items.length ? `${items.length}개 중 ${doneCount}개 완료` : ''}</span>
  </header>
  <ul>
    {#each items as t (t.id)}
      <li>
        {#if editId === t.id}
          <form class="edit" onsubmit={(e) => { e.preventDefault(); finishEdit(); }}>
            <input type="text" aria-label="할 일 제목" bind:value={edit.title} maxlength="200" />
            <div class="line">
              <input type="date" aria-label="기한" bind:value={edit.due} />
              <button type="button" class="link press" onclick={() => (edit.due = null)}>기한 없음</button>
              <button type="button" class="link danger press" onclick={del}>삭제</button>
              <button type="submit" class="link press">완료</button>
            </div>
          </form>
        {:else}
          <button class="box press" class:on={t.done} aria-label={`${t.title} ${t.done ? '완료 취소' : '완료로 표시'}`}
            aria-pressed={!!t.done} onclick={() => toggleTodo(t)}>
            {#if t.done}<Icon name="check" size={14} />{/if}
          </button>
          <button class="text press" class:done={t.done} onclick={() => startEdit(t)}>{t.title}</button>
          {#if t.due}<span class="due">{dueLabel(t.due)}</span>{/if}
        {/if}
      </li>
    {:else}
      <li class="empty">할 일이 없습니다.</li>
    {/each}
  </ul>
  <form class="add" onsubmit={add}>
    <input type="text" aria-label="새 할 일" placeholder="+ 할 일 추가" bind:value={adding} maxlength="200" />
  </form>
</section>

<style>
  .panel { display: flex; flex-direction: column; min-height: 0; }
  header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4px; }
  h2 { margin: 0; font-size: 17px; font-weight: 600; }
  .count { font-size: 13px; color: var(--text-2); }
  ul { list-style: none; margin: 0; padding: 0; flex: 1; min-height: 0; overflow-y: auto; touch-action: pan-y; }
  li { display: flex; align-items: center; gap: 10px; min-height: 46px; border-top: 1px solid #f2f2f7; }
  li.empty { color: var(--text-3); font-size: 14px; }
  .box {
    width: 26px; height: 26px; flex: none; padding: 0; border-radius: 8px; border: 1.5px solid #8e8e93;
    background: var(--surface); color: #fff; display: flex; align-items: center; justify-content: center;
  }
  .box.on { background: var(--text); border-color: var(--text); }
  .text { flex: 1; min-width: 0; min-height: 44px; border: 0; background: transparent; padding: 0; text-align: left; font-size: 15px; line-height: 20px; }
  .text.done { color: var(--text-2); text-decoration: line-through; }
  .due { font-size: 12px; color: var(--text-2); flex: none; }
  .add input, .edit input[type='text'] {
    width: 100%; height: 46px; padding: 0; border: 0; border-top: 1px solid #f2f2f7; background: transparent;
    font: inherit; font-size: 15px; color: var(--text);
  }
  .add input::placeholder { color: var(--blue); opacity: 1; }
  .add input:focus-visible { outline: none; }
  .edit { width: 100%; padding: 6px 0; display: flex; flex-direction: column; gap: 4px; }
  .edit input[type='text'] { border: 1px solid #d1d1d6; border-radius: 10px; padding: 0 10px; }
  .line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .line input[type='date'] { height: 40px; border: 1px solid #d1d1d6; border-radius: 10px; padding: 0 8px; font: inherit; font-size: 14px; }
  .link { min-height: 44px; padding: 0 10px; border: 0; background: transparent; color: var(--blue); font-size: 14px; }
  .link.danger { color: var(--red); margin-left: auto; }
</style>
