<script>
  import { onMount } from 'svelte';
  import Header from './lib/Header.svelte';
  import YearView from './lib/YearView.svelte';
  import MonthView from './lib/MonthView.svelte';
  import WeekView from './lib/WeekView.svelte';
  import { parseHash, toHash, clampKey } from './lib/dates.js';

  let route = $state(parseHash(location.hash));

  function go(view, key) {
    location.hash = toHash(view, clampKey(key));
  }

  onMount(() => {
    const onChange = () => (route = parseHash(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  });
</script>

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

<style>
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
