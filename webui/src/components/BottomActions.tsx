/**
 * Copyright 2025 Magic Mount-rs Authors
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { JSX } from "solid-js";

import "./BottomActions.css";

interface BottomActionsProps {
  children: JSX.Element;
}

export default (props: BottomActionsProps) => (
  <div class="bottom-actions-root">{props.children}</div>
);
