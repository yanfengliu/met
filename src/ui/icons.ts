/**
 * Inline SVG icons for the transport buttons (24x24 view box), so no font or emoji rendering decides what a control looks like.
 */
const svg = (path: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;

export const ICONS = {
  start: svg('M6 5h2v14H6zM20 5v14L9.5 12z'),
  stepBack: svg('M7 5h2v14H7zM19 5v14l-8.5-7z'),
  playBackward: svg('M18 5v14L7 12z'),
  play: svg('M7 5v14l11-7z'),
  pause: svg('M7 5h4v14H7zm6 0h4v14h-4z'),
  stepForward: svg('M15 5h2v14h-2zM5 5v14l8.5-7z'),
  end: svg('M16 5h2v14h-2zM4 5v14l10.5-7z'),
  /** A walking figure. */
  walk: svg('M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2a5.1 5.1 0 0 1-4.4-2.5l-1-1.6A2 2 0 0 0 11.9 6c-.3 0-.5 0-.8.1L6 8.3V13h2V9.6l1.8-.7'),
  /** A chevron up: unfold the timeline bar while walking. */
  unfold: svg('M7.4 15.4 12 10.8l4.6 4.6L18 14l-6-6-6 6z'),
  /** A chevron down: fold it again. */
  fold: svg('M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z'),
} as const;
