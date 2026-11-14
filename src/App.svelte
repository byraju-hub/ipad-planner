<script>
  import { onMount } from 'svelte';
  import Header from './lib/Header.svelte';
  import YearView from './lib/YearView.svelte';
  import MonthView from './lib/MonthView.svelte';
  import WeekView from './lib/WeekView.svelte';
  import Login from './lib/Login.svelte';
  import EventSheet from './lib/EventSheet.svelte';
  import SettingsSheet from './lib/SettingsSheet.svelte';
  import { parseHash, toHash, clampKey } from './lib/dates.js';
  import { auth, checkAuth } from './lib/auth.svelte.js';
  import { data, loadAll } from './lib/data.svelte.js';
  import { syncNow } from './lib/sync.svelte.js';
  import { ui } from './lib/ui.svelte.js';

  let route = $state(parseHash(location.hash));
  const usable = $derived(auth.status === 'in' || auth.status === 'offline' || auth.status === 'local');

  function go(view, key) {
    location.hash = toHash(view, clampKey(key));
  }

  // 로그인된 뒤에만 기기 데이터를 읽고 동기화한다
  $effect(() => {
    if (!usable) return;
    if (!data.ready) loadAll();
    syncNow();
  });

  onMount(() => {
    checkAuth();
    const onHash = () => (route = parseHash(location.hash));
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
    <main>
      {#if route.view === 'year'}
        <YearView key={route.key} {go} />
      {:else if route.view === 'month'}
        <MonthView key={route.key} {go} />
      {:else}
        <WeekView key={route.key} />
      {/if}
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
  }
</style>
