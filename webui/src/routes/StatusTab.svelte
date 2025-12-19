<script>
  import { onMount } from 'svelte';
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import Skeleton from '../components/Skeleton.svelte';
  import BottomActions from '../components/BottomActions.svelte';
  import './StatusTab.css';
  import '@material/web/icon/icon.js';
  import '@material/web/iconbutton/icon-button.js';
  import '@material/web/button/filled-tonal-button.js';
  import '@material/web/iconbutton/filled-tonal-icon-button.js';
  import '@material/web/dialog/dialog.js';
  import '@material/web/button/text-button.js';

  onMount(() => {
    store.loadStatus();
  });

  function copyDebugInfo() {
    const info = `Magic Mount v${store.version}\n` +
                 `Model: ${store.device.model}\n` +
                 `Android: ${store.device.android}\n` +
                 `Kernel: ${store.device.kernel}\n` +
                 `SELinux: ${store.device.selinux}`;
    navigator.clipboard.writeText(info);
    store.showToast(store.L.logs.copySuccess || "Copied to clipboard", 'success');
  }

  let showRebootConfirm = $state(false);
  function handleReboot() {
    showRebootConfirm = false;
    store.rebootDevice();
  }

  let mountedCount = $derived(store.modules?.filter(m => m.is_mounted).length ?? 0);
  let isSelinuxEnforcing = $derived(store.device.selinux === 'Enforcing');
</script>

<md-dialog 
  open={showRebootConfirm} 
  onclose={() => showRebootConfirm = false}
  style="--md-dialog-scrim-color: transparent; --md-sys-color-scrim: transparent;"
>
  <div slot="headline">{store.L.common?.rebootTitle || "Reboot System?"}</div>
  <div slot="content">
    {store.L.common?.rebootConfirm || "Are you sure you want to reboot the device?"}
  </div>
  <div slot="actions">
    <md-text-button 
      onclick={() => showRebootConfirm = false}
      role="button" tabindex="0" onkeydown={() => {}}
    >
      {store.L.common?.cancel || "Cancel"}
    </md-text-button>
    <md-text-button 
      onclick={handleReboot}
      role="button" tabindex="0" onkeydown={() => {}}
    >
      {store.L.common?.reboot || "Reboot"}
    </md-text-button>
  </div>
</md-dialog>

<div class="dashboard-grid">
  <div class="hero-card">
    <div class="hero-decoration">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.5 5.6L10 0l2.5 5.6L18 8l-5.5 2.4L10 16l-2.5-5.6L2 8l5.5-2.4zm12 9.4l1.5-3 1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5zm-3-8l1.25-2.5 1.25 2.5 2.5 1.25-2.5 1.25-1.25 2.5-1.25-2.5-2.5-1.25 2.5-1.25z"/>
      </svg>
    </div>

    <div class="hero-content">
      <div class="hero-label-group">
        <div class="hero-icon-circle">
          <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.home} /></svg></md-icon>
        </div>
        <span class="hero-title">{store.L.status.deviceTitle || "Device"}</span>
      </div>
      <div class="hero-main-info">
        {#if store.loading.status}
          <Skeleton width="150px" height="32px" />
          <Skeleton width="80px" height="24px" style="margin-top: 12px;" />
        {:else}
          <span class="device-model">{store.device.model}</span>
          <div class="version-pill">
            <span>Magic Mount v{store.version}</span>
          </div>
        {/if}
      </div>
    </div>
    <div class="hero-actions">
        <md-icon-button 
            onclick={copyDebugInfo} 
            title={store.L.status.copy || "Copy info"}
            role="button"
            tabindex="0"
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') copyDebugInfo(); }}
        >
            <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.copy} /></svg></md-icon>
        </md-icon-button>
    </div>
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
        <span class="info-label">{store.L.status.androidLabel || "Android"}</span>
        {#if store.loading.status}
          <Skeleton width="60px" height="16px" />
        {:else}
          <span class="info-val">{store.device.android}</span>
        {/if}
      </div>

      <div class="info-item">
        <span class="info-label">{store.L.status.selinuxLabel || "SELinux"}</span>
        {#if store.loading.status}
          <Skeleton width="80px" height="16px" />
        {:else}
          <span class="info-val" class:warn={!isSelinuxEnforcing}>
            {store.device.selinux}
          </span>
        {/if}
      </div>

      <div class="info-item full-width">
        <span class="info-label">{store.L.status.kernelLabel || "Kernel"}</span>
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
  <div class="spacer"></div>
  <md-filled-tonal-icon-button 
    class="reboot-btn"
    onclick={() => showRebootConfirm = true}
    title={store.L.common?.reboot || "Reboot Device"}
    role="button"
    tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') showRebootConfirm = true; }}
  >
    <md-icon>
        <svg viewBox="0 0 24 24"><path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z"/></svg>
    </md-icon>
  </md-filled-tonal-icon-button>

  <md-filled-tonal-icon-button 
    onclick={() => store.loadStatus()} 
    disabled={store.loading.status}
    title={store.L.logs.refresh}
    role="button"
    tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') store.loadStatus(); }}
  >
    <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.refresh} /></svg></md-icon>
  </md-filled-tonal-icon-button>
</BottomActions>