import type { JSX } from "solid-js";

import "./BottomActions.css";

interface BottomActionsProps {
  children: JSX.Element;
}

export default (props: BottomActionsProps) => (
  <div class="bottom-actions-root">{props.children}</div>
);
