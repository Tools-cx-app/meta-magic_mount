<script>
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import './NavBar.css';
  let { activeTab, onTabChange } = $props();
  let navContainer = $state();
  let tabRefs = $state({});
  const TABS = [
    { id: 'status', icon: ICONS.home },
    { id: 'config', icon: ICONS.settings },
    { id: 'modules', icon: ICONS.modules },
    { id: 'logs', icon: ICONS.description },
    { id: 'info', icon: ICONS.info }
  ];
  $effect(() => {
    if (activeTab && tabRefs[activeTab] && navContainer) {
      const tab = tabRefs[activeTab];
      const containerWidth = navContainer.clientWidth;
      const tabLeft = tab.offsetLeft;
      const tabWidth = tab.clientWidth;
      const scrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);
      navContainer.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  });
</script>
<nav class="bottom-nav" bind:this={navContainer}>
  {#each TABS as tab}
    <button 
      class="nav-tab {activeTab === tab.id ? 'active' : ''}" 
      onclick={() => onTabChange(tab.id)}
      bind:this={tabRefs[tab.id]}
      type="button"
    >
      <div class="icon-container">
        <svg viewBox="0 0 24 24"><path d={tab.icon}/></svg>
      </div>
      <span class="label">{store.L.tabs[tab.id]}</span>
    </button>
  {/each}
</nav>