import { DEFAULT_CONFIG } from './constants';
const MOCK_DELAY = 600;
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export const MockAPI = {
  loadConfig: async () => {
    await delay(MOCK_DELAY);
    console.log("[MockAPI] loadConfig");
    return {
      ...DEFAULT_CONFIG,
      moduledir: '/data/adb/modules',
      mountsource: 'KSU',
      verbose: true,
      umount: true, 
      partitions: ['product', 'system_ext', 'vendor']
    };
  },
  saveConfig: async (config) => {
    await delay(MOCK_DELAY);
    console.log("[MockAPI] saveConfig:", config);
  },
  scanModules: async (moduleDir) => {
    await delay(MOCK_DELAY);
    console.log("[MockAPI] scanModules");
    return [
      {
        id: "youtube-revanced",
        name: "YouTube ReVanced",
        version: "18.20.39",
        description: "YouTube ReVanced Module",
        is_mounted: true,
        disabledByFlag: false,
        skipMount: false,
        mode: 'magic'
      },
      {
        id: "pixelfy-gphotos",
        name: "Pixelfy GPhotos",
        version: "2.1",
        description: "Unlimited Google Photos backup for Pixel devices.",
        is_mounted: true,
        disabledByFlag: false,
        skipMount: false,
        mode: 'magic'
      },
      {
        id: "sound-enhancer",
        name: "Sound Enhancer",
        version: "1.0",
        description: "Improves system audio quality. Currently disabled.",
        is_mounted: false,
        disabledByFlag: true,
        skipMount: false,
        mode: 'magic'
      }
    ];
  },
  readLogs: async (logPath, lines) => {
    await delay(MOCK_DELAY);
    console.log("[MockAPI] readLogs");
    return `[I] Magic Mount Daemon v1.0.0 started
[I] Mounting source: KSU
[I] Loading config from /data/adb/magic_mount/config.toml
[D] Verbose logging enabled
[I] Scanned 3 modules
[I] Mounting youtube-revanced... Success
[I] Mounting pixelfy-gphotos... Success
[W] Skipping sound-enhancer: disable file found
[I] OverlayFS mounted on /system/product
[I] OverlayFS mounted on /system/vendor
[E] Failed to mount /system/my_custom_partition: No such file or directory
[I] Daemon loop active`;
  },
  getStorageUsage: async () => {
    await delay(MOCK_DELAY);
    return {
      type: 'ext4',
      percent: '42%',
      size: '118 GB',
      used: '50 GB',
      hymofs_available: false 
    };
  },
  getSystemInfo: async () => {
    await delay(MOCK_DELAY);
    return {
      kernel: '5.10.101-android12-9-00001-g532145',
      selinux: 'Enforcing',
      mountBase: '/data/adb/modules',
      activeMounts: ['youtube-revanced', 'pixelfy-gphotos']
    };
  },
  getDeviceStatus: async () => {
    await delay(MOCK_DELAY);
    return {
      model: 'Pixel 8 Pro (Mock)',
      android: '14',
      kernel: '5.10.101-mock',
      selinux: 'Enforcing'
    };
  },
  getVersion: async () => {
    await delay(MOCK_DELAY);
    return "1.2.0-mock";
  },
  rebootDevice: async () => {
    console.log("[MockAPI] Reboot requested");
    alert("Reboot requested (Mock)");
  },
  openLink: async (url) => {
    console.log("[MockAPI] Open link:", url);
    window.open(url, '_blank');
  },
  fetchSystemColor: async () => {
    await delay(500);
    return '#50a48f'; 
  }
};