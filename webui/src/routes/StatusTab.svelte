<script>
  import { onMount } from 'svelte';
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import './StatusTab.css';

  onMount(() => {
    store.loadStatus();
  });
</script>

<div class="dashboard-grid">
  <div class="storage-card">
    <div class="storage-header">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="storage-title">{store.L.status.storageTitle}</span>
      </div>
      
      <div class="storage-value">
        {store.storage.percent}
      </div>
    </div>
    
    <div class="progress-track">
      <div class="progress-fill" style="width: {store.storage.percent}"></div>
    </div>

    <div class="storage-details">
      <span>{store.L.status.storageDesc}</span>
      <span>{store.storage.used} / {store.storage.size}</span>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-value">{store.modules.length}</div>
      <div class="stat-label">{store.L.status.moduleActive}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{store.config.mountsource}</div>
      <div class="stat-label">{store.L.config.mountSource}</div>
    </div>
  </div>
</div>

<div class="bottom-actions">
  <div style="flex:1"></div>
  <button 
    class="btn-tonal" 
    onclick={() => store.loadStatus()} 
    disabled={store.loading.status}
    title={store.L.logs.refresh}
  >
    <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.refresh} fill="currentColor"/></svg>
  </button>
</div>