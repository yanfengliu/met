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
} as const;
