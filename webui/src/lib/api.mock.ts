/**
 * Copyright 2025 Magic Mount-rs Authors
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type {
  DeviceStatus,
  MagicConfig,
  MagicModule,
  StorageUsage,
  SystemInfo,
} from "./api";
import { DEFAULT_CONFIG } from "./constants";

const MOCK_DELAY = 600;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const MockAPI = {
  loadConfig: async (): Promise<MagicConfig> => {
    await delay(MOCK_DELAY);
    console.log("[MockAPI] loadConfig");

    return {
      ...DEFAULT_CONFIG,
      mountsource: "KSU",
      umount: true,
      partitions: ["product", "system_ext", "vendor"],
    };
  },

  saveConfig: async (config: MagicConfig) => {
    await delay(MOCK_DELAY);
    console.log("[MockAPI] saveConfig:", config);
  },

  scanModules: async (): Promise<MagicModule[]> => {
    await delay(MOCK_DELAY);
    console.log("[MockAPI] scanModules");

    return [
      {
        id: "youtube-revanced",
        name: "YouTube ReVanced",
        version: "18.20.39",
        author: "ReVanced Team",
        description: "YouTube ReVanced Module",
        is_mounted: true,
        mode: "magic",
        rules: { default_mode: "magic", paths: {} },
      },
      {
        id: "pixelfy-gphotos",
        name: "Pixelfy GPhotos",
        version: "2.1",
        author: "PixelProps",
        description: "Unlimited Google Photos backup for Pixel devices.",
        is_mounted: true,
        mode: "magic",
        rules: { default_mode: "magic", paths: {} },
      },
      {
        id: "sound-enhancer",
        name: "Sound Enhancer",
        version: "1.0",
        author: "AudioMod",
        description: "Improves system audio quality. Currently disabled.",
        is_mounted: false,
        mode: "magic",
        rules: { default_mode: "magic", paths: {} },
      },
    ];
  },

  getStorageUsage: async (): Promise<StorageUsage> => {
    await delay(MOCK_DELAY);

    return {
      type: "ext4",
      percent: "42%",
      size: "118 GB",
      used: "50 GB",
      hymofs_available: false,
    };
  },

  getSystemInfo: async (): Promise<SystemInfo> => {
    await delay(MOCK_DELAY);

    return {
      kernel: "5.10.101-android12-9-00001-g532145",
      selinux: "Enforcing",
      mountBase: "/data/adb/modules",
      activeMounts: ["youtube-revanced", "pixelfy-gphotos"],
    };
  },

  getDeviceStatus: async (): Promise<DeviceStatus> => {
    await delay(MOCK_DELAY);

    return {
      model: "Pixel 8 Pro (Mock)",
      android: "14",
      kernel: "5.10.101-mock",
      selinux: "Enforcing",
    };
  },

  getVersion: async (): Promise<string> => {
    await delay(MOCK_DELAY);

    return "1.2.0-mock";
  },

  reboot: async (): Promise<void> => {
    console.log("[MockAPI] Reboot requested");
    // eslint-disable-next-line no-alert
    alert("Reboot requested (Mock)");
  },

  openLink: async (url: string) => {
    console.log("[MockAPI] Open link:", url);
    window.open(url, "_blank");
  },

  fetchSystemColor: async (): Promise<string | null> => {
    await delay(500);

    return "#50a48f";
  },
};
