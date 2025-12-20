<script lang="ts">
</script>

<div class="logo-wrapper">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="magic-svg">
    <defs>
      <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:var(--md-sys-color-primary);stop-opacity:1" />
        <stop offset="100%" style="stop-color:var(--md-sys-color-tertiary);stop-opacity:1" />
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
      <path d="M 50 26 Q 50 50 74 50 Q 50 50 50 74 Q 50 50 26 50 Q 50 50 50 26 Z" class="core-shadow" />
      
      <path d="M 50 26 Q 50 50 74 50 Q 50 50 50 74 Q 50 50 26 50 Q 50 50 50 26 Z" class="core-body" filter="url(#glow)" />
      
      <circle cx="50" cy="50" r="3" fill="white" opacity="0.6" filter="url(#glow)" />
    </g>
  </svg>
</div>

<style>
  .logo-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .magic-svg {
    width: 100%;
    height: 100%;
    max-width: 120px;
    max-height: 120px;
    overflow: visible;
  }

  /* 轨道环 */
  .ring-bg {
    fill: none;
    stroke: var(--md-sys-color-surface-variant);
    stroke-width: 2;
    opacity: 0.3;
  }

  .ring-segment {
    fill: none;
    stroke: var(--md-sys-color-secondary);
    stroke-width: 2;
    stroke-linecap: round;
    opacity: 0.6;
  }

  .track-ring {
    animation: spin-slow 20s linear infinite;
    transform-origin: 50px 50px;
  }

  /* 能量环 */
  .energy-ring {
    fill: none;
    stroke: var(--md-sys-color-primary);
    stroke-width: 1.5;
    stroke-dasharray: 10 10;
    opacity: 0.8;
  }

  .energy-dot {
    fill: var(--md-sys-color-primary);
  }

  .spin-ring {
    animation: spin-fast 8s linear infinite reverse;
    transform-origin: 50px 50px;
  }

  /* 核心 */
  .core-shadow {
    fill: var(--md-sys-color-shadow);
    opacity: 0.2;
    transform: translate(2px, 2px);
    transform-origin: 50px 50px;
  }

  .core-body {
    fill: url(#coreGradient);
  }

  .static-core {
    transform-origin: 50px 50px;
  }

  /* 动画定义 */
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes spin-fast {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }
</style>