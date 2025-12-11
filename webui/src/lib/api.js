import { DEFAULT_CONFIG, PATHS } from './constants';
import { MockAPI } from './api.mock';

let ksuExec = null;

try {
  const ksu = await import('kernelsu').catch(() => null);
  ksuExec = ksu ? ksu.exec : null;
} catch (e) {
  console.warn("KernelSU module not found, defaulting to Mock.");
}

const shouldUseMock = import.meta.env.DEV || !ksuExec;

console.log(`[API Init] Mode: ${shouldUseMock ? '🛠️ MOCK' : '🚀 REAL'}`);

function isTrueValue(v) {
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function stripQuotes(v) {
  if (v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1);
  }
  return v;
}

function parseKvConfig(text) {
  try {
    const result = { ...DEFAULT_CONFIG };
    const lines = text.split('\n');

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;

      const eqIndex = line.indexOf('=');
      if (eqIndex < 0) continue;

      let key = line.slice(0, eqIndex).trim();
      let value = line.slice(eqIndex + 1).trim();
      if (!key || !value) continue;
      if (value.startsWith('[') && value.endsWith(']')) {
         value = value.slice(1, -1);
         if (!value.trim()) {
             if (key === 'partitions') result.partitions = [];
             continue;
         }
         const parts = value.split(',').map(s => stripQuotes(s.trim()));
         if (key === 'partitions') result.partitions = parts;
         continue;
      }

      const rawValue = value;
      value = stripQuotes(value);

      switch (key) {
        case 'moduledir': result.moduledir = value; break;
        case 'tempdir': result.tempdir = value; break;
        case 'mountsource': result.mountsource = value; break;
        case 'verbose': result.verbose = isTrueValue(rawValue); break;
        case 'umount': result.umount = isTrueValue(rawValue); break;
      }
    }
    return result;
  } catch (e) {
    console.error('Failed to parse config:', e);
    return DEFAULT_CONFIG;
  }
}

function serializeKvConfig(cfg) {
  const q = (s) => `"${s}"`;
  const lines = ['# Magic Mount Configuration File', ''];
  
  lines.push(`moduledir = ${q(cfg.moduledir)}`);
  if (cfg.tempdir) lines.push(`tempdir = ${q(cfg.tempdir)}`);
  lines.push(`mountsource = ${q(cfg.mountsource)}`);
  lines.push(`verbose = ${cfg.verbose}`);
  lines.push(`umount = ${!cfg.disable_umount}`); 
  
  const parts = cfg.partitions.map(p => q(p)).join(', ');
  lines.push(`partitions = [${parts}]`);
  
  return lines.join('\n');
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const RealAPI = {
  loadConfig: async () => {
    try {
      const { errno, stdout } = await ksuExec(`[ -f "${PATHS.CONFIG}" ] && cat "${PATHS.CONFIG}" || echo ""`);
      if (errno === 0 && stdout.trim()) {
        const raw = parseKvConfig(stdout);
        return {
            ...raw,
            disable_umount: !raw.umount,
            force_ext4: false,
            enable_nuke: false,
            dry_run: false
        };
      }
    } catch (e) {
      console.error("Config load error:", e);
    }
    return { ...DEFAULT_CONFIG, disable_umount: !DEFAULT_CONFIG.umount };
  },

  saveConfig: async (config) => {
    const content = serializeKvConfig(config);
    const cmd = `
      mkdir -p "$(dirname "${PATHS.CONFIG}")"
      cat > "${PATHS.CONFIG}" << 'EOF_CONFIG'
${content}
EOF_CONFIG
      chmod 644 "${PATHS.CONFIG}"
    `;
    const { errno, stderr } = await ksuExec(cmd);
    if (errno !== 0) throw new Error(`Failed to save config: ${stderr}`);
  },

  scanModules: async (moduleDir) => {
    const cmd = `/data/adb/modules/magic_mount_rs/meta-mm scan --json`;
    try {
      const { errno, stdout, stderr } = await ksuExec(cmd);
      if (errno === 0 && stdout) {
        try {
          const rawModules = JSON.parse(stdout);
          return rawModules.map(m => ({
            id: m.id,
            name: m.name,
            version: m.version,
            author: m.author || "Unknown",
            description: m.description,
            is_mounted: !m.skip, 
            mode: 'magic',
            rules: { default_mode: 'magic', paths: {} }
          }));
        } catch (parseError) {
          console.error("Failed to parse module JSON:", parseError);
          return [];
        }
      } else {
        console.error("Scan command failed:", stderr);
      }
    } catch (e) {
      console.error("Scan modules error:", e);
    }
    return [];
  },

  readLogs: async (logPath = PATHS.LOG_FILE, lines = 1000) => {
    const cmd = `[ -f "${logPath}" ] && tail -n ${lines} "${logPath}" || echo ""`;
    const { errno, stdout, stderr } = await ksuExec(cmd);
    if (errno === 0) return stdout || "";
    throw new Error(stderr || "Log file not found");
  },

  getStorageUsage: async () => {
      try {
          const { stdout } = await ksuExec(`df -k /data/adb/modules | tail -n 1`);
          if (stdout) {
              const parts = stdout.split(/\s+/);
              if (parts.length >= 6) {
                  const total = parseInt(parts[1]) * 1024;
                  const used = parseInt(parts[2]) * 1024;
                  const percent = parts[4];
                  return {
                      type: 'ext4',
                      percent: percent,
                      size: formatBytes(total),
                      used: formatBytes(used),
                      hymofs_available: false 
                  };
              }
          }
      } catch (e) {}
      return { size: '-', used: '-', percent: '0%', type: null, hymofs_available: false };
  },

  getSystemInfo: async () => {
    try {
      const cmd = `
        echo "KERNEL:$(uname -r)"
        echo "SELINUX:$(getenforce)"
      `;
      const { errno, stdout } = await ksuExec(cmd);
      let info = { kernel: '-', selinux: '-', mountBase: '/data/adb/modules', activeMounts: [] };
      
      if (errno === 0 && stdout) {
        stdout.split('\n').forEach(line => {
          if (line.startsWith('KERNEL:')) info.kernel = line.substring(7).trim();
          else if (line.startsWith('SELINUX:')) info.selinux = line.substring(8).trim();
        });
      }
      
      const m = await ksuExec(`ls -1 /data/adb/modules`);
      if (m.errno === 0 && m.stdout) {
          info.activeMounts = m.stdout.split('\n').filter(s => s.trim() && s !== 'magic_mount_rs');
      }
      return info;
    } catch (e) {
      return { kernel: '-', selinux: '-', mountBase: '-', activeMounts: [] };
    }
  },

  getDeviceStatus: async () => {
    const cmd = `getprop ro.product.model; getprop ro.build.version.release`;
    const { stdout } = await ksuExec(cmd);
    const lines = stdout ? stdout.split('\n') : [];
    return {
        model: lines[0] || 'Unknown',
        android: lines[1] || 'Unknown',
        kernel: 'See System Info',
        selinux: 'See System Info'
    };
  },

  getVersion: async () => {
    const cmd = `/data/adb/modules/magic_mount_rs/meta-mm version`;
    try {
      const { errno, stdout } = await ksuExec(cmd);
      if (errno === 0 && stdout) {
        const res = JSON.parse(stdout);
        return res.version || "0.0.0";
      }
    } catch (e) {}
    return "Unknown";
  },

  rebootDevice: async () => {
      await ksuExec(`reboot`);
  },

  openLink: async (url) => {
    const safeUrl = url.replace(/"/g, '\\"');
    const cmd = `am start -a android.intent.action.VIEW -d "${safeUrl}"`;
    await ksuExec(cmd);
  },

  fetchSystemColor: async () => {
    try {
      const { stdout } = await ksuExec('settings get secure theme_customization_overlay_packages');
      if (stdout) {
        const match = /["']?android\.theme\.customization\.system_palette["']?\s*:\s*["']?#?([0-9a-fA-F]{6,8})["']?/i.exec(stdout) || 
                      /["']?source_color["']?\s*:\s*["']?#?([0-9a-fA-F]{6,8})["']?/i.exec(stdout);
        if (match && match[1]) {
          let hex = match[1];
          if (hex.length === 8) hex = hex.substring(2);
          return '#' + hex;
        }
      }
    } catch (e) {}
    return null;
  }
};

export const API = shouldUseMock ? MockAPI : RealAPI;