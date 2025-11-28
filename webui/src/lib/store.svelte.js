import { API } from './api';
import { DEFAULT_CONFIG, DEFAULT_SEED } from './constants';
import { Monet } from './theme';

// Eager load locales
const localeModules = import.meta.glob('../locales/*.json', { eager: true });

export const store = $state({
  config: { ...DEFAULT_CONFIG },
  modules: [],
  logs: [],
  storage: { used: '-', size: '-', percent: '0%', type: 'unknown' },
  
  // UI State
  loading: { config: false, modules: false, logs: false, status: false },
  saving: { config: false, modules: false },
  toast: { text: '', type: 'info', visible: false },
  
  // Settings
  theme: 'dark',
  lang: 'en',
  seed: DEFAULT_SEED,
  loadedLocale: null,

  get availableLanguages() {
    return Object.entries(localeModules).map(([path, mod]) => {
      const match = path.match(/\/([^/]+)\.json$/);
      const code = match ? match[1] : 'en';
      const name = mod.default?.lang?.display || code.toUpperCase();
      return { code, name };
    }).sort((a, b) => {
      if (a.code === 'en') return -1;
      if (b.code === 'en') return 1;
      return a.code.localeCompare(b.code);
    });
  },

  get L() {
    return this.loadedLocale || this.getFallbackLocale();
  },

  getFallbackLocale() {
    // Basic fallback to prevent crash
    return {
        common: { appName: "Magic Mount", saving: "Saving...", theme: "Theme", language: "Language" },
        lang: { display: "English" },
        tabs: { status: "Status", config: "Config", modules: "Modules", logs: "Logs" },
        status: { storageTitle: "Storage", storageDesc: "/data/adb usage", moduleTitle: "Modules", moduleActive: "Active", modeStats: "Stats", modeAuto: "Auto", modeMagic: "Magic" },
        config: { title: "Config", verboseLabel: "Verbose", verboseOff: "Off", verboseOn: "On", moduleDir: "Module Dir", tempDir: "Temp Dir", mountSource: "Mount Source", logFile: "Log File", partitions: "Partitions", autoPlaceholder: "Auto", reload: "Reload", save: "Save", reset: "Reset", invalidPath: "Invalid path", loadSuccess: "Config Loaded", loadError: "Load Error", loadDefault: "Using Default", saveSuccess: "Saved", saveFailed: "Save Failed", umountLabel: "Umount", umountOff: "Unmount", umountOn: "No Unmount" },
        modules: { title: "Modules", desc: "Toggle Magic Mount (Skip Mount file)", modeAuto: "Default", modeMagic: "Magic", scanning: "Scanning...", reload: "Refresh", save: "Save", empty: "Empty", scanError: "Scan Failed", saveSuccess: "Saved", saveFailed: "Failed", searchPlaceholder: "Search", filterLabel: "Filter", filterAll: "All", toggleError: "Toggle Failed" },
        logs: { title: "Logs", loading: "Loading...", refresh: "Refresh", empty: "Empty", copy: "Copy", copySuccess: "Copied", copyFail: "Failed", searchPlaceholder: "Search", filterLabel: "Level", levels: { all: "All", info: "Info", warn: "Warn", error: "Error" }, current: "Current", old: "Old", readFailed: "Read Failed", readException: "Exception" }
    };
  },

  get modeStats() {
    let auto = 0;
    let magic = 0;
    this.modules.forEach(m => {
      // Logic: skipMount=true means 'magic' mode in terms of "we are intervening" 
      // or "default" depending on definition. 
      // In original code: skip_mount present = skip.
      // Hybrid UI uses 'magic' vs 'auto'.
      // Let's align: skipMount=true -> Magic Mode (Intervention)
      if (m.skipMount) magic++;
      else auto++;
    });
    return { auto, magic };
  },

  showToast(msg, type = 'info') {
    this.toast = { text: msg, type, visible: true };
    setTimeout(() => { this.toast.visible = false; }, 3000);
  },

  setTheme(newTheme) {
    this.theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('mm-theme', newTheme);
    Monet.apply(this.seed, newTheme === 'dark');
  },

  async setLang(code) {
    const path = `../locales/${code}.json`;
    if (localeModules[path]) {
      try {
        const mod = localeModules[path];
        this.loadedLocale = mod.default; 
        this.lang = code;
        localStorage.setItem('mm-lang', code);
      } catch (e) {
        console.error(`Failed to load locale: ${code}`, e);
        if (code !== 'en') await this.setLang('en');
      }
    }
  },

  async init() {
    const savedLang = localStorage.getItem('mm-lang') || 'en';
    await this.setLang(savedLang);
    
    const savedTheme = localStorage.getItem('mm-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setTheme(savedTheme || (systemDark ? 'dark' : 'light'));

    const sysColor = await API.fetchSystemColor();
    if (sysColor) {
      this.seed = sysColor;
      Monet.apply(this.seed, this.theme === 'dark');
    }

    await this.loadConfig();
  },

  async loadConfig() {
    this.loading.config = true;
    try {
      this.config = await API.loadConfig();
      if (this.L?.config) this.showToast(this.L.config.loadSuccess);
    } catch (e) {
      if (this.L?.config) this.showToast(this.L.config.loadError, 'error');
    }
    this.loading.config = false;
  },

  async saveConfig() {
    this.saving.config = true;
    try {
      await API.saveConfig(this.config);
      this.showToast(this.L.config.saveSuccess);
    } catch (e) {
      this.showToast(this.L.config.saveFailed, 'error');
    }
    this.saving.config = false;
  },

  async loadModules() {
    this.loading.modules = true;
    try {
      this.modules = await API.scanModules(this.config.moduledir);
    } catch (e) {
      this.showToast(this.L.modules.scanError, 'error');
    }
    this.loading.modules = false;
  },

  async toggleModuleMode(moduleId, currentSkip) {
      try {
          await API.toggleSkipMount(moduleId, !currentSkip, this.config.moduledir);
          // Update local state optimistically
          this.modules = this.modules.map(m => 
              m.id === moduleId ? { ...m, skipMount: !currentSkip, mode: (!currentSkip ? 'magic' : 'auto') } : m
          );
      } catch (e) {
          this.showToast(this.L.modules.toggleError, 'error');
      }
  },

  async loadLogs(silent = false) {
    if (!silent) this.loading.logs = true;
    try {
      const raw = await API.readLogs(PATHS.LOG_FILE, 1000);
      if (!raw) {
        this.logs = [{ text: this.L.logs.empty, type: 'debug' }];
      } else {
        this.logs = raw.split('\n').map(line => {
          let type = 'debug';
          if (line.includes('[ERROR]')) type = 'error';
          else if (line.includes('[WARN]')) type = 'warn';
          else if (line.includes('[INFO]')) type = 'info';
          return { text: line, type };
        });
      }
    } catch (e) {
      this.logs = [{ text: `Error: ${e.message}`, type: 'error' }];
      if (!silent) this.showToast(this.L.logs.readFailed, 'error');
    }
    this.loading.logs = false;
  },

  async loadStatus() {
    this.loading.status = true;
    try {
      this.storage = await API.getStorageUsage();
      if (this.modules.length === 0) {
        await this.loadModules();
      }
    } catch (e) {}
    this.loading.status = false;
  }
});