import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import BottomActions from "../components/BottomActions";
import Skeleton from "../components/Skeleton";
import { ICONS } from "../lib/constants";
import { store } from "../lib/store";

import "./LogsTab.css";
import "@material/web/checkbox/checkbox.js";
import "@material/web/iconbutton/filled-tonal-icon-button.js";
import "@material/web/icon/icon.js";

export default function LogsTab() {
  const [searchLogQuery, setSearchLogQuery] = createSignal("");
  const [filterLevel, setFilterLevel] = createSignal<
    "all" | "info" | "warn" | "error"
  >("all");
  let logContainer: HTMLElement | undefined;
  const [autoRefresh, setAutoRefresh] = createSignal(false);
  let refreshInterval: number | undefined;
  const [userHasScrolledUp, setUserHasScrolledUp] = createSignal(false);

  const filteredLogs = () =>
    store.logs.filter((line) => {
      const text = typeof line === "string" ? line : line.text;
      const type = typeof line === "string" ? "info" : line.type;

      const matchesSearch = text
        .toLowerCase()
        .includes(searchLogQuery().toLowerCase());
      let matchesLevel = true;
      if (filterLevel() !== "all") {
        matchesLevel = type === filterLevel();
      }

      return matchesSearch && matchesLevel;
    });

  async function scrollToBottom() {
    if (logContainer) {
      logContainer.scrollTo({
        top: logContainer.scrollHeight,
        behavior: "smooth",
      });
      setUserHasScrolledUp(false);
    }
  }

  function handleScroll(e: Event) {
    const target = e.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setUserHasScrolledUp(distanceToBottom > 50);
  }

  async function refreshLogs(silent = false) {
    await store.loadLogs(silent);
    if (!silent && !userHasScrolledUp() && logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  }

  async function copyLogs() {
    if (filteredLogs().length === 0) {
      return;
    }
    const text = filteredLogs()
      .map((l) => (typeof l === "string" ? l : l.text))
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      store.showToast(store.L.logs?.copySuccess || "Copied", "success");
    } catch {
      store.showToast(store.L.logs?.copyFail || "Failed to copy", "error");
    }
  }

  createEffect(() => {
    if (autoRefresh()) {
      refreshLogs(true);
      refreshInterval = window.setInterval(() => {
        refreshLogs(true);
      }, 3000);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    }
  });

  onMount(() => {
    refreshLogs();
  });

  onCleanup(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  function toggleAutoRefresh(e: Event) {
    setAutoRefresh((e.target as HTMLInputElement).checked);
  }

  return (
    <>
      <div class="logs-container-page">
        <div class="logs-controls">
          <div class="search-wrapper">
            <md-icon class="search-icon">
              <svg viewBox="0 0 24 24">
                <path d={ICONS.search} />
              </svg>
            </md-icon>
            <input
              type="text"
              class="log-search-input"
              placeholder={store.L.logs?.searchPlaceholder}
              value={searchLogQuery()}
              onInput={(e) => setSearchLogQuery(e.currentTarget.value)}
            />
          </div>

          <div class="controls-right">
            <div class="log-auto-group">
              <md-checkbox
                id="auto-refresh"
                checked={autoRefresh()}
                onChange={toggleAutoRefresh}
                touch-target="wrapper"
              />
              <label for="auto-refresh" class="log-auto-label">
                Auto
              </label>
            </div>

            <div class="log-divider" />

            <select
              class="log-filter-select"
              value={filterLevel()}
              onChange={(e) =>
                setFilterLevel(
                  e.currentTarget.value as "all" | "info" | "warn" | "error",
                )
              }
            >
              <option value="all">{store.L.logs?.levels?.all}</option>
              <option value="info">{store.L.logs?.levels?.info}</option>
              <option value="warn">{store.L.logs?.levels?.warn}</option>
              <option value="error">{store.L.logs?.levels?.error}</option>
            </select>
          </div>
        </div>

        <div class="log-viewer" ref={logContainer} onScroll={handleScroll}>
          <Show
            when={
              !(
                store.loading.logs &&
                !autoRefresh() &&
                filteredLogs().length === 0
              )
            }
            fallback={
              <div class="log-skeleton-container">
                <For each={Array.from({ length: 10 })}>
                  {(_, i) => (
                    <Skeleton width={`${60 + (i() % 3) * 20}%`} height="14px" />
                  )}
                </For>
              </div>
            }
          >
            <Show
              when={filteredLogs().length > 0}
              fallback={
                <div class="log-empty-state">
                  {store.logs.length === 0
                    ? store.L.logs?.empty
                    : "No matching logs"}
                </div>
              }
            >
              <For each={filteredLogs()}>
                {(line) => (
                  <div class="log-entry">
                    {typeof line === "string" ? (
                      <span class="log-info">{line}</span>
                    ) : (
                      <span class={`log-${line.type}`}>{line.text}</span>
                    )}
                  </div>
                )}
              </For>
              <div class="log-footer">— End of Logs —</div>
            </Show>
          </Show>

          <Show when={userHasScrolledUp()}>
            <button
              class="scroll-fab"
              onClick={scrollToBottom}
              title="Scroll to bottom"
            >
              <svg viewBox="0 0 24 24" class="scroll-icon">
                <path
                  d="M11 4h2v12l5.5-5.5 1.42 1.42L12 19.84l-7.92-7.92L5.5 10.5 11 16V4z"
                  fill="currentColor"
                />
              </svg>
              Latest
            </button>
          </Show>
        </div>
      </div>

      <BottomActions>
        <md-filled-tonal-icon-button
          on:click={copyLogs}
          prop:disabled={filteredLogs().length === 0}
          title={store.L.logs?.copy}
        >
          <md-icon>
            <svg viewBox="0 0 24 24">
              <path d={ICONS.copy} />
            </svg>
          </md-icon>
        </md-filled-tonal-icon-button>

        <div class="spacer" />

        <md-filled-tonal-icon-button
          on:click={() => refreshLogs(false)}
          prop:disabled={store.loading.logs}
          prop:title={store.L.logs?.refresh}
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
