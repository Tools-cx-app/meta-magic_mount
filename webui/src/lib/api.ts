/**
 * Copyright 2025 Magic Mount-rs Authors
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MockAPI } from "./api.mock";
import { DEFAULT_CONFIG, PATHS } from "./constants";

export interface MagicConfig {
  moduledir: string;
  tempdir?: string;
  mountsource: string;
  verbose: boolean;
  umount: boolean;
  disable_umount?: boolean;
  partitions: string[];
  [key: string]: any;
}

export interface MagicModule {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  is_mounted: boolean;
  mode: string;
  disabledByFlag?: boolean;
  skipMount?: boolean;
  rules: { default_mode: string; paths: Record<string, any> };
}

export interface SystemInfo {
  kernel: string;
  selinux: string;
  mountBase: string;
  activeMounts: string[];
}

export interface StorageUsage {
  type: string | null;
  percent: string;
  size: string;
  used: string;
  hymofs_available: boolean;
}

export interface DeviceStatus {
  model: string;
  android: string;
  kernel: string;
  selinux: string;
}

interface KsuExecResult {
  errno: number;
  stdout: string;
  stderr: string;
}
type KsuExec = (cmd: string) => Promise<KsuExecResult>;

let ksuExec: KsuExec | null = null;

try {
  const ksu = await import("kernelsu").catch(() => null);
  ksuExec = ksu ? ksu.exec : null;
} catch {
  console.warn("KernelSU module not found, defaulting to Mock.");
}

const shouldUseMock = import.meta.env.DEV || !ksuExec;
console.log(`[API Init] Mode: ${shouldUseMock ? "🛠️ MOCK" : "🚀 REAL"}`);

function isTrueValue(v: any): boolean {
  const s = String(v).trim().toLowerCase();

  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function stripQuotes(v: string): string {
  if (v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1);
  }

  return v;
}

function parseKvConfig(text: string): MagicConfig {
  try {
    const result: MagicConfig = { ...DEFAULT_CONFIG };
    const lines = text.split("\n");
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) {
        continue;
      }
      const key = line.slice(0, eqIndex).trim();
      let value = line.slice(eqIndex + 1).trim();
      if (!key || !value) {
        continue;
      }

      if (value.startsWith("[") && value.endsWith("]")) {
        value = value.slice(1, -1);
        if (!value.trim()) {
          if (key === "partitions") {
            result.partitions = [];
          }
          continue;
        }
        const parts = value.split(",").map((s) => stripQuotes(s.trim()));
        if (key === "partitions") {
          result.partitions = parts;
        }
        continue;
      }

      const rawValue = value;
      value = stripQuotes(value);

      switch (key) {
        case "moduledir": {
          result.moduledir = value;
          break;
        }
        case "tempdir": {
          result.tempdir = value;
          break;
        }
        case "mountsource": {
          result.mountsource = value;
          break;
        }
        case "verbose": {
          result.verbose = isTrueValue(rawValue);
          break;
        }
        case "umount": {
          result.umount = isTrueValue(rawValue);
          break;
        }
      }
    }

    return result;
  } catch (e) {
    console.error("Failed to parse config:", e);

    return DEFAULT_CONFIG;
  }
}

function serializeKvConfig(cfg: MagicConfig): string {
  const q = (s: string) => `"${s}"`;
  const lines = ["# Magic Mount Configuration File", ""];

  lines.push(`moduledir = ${q(cfg.moduledir)}`);
  if (cfg.tempdir) {
    lines.push(`tempdir = ${q(cfg.tempdir)}`);
  }
  lines.push(`mountsource = ${q(cfg.mountsource)}`);
  lines.push(`verbose = ${cfg.verbose}`);
  lines.push(`umount = ${!cfg.disable_umount}`);
  const parts = cfg.partitions.map((p) => q(p)).join(", ");
  lines.push(`partitions = [${parts}]`);

  return lines.join("\n");
}

function formatBytes(bytes: number, decimals = 2): string {
  if (!+bytes) {
    return "0 B";
  }
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

const RealAPI = {
  loadConfig: async (): Promise<MagicConfig> => {
    try {
      const { errno, stdout } = await ksuExec!(
        `[ -f "${PATHS.CONFIG}" ] && cat "${PATHS.CONFIG}" || echo ""`,
      );
      if (errno === 0 && stdout.trim()) {
        const raw = parseKvConfig(stdout);

        return {
          ...raw,
          disable_umount: !raw.umount,
        };
      }
    } catch (e) {
      console.error("Config load error:", e);
    }

    return { ...DEFAULT_CONFIG, disable_umount: !DEFAULT_CONFIG.umount };
  },

  saveConfig: async (config: MagicConfig): Promise<void> => {
    const content = serializeKvConfig(config);
    const cmd = `
      mkdir -p "$(dirname "${PATHS.CONFIG}")"
      cat > "${PATHS.CONFIG}" << 'EOF_CONFIG'
${content}
EOF_CONFIG
      chmod 644 "${PATHS.CONFIG}"
    `;
    const { errno, stderr } = await ksuExec!(cmd);
    if (errno !== 0) {
      throw new Error(`Failed to save config: ${stderr}`);
    }
  },

  scanModules: async (_moduleDir: string): Promise<MagicModule[]> => {
    const cmd = "/data/adb/modules/magic_mount_rs/meta-mm scan --json";
    try {
      const { errno, stdout, stderr } = await ksuExec!(cmd);
      if (errno === 0 && stdout) {
        try {
          const rawModules = JSON.parse(stdout);

          return rawModules.map((m: any) => ({
            id: m.id,
            name: m.name,
            version: m.version,
            author: m.author ?? "Unknown",
            description: m.description,
            is_mounted: !m.skip,
            mode: "magic",
            rules: { default_mode: "magic", paths: {} },
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

  getStorageUsage: async (): Promise<StorageUsage> => {
    try {
      const { stdout } = await ksuExec!("df -k /data/adb/modules | tail -n 1");
      if (stdout) {
        const parts = stdout.split(/\s+/);
        if (parts.length >= 6) {
          const total = Number.parseInt(parts[1]) * 1024;
          const used = Number.parseInt(parts[2]) * 1024;
          const percent = parts[4];

          return {
            type: "ext4",
            percent,
            size: formatBytes(total),
            used: formatBytes(used),
            hymofs_available: false,
          };
        }
      }
    } catch {}

    return {
      size: "-",
      used: "-",
      percent: "0%",
      type: null,
      hymofs_available: false,
    };
  },

  getSystemInfo: async (): Promise<SystemInfo> => {
    try {
      const cmd = `
        echo "KERNEL:$(uname -r)"
        echo "SELINUX:$(getenforce)"
      `;
      const { errno, stdout } = await ksuExec!(cmd);
      const info = {
        kernel: "-",
        selinux: "-",
        mountBase: "/data/adb/modules",
        activeMounts: [] as string[],
      };
      if (errno === 0 && stdout) {
        for (const line of stdout.split("\n")) {
          if (line.startsWith("KERNEL:")) {
            info.kernel = line.slice(7).trim();
          } else if (line.startsWith("SELINUX:")) {
            info.selinux = line.slice(8).trim();
          }
        }
      }
      const m = await ksuExec!("ls -1 /data/adb/modules");
      if (m.errno === 0 && m.stdout) {
        info.activeMounts = m.stdout
          .split("\n")
          .filter((s) => s.trim() && s !== "magic_mount_rs");
      }

      return info;
    } catch {
      return { kernel: "-", selinux: "-", mountBase: "-", activeMounts: [] };
    }
  },

  getDeviceStatus: async (): Promise<DeviceStatus> => {
    const cmd = "getprop ro.product.model; getprop ro.build.version.release";
    const { stdout } = await ksuExec!(cmd);
    const lines = stdout ? stdout.split("\n") : [];

    return {
      model: lines[0] || "Unknown",
      android: lines[1] || "Unknown",
      kernel: "See System Info",
      selinux: "See System Info",
    };
  },

  getVersion: async (): Promise<string> => {
    const cmd = "/data/adb/modules/magic_mount_rs/meta-mm version";
    try {
      const { errno, stdout } = await ksuExec!(cmd);
      if (errno === 0 && stdout) {
        const res = JSON.parse(stdout);

        return res.version ?? "0.0.0";
      }
    } catch {}

    return "Unknown";
  },

  openLink: async (url: string) => {
    const safeUrl = url.replace(/"/g, '\\"');
    const cmd = `am start -a android.intent.action.VIEW -d "${safeUrl}"`;
    await ksuExec!(cmd);
  },

  fetchSystemColor: async (): Promise<string | null> => {
    try {
      const { stdout } = await ksuExec!(
        "settings get secure theme_customization_overlay_packages",
      );
      if (stdout) {
        const match =
          /["']?android\.theme\.customization\.system_palette["']?\s*:\s*["']?#?([0-9a-f]{6,8})["']?/i.exec(
            stdout,
          ) ??
          /["']?source_color["']?\s*:\s*["']?#?([0-9a-f]{6,8})["']?/i.exec(
            stdout,
          );
        if (match?.[1]) {
          let hex = match[1];
          if (hex.length === 8) {
            hex = hex.slice(2);
          }

          return `#${hex}`;
        }
      }
    } catch {}

    return null;
  },

  reboot: async (): Promise<void> => {
    const cmd = "svc power reboot || reboot";
    await ksuExec!(cmd);
  },
};

if (MockAPI && !MockAPI.reboot) {
  MockAPI.reboot = async () => {
    console.log("Mock Reboot triggered");
  };
}

export const API = shouldUseMock ? MockAPI : RealAPI;
