import { exec } from 'kernelsu';
import { DEFAULT_CONFIG, PATHS } from './constants';

// Helpers for Config Parsing
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

      // Handle brackets for arrays (simple logic)
      if (value.startsWith('[') && value.endsWith(']')) {
         value = value.slice(1, -1);
         if (!value.trim()) {
             // empty array
             if (key === 'partitions') result.partitions = [];
             continue;
         }
         // split by comma, remove quotes
         const parts = value.split(',').map(s => stripQuotes(s.trim()));
         if (key === 'partitions') result.partitions = parts;
         continue;
      }

      // Handle simple values
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
    // Escape single quotes for shell string
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
    // Shell script to scan modules and get simple status
    const cmd = `
      MOD_DIR="${moduleDir}"
      [ -d "$MOD_DIR" ] || exit 0
      for m in "$MOD_DIR"/*; do
        [ -d "$m" ] || continue
        # Basic check if it's a module
        [ -f "$m/module.prop" ] || continue
        
        name=$(basename "$m")
        
        # Read props roughly
        prop_name=$(grep "^name=" "$m/module.prop" | cut -d= -f2-)
        prop_ver=$(grep "^version=" "$m/module.prop" | cut -d= -f2-)
        prop_desc=$(grep "^description=" "$m/module.prop" | cut -d= -f2-)
        
        disabled=0
        skip=0
        
        if [ -f "$m/disable" ] || [ -f "$m/remove" ]; then
          disabled=1
        fi
        
        if [ -f "$m/skip_mount" ]; then
          skip=1
        fi
        
        # Output delimiter separated
        printf "%s|%s|%s|%s|%s|%s\\n" "$name" "$disabled" "$skip" "$prop_name" "$prop_ver" "$prop_desc"
      done
    `;

    try {
      const { errno, stdout } = await exec(cmd);
      if (errno === 0 && stdout) {
        return stdout.split('\n').filter(l => l.trim()).map(line => {
          const [id, disabledStr, skipStr, name, version, description] = line.split('|');
          return {
            id,
            name: name || id,
            version: version || '',
            description: description || '',
            disabledByFlag: disabledStr === '1',
            skipMount: skipStr === '1',
            // Mapping for UI logic
            mode: (skipStr === '1') ? 'magic' : 'auto' 
          };
        });
      }
    } catch (e) {
      console.error("Scan modules error:", e);
    }
    return [];
  },

  toggleSkipMount: async (moduleId, shouldSkip, moduleDir = DEFAULT_CONFIG.moduledir) => {
    const target = `${moduleDir}/${moduleId}/skip_mount`;
    const cmd = shouldSkip ? `touch "${target}"` : `rm -f "${target}"`;
    const { errno, stderr } = await exec(cmd);
    if (errno !== 0) throw new Error(stderr);
  },

  readLogs: async (logPath = PATHS.LOG_FILE, lines = 1000) => {
    // FIX: Using cat instead of tail for better compatibility
    const cmd = `[ -f "${logPath}" ] && cat "${logPath}" || echo ""`;
    const { errno, stdout, stderr } = await exec(cmd);
    if (errno === 0) return stdout || "";
    throw new Error(stderr || "Log file not found");
  },

  getStorageUsage: async () => {
    try {
      // Use df to check /data/adb/modules usage
      const { errno, stdout } = await exec(`df -h /data/adb | tail -n 1`);
      if (errno === 0 && stdout) {
        const parts = stdout.trim().split(/\s+/);
        // Filesystem Size Used Avail Use% Mounted on
        // We assume standard output format
        if (parts.length >= 5) {
            return {
                size: parts[1],
                used: parts[2],
                percent: parts[4],
                type: 'ext4' // Assuming standard install
            };
        }
      }
    } catch (e) {
      console.error("Storage check failed:", e);
    }
    return { size: '-', used: '-', percent: '0%', type: 'unknown' };
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