<script>
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import { onMount } from 'svelte';
  import './LogsTab.css';

  onMount(() => {
    store.loadLogs();
  });

  async function copyLogs() {
    if (!store.logs) return;
    try {
      await navigator.clipboard.writeText(store.logs);
      store.showToast(store.L.logs.copySuccess, 'success');
    } catch (e) {
      store.showToast(store.L.logs.copyFail, 'error');
    }
  }
</script>

<div class="log-card">
  {#if store.loading.logs}
    <div style="padding: 20px; text-align: center; opacity: 0.7;">
      {store.L.logs.loading}
    </div>
  {:else}
    <pre class="log-content">{store.logs}</pre>
  {/if}
</div>

<div class="bottom-actions">
  <button class="btn-tonal" onclick={copyLogs} disabled={!store.logs} title={store.L.logs.copy}>
    <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.copy} fill="currentColor"/></svg>
  </button>
  <div style="flex:1"></div>
  <button 
    class="btn-tonal" 
    onclick={() => store.loadLogs()} 
    disabled={store.loading.logs}
    title={store.L.logs.refresh}
  >
    <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.refresh} fill="currentColor"/></svg>
  </button>
</div>