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
.met-modes { gap: 16px; align-items: center; }
.met-walk { padding: 0 12px 0 8px; }
.met-walk-status {
  position: absolute; top: 12px; left: 12px; z-index: 3; box-sizing: border-box; max-width: min(460px, calc(100vw - 210px));
  padding: 8px 12px; border-radius: 8px; background: var(--met-panel); backdrop-filter: blur(8px); border: 1px solid var(--met-line);
  font-size: 13px; line-height: 1.35; color: var(--met-text); pointer-events: none;
}
.met-walk-status[hidden] { display: none; }
/* While walking the bar folds into a strip at the bottom right holding the Timeline button and the Walk toggle; the Timeline button unfolds it. */
.met-bar-toggle[hidden] { display: none; }
.met-bar.met-bar-folded { left: auto; right: 12px; bottom: 12px; padding: 6px; border: 1px solid var(--met-line); border-radius: 10px; }
.met-bar-folded .met-label, .met-bar-folded .met-scrub, .met-bar-folded .met-transport, .met-bar-folded .met-speed { display: none; }
.met-bar-folded .met-modes { gap: 8px; }
/* The crosshair marks the eye's ray at the centre of the walking view; gold while a door or an artwork is within reach of it. */
.met-crosshair { position: absolute; left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px; z-index: 1; pointer-events: none; }
.met-crosshair[hidden] { display: none; }
.met-crosshair::before, .met-crosshair::after {
  content: ''; position: absolute; border-radius: 1px; background: rgba(255, 255, 255, 0.92); box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.55);
}
.met-crosshair::before { left: 7px; top: 0; width: 2px; height: 16px; }
.met-crosshair::after { left: 0; top: 7px; width: 16px; height: 2px; }
.met-crosshair[data-target]::before, .met-crosshair[data-target]::after { background: var(--met-accent); }
/* The door prompt, centred 16 px under the crosshair: inside the band x = centre ± 160 px, y = centre - 8 px to + 80 px, which the label card keeps out of. */
.met-door-prompt {
  position: absolute; left: 50%; top: calc(50% + 16px); transform: translateX(-50%); z-index: 1; box-sizing: border-box; max-width: 300px;
  padding: 4px 10px; border-radius: 6px; background: var(--met-panel); border: 1px solid var(--met-line);
  font-size: 13px; font-weight: 600; line-height: 1.35; white-space: nowrap; color: var(--met-text); pointer-events: none;
}
.met-door-prompt[hidden] { display: none; }
/* The floor picker: a column at the left, centred in the view above the bar; open menu panels (z-index 3) cover it on a narrow screen. */
.met-floors {
  position: absolute; left: 12px; top: calc((100% - var(--met-bar-h)) / 2); transform: translateY(-50%); z-index: 2;
  display: flex; flex-direction: column; gap: 4px; padding: 4px; border-radius: 10px;
  background: var(--met-panel); backdrop-filter: blur(8px); border: 1px solid var(--met-line);
}
.met-floors[hidden] { display: none; }
.met-floor { min-width: 66px; height: 34px; padding: 0 8px; }
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
  .met-modes { gap: 10px; }
  .met-walk-status { font-size: 12px; padding: 6px 9px; }
  .met-bar.met-bar-folded { right: 8px; bottom: 8px; padding: 5px; }
  .met-floors { left: 8px; gap: 3px; padding: 3px; }
  .met-floor { min-width: 58px; height: 32px; padding: 0 6px; font-size: 13px; }
}

/*
 * The artwork's card (src/ui/art-card.ts): at the bottom left above the timeline bar, whole or folded (the folded strip stands 12 px off the bottom), and
 * in the orbit view clear of the floor picker (--met-floors-w, src/ui/ui.ts). Walking, where it could reach the middle of the view, it keeps under the
 * crosshair (16 px) and, folded, under the door prompt's place too: the band from the crosshair down to 80 px under the centre.
 */
.met-art-card {
  position: absolute; left: 12px; bottom: calc(var(--met-bar-h) + 12px); z-index: 2; box-sizing: border-box;
  width: min(360px, calc(100vw - 24px)); max-height: calc(100% - var(--met-bar-h) - 76px); overflow-y: auto;
  padding: 10px 12px; border-radius: 10px; border: 1px solid var(--met-line);
  background: var(--met-panel); backdrop-filter: blur(8px); font-size: 13px; line-height: 1.35;
}
.met-art-card[hidden] { display: none; }
.met-floors:not([hidden]) ~ .met-art-card { left: calc(var(--met-floors-w) + 24px); width: min(360px, calc(100vw - var(--met-floors-w) - 36px)); }
.met-bar-folded ~ .met-art-card { bottom: calc(var(--met-bar-h) + 24px); }
.met-art-title { margin: 0 0 3px; font-size: 15px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
.met-art-line { margin: 0; overflow-wrap: anywhere; }
.met-art-dim { color: var(--met-dim); }
.met-art-foot { margin: 6px 0 0; display: flex; flex-wrap: wrap; gap: 2px 12px; align-items: baseline; font-size: 12px; }
.met-art-link { color: var(--met-accent); text-underline-offset: 2px; }
.met-art-link:focus-visible { outline: 2px solid var(--met-accent); outline-offset: 2px; border-radius: 2px; }
.met-art-credit { color: var(--met-dim); }
.met-art-hint { margin: 6px 0 0; font-size: 12px; }
@media (max-width: 1000px) {
  .met-crosshair:not([hidden]) ~ .met-art-card { max-height: calc(50% - 16px - var(--met-bar-h) - 12px); }
  .met-crosshair:not([hidden]) ~ .met-bar-folded ~ .met-art-card { max-height: calc(50% - 88px - var(--met-bar-h) - 24px); }
}
@media (max-width: 640px) {
  .met-art-card { left: 8px; width: calc(100vw - 16px); bottom: calc(var(--met-bar-h) + 8px); padding: 8px 10px; font-size: 12px; }
  .met-floors:not([hidden]) ~ .met-art-card { left: calc(var(--met-floors-w) + 16px); width: calc(100vw - var(--met-floors-w) - 24px); }
  .met-bar-folded ~ .met-art-card { bottom: calc(var(--met-bar-h) + 16px); }
  .met-crosshair:not([hidden]) ~ .met-art-card { max-height: calc(50% - 16px - var(--met-bar-h) - 8px); }
  .met-crosshair:not([hidden]) ~ .met-bar-folded ~ .met-art-card { max-height: calc(50% - 88px - var(--met-bar-h) - 16px); }
  .met-art-title { font-size: 14px; }
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
