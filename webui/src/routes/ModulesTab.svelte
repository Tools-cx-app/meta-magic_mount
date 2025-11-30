<script>
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import Skeleton from '../components/Skeleton.svelte';
  import './ModulesTab.css';

  let searchQuery = $state('');
  let expandedMap = $state({});

  onMount(() => {
    store.loadModules();
  });

  let filteredModules = $derived(store.modules.filter(m => {
    const q = searchQuery.toLowerCase();
    const matchSearch = m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    return matchSearch;
  }));

  function toggleExpand(id) {
    if (expandedMap[id]) {
      delete expandedMap[id];
    } else {
      expandedMap[id] = true;
    }
    expandedMap = { ...expandedMap };
  }

  function handleKeydown(e, id) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand(id);
    }
  }
</script>

<div class="search-container">
  <svg class="search-icon" viewBox="0 0 24 24"><path d={ICONS.search} /></svg>
  <input 
    type="text" 
    class="search-input" 
    placeholder={store.L.modules.searchPlaceholder}
    bind:value={searchQuery}
  />
</div>

{#if store.loading.modules}
  <div class="rules-list">
    {#each Array(5) as _}
      <div class="rule-card">
        <div class="rule-info">
          <div style="display:flex; flex-direction:column; gap: 6px; width: 100%;">
            <Skeleton width="60%" height="20px" />
            <Skeleton width="40%" height="14px" />
          </div>
        </div>
      </div>
    {/each}
  </div>
{:else if filteredModules.length === 0}
  <div style="text-align:center; padding: 40px; opacity: 0.6">
    {store.modules.length === 0 ? store.L.modules.empty : "No matching modules"}
  </div>
{:else}
  <div class="rules-list">
    {#each filteredModules as mod (mod.id)}
      <div 
        class="rule-card" 
        class:expanded={expandedMap[mod.id]} 
        onclick={() => toggleExpand(mod.id)}
        onkeydown={(e) => handleKeydown(e, mod.id)}
        role="button"
        tabindex="0"
      >
        <div class="rule-main">
          <div class="rule-info">
            <div style="display:flex; flex-direction:column;">
              <span class="module-name">{mod.name}</span>
              <span class="module-id">{mod.id} <span style="opacity:0.6; margin-left: 8px;">{mod.version}</span></span>
            </div>
          </div>
        </div>
        
        {#if expandedMap[mod.id]}
          <div class="rule-details" transition:slide={{ duration: 200 }}>
            <p class="module-desc">{mod.description || 'No description'}</p>
            {#if mod.disabledByFlag}
                <p style="color: var(--md-sys-color-error); font-size: 12px; font-weight: bold;">
                    Module is disabled or removed via KernelSU manager.
                </p>
            {/if}
            {#if mod.skipMount}
                <p style="color: var(--md-sys-color-on-surface-variant); font-size: 12px; opacity: 0.7;">
                    Skipped by skip_mount flag.
                </p>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<div class="bottom-actions">
  <button class="btn-tonal" onclick={() => store.loadModules()} disabled={store.loading.modules} title={store.L.modules.reload}>
    <svg viewBox="0 0 24 24" width="20" height="20"><path d={ICONS.refresh} fill="currentColor"/></svg>
  </button>
</div>