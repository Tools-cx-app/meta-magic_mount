<script>
  import { onMount } from 'svelte';
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import './StatusTab.css';

  onMount(() => {
    store.loadStatus();
  });

  function handleReboot() {
    if (confirm("Reboot device?")) {
        API.rebootDevice();
    }
  }

  function copyDebugInfo() {
    const info = `Magic Mount v${store.version}\n` +
                 `Model: ${store.device.model}\n` +
                 `Android: ${store.device.android}\n` +
                 `Kernel: ${store.device.kernel}\n` +
                 `SELinux: ${store.device.selinux}`;
    navigator.clipboard.writeText(info);
    store.showToast(store.L.logs.copySuccess, 'success');
  }
</script>

<div class="dashboard-grid">
  <div class="device-card">
    <div class="device-header">
      <div style="display:flex; flex-direction:column; gap:4px;">
        <span class="device-title">{store.L.status.deviceTitle}</span>
        <div style="display:flex; align-items:center; gap:8px;">
            <span class="device-model">{store.device.model}</span>
            <span class="version-badge">v{store.version}</span>
        </div>
      </div>
      
      <button class="btn-icon" onclick={copyDebugInfo} title={store.L.status.copy}>
        <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.copy} fill="currentColor"/></svg>
      </button>
    </div>
    
    <div class="device-info-grid">
        <div class="info-item">
            <span class="info-label">{store.L.status.androidLabel}</span>
            <span class="info-val">{store.device.android}</span>
        </div>
        <div class="info-item">
            <span class="info-label">{store.L.status.selinuxLabel}</span>
            <span class="info-val" class:warn={store.device.selinux !== 'Enforcing'}>
                {store.device.selinux}
            </span>
        </div>
        <div class="info-item" style="grid-column: span 2;">
            <span class="info-label">{store.L.status.kernelLabel}</span>
            <span class="info-val mono">{store.device.kernel}</span>
        </div>
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
  <button class="btn-filled" onclick={handleReboot}>
    {store.L.status.reboot}
  </button>
  <button 
    class="btn-tonal" 
    onclick={() => store.loadStatus()} 
    disabled={store.loading.status}
    title={store.L.logs.refresh}
  >
    <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.refresh} fill="currentColor"/></svg>
  </button>
</div>