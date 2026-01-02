/**
 * Copyright 2025 Magic Mount-rs Authors
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { For, createEffect } from "solid-js";

import { ICONS } from "../lib/constants";
import { store } from "../lib/store";

import "./NavBar.css";

interface NavBarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

const TABS = [
  { id: "status", icon: ICONS.home },
  { id: "config", icon: ICONS.settings },
  { id: "modules", icon: ICONS.modules },
  { id: "logs", icon: ICONS.description },
  { id: "info", icon: ICONS.info },
];

export default function NavBar(props: NavBarProps) {
  let navContainer: HTMLElement | undefined;
  const tabRefs: Record<string, HTMLElement | undefined> = {};

  createEffect(() => {
    const activeTab = props.activeTab;
    if (activeTab && tabRefs[activeTab] && navContainer) {
      const tab = tabRefs[activeTab];
      const containerWidth = navContainer.clientWidth;
      const tabLeft = tab.offsetLeft;
      const tabWidth = tab.clientWidth;
      const scrollLeft = tabLeft - containerWidth / 2 + tabWidth / 2;
      navContainer.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
    }
  });

  return (
    <nav
      class={`bottom-nav ${store.fixBottomNav ? "fix-padding" : ""}`}
      ref={navContainer}
    >
      <For each={TABS}>
        {(tab) => (
          <button
            class={`nav-tab ${props.activeTab === tab.id ? "active" : ""}`}
            onClick={() => props.onTabChange(tab.id)}
            ref={(el) => (tabRefs[tab.id] = el)}
            type="button"
          >
            <div class="icon-container">
              <svg viewBox="0 0 24 24">
                <path d={tab.icon} />
              </svg>
            </div>
            <span class="label">{store.L.tabs?.[tab.id] ?? tab.id}</span>
          </button>
        )}
      </For>
    </nav>
  );
}
