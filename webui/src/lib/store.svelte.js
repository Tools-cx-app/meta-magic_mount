import { API } from './api';
import { DEFAULT_CONFIG, DEFAULT_SEED } from './constants';
import { Monet } from './theme';

const localeModules = import.meta.glob('../locales/*.json', { eager: true });

export const store = $state({
  config: { ...DEFAULT_CONFIG },
  modules: [],
  logs: "", 
  device: { model: 'Loading...', android: '-', kernel: '-', selinux: '-' },
  
  loading: { config: false, modules: false, logs: false, status: false },
  saving: { config: false, modules: false },
  toast: { text: '', type: 'info', visible: false },
  
  // Settings
  theme: 'auto', // 'auto' | 'light' | 'dark'
  isSystemDark: false,
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
    return {
        common: { appName: "Magic Mount", saving: "...", theme: "Theme", language: "Language", themeAuto: "Auto", themeLight: "Light", themeDark: "Dark" },
        lang: { display: "English" },
        tabs: { status: "Status", config: "Config", modules: "Modules", logs: "Logs" },
        status: { deviceTitle: "Device Info", moduleTitle: "Modules", moduleActive: "Active Modules", modelLabel: "Model", androidLabel: "Android", kernelLabel: "Kernel", selinuxLabel: "SELinux" },
        config: { title: "Config", verboseLabel: "Verbose", verboseOff: "Off", verboseOn: "On", moduleDir: "Module Dir", tempDir: "Temp Dir", mountSource: "Mount Source", logFile: "Log File", partitions: "Partitions", autoPlaceholder: "Auto", reload: "Reload", save: "Save", reset: "Reset", invalidPath: "Invalid path", loadSuccess: "Config Loaded", loadError: "Load Error", loadDefault: "Using Default", saveSuccess: "Saved", saveFailed: "Save Failed", umountLabel: "Umount", umountOff: "Unmount", umountOn: "No Unmount" },
        modules: { title: "Modules", desc: "Modules strictly managed by Magic Mount.", scanning: "Scanning...", reload: "Refresh", save: "Save", empty: "No magic-mounted modules", scanError: "Scan Failed", saveSuccess: "Saved", saveFailed: "Failed", searchPlaceholder: "Search", filterLabel: "Filter", filterAll: "All", toggleError: "Toggle Failed" },
        logs: { title: "Logs", loading: "Loading...", refresh: "Refresh", empty: "Empty", copy: "Copy", copySuccess: "Copied", copyFail: "Failed", searchPlaceholder: "Search", filterLabel: "Level", levels: { all: "All", info: "Info", warn: "Warn", error: "Error" }, current: "Current", old: "Old", readFailed: "Read Failed", readException: "Exception" }
    };
  },

  showToast(msg, type = 'info') {
    this.toast = { text: msg, type, visible: true };
    setTimeout(() => { this.toast.visible = false; }, 3000);
  },

  applyTheme() {
    const isDark = this.theme === 'auto' ? this.isSystemDark : this.theme === 'dark';
    const attr = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', attr);
    Monet.apply(this.seed, isDark);
  },

  setTheme(newTheme) {
    this.theme = newTheme;
    localStorage.setItem('mm-theme', newTheme);
    this.applyTheme();
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
    
    this.theme = localStorage.getItem('mm-theme') || 'auto';
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.isSystemDark = mediaQuery.matches;
    
    mediaQuery.addEventListener('change', (e) => {
      this.isSystemDark = e.matches;
      if (this.theme === 'auto') {
        this.applyTheme();
      }
    });
    
    const sysColor = await API.fetchSystemColor();
    if (sysColor) {
      this.seed = sysColor;
    }
    
    this.applyTheme();
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

  async loadLogs(silent = false) {
    if (!silent) this.loading.logs = true;
    try {
      const raw = await API.readLogs();
      this.logs = raw || this.L.logs.empty;
    } catch (e) {
      this.logs = `Error loading logs: ${e.message}`;
      if (!silent) this.showToast(this.L.logs.readFailed, 'error');
    }
    this.loading.logs = false;
  },

  async loadStatus() {
    this.loading.status = true;
    try {
      this.device = await API.getDeviceStatus();
      if (this.modules.length === 0) {
        await this.loadModules();
      }
    } catch (e) {}
    this.loading.status = false;
  }
});