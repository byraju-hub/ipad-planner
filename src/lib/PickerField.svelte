<script>
  import { parseKey, dayOfWeek, DOW } from './dates.js';

  // 날짜·시간 선택칸. 보이는 글자는 직접 그리고, 진짜 입력칸은 투명하게 위에 겹쳐 둔다.
  // (아이패드 Safari 의 날짜·시간 입력칸은 모양 지정이 일관되지 않아 글자가 왼쪽 위로 붙거나 칸을 밀어낸다.
  //  누르면 기기 기본 선택창이 뜨는 것은 그대로다)
  let { id, type, value = $bindable(''), min, clearable = false, compact = false, ariaLabel, placeholder = '선택' } = $props();

  const text = $derived.by(() => {
    if (!value) return placeholder;
    if (type === 'date') {
      const { y, m, d } = parseKey(value);
      return `${y}. ${m}. ${d}. (${DOW[dayOfWeek(value)]})`;
    }
    const [h, mm] = value.split(':').map(Number);
    return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}:${String(mm).padStart(2, '0')}`;
  });

  function open(e) {
    try {
      e.currentTarget.showPicker?.(); // 데스크톱 브라우저에서도 칸을 누르면 선택창이 뜨게
    } catch {
      /* 지원하지 않는 환경 */
    }
  }
</script>

<div class="pf" class:compact>
  <span class="text" class:empty={!value}>{text}</span>
  <input {id} {type} {min} bind:value aria-label={ariaLabel} onclick={open} />
  {#if clearable && value}
    <button type="button" class="clear" aria-label="지우기" onclick={() => (value = null)}>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8" /></svg>
    </button>
  {/if}
</div>

<style>
  .pf {
    position: relative; display: flex; align-items: center; width: 100%; min-width: 0; height: 48px;
    padding: 0 14px; border: 1px solid #d1d1d6; border-radius: 12px; background: var(--surface);
  }
  .pf.compact { height: 40px; width: auto; padding: 0 10px; border-radius: 10px; }
  .text { flex: 1; min-width: 0; font-size: 17px; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
  .compact .text { font-size: 14px; }
  .text.empty { color: var(--text-3); }
  /* 진짜 입력칸: 투명하게 칸 전체를 덮는다. 글자 크기 16px 미만이면 iOS 가 확대하므로 16px 이상 */
  input {
    position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0;
    opacity: 0; font-size: 16px; cursor: pointer;
  }
  .pf:focus-within { outline: 2px solid var(--blue); outline-offset: -1px; border-color: transparent; }
  .clear {
    position: relative; z-index: 1; flex: none; width: 44px; height: 44px; margin-right: -12px;
    border: 0; background: transparent; color: var(--text-2); display: flex; align-items: center; justify-content: center;
  }
  .compact .clear { height: 40px; width: 36px; margin-right: -8px; }
</style>
