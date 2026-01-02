/**
 * Copyright 2025 Magic Mount-rs Authors
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { For, Show, createSignal } from "solid-js";

import { ICONS } from "../lib/constants";
import { store } from "../lib/store";

import "./TopBar.css";

export default function TopBar() {
  const [showLangMenu, setShowLangMenu] = createSignal(false);
  let langButtonRef: HTMLButtonElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  function toggleTheme() {
    let nextTheme;
    let toastMsg;
    const common = store.L?.common;

    if (store.theme === "auto") {
      nextTheme = "light";
      toastMsg = common?.themeLight ?? "Light Mode";
    } else if (store.theme === "light") {
      nextTheme = "dark";
      toastMsg = common?.themeDark ?? "Dark Mode";
    } else {
      nextTheme = "auto";
      toastMsg = common?.themeAuto ?? "Auto Mode";
    }

    store.setTheme(nextTheme);
    store.showToast(toastMsg, "info");
  }

  function getThemeIcon() {
    if (store.theme === "auto") {
      return ICONS.auto_mode;
    }
    if (store.theme === "light") {
      return ICONS.light_mode;
    }

    return ICONS.dark_mode;
  }

  function setLang(code: string) {
    store.setLang(code);
    setShowLangMenu(false);
  }

  function handleOutsideClick(e: MouseEvent) {
    const target = e.target as Node;
    if (
      showLangMenu() &&
      menuRef &&
      !menuRef.contains(target) &&
      langButtonRef &&
      !langButtonRef.contains(target)
    ) {
      setShowLangMenu(false);
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("click", handleOutsideClick);
  }

  return (
    <header class="top-bar">
      <div class="top-bar-content">
        <h1 class="screen-title">{store.L?.common?.appName}</h1>
        <div class="top-actions">
          <button
            class="btn-icon"
            onClick={toggleTheme}
            title={store.L?.common?.theme}
          >
            <svg viewBox="0 0 24 24">
              <path d={getThemeIcon()} fill="currentColor" />
            </svg>
          </button>

          <button
            class="btn-icon"
            ref={langButtonRef}
            onClick={() => setShowLangMenu(!showLangMenu())}
            title={store.L?.common?.language}
          >
            <svg viewBox="0 0 24 24">
              <path d={ICONS.translate} fill="currentColor" />
            </svg>
          </button>

          <Show when={showLangMenu()}>
            <div class="menu-dropdown" ref={menuRef}>
              <For each={store.availableLanguages ?? []}>
                {(l) => (
                  <button class="menu-item" onClick={() => setLang(l.code)}>
                    {l.name}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
}
