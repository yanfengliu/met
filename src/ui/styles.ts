/**
 * Page chrome styles, injected once at boot. Plain CSS; the layout is checked at 1280x720 and 390x844 by tests/e2e/layout.spec.ts.
 */
const CSS = /* css */ `
:root {
  --met-panel: rgba(20, 21, 24, 0.9);
  --met-panel-solid: #16171a;
  --met-line: rgba(255, 255, 255, 0.14);
  --met-text: #f2efe8;
  --met-dim: #b9b4aa;
  --met-accent: #e0b25c;
  --met-accent-ink: #1b1508;
  --met-thumb: 16px;
  --met-bar-h: 150px;
  color-scheme: dark;
}
.met-app { position: fixed; inset: 0; overflow: hidden; font: 14px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--met-text); }
.met-viewport { position: absolute; inset: 0; }
.met-viewport canvas { display: block; width: 100%; height: 100%; touch-action: none; outline: none; }
.met-noui .met-ui { display: none; }
.met-ui button { font: inherit; color: inherit; }
.met-button {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-width: 40px; height: 40px; padding: 0 10px; border-radius: 8px;
  border: 1px solid var(--met-line); background: rgba(255, 255, 255, 0.06); cursor: pointer;
}
.met-button:hover { background: rgba(255, 255, 255, 0.13); }
.met-button:focus-visible, .met-ui input:focus-visible { outline: 2px solid var(--met-accent); outline-offset: 2px; }
.met-button[aria-pressed="true"] { background: var(--met-accent); color: var(--met-accent-ink); border-color: var(--met-accent); }
.met-button svg { width: 20px; height: 20px; fill: currentColor; flex: none; }
.met-icon { padding: 0; width: 40px; }

.met-menus { position: absolute; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 3; }
/* Panels anchor to the whole group's right edge (its containing block), so a panel opened from the left button still fits a narrow screen. */
.met-menu { position: static; }
.met-menu > .met-button { background: var(--met-panel); backdrop-filter: blur(8px); }
.met-panel {
  position: absolute; top: 48px; right: 0; width: min(330px, calc(100vw - 24px));
  max-height: calc(100vh - var(--met-bar-h) - 84px); overflow-y: auto; box-sizing: border-box;
  padding: 8px; border-radius: 10px; border: 1px solid var(--met-line);
  background: var(--met-panel-solid); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}
.met-panel[hidden] { display: none; }
.met-panel h2 { margin: 10px 8px 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--met-dim); }
.met-panel h2:first-child { margin-top: 4px; }
.met-item {
  display: flex; width: 100%; align-items: baseline; justify-content: space-between; gap: 12px; text-align: left;
  padding: 9px 10px; border: 0; border-radius: 7px; background: transparent; cursor: pointer;
}
.met-item:hover, .met-item:focus-visible { background: rgba(255, 255, 255, 0.1); outline: none; }
.met-item:disabled { color: var(--met-dim); opacity: 0.6; cursor: default; background: transparent; }
.met-item[aria-current="true"], .met-item[aria-pressed="true"] { color: var(--met-accent); }
.met-item .met-years { color: var(--met-dim); font-size: 12px; white-space: nowrap; }
/* Chapter items: title and years on the first line, the summary as a wrapped line of text under them. */
.met-chapter { flex-wrap: wrap; row-gap: 3px; }
.met-chapter .met-summary { display: block; flex: 1 0 100%; color: var(--met-dim); font-size: 12px; line-height: 1.35; overflow-wrap: anywhere; }
.met-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; flex-wrap: wrap; }
.met-row input[type="range"] { flex: 1 1 140px; min-width: 120px; accent-color: var(--met-accent); }
.met-row output { min-width: 52px; text-align: right; font-variant-numeric: tabular-nums; color: var(--met-dim); }

.met-bar {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 2; box-sizing: border-box;
  padding: 10px 16px 12px; background: var(--met-panel); backdrop-filter: blur(10px); border-top: 1px solid var(--met-line);
}
.met-label { margin-bottom: 6px; min-width: 0; }
.met-title { font-weight: 600; overflow-wrap: anywhere; }
.met-detail { color: var(--met-dim); font-size: 13px; margin-top: 2px; min-height: 1.35em; overflow-wrap: anywhere; }
.met-scrub { position: relative; height: 28px; margin: 4px 0 8px; }
.met-marks { position: absolute; left: calc(var(--met-thumb) / 2); right: calc(var(--met-thumb) / 2); top: 3px; bottom: 3px; pointer-events: none; }
.met-mark { position: absolute; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--met-accent); opacity: 0.85; border-radius: 1px; }
.met-scrubber {
  -webkit-appearance: none; appearance: none; position: absolute; inset: 0; width: 100%; height: 28px; margin: 0;
  background: transparent; cursor: pointer;
}
.met-scrubber::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.22); }
.met-scrubber::-moz-range-track { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.22); }
.met-scrubber::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: var(--met-thumb); height: var(--met-thumb); margin-top: -5px;
  border-radius: 50%; background: var(--met-text); border: 2px solid var(--met-accent); box-sizing: border-box;
}
.met-scrubber::-moz-range-thumb { width: var(--met-thumb); height: var(--met-thumb); border-radius: 50%; background: var(--met-text); border: 2px solid var(--met-accent); box-sizing: border-box; }
.met-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; }
.met-group { display: flex; gap: 6px; flex-wrap: nowrap; }
.met-speed .met-button { min-width: 44px; padding: 0 8px; font-variant-numeric: tabular-nums; }

.met-error {
  position: absolute; left: 16px; right: 16px; top: 16px; z-index: 5; margin: 0; padding: 14px 16px; border-radius: 10px;
  background: #3a1514; color: #ffd9d4; border: 1px solid #a3433b; white-space: pre-wrap; font: 13px/1.4 ui-monospace, Consolas, monospace;
}

@media (max-width: 640px) {
  .met-bar { padding: 8px 12px 10px; }
  .met-title { font-size: 13px; }
  .met-detail { font-size: 12px; }
  .met-controls { justify-content: flex-start; }
  .met-group { gap: 5px; }
  .met-icon { width: 40px; }
  .met-speed .met-button { min-width: 40px; padding: 0 4px; }
}
`;

/** Installs the page styles once; later calls do nothing. Call before measuring any element. */
export function installStyles(): void {
  if (document.head.querySelector('style[data-met="ui"]') !== null) return;
  const style = document.createElement('style');
  style.dataset['met'] = 'ui';
  style.textContent = CSS;
  document.head.appendChild(style);
}
