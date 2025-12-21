import { For } from "solid-js";

import { store } from "../lib/store";

import "./Toast.css";

export default () => (
  <div class="toast-container">
    <For each={store.toasts}>
      {(toast) => (
        <div class={`toast toast-${toast.type}`} role="alert">
          <span>{toast.text}</span>
        </div>
      )}
    </For>
  </div>
);
