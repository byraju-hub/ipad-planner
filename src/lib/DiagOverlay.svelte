<script>
  import { diag, setDiag, resetDiag } from './diag.svelte.js';
</script>

{#if diag.on}
  <div class="diag" role="status" aria-label="펜 진단">
    <div class="row"><b>펜 진단</b>
      <button onclick={resetDiag}>초기화</button>
      <button onclick={() => setDiag(false)}>끄기</button>
    </div>
    <div>닿음 {diag.down} · 이동 {diag.move} (묶음 {diag.coalesced}) · 뗌 {diag.up}</div>
    <div>취소 <b class:bad={diag.cancel > 0}>{diag.cancel}</b> · 획 {diag.strokes} · 정리 {diag.stale} · 이음 {diag.stitched} · 먼지 {diag.dust} · 손바닥 {diag.palm}</div>
    <div>이동 간격 최대 {Math.round(diag.maxGap)}ms{diag.lastCancel ? ` · 취소: ${diag.lastCancel}` : ''}</div>
  </div>
{/if}

<style>
  .diag {
    position: fixed; left: 12px; bottom: 12px; z-index: 80; width: 330px;
    padding: 10px 12px; border-radius: 12px; background: rgba(29, 29, 31, 0.9); color: #fff;
    font-size: 12px; line-height: 1.6; font-variant-numeric: tabular-nums;
  }
  .row { display: flex; align-items: center; gap: 6px; }
  b { font-weight: 600; }
  .bad { color: #ff9f0a; }
  button { margin-left: auto; min-height: 32px; padding: 0 10px; border: 1px solid #636366; border-radius: 8px; background: transparent; color: #fff; font-size: 12px; }
  button + button { margin-left: 0; }
</style>
