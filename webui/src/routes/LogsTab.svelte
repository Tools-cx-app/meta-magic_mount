<script lang="ts">
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import { onMount, tick, onDestroy } from 'svelte';
  import Skeleton from '../components/Skeleton.svelte';
  import BottomActions from '../components/BottomActions.svelte';
  import './LogsTab.css';
  
  import '@material/web/checkbox/checkbox.js';
  import '@material/web/iconbutton/filled-tonal-icon-button.js';
  import '@material/web/icon/icon.js';

  let searchLogQuery = $state('');
  let filterLevel = $state<'all' | 'info' | 'warn' | 'error'>('all'); 
  let logContainer = $state<HTMLElement>();
  let autoRefresh = $state(false);
  let refreshInterval: number | undefined; 
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

  function handleScroll(e: Event) {
    const target = e.target as HTMLElement;
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
    const text = filteredLogs.map(l => (typeof l === 'string' ? l : l.text)).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      store.showToast(store.L.logs.copySuccess || "Copied", 'success');
    } catch (e) {
      store.showToast(store.L.logs.copyFail || "Failed to copy", 'error');
    }
  }

  $effect(() => {
    if (autoRefresh) {
      refreshLogs(true); 
      // window.setInterval returns a number in browser env
      refreshInterval = window.setInterval(() => {
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

  function toggleAutoRefresh(e: Event) {
      autoRefresh = (e.target as HTMLInputElement).checked;
  }
</script>

<div class="logs-container-page">
  <div class="logs-controls">
    <div class="search-wrapper">
        <md-icon class="search-icon"><svg viewBox="0 0 24 24"><path d={ICONS.search} /></svg></md-icon>
        <input 
            type="text" 
            class="log-search-input" 
            placeholder={store.L.logs.searchPlaceholder}
            bind:value={searchLogQuery}
        />
    </div>
    
    <div class="controls-right">
        <div class="log-auto-group">
            <md-checkbox 
                id="auto-refresh" 
                checked={autoRefresh} 
                onchange={toggleAutoRefresh}
                touch-target="wrapper"
            ></md-checkbox>
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
  </div>

  <div class="log-viewer" bind:this={logContainer} onscroll={handleScroll}>
    {#if store.loading.logs && !autoRefresh && filteredLogs.length === 0}
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
        <div class="log-entry">
            {#if typeof line === 'string'}
                <span class="log-info">{line}</span>
            {:else}
                <span class="log-{line.type}">{line.text}</span>
            {/if}
        </div>
        {/each}
        <div class="log-footer">
        — End of Logs —
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
</div>

<BottomActions>
  <md-filled-tonal-icon-button 
    onclick={copyLogs} 
    disabled={filteredLogs.length === 0} 
    title={store.L.logs.copy}
    role="button"
    tabindex="0"
    onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') copyLogs(); }}
  >
    <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.copy} /></svg></md-icon>
  </md-filled-tonal-icon-button>

  <div class="spacer"></div>

  <md-filled-tonal-icon-button 
    onclick={() => refreshLogs(false)} 
    disabled={store.loading.logs}
    title={store.L.logs.refresh}
    role="button"
    tabindex="0"
    onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') refreshLogs(false); }}
  >
    <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.refresh} /></svg></md-icon>
  </md-filled-tonal-icon-button>
</BottomActions>