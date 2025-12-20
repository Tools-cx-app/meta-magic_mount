import { API, type MagicConfig, type MagicModule, type DeviceStatus, type StorageUsage, type SystemInfo } from './api';
import { DEFAULT_CONFIG, DEFAULT_SEED } from './constants';
import { Monet } from './theme';

const localeModules = import.meta.glob('../locales/*.json', { eager: true });
const modulesAny: Record<string, any> = localeModules;

let darkModeQuery: MediaQueryList;

export interface LogEntry {
    text: string;
    type: 'info' | 'error' | 'warn' | 'debug';
}

const createStore = () => {
  let theme = $state('auto');
  let isSystemDark = $state(false);
  let lang = $state('en');
  let seed = $state(DEFAULT_SEED);
  let loadedLocale = $state<any>(null);
  let toast = $state({ id: 'init', text: '', type: 'info', visible: false });

  let fixBottomNav = $state(false);

  const availableLanguages = Object.entries(modulesAny).map(([path, moduleData]) => {
    const mod = moduleData as any;
    const match = path.match(/\/([^/]+)\.json$/);
    const code = match ? match[1] : 'en';
    const name = mod.default?.lang?.display || code.toUpperCase();
    return { code, name };
  }).sort((a, b) => {
    if (a.code === 'en') return -1;
    if (b.code === 'en') return 1;
    return a.name.localeCompare(b.name);
  });

  let config = $state<MagicConfig>(DEFAULT_CONFIG);
  let modules = $state<MagicModule[]>([]);
  let logs = $state<LogEntry[]>([]);
  
  let device = $state<DeviceStatus>({ model: '-', android: '-', kernel: '-', selinux: '-' });
  let version = $state('...');
  let storage = $state<StorageUsage>({ used: '-', size: '-', percent: '0%', type: null, hymofs_available: false });
  let systemInfo = $state<SystemInfo>({ kernel: '-', selinux: '-', mountBase: '-', activeMounts: [] });
  let activePartitions = $state<string[]>([]);
  let diagnostics = $state<any[]>([]);

  let loadingConfig = $state(false);
  let loadingModules = $state(false);
  let loadingLogs = $state(false);
  let loadingStatus = $state(false);
  let loadingDiagnostics = $state(false);
  
  let savingConfig = $state(false);
  let savingModules = $state(false);

  let L = $derived(loadedLocale?.default || {});

  let modeStats = $derived.by(() => {
    const stats = { auto: 0, magic: 0, hymofs: 0 };
    modules.forEach(m => {
        if (!m.is_mounted) return;
        stats.magic++;
    });
    return stats;
  });

  function showToast(text: string, type = 'info') {
    const id = Date.now().toString();
    toast = { id, text, type, visible: true };
    setTimeout(() => {
      if (toast.id === id) {
        toast.visible = false;
      }
    }, 3000);
  }

  function setTheme(t: string) {
    theme = t;
    localStorage.setItem('mm-theme', t);
    applyTheme();
  }

  function toggleBottomNavFix() {
    fixBottomNav = !fixBottomNav;
    localStorage.setItem('mm-fix-nav', String(fixBottomNav));
  }

  function applyTheme() {
    const isDark = theme === 'auto' ? isSystemDark : theme === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    Monet.apply(seed, isDark);
  }

  async function loadLocale(code: string) {
    const path = `../locales/${code}.json`;
    const entry = Object.entries(modulesAny).find(([k]) => k.endsWith(`/${code}.json`));
    if (entry) {
        loadedLocale = entry[1];
    } else {
        const enEntry = Object.entries(modulesAny).find(([k]) => k.endsWith('/en.json'));
        if (enEntry) loadedLocale = enEntry[1];
    }
  }

  function setLang(code: string) {
    lang = code;
    localStorage.setItem('mm-lang', code);
    loadLocale(code);
  }

  async function init() {
    const savedLang = localStorage.getItem('mm-lang') || 'en';
    lang = savedLang;
    await loadLocale(savedLang);

    const savedTheme = localStorage.getItem('mm-theme');
    if (savedTheme) {
        theme = savedTheme;
    }

    const savedNavFix = localStorage.getItem('mm-fix-nav');
    if (savedNavFix === 'true') {
        fixBottomNav = true;
    }

    if (!darkModeQuery && typeof window !== 'undefined') {
        darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        isSystemDark = darkModeQuery.matches;
        darkModeQuery.addEventListener('change', (e) => {
          isSystemDark = e.matches;
          applyTheme();
        });
    }

    try {
        const sysColor = await API.fetchSystemColor();
        if (sysColor) {
            seed = sysColor;
        }
    } catch {}
    
    applyTheme();
    
    await Promise.all([
      loadConfig(),
      loadStatus()
    ]);
  }

  async function loadConfig() {
    loadingConfig = true;
    try {
      config = await API.loadConfig();
    } catch (e) {
      showToast('Failed to load config', 'error');
    }
    loadingConfig = false;
  }
  
  async function resetConfig() {
      loadingConfig = true;
      try {
          config = { ...DEFAULT_CONFIG }; 
          await saveConfig();
          showToast(L.common?.resetSuccess || 'Config Reset', 'success');
      } catch(e) {
          showToast(L.common?.resetFailed || 'Failed to reset', 'error');
      }
      loadingConfig = false;
  }

  async function saveConfig() {
    savingConfig = true;
    try {
      await API.saveConfig($state.snapshot(config));
      showToast(L.common?.saveSuccess || 'Saved', 'success');
    } catch (e) {
      showToast('Failed to save config', 'error');
    }
    savingConfig = false;
  }

  async function loadModules() {
    loadingModules = true;
    try {
      modules = await API.scanModules(config.moduledir);
    } catch (e) {
      showToast('Failed to load modules', 'error');
    }
    loadingModules = false;
  }

  async function saveModules() {
    showToast("Not supported in this version", "info");
  }

  async function loadLogs(silent = false) {
    if (!silent) loadingLogs = true;
    try {
      const rawLogs = await API.readLogs();
      logs = rawLogs.split('\n').map((line: string) => {
        let type: LogEntry['type'] = 'info';
        if (line.includes('[E]') || line.includes('ERROR')) type = 'error';
        else if (line.includes('[W]') || line.includes('WARN')) type = 'warn';
        else if (line.includes('[D]') || line.includes('DEBUG')) type = 'debug';
        return { text: line, type };
      });
    } catch (e) {
      logs = [{ text: "Failed to load logs.", type: 'error' }];
    }
    loadingLogs = false;
  }

  async function loadStatus() {
    loadingStatus = true;
    loadingDiagnostics = true;
    try {
      const baseDevice = await API.getDeviceStatus();
      version = await API.getVersion();
      storage = await API.getStorageUsage();
      systemInfo = await API.getSystemInfo();
      activePartitions = systemInfo.activeMounts || [];
      diagnostics = []; 
      
      device = {
        ...baseDevice,
        kernel: systemInfo.kernel,
        selinux: systemInfo.selinux
      };
      
      if (modules.length === 0) {
        await loadModules();
      }
    } catch (e) {}
    loadingStatus = false;
    loadingDiagnostics = false;
  }

  async function rebootDevice() {
    try {
      await API.reboot();
    } catch(e) {
      showToast(L.common?.rebootFailed || 'Reboot failed', 'error');
    }
  }

  return {
    get theme() { return theme; },
    get isSystemDark() { return isSystemDark; },
    get lang() { return lang; },
    get seed() { return seed; },
    get availableLanguages() { return availableLanguages; },
    get L() { return L; },
    get toast() { return toast; },
    get toasts() { return toast.visible ? [toast] : []; },
    showToast,
    setTheme,
    setLang,
    init,

    get fixBottomNav() { return fixBottomNav; },
    toggleBottomNavFix,

    get config() { return config; },
    set config(v) { config = v; },
    loadConfig,
    saveConfig,
    resetConfig,

    get modules() { return modules; },
    set modules(v) { modules = v; },
    get modeStats() { return modeStats; },
    loadModules,
    saveModules,

    get logs() { return logs; },
    loadLogs,

    get device() { return device; },
    get version() { return version; },
    get storage() { return storage; },
    get systemInfo() { return systemInfo; },
    get activePartitions() { return activePartitions; },
    get diagnostics() { return diagnostics; },
    loadStatus,
    rebootDevice,

    get loading() {
      return {
        config: loadingConfig,
        modules: loadingModules,
        logs: loadingLogs,
        status: loadingStatus,
        diagnostics: loadingDiagnostics
      };
    },
    get saving() {
      return {
        config: savingConfig,
        modules: savingModules
      };
    }
  };
};

export const store = createStore();