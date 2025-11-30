import { exec } from 'kernelsu';
import { DEFAULT_CONFIG, PATHS } from './constants';

// ... (keep helper functions: isTrueValue, stripQuotes, parseKvConfig, serializeKvConfig) ...
// (Omitting them here to save space, but keep them in your file)
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
        case 'moduledir':
          result.moduledir = value;
          break;
        case 'tempdir':
          result.tempdir = value;
          break;
        case 'mountsource':
          result.mountsource = value;
          break;
        case 'verbose':
          result.verbose = isTrueValue(rawValue);
          break;
        case 'umount':
          result.umount = isTrueValue(rawValue);
          break;
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
  lines.push(`umount = ${cfg.umount}`);
  
  const parts = cfg.partitions.map(p => q(p)).join(', ');
  lines.push(`partitions = [${parts}]`);
  
  return lines.join('\n');
}

export const API = {
  loadConfig: async () => {
    try {
      const { errno, stdout } = await exec(`[ -f "${PATHS.CONFIG}" ] && cat "${PATHS.CONFIG}" || echo ""`);
      if (errno === 0 && stdout.trim()) {
        return parseKvConfig(stdout);
      }
    } catch (e) {
      console.error("Config load error:", e);
    }
    return { ...DEFAULT_CONFIG };
  },

  saveConfig: async (config) => {
    const content = serializeKvConfig(config);
    const safeContent = content.replace(/'/g, "'\\''");
    
    const cmd = `
      mkdir -p "$(dirname "${PATHS.CONFIG}")"
      cat > "${PATHS.CONFIG}" << 'EOF_CONFIG'
${content}
EOF_CONFIG
      chmod 644 "${PATHS.CONFIG}"
    `;
    
    const { errno, stderr } = await exec(cmd);
    if (errno !== 0) throw new Error(`Failed to save config: ${stderr}`);
  },

  scanModules: async (moduleDir = DEFAULT_CONFIG.moduledir) => {
    const cmd = `/data/adb/modules/magic_mount_rs/meta-mm scan --json`;
    try {
      const { errno, stdout, stderr } = await exec(cmd);
      if (errno === 0 && stdout) {
        try {
          const rawModules = JSON.parse(stdout);
          return rawModules.map(m => ({
            id: m.id,
            name: m.name,
            version: m.version,
            description: m.description,
            disabledByFlag: m.disabled,
            skipMount: m.skip,
            mode: 'magic'
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
    const { errno, stdout, stderr } = await exec(cmd);
    if (errno === 0) return stdout || "";
    throw new Error(stderr || "Log file not found");
  },

  getDeviceStatus: async () => {
    const cmd = `
      echo "model=$(getprop ro.product.model)"
      echo "android=$(getprop ro.build.version.release)"
      echo "kernel=$(uname -r)"
      echo "selinux=$(getenforce)"
    `;
    try {
      const { errno, stdout } = await exec(cmd);
      if (errno === 0 && stdout) {
        const lines = stdout.split('\n');
        const result = {};
        for (const line of lines) {
            const [key, val] = line.split('=');
            if (key && val) result[key.trim()] = val.trim();
        }
        return result;
      }
    } catch (e) {
      console.error("Device status fetch failed:", e);
    }
    return { model: 'Unknown', android: '-', kernel: '-', selinux: 'Unknown' };
  },

  getVersion: async () => {
    const cmd = `/data/adb/modules/magic_mount_rs/meta-mm version`;
    try {
      const { errno, stdout } = await exec(cmd);
      if (errno === 0 && stdout) {
        const res = JSON.parse(stdout);
        return res.version || "0.0.0";
      }
    } catch (e) {}
    return "Unknown";
  },

  rebootDevice: async () => {
      await exec(`reboot`);
  },

  fetchSystemColor: async () => {
    try {
      const { stdout } = await exec('settings get secure theme_customization_overlay_packages');
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