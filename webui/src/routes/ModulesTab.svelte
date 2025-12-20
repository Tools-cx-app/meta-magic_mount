<script lang="ts">
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import Skeleton from '../components/Skeleton.svelte';
  import BottomActions from '../components/BottomActions.svelte';
  import './ModulesTab.css';
  
  import '@material/web/textfield/outlined-text-field.js';
  import '@material/web/icon/icon.js';
  import '@material/web/ripple/ripple.js';
  import '@material/web/iconbutton/filled-tonal-icon-button.js';

  let searchQuery = $state('');
  let expandedId = $state<string | null>(null);

  onMount(() => {
    store.loadModules();
  });

  let filteredModules = $derived(store.modules.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchSearch = m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    return matchSearch;
  }));

  function toggleExpand(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  function handleKeydown(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand(id);
    }
  }
  
  function handleInput(e: Event) {
      searchQuery = (e.target as HTMLInputElement).value;
  }
</script>

<div class="modules-container">
  <div class="desc-card">
    <div class="desc-icon">
        <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.info} /></svg></md-icon>
    </div>
    <p class="desc-text">
      {store.L.modules?.desc || "Modules are strictly managed by Magic Mount strategy."}
    </p>
  </div>

  <div class="search-section">
    <md-outlined-text-field 
        label={store.L.modules?.searchPlaceholder || "Search modules..."}
        value={searchQuery}
        oninput={handleInput}
        class="search-field"
    >
        <md-icon slot="leading-icon"><svg viewBox="0 0 24 24"><path d={ICONS.search} /></svg></md-icon>
    </md-outlined-text-field>
  </div>

  {#if store.loading.modules}
    <div class="modules-list">
      {#each Array(5) as _}
        <div class="module-card skeleton-card">
          <Skeleton width="60%" height="20px" />
          <Skeleton width="40%" height="14px" style="margin-top: 8px;" />
        </div>
      {/each}
    </div>
  {:else if filteredModules.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
          <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.modules} /></svg></md-icon>
      </div>
      <p>{store.modules.length === 0 ? (store.L.modules?.empty || "No modules found") : "No matching modules"}</p>
    </div>
  {:else}
    <div class="modules-list">
      {#each filteredModules as mod (mod.id)}
        <div 
          class="module-card" 
          class:expanded={expandedId === mod.id}
          class:unmounted={!mod.is_mounted}
        >
          <div 
             class="card-main clickable"
              onclick={() => toggleExpand(mod.id)}
              onkeydown={(e) => handleKeydown(e, mod.id)}
              role="button"
              tabindex="0"
          >
            <md-ripple></md-ripple>
            <div class="module-info">
              <span class="module-name">{mod.name}</span>
              <div class="module-meta-row">
                  <span class="module-id">{mod.id}</span>
                  <span class="version-tag">{mod.version}</span>
              </div>
            </div>
     
            <div class="status-badge" class:magic={mod.is_mounted} class:skipped={!mod.is_mounted}>
                {mod.is_mounted ? 'Magic' : 'Skipped'}
            </div>
          </div>

          {#if expandedId === mod.id}
            <div class="card-details" transition:slide={{ duration: 200 }}>
              <div class="detail-row">
                  <span class="detail-label">Author</span>
                  <span class="detail-value">{mod.author || 'Unknown'}</span>
              </div>
              <div class="detail-row description">
                  <span class="detail-label">Description</span>
                  <p class="detail-value">{mod.description || 'No description'}</p>
              </div>
              
              {#if !mod.is_mounted}
                  <div class="status-alert">
                      <md-icon class="alert-icon"><svg viewBox="0 0 24 24"><path d={ICONS.info} /></svg></md-icon>
                      <span>
                          {#if mod.disabledByFlag}
                              Disabled via Manager or 'disable' file.
                          {:else if mod.skipMount}
                              Skipped via 'skip_mount' flag.
                          {:else}
                              Not mounted.
                          {/if}
                      </span>
                  </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<BottomActions>
  <div class="spacer"></div>
  <md-filled-tonal-icon-button 
    onclick={() => store.loadModules()} 
    disabled={store.loading.modules}
    title={store.L.modules?.reload || "Refresh"}
    role="button"
    tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') store.loadModules(); }}
  >
    <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.refresh} /></svg></md-icon>
  </md-filled-tonal-icon-button>
</BottomActions>