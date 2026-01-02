/**
 * Copyright 2025 Magic Mount-rs Authors
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { For, Show, createMemo, createSignal, onMount } from "solid-js";

import BottomActions from "../components/BottomActions";
import Skeleton from "../components/Skeleton";
import { ICONS } from "../lib/constants";
import { store } from "../lib/store";

import "./ModulesTab.css";
import "@material/web/textfield/outlined-text-field.js";
import "@material/web/icon/icon.js";
import "@material/web/ripple/ripple.js";
import "@material/web/iconbutton/filled-tonal-icon-button.js";

export default function ModulesTab() {
  const [searchQuery, setSearchQuery] = createSignal("");
  const [expandedId, setExpandedId] = createSignal<string | null>(null);

  onMount(() => {
    store.loadModules();
  });

  const filteredModules = createMemo(() =>
    store.modules.filter((m) => {
      const q = searchQuery().toLowerCase();
      const matchSearch =
        m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);

      return matchSearch;
    }),
  );

  function toggleExpand(id: string) {
    setExpandedId(expandedId() === id ? null : id);
  }

  function handleKeydown(e: KeyboardEvent, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpand(id);
    }
  }

  function handleInput(e: Event) {
    setSearchQuery((e.target as HTMLInputElement).value);
  }

  return (
    <>
      <div class="modules-container">
        <div class="desc-card">
          <div class="desc-icon">
            <md-icon>
              <svg viewBox="0 0 24 24">
                <path d={ICONS.info} />
              </svg>
            </md-icon>
          </div>
          <p class="desc-text">
            {store.L.modules?.desc ??
              "Modules are strictly managed by Magic Mount strategy."}
          </p>
        </div>

        <div class="search-section">
          <md-outlined-text-field
            prop:label={
              store.L.modules?.searchPlaceholder ?? "Search modules..."
            }
            prop:value={searchQuery()}
            on:input={handleInput}
            class="search-field"
          >
            <md-icon slot="leading-icon">
              <svg viewBox="0 0 24 24">
                <path d={ICONS.search} />
              </svg>
            </md-icon>
          </md-outlined-text-field>
        </div>

        <Show
          when={!store.loading.modules}
          fallback={
            <div class="modules-list">
              <For each={Array.from({ length: 5 })}>
                {() => (
                  <div class="module-card skeleton-card">
                    <Skeleton width="60%" height="20px" />
                    <Skeleton width="40%" height="14px" />
                  </div>
                )}
              </For>
            </div>
          }
        >
          <Show
            when={filteredModules().length > 0}
            fallback={
              <div class="empty-state">
                <div class="empty-icon">
                  <md-icon>
                    <svg viewBox="0 0 24 24">
                      <path d={ICONS.modules} />
                    </svg>
                  </md-icon>
                </div>
                <p>
                  {store.modules.length === 0
                    ? (store.L.modules?.empty ?? "No modules found")
                    : "No matching modules"}
                </p>
              </div>
            }
          >
            <div class="modules-list">
              <For each={filteredModules()}>
                {(mod) => (
                  <div
                    class={`module-card ${expandedId() === mod.id ? "expanded" : ""} ${
                      mod.is_mounted ? "" : "unmounted"
                    }`}
                  >
                    <div
                      class="card-main clickable"
                      onClick={() => toggleExpand(mod.id)}
                      onKeyDown={(e) => handleKeydown(e, mod.id)}
                      role="button"
                      tabindex="0"
                    >
                      <md-ripple />
                      <div class="module-info">
                        <span class="module-name">{mod.name}</span>
                        <div class="module-meta-row">
                          <span class="module-id">{mod.id}</span>
                          <span class="version-tag">{mod.version}</span>
                        </div>
                      </div>

                      <div
                        class={`status-badge ${mod.is_mounted ? "magic" : "skipped"}`}
                      >
                        {mod.is_mounted ? "Magic" : "Skipped"}
                      </div>
                    </div>

                    <Show when={expandedId() === mod.id}>
                      <div class="card-details">
                        <div class="detail-row">
                          <span class="detail-label">Author</span>
                          <span class="detail-value">
                            {mod.author || "Unknown"}
                          </span>
                        </div>
                        <div class="detail-row description">
                          <span class="detail-label">Description</span>
                          <p class="detail-value">
                            {mod.description || "No description"}
                          </p>
                        </div>

                        <Show when={!mod.is_mounted}>
                          <div class="status-alert">
                            <md-icon class="alert-icon">
                              <svg viewBox="0 0 24 24">
                                <path d={ICONS.info} />
                              </svg>
                            </md-icon>
                            <span>
                              {mod.disabledByFlag
                                ? "Disabled via Manager or 'disable' file."
                                : mod.skipMount
                                  ? "Skipped via 'skip_mount' flag."
                                  : "Not mounted."}
                            </span>
                          </div>
                        </Show>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>

      <BottomActions>
        <div class="spacer" />
        <md-filled-tonal-icon-button
          on:click={() => store.loadModules()}
          prop:disabled={store.loading.modules}
          prop:title={store.L.modules?.reload ?? "Refresh"}
        >
          <md-icon>
            <svg viewBox="0 0 24 24">
              <path d={ICONS.refresh} />
            </svg>
          </md-icon>
        </md-filled-tonal-icon-button>
      </BottomActions>
    </>
  );
}
