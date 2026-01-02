/**
 * Copyright 2025 Magic Mount-rs Authors
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./MagicLogo.css";

export default () => (
  <div class="logo-wrapper">
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      class="magic-svg"
    >
      <defs>
        <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop
            offset="0%"
            style={{
              "stop-color": "var(--md-sys-color-primary)",
              "stop-opacity": "1",
            }}
          />
          <stop
            offset="100%"
            style={{
              "stop-color": "var(--md-sys-color-tertiary)",
              "stop-opacity": "1",
            }}
          />
        </linearGradient>

        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g class="track-ring">
        <circle cx="50" cy="50" r="42" class="ring-bg" />
        <path d="M 50 8 A 42 42 0 0 1 92 50" class="ring-segment" />
        <path d="M 50 92 A 42 42 0 0 1 8 50" class="ring-segment" />
      </g>

      <g class="spin-ring">
        <circle cx="50" cy="50" r="34" class="energy-ring" />
        <circle cx="50" cy="16" r="3" class="energy-dot" />
        <circle cx="20.5" cy="67" r="3" class="energy-dot" />
        <circle cx="79.5" cy="67" r="3" class="energy-dot" />
      </g>

      <g class="static-core">
        <path
          d="M 50 26 Q 50 50 74 50 Q 50 50 50 74 Q 50 50 26 50 Q 50 50 50 26 Z"
          class="core-shadow"
        />

        <path
          d="M 50 26 Q 50 50 74 50 Q 50 50 50 74 Q 50 50 26 50 Q 50 50 50 26 Z"
          class="core-body"
          filter="url(#glow)"
        />

        <circle
          cx="50"
          cy="50"
          r="3"
          fill="white"
          opacity="0.6"
          filter="url(#glow)"
        />
      </g>
    </svg>
  </div>
);
