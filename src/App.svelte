<script>
  import { onMount } from 'svelte';
  import Header from './lib/Header.svelte';
  import YearView from './lib/YearView.svelte';
  import MonthView from './lib/MonthView.svelte';
  import WeekView from './lib/WeekView.svelte';
  import Login from './lib/Login.svelte';
  import EventSheet from './lib/EventSheet.svelte';
  import SettingsSheet from './lib/SettingsSheet.svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { parseHash, toHash, clampKey, prevKey, nextKey, canGoPrev, periodRange } from './lib/dates.js';
  import { swipe } from './lib/swipe.js';
  import { tool } from './lib/ink.svelte.js';
  import { auth, checkAuth } from './lib/auth.svelte.js';
  import { data, loadAll } from './lib/data.svelte.js';
  import { syncNow } from './lib/sync.svelte.js';
  import { ui } from './lib/ui.svelte.js';

  let route = $state(parseHash(location.hash));
  const usable = $derived(auth.status === 'in' || auth.status === 'offline' || auth.status === 'local');

  // 화면이 들어오는 방향(1: 오른쪽에서, -1: 왼쪽에서)
  let dir = $state(1);
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function go(view, key) {
    location.hash = toHash(view, clampKey(key));
  }

  // 밀어서 이전·다음 기간으로(주간은 주, 월간은 달, 연간은 해). 글씨를 손가락으로 쓰는 중이거나 창이 열려 있으면 쓰지 않는다
  function step(n) {
    if (n < 0 && !canGoPrev(route.view, route.key)) return;
    go(route.view, n < 0 ? prevKey(route.view, route.key) : nextKey(route.view, route.key));
  }
  const swipeOptions = () => ({
    enabled: () => !ui.sheet && !tool.finger,
    onprev: () => step(-1),
    onnext: () => step(1),
  });

  // 로그인된 뒤에만 기기 데이터를 읽고 동기화한다
  $effect(() => {
    if (!usable) return;
    if (!data.ready) loadAll();
    syncNow();
  });

  onMount(() => {
    checkAuth();
    const onHash = () => {
      const next = parseHash(location.hash);
      if (next.view === route.view) dir = next.key >= route.key ? 1 : -1;
      route = next;
    };
    const onOnline = () => syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncNow();
    };
    const timer = setInterval(onVisible, 60000);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  });
</script>

{#if auth.status === 'checking'}
  <div class="boot" role="status" aria-label="불러오는 중"></div>
{:else if auth.status === 'out'}
  <Login />
{:else}
  <div class="app">
    <Header view={route.view} key={route.key} {go} />
    <main use:swipe={swipeOptions()}>
      {#key route.view + periodRange(route.view, route.key).start}
        <div class="stage" in:fly={{ x: dir * 48, duration: reduceMotion ? 0 : 220, easing: cubicOut }}>
          {#if route.view === 'year'}
            <YearView key={route.key} {go} />
          {:else if route.view === 'month'}
            <MonthView key={route.key} {go} />
          {:else}
            <WeekView key={route.key} />
          {/if}
        </div>
      {/key}
    </main>
  </div>
  {#if ui.sheet?.type === 'event'}
    {#key ui.sheet}
      <EventSheet ev={ui.sheet.ev} date={ui.sheet.date} />
    {/key}
  {:else if ui.sheet?.type === 'settings'}
    <SettingsSheet />
  {/if}
{/if}

<style>
  .boot { height: 100%; }
  .app {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: env(safe-area-inset-top) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom))
      max(24px, env(safe-area-inset-left));
  }
  main {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden; /* 넘어가는 동안 옆으로 삐져나온 부분을 가린다 */
  }
  .stage {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
  }
</style>
