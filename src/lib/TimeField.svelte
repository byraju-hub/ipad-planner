<script>
  // 시간 선택칸: 한 번에 고른다. 30분 단위(00분, 30분)만 목록에 나온다.
  // 기기 기본 시간 선택창은 분을 1분 단위로 고르게 해서 쓰지 않는다.
  let { id, value = $bindable(null), clearable = false, placeholder = '선택', ariaLabel, onpick } = $props();

  const label = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}`;
  };
  const SLOTS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

  // 이미 저장된 일정의 시간이 30분 단위가 아니면 그 값도 목록에 보여 준다
  const slots = $derived(value && !SLOTS.includes(value) ? [...SLOTS, value].sort() : SLOTS);

  function change(e) {
    value = e.currentTarget.value || null;
    onpick?.(value);
  }
</script>

<div class="tf">
  <span class="text" class:empty={!value}>{value ? label(value) : placeholder}</span>
  <select {id} aria-label={ariaLabel} value={value ?? ''} onchange={change}>
    {#if !value}<option value="" disabled>{placeholder}</option>{/if}
    {#each slots as s}<option value={s}>{label(s)}</option>{/each}
  </select>
  {#if clearable && value}
    <button type="button" class="clear" aria-label="지우기" onclick={() => (value = null)}>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8" /></svg>
    </button>
  {/if}
</div>

<style>
  .tf {
    position: relative; display: flex; align-items: center; width: 100%; min-width: 0; height: 48px;
    padding: 0 14px; border: 1px solid #d1d1d6; border-radius: 12px; background: var(--surface);
  }
  .text { flex: 1; min-width: 0; font-size: 17px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
  .text.empty { color: var(--text-3); }
  /* 진짜 선택칸: 투명하게 칸 전체를 덮는다. 글자 크기 16px 미만이면 iOS 가 확대하므로 16px 이상 */
  select {
    position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0;
    opacity: 0; font-size: 16px; cursor: pointer;
  }
  .tf:focus-within { outline: 2px solid var(--blue); outline-offset: -1px; border-color: transparent; }
  .clear {
    position: relative; z-index: 1; flex: none; width: 44px; height: 44px; margin-right: -12px;
    border: 0; background: transparent; color: var(--text-2); display: flex; align-items: center; justify-content: center;
  }
</style>
