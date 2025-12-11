<script>
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import './TopBar.css';

  let showLangMenu = $state(false);
  let langButtonRef = $state();
  let menuRef = $state();

  function toggleTheme() {
    let nextTheme;
    let toastMsg;
    const common = store.L?.common;

    if (store.theme === 'auto') {
      nextTheme = 'light';
      toastMsg = common?.themeLight ?? 'Light Mode';
    } else if (store.theme === 'light') {
      nextTheme = 'dark';
      toastMsg = common?.themeDark ?? 'Dark Mode';
    } else {
      nextTheme = 'auto';
      toastMsg = common?.themeAuto ?? 'Auto Mode';
    }

    store.setTheme(nextTheme);
    store.showToast(toastMsg, 'info');
  }

  function getThemeIcon() {
    if (store.theme === 'auto') return ICONS.auto_mode;
    if (store.theme === 'light') return ICONS.light_mode;
    return ICONS.dark_mode;
  }

  function setLang(code) {
    store.setLang(code);
    showLangMenu = false;
  }
  
  function handleOutsideClick(e) {
    if (showLangMenu && 
        menuRef && !menuRef.contains(e.target) && 
        langButtonRef && !langButtonRef.contains(e.target)) {
      showLangMenu = false;
    }
  }
</script>

<svelte:window onclick={handleOutsideClick} />

<header class="top-bar">
  <div class="top-bar-content">
    <h1 class="screen-title">{store.L?.common?.appName}</h1>
    <div class="top-actions">
      <button class="btn-icon" onclick={toggleTheme} title={store.L?.common?.theme}>
        <svg viewBox="0 0 24 24"><path d={getThemeIcon()} fill="currentColor"/></svg>
      </button>

      <button 
        class="btn-icon" 
        bind:this={langButtonRef}
        onclick={() => showLangMenu = !showLangMenu} 
        title={store.L?.common?.language}
      >
        <svg viewBox="0 0 24 24"><path d={ICONS.translate} fill="currentColor"/></svg>
      </button>

      {#if showLangMenu}
        <div class="menu-dropdown" bind:this={menuRef}>
            {#each store.availableLanguages ?? [] as l}
                <button class="menu-item" onclick={() => setLang(l.code)}>{l.name}</button>
            {/each}
        </div>
      {/if}
    </div>
  </div>
</header>