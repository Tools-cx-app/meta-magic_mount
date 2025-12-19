<script>
  import { store } from '../lib/store.svelte';
  import { ICONS } from '../lib/constants';
  import ChipInput from '../components/ChipInput.svelte';
  import BottomActions from '../components/BottomActions.svelte';
  import './ConfigTab.css';
  import '@material/web/textfield/outlined-text-field.js';
  import '@material/web/button/filled-button.js';
  import '@material/web/iconbutton/filled-tonal-icon-button.js';
  import '@material/web/iconbutton/icon-button.js';
  import '@material/web/icon/icon.js';
  import '@material/web/ripple/ripple.js';
  
  let initialConfigStr = $state('');
  
  const isValidPath = (p) => !p || (p.startsWith('/') && p.length > 1);
  let invalidModuleDir = $derived(!isValidPath(store.config.moduledir));
  
  let isDirty = $derived.by(() => {
    if (!initialConfigStr) return false;
    return JSON.stringify(store.config) !== initialConfigStr;
  });

  $effect(() => {
    if (!store.loading.config && store.config) {
      if (!initialConfigStr || initialConfigStr === JSON.stringify(store.config)) {
        initialConfigStr = JSON.stringify(store.config);
      }
    }
  });

  function save() {
    if (invalidModuleDir) {
      store.showToast(store.L.config.invalidPath, "error");
      return;
    }
    store.saveConfig().then(() => {
        initialConfigStr = JSON.stringify(store.config);
    });
  }
  
  function reload() {
    store.loadConfig().then(() => {
        initialConfigStr = JSON.stringify(store.config);
    });
  }
  
  function toggle(key) {
    if (typeof store.config[key] === 'boolean') {
      store.config[key] = !store.config[key];
    }
  }

  function handleInput(key, value) {
    store.config[key] = value;
  }
</script>

<div class="config-container">
  <section class="config-group">
    <div class="config-card">
      <div class="card-header">
        <div class="card-icon">
          <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.modules} /></svg></md-icon>
        </div>
        <div class="card-text">
          <span class="card-title">{store.L.config.moduleDir}</span>
          <span class="card-desc">Set the directory where modules are stored</span>
        </div>
      </div>
      
      <div class="input-stack">
        <md-outlined-text-field 
          label={store.L.config.moduleDir} 
          value={store.config.moduledir}
          oninput={(e) => handleInput('moduledir', e.target.value)}
          error={invalidModuleDir}
          supporting-text={invalidModuleDir ? (store.L.config.invalidPath || "Invalid Path") : ""}
          class="full-width-field"
        >
          <md-icon slot="leading-icon"><svg viewBox="0 0 24 24"><path d={ICONS.modules} /></svg></md-icon>
        </md-outlined-text-field>
      </div>
    </div>

    <div class="config-card">
      <div class="card-header">
        <div class="card-icon">
          <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.ksu} /></svg></md-icon>
        </div>
        <div class="card-text">
          <span class="card-title">{store.L.config.mountSource}</span>
          <span class="card-desc">Global mount source namespace (e.g. KSU)</span>
        </div>
      </div>
      
      <div class="input-stack">
        <md-outlined-text-field 
          label={store.L.config.mountSource} 
          value={store.config.mountsource}
          oninput={(e) => handleInput('mountsource', e.target.value)}
          class="full-width-field"
        >
          <md-icon slot="leading-icon"><svg viewBox="0 0 24 24"><path d={ICONS.ksu} /></svg></md-icon>
        </md-outlined-text-field>
      </div>
    </div>
  </section>
  
  <section class="config-group">
    <div class="config-card">
      <div class="card-header">
        <div class="card-icon">
           <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.storage} /></svg></md-icon>
        </div>
        <div class="card-text">
          <span class="card-title">{store.L.config.partitions}</span>
          <span class="card-desc">Add partitions to mount</span>
        </div>
      </div>
      <div class="p-input">
        <ChipInput bind:values={store.config.partitions} placeholder="e.g. product, system_ext..." />
      </div>
    </div>
  </section>
  
  <section class="config-group">
    <div class="options-grid">
      <button 
        class="option-tile clickable primary" 
        class:active={store.config.verbose} 
        onclick={() => toggle('verbose')}
      >
        <md-ripple></md-ripple>
        <div class="tile-top">
          <div class="tile-icon">
            <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.description} /></svg></md-icon>
          </div>
        </div>
        <div class="tile-bottom">
          <span class="tile-label">{store.L.config.verboseLabel}</span>
        </div>
      </button>

      <button 
        class="option-tile clickable tertiary" 
        class:active={store.config.disable_umount} 
        onclick={() => toggle('disable_umount')}
      >
        <md-ripple></md-ripple>
        <div class="tile-top">
          <div class="tile-icon">
            <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.anchor} /></svg></md-icon>
          </div>
        </div>
        <div class="tile-bottom">
          <span class="tile-label">{store.L.config.umountLabel || 'Disable Umount'}</span>
        </div>
      </button>
    </div>
  </section>
</div>

<BottomActions>
  <md-filled-tonal-icon-button 
    onclick={reload}
    disabled={store.loading.config}
    title={store.L.config.reload}
  >
    <md-icon><svg viewBox="0 0 24 24"><path d={ICONS.refresh} /></svg></md-icon>
  </md-filled-tonal-icon-button>
  
  <div class="spacer"></div>

  <md-filled-button 
    onclick={save} 
    disabled={store.saving.config || !isDirty}
  >
    <md-icon slot="icon"><svg viewBox="0 0 24 24"><path d={ICONS.save} /></svg></md-icon>
    {store.saving.config ? store.L.common.saving : store.L.config.save}
  </md-filled-button>
</BottomActions>