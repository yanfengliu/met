/**
 * Inline SVG icons for the page's buttons (24x24 view box), so no font or emoji rendering decides what a control looks like.
 */
const svg = (path: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;

export const ICONS = {
  /** A walking figure. */
  walk: svg('M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3A7.3 7.3 0 0 0 19 13v-2a5.1 5.1 0 0 1-4.4-2.5l-1-1.6A2 2 0 0 0 11.9 6c-.3 0-.5 0-.8.1L6 8.3V13h2V9.6l1.8-.7'),
} as const;
