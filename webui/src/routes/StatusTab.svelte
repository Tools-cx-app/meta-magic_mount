<script>
  import { onMount } from 'svelte';
  import { store } from '../lib/store.svelte';
  import { API } from '../lib/api';
  import { ICONS } from '../lib/constants';
  import Skeleton from '../components/Skeleton.svelte';
  import BottomActions from '../components/BottomActions.svelte';
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
  let mountedCount = $derived(store.modules?.length ?? 0);
  let isSelinuxEnforcing = $derived(store.device.selinux === 'Enforcing');
</script>
<div class="dashboard-grid">
  <div class="hero-card">
    <div class="hero-content">
      <div class="hero-label-group">
        <div class="hero-icon-circle">
          <svg viewBox="0 0 24 24"><path d={ICONS.home} /></svg>
        </div>
        <span class="hero-title">{store.L.status.deviceTitle}</span>
      </div>
      <div class="hero-main-info">
        {#if store.loading.status}
          <Skeleton width="150px" height="32px" />
          <Skeleton width="80px" height="14px" style="margin-top: 8px;" />
        {:else}
          <span class="device-model">{store.device.model}</span>
          <span class="device-version">Magic Mount v{store.version}</span>
        {/if}
      </div>
    </div>
    <button class="hero-action-btn" onclick={copyDebugInfo} title={store.L.status.copy}>
      <svg viewBox="0 0 24 24"><path d={ICONS.copy} /></svg>
    </button>
  </div>
  <div class="stats-row">
    <div class="stat-card">
      {#if store.loading.status}
        <Skeleton width="40px" height="32px" />
        <Skeleton width="60px" height="12px" style="margin-top: 8px" />
      {:else}
        <div class="stat-value">{mountedCount}</div>
        <div class="stat-label">{store.L.status.moduleActive}</div>
      {/if}
    </div>
    <div class="stat-card">
      {#if store.loading.status}
         <Skeleton width="40px" height="32px" />
         <Skeleton width="60px" height="12px" style="margin-top: 8px" />
      {:else}
         <div class="stat-value">{store.config?.mountsource ?? '-'}</div>
         <div class="stat-label">{store.L.config.mountSource}</div>
      {/if}
    </div>
  </div>
  <div class="details-card">
    <div class="card-title">{store.L.status.sysInfoTitle || "System Details"}</div>
    <div class="info-list">
      <div class="info-item">
        <span class="info-label">{store.L.status.androidLabel}</span>
        {#if store.loading.status}
          <Skeleton width="60px" height="16px" />
        {:else}
          <span class="info-val">{store.device.android}</span>
        {/if}
      </div>
      <div class="info-item">
        <span class="info-label">{store.L.status.selinuxLabel}</span>
        {#if store.loading.status}
          <Skeleton width="80px" height="16px" />
        {:else}
          <span class="info-val" class:warn={!isSelinuxEnforcing}>
            {store.device.selinux}
          </span>
        {/if}
      </div>
      <div class="info-item full-width">
        <span class="info-label">{store.L.status.kernelLabel}</span>
        {#if store.loading.status}
          <Skeleton width="100%" height="16px" />
        {:else}
          <span class="info-val mono">{store.device.kernel}</span>
        {/if}
      </div>
    </div>
  </div>
</div>
<BottomActions>
  <button class="btn-tonal" onclick={handleReboot}>
    <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.refresh} fill="currentColor"/></svg>
    {store.L.status.reboot}
  </button>
  <div class="spacer"></div>
  <button 
    class="btn-filled" 
    onclick={() => store.loadStatus()} 
    disabled={store.loading.status}
    title={store.L.logs.refresh}
  >
    <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.refresh} fill="currentColor"/></svg>
  </button>
</BottomActions>