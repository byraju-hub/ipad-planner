<script>
  // 시간 선택칸: 오전/오후 · 시 · 분(00, 30만). 기기 기본 시간 선택창은 분을 1분 단위로 고르게 해서 쓰지 않는다.
  let { id, value = $bindable(null), clearable = false, ariaLabel, onpick } = $props();

  const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const parts = $derived.by(() => {
    if (!value) return { ap: '', h: '', m: '' };
    const [h, m] = value.split(':').map(Number);
    return { ap: h < 12 ? 'am' : 'pm', h: h % 12, m };
  });
  // 이미 저장된 일정의 분이 00·30이 아니면 그 값도 목록에 보여 준다
  const minutes = $derived(parts.m === '' || parts.m === 0 || parts.m === 30 ? [0, 30] : [0, 30, parts.m].sort((a, b) => a - b));

  const pad = (n) => String(n).padStart(2, '0');

  function pick(next) {
    const p = { ap: parts.ap || 'am', h: parts.h === '' ? 9 : parts.h, m: parts.m === '' ? 0 : parts.m, ...next };
    value = `${pad((p.h % 12) + (p.ap === 'pm' ? 12 : 0))}:${pad(p.m)}`;
    onpick?.(value);
  }
</script>

<div class="tf" role="group" aria-label={ariaLabel} {id}>
  <select aria-label="오전·오후" value={parts.ap} onchange={(e) => pick({ ap: e.currentTarget.value })}>
    {#if !value}<option value="" disabled>--</option>{/if}
    <option value="am">오전</option>
    <option value="pm">오후</option>
  </select>
  <select aria-label="시" value={parts.h} onchange={(e) => pick({ h: Number(e.currentTarget.value) })}>
    {#if !value}<option value="" disabled>--</option>{/if}
    {#each HOURS as h}<option value={h}>{h}시</option>{/each}
  </select>
  <select aria-label="분" value={parts.m} onchange={(e) => pick({ m: Number(e.currentTarget.value) })}>
    {#if !value}<option value="" disabled>--</option>{/if}
    {#each minutes as m}<option value={m}>{pad(m)}분</option>{/each}
  </select>
  {#if clearable && value}
    <button type="button" class="clear" aria-label="지우기" onclick={() => (value = null)}>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8" /></svg>
    </button>
  {/if}
</div>

<style>
  .tf { display: flex; align-items: center; gap: 6px; min-width: 0; }
  select {
    flex: 1 1 0; min-width: 0; height: 48px; padding: 0 8px; border: 1px solid #d1d1d6; border-radius: 12px;
    background: var(--surface); color: var(--text); font: inherit; font-size: 17px; text-align: center; text-align-last: center;
  }
  select:focus-visible { outline: 2px solid var(--blue); outline-offset: -1px; border-color: transparent; }
  .clear {
    flex: none; width: 36px; height: 44px; border: 0; background: transparent; color: var(--text-2);
    display: flex; align-items: center; justify-content: center;
  }
</style>
