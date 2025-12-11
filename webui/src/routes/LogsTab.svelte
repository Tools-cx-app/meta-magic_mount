<script>
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import { onMount, tick, onDestroy } from 'svelte';
  import Skeleton from '../components/Skeleton.svelte';
  import BottomActions from '../components/BottomActions.svelte';
  import './LogsTab.css';

  let searchLogQuery = $state('');
  let filterLevel = $state('all'); 
  let logContainer = $state();
  let autoRefresh = $state(false);
  let refreshInterval;
  let userHasScrolledUp = $state(false);

  let filteredLogs = $derived(store.logs.filter(line => {
    const text = typeof line === 'string' ? line : line.text;
    const type = typeof line === 'string' ? 'info' : line.type;
    
    const matchesSearch = text.toLowerCase().includes(searchLogQuery.toLowerCase());
    let matchesLevel = true;
    if (filterLevel !== 'all') {
      matchesLevel = type === filterLevel;
    }
    return matchesSearch && matchesLevel;
  }));

  async function scrollToBottom() {
    if (logContainer) { 
      await tick();
      logContainer.scrollTo({ top: logContainer.scrollHeight, behavior: 'smooth' });
      userHasScrolledUp = false;
    }
  }

  function handleScroll(e) {
    const target = e.target;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    userHasScrolledUp = distanceToBottom > 50;
  }

  async function refreshLogs(silent = false) {
    await store.loadLogs(silent);
    if (!silent && !userHasScrolledUp) {
      if (logContainer) {
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  }

  async function copyLogs() {
    if (filteredLogs.length === 0) return;
    const text = filteredLogs.map(l => l.text || l).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      store.showToast(store.L.logs.copySuccess, 'success');
    } catch (e) {
      store.showToast(store.L.logs.copyFail, 'error');
    }
  }

  $effect(() => {
    if (autoRefresh) {
      refreshLogs(true); 
      refreshInterval = setInterval(() => {
        refreshLogs(true); 
      }, 3000);
    } else {
      if (refreshInterval) clearInterval(refreshInterval);
    }
    return () => { if (refreshInterval) clearInterval(refreshInterval); };
  });

  onMount(() => {
    refreshLogs(); 
  });

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval);
  });
</script>

<div class="logs-controls">
  <svg viewBox="0 0 24 24" width="20" height="20" class="log-search-icon">
    <path d={ICONS.search} />
  </svg>
  <input 
    type="text" 
    class="log-search-input" 
    placeholder={store.L.logs.searchPlaceholder}
    bind:value={searchLogQuery}
  />
  <div class="log-auto-group">
    <input type="checkbox" id="auto-refresh" bind:checked={autoRefresh} class="log-auto-checkbox" />
    <label for="auto-refresh" class="log-auto-label">Auto</label>
  </div>
  <div class="log-divider"></div>
  <select class="log-filter-select" bind:value={filterLevel}>
    <option value="all">{store.L.logs.levels.all}</option>
    <option value="info">{store.L.logs.levels.info}</option>
    <option value="warn">{store.L.logs.levels.warn}</option>
    <option value="error">{store.L.logs.levels.error}</option>
  </select>
</div>

<div class="log-container" bind:this={logContainer} onscroll={handleScroll}>
  {#if store.loading.logs}
    <div class="log-skeleton-container">
      {#each Array(10) as _, i}
        <Skeleton width="{60 + (i % 3) * 20}%" height="14px" />
      {/each}
    </div>
  {:else if filteredLogs.length === 0}
    <div class="log-empty-state">
      {store.logs.length === 0 ? store.L.logs.empty : "No matching logs"}
    </div>
  {:else}
    {#each filteredLogs as line}
      <span class="log-entry">
        <span class="log-{line.type}">{line.text}</span>
      </span>
    {/each}
    <div class="log-footer">
      — Showing last 1000 lines —
    </div>
  {/if}

  {#if userHasScrolledUp}
    <button 
      class="scroll-fab" 
      onclick={scrollToBottom}
      title="Scroll to bottom"
    >
      <svg viewBox="0 0 24 24" class="scroll-icon"><path d="M11 4h2v12l5.5-5.5 1.42 1.42L12 19.84l-7.92-7.92L5.5 10.5 11 16V4z" fill="currentColor"/></svg>
      Latest
    </button>
  {/if}
</div>

<BottomActions>
  <button class="btn-tonal" onclick={copyLogs} disabled={filteredLogs.length === 0} title={store.L.logs.copy}>
    <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.copy} fill="currentColor"/></svg>
  </button>
  <div class="spacer"></div>
  <button 
    class="btn-tonal" 
    onclick={() => refreshLogs(false)} 
    disabled={store.loading.logs}
    title={store.L.logs.refresh}
  >
    <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.refresh} fill="currentColor"/></svg>
  </button>
</BottomActions>