<script>
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  let { title, onclose, children } = $props();

  onMount(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onclose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

<div class="layer">
  <button class="backdrop" aria-label="닫기" tabindex="-1" onclick={onclose}></button>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
    <div class="top">
      <h2>{title}</h2>
      <button class="x press" aria-label="닫기" onclick={onclose}><Icon name="close" size={20} /></button>
    </div>
    {@render children?.()}
  </div>
</div>

<style>
  .layer {
    position: fixed; inset: 0; z-index: 50;
    display: grid; place-items: center;
    padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
  }
  .backdrop {
    position: absolute; inset: 0; border: 0; padding: 0;
    background: rgba(0, 0, 0, 0.28); cursor: default;
    animation: fade 200ms ease-out;
  }
  .sheet {
    position: relative; width: min(460px, 100%); max-height: 100%;
    overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y;
    background: var(--surface); border-radius: 22px; padding: 20px 24px 24px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
    transform-origin: center;
    animation: pop 220ms var(--ease-out);
  }
  .top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  h2 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
  .x {
    width: 44px; height: 44px; margin-right: -12px;
    border: 0; border-radius: 22px; background: transparent; color: var(--text-2);
    display: flex; align-items: center; justify-content: center;
  }
  @keyframes fade { from { opacity: 0; } }
  @keyframes pop { from { opacity: 0; transform: scale(0.96); } }
  @media (prefers-reduced-motion: reduce) {
    .backdrop, .sheet { animation: fade 120ms linear; }
  }
</style>
