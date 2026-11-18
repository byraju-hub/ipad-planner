<script>
  import { data, newOpinion, saveOpinion, removeOpinion } from './data.svelte.js';
  import { OPINION_STATUS, statusOf } from './categories.js';
  import { parseKey } from './dates.js';
  import { scrollable } from './scrollable.js';
  import PickerField from './PickerField.svelte';

  // 처리 전(새 메모·검토 중)이거나 이 기간에 들은 메모를 보여준다
  let { title = '메모', range } = $props();

  let adding = $state(false);
  let draft = $state({ content: '', source: '' });
  let editId = $state(null);
  let edit = $state(null);

  const items = $derived(
    data.opinions.filter(
      (o) => o.status === 'new' || o.status === 'review' || (o.heard_on && o.heard_on >= range.start && o.heard_on <= range.end),
    ),
  );
  const openCount = $derived(items.filter((o) => o.status === 'new' || o.status === 'review').length);

  const when = (d) => (d ? `${parseKey(d).m}/${parseKey(d).d}` : '');

  async function add(e) {
    e.preventDefault();
    const content = draft.content.trim();
    if (!content) return;
    await saveOpinion({ ...newOpinion(), content, source: draft.source.trim() });
    draft = { content: '', source: '' };
    adding = false;
  }

  function nextStatus(o) {
    const i = OPINION_STATUS.findIndex((s) => s.id === o.status);
    saveOpinion({ ...o, status: OPINION_STATUS[(i + 1) % OPINION_STATUS.length].id });
  }

  function startEdit(o) {
    editId = o.id;
    edit = { ...o };
  }
  async function finishEdit() {
    if (edit && edit.content.trim()) await saveOpinion({ ...edit, content: edit.content.trim(), source: edit.source.trim() });
    editId = null;
  }
  async function del() {
    await removeOpinion(edit);
    editId = null;
  }
</script>

<section class="panel">
  <header>
    <h2>{title}</h2>
    <span class="count">{openCount ? `처리 전 ${openCount}건` : ''}</span>
  </header>
  <ul use:scrollable>
    {#each items as o (o.id)}
      <li>
        {#if editId === o.id}
          <form class="edit" onsubmit={(e) => { e.preventDefault(); finishEdit(); }}>
            <textarea aria-label="메모 내용" rows="3" bind:value={edit.content} maxlength="5000"></textarea>
            <input type="text" aria-label="들은 곳" placeholder="누가·어디서" bind:value={edit.source} maxlength="100" />
            <PickerField type="date" compact ariaLabel="들은 날짜" bind:value={edit.heard_on} />
            <div class="line">
              <button type="button" class="link danger press" onclick={del}>삭제</button>
              <button type="submit" class="link press">완료</button>
            </div>
          </form>
        {:else}
          <button class="body press" onclick={() => startEdit(o)}>{o.content}</button>
          <div class="meta">
            <span class="from">{[o.source, when(o.heard_on)].filter(Boolean).join(' · ')}</span>
            <button class="badge press" style={`--bg:${statusOf(o.status).bg};--fg:${statusOf(o.status).fg}`}
              aria-label={`상태: ${statusOf(o.status).label}. 누르면 다음 상태로`} onclick={() => nextStatus(o)}>{statusOf(o.status).label}</button>
          </div>
        {/if}
      </li>
    {:else}
      <li class="empty">기록한 메모가 없습니다.</li>
    {/each}
  </ul>
  {#if adding}
    <form class="edit add" onsubmit={add}>
      <textarea aria-label="메모 내용" rows="3" placeholder="들은 내용" bind:value={draft.content} maxlength="5000"></textarea>
      <input type="text" aria-label="들은 곳" placeholder="누가·어디서" bind:value={draft.source} maxlength="100" />
      <div class="line">
        <button type="button" class="link press" onclick={() => (adding = false)}>취소</button>
        <button type="submit" class="link press">저장</button>
      </div>
    </form>
  {:else}
    <button class="addbtn press" onclick={() => (adding = true)}>+ 메모 기록</button>
  {/if}
</section>

<style>
  .panel { display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; }
  header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4px; }
  h2 { margin: 0; font-size: 17px; font-weight: 600; }
  .count { font-size: 13px; color: var(--text-2); }
  ul { list-style: none; margin: 0; padding: 0; flex: 1; min-height: 0; overflow-y: auto; }
  li { display: flex; flex-direction: column; gap: 4px; padding: 6px 0; border-top: 1px solid #f2f2f7; }
  li.empty { color: var(--text-3); font-size: 14px; min-height: 46px; justify-content: center; }
  .body { min-height: 44px; border: 0; background: transparent; padding: 0; text-align: left; font-size: 13px; line-height: 20px; }
  .meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .from { font-size: 12px; color: var(--text-2); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .badge { min-height: 32px; padding: 0 12px; border: 0; border-radius: 16px; background: var(--bg); color: var(--fg); font-size: 12px; font-weight: 500; flex: none; }
  .addbtn { min-height: 46px; border: 0; border-top: 1px solid #f2f2f7; background: transparent; text-align: left; padding: 0; font-size: 13px; color: var(--blue); }
  .edit { display: flex; flex-direction: column; gap: 6px; padding: 6px 0; }
  .edit.add { border-top: 1px solid #f2f2f7; }
  .edit textarea, .edit input {
    width: 100%; border: 1px solid #d1d1d6; border-radius: 10px; padding: 8px 10px; font: inherit; font-size: 13px;
    color: var(--text); background: var(--surface); resize: none;
  }
  .edit input { min-height: 42px; }
  .line { display: flex; justify-content: flex-end; gap: 4px; }
  .link { min-height: 44px; padding: 0 12px; border: 0; background: transparent; color: var(--blue); font-size: 14px; }
  .link.danger { color: var(--red); margin-right: auto; padding-left: 0; }
</style>
