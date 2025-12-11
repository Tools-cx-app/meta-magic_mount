<script>
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import Skeleton from '../components/Skeleton.svelte';
  import BottomActions from '../components/BottomActions.svelte';
  import './ModulesTab.css';

  let searchQuery = $state('');
  let expandedId = $state(null);

  onMount(() => {
    store.loadModules();
  });

  let filteredModules = $derived(store.modules.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchSearch = m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    return matchSearch;
  }));

  function toggleExpand(id) {
    expandedId = expandedId === id ? null : id;
  }

  function handleKeydown(e, id) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand(id);
    }
  }
</script>

<div class="md3-card desc-card">
  <p class="desc-text">
    {store.L.modules?.desc || "Modules are strictly managed by Magic Mount strategy."}
  </p>
</div>

<div class="search-container">
  <svg class="search-icon" viewBox="0 0 24 24"><path d={ICONS.search} /></svg>
  <input 
    type="text" 
    class="search-input" 
    placeholder={store.L.modules?.searchPlaceholder}
    bind:value={searchQuery}
  />
</div>

{#if store.loading.modules}
  <div class="rules-list">
    {#each Array(5) as _}
      <div class="rule-card">
        <div class="rule-info">
          <div class="skeleton-group">
            <Skeleton width="60%" height="20px" />
            <Skeleton width="40%" height="14px" />
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else if filteredModules.length === 0}
  <div class="empty-state">
    {store.modules.length === 0 ? (store.L.modules?.empty ?? "No modules found") : "No matching modules"}
  </div>
{:else}
  <div class="rules-list">
    {#each filteredModules as mod (mod.id)}
      <div 
        class="rule-card" 
        class:expanded={expandedId === mod.id} 
        class:unmounted={!mod.is_mounted}
      >
        <div 
            class="rule-main"
            onclick={() => toggleExpand(mod.id)}
            onkeydown={(e) => handleKeydown(e, mod.id)}
            role="button"
            tabindex="0"
        >
          <div class="rule-info">
            <div class="info-col">
              <span class="module-name">{mod.name}</span>
              <span class="module-id">{mod.id} <span class="version-tag">{mod.version}</span></span>
            </div>
          </div>
          
          {#if mod.is_mounted}
             <div class="mode-badge badge-magic">Magic</div>
          {:else}
             <div class="mode-badge badge-none">Skipped</div>
          {/if}
        </div>
        
        {#if expandedId === mod.id}
          <div class="rule-details" transition:slide={{ duration: 200 }}>
            <p class="module-desc">{mod.description || 'No description'}</p>
            <p class="module-meta">Author: {mod.author || 'Unknown'}</p>
            
            {#if !mod.is_mounted}
                <div class="status-alert">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d={ICONS.info} fill="currentColor"/></svg>
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

<BottomActions>
  <button class="btn-tonal" onclick={() => store.loadModules()} disabled={store.loading.modules} title={store.L.modules?.reload}>
    <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.refresh} fill="currentColor"/></svg>
  </button>
</BottomActions>