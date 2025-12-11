<script>
  import { store } from '../lib/store.svelte';
  import './InfoTab.css';
</script>

<div class="info-container">
  
  <div class="header-section">
    <div class="logo-circle">
      <svg viewBox="0 0 24 24" width="48" height="48">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/>
      </svg>
    </div>
    <h1 class="app-name">{store.L.common?.appName || 'Magic Mount'}</h1>
    <div class="version-badge">v{store.version}</div>
  </div>

  <div class="info-card">
    <div class="info-row">
      <span class="label">Theme</span>
      <span class="value" style="text-transform: capitalize;">{store.theme}</span>
    </div>
    <div class="divider"></div>
    <div class="info-row">
      <span class="label">Language</span>
      <span class="value" style="text-transform: uppercase;">{store.lang}</span>
    </div>
    <div class="divider"></div>
    <div class="info-row">
      <span class="label">Modules Loaded</span>
      <span class="value">{store.modules.length}</span>
    </div>
  </div>

  <div class="footer-text">
    <p>Magic Mount Manager</p>
  </div>

</div>