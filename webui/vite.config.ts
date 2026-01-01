/**
 * Copyright 2025 Magic Mount-rs Authors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  base: "./",
  build: {
    outDir: "../module/webroot",
  },
  plugins: [solid()],
});
