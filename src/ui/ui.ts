/**
 * The page chrome: timeline bar, Build menu, View menu, floor picker, the walk mode's crosshair and status line, and keyboard shortcuts, wired to app
 * actions. Plain DOM; `sync` is cheap to call every frame. The timeline shows only while the build replay is open (docs/design/spec.md, Page: Build replay).
 * The artwork's card (src/ui/art-card.ts) shows the label of the artwork looked at or clicked.
 */
import type { Chapter } from '../build/types.js';
import { ArtCard } from './art-card.js';
import type { ArtCardContent } from './art-card.js';
import { FloorPicker } from './floor-picker.js';
import type { FloorEntry } from './floor-picker.js';
import { bindKeys } from './keyboard.js';
import { chapterAt } from './label.js';
import type { LabelStep } from './label.js';
import { BuildMenu, ViewMenu, closeOnOutside } from './menus.js';
import type { ChapterEntry, PresetEntry, SpawnEntry, ViewActions, ViewState } from './menus.js';
import { el, setAttr, setText } from './dom.js';
import { installStyles } from './styles.js';
import { TimelineBar } from './timeline-bar.js';
import type { BarActions, BarState } from './timeline-bar.js';

export interface UiInfo {
  readonly steps: readonly LabelStep[];
  readonly chapters: readonly Chapter[];
  readonly ranges: readonly ChapterEntry[];
  readonly presets: readonly PresetEntry[];
  readonly spawns: readonly SpawnEntry[];
  /** Top of the section-cut slider, in metres. */
  readonly cutMax: number;
  /** The floor picker's entries from the top of its column down: All, then the floors from the highest. */
  readonly floors: readonly FloorEntry[];
}

export interface UiActions extends BarActions, ViewActions {
  /** Opens the build replay at the start of a chapter: its first step's index. */
  goToChapter(first: number): void;
  /** The Build menu's Build replay item: opens the build replay, or closes it. */
  toggleReplay(): void;
  jump(): void;
  /** E while walking: opens or closes the door the walking eye looks at (docs/design/spec.md, Doors). */
  act(): void;
  /** Chooses a floor picker entry by id. */
  chooseFloor(id: string): void;
  floorUp(): void;
  floorDown(): void;
}

/** What the walk status line says: nothing in the orbit view, then preparing, walking with the pointer free, or with it locked to the view. */
export type WalkStatus = 'off' | 'preparing' | 'free' | 'locked';

export type UiState = BarState & ViewState & {
  readonly walkStatus: WalkStatus;
  /** While walking, whether the status line shows how to look, move and leave (src/walk/walk-mode.ts, `HINT_SECONDS`). */
  readonly walkHint: boolean;
  /** The kind of tagged piece the walking eye looks at within reach (src/walk/look.ts), or null. */
  readonly walkTarget: string | null;
  /** What the prompt under the crosshair says for the door the walking eye looks at ("E Open", "E Close" or "Locked"; src/viewer/doors.ts), or null. */
  readonly walkPrompt: string | null;
  /** The floor picker's entry in view. */
  readonly floor: string;
  /** The artwork's card to show (src/ui/art-card.ts), or null. */
  readonly artCard: ArtCardContent | null;
};

export interface Ui {
  sync(state: UiState): void;
  /** The timeline bar, whose height the camera keeps clear of in the orbit view while it is whole. */
  readonly bar: HTMLElement;
  /** The physical keys held now (src/ui/keyboard.ts). */
  readonly held: ReadonlySet<string>;
}

const WALK_STATUS: Readonly<Record<WalkStatus, string>> = {
  off: '',
  preparing: 'Preparing walk mode…',
  free: 'Walk mode. Click the view to look with the mouse, or drag. W A S D or the arrows walk, Shift runs, Space jumps, F leaves.',
  locked: 'Move the mouse to look. Esc frees the pointer; F leaves walk mode.',
};

/**
 * Builds the chrome into `root`. `walking()` says whether walk mode is on now; the keys read it at each press, so a key right after one that
 * changes the mode (F, then Space before the next frame) takes the new mode's meaning.
 */
export function createUi(root: HTMLElement, info: UiInfo, actions: UiActions, initial: UiState, walking: () => boolean): Ui {
  installStyles();
  const bar = new TimelineBar(
    { steps: info.steps, chapters: info.chapters, boundaries: info.ranges.filter((r) => r.count > 0).map((r) => ({ first: r.first, title: r.title })) },
    actions,
  );
  const chapters = new BuildMenu(info.ranges, (first) => { actions.goToChapter(first); }, () => { actions.toggleReplay(); });
  const view = new ViewMenu(info.presets, info.spawns, info.cutMax, initial, actions);
  const floors = new FloorPicker(info.floors, (id) => { actions.chooseFloor(id); });
  const menus = document.createElement('div');
  menus.className = 'met-menus';
  menus.append(chapters.disclosure.element, view.disclosure.element);
  const ui = document.createElement('div');
  ui.className = 'met-ui';
  ui.dataset['testid'] = 'ui';
  const status = el('div', { className: 'met-walk-status', testid: 'walk-status', attrs: { role: 'status', 'aria-live': 'polite' } });
  status.hidden = true;
  // The crosshair marks the eye's ray: the canvas's centre, where walk mode's projection is centred (src/main.ts sets no inset while walking).
  const crosshair = el('div', { className: 'met-crosshair', testid: 'crosshair', attrs: { 'aria-hidden': 'true' } });
  crosshair.hidden = true;
  ui.append(crosshair, menus, status, floors.element, bar.element);
  // The artwork's card comes after the floor picker and the bar, whose state its place follows (src/ui/styles.ts).
  const card = new ArtCard();
  ui.append(card.element);
  // The door prompt, centred under the crosshair in the band M3b's label card keeps out of (docs/design/spec.md, Doors: Use).
  const prompt = el('div', { className: 'met-door-prompt', testid: 'door-prompt', attrs: { role: 'status', 'aria-live': 'polite' } });
  prompt.hidden = true;
  crosshair.after(prompt);
  root.appendChild(ui);
  closeOnOutside([chapters.disclosure, view.disclosure]);
  const held = bindKeys(actions, walking);

  // Panels never reach under the bar, whole or a strip, and while the replay is open the floor picker centres in the view above it: both follow the bar's
  // height (src/ui/styles.ts).
  const fit = (): void => {
    document.documentElement.style.setProperty('--met-bar-h', `${String(Math.ceil(bar.element.getBoundingClientRect().height))}px`);
  };
  new ResizeObserver(fit).observe(bar.element);
  fit();
  // The artwork's card stands clear of the floor picker in the orbit view: it follows the picker's width.
  const fitPicker = (): void => {
    document.documentElement.style.setProperty('--met-floors-w', `${String(Math.ceil(floors.element.getBoundingClientRect().width))}px`);
  };
  new ResizeObserver(fitPicker).observe(floors.element);
  fitPicker();

  const sync = (state: UiState): void => {
    bar.sync(state);
    chapters.sync(chapterAt(state.t, info.ranges, info.steps.length), state.replay);
    if (ui.hasAttribute('data-replay') !== state.replay) ui.toggleAttribute('data-replay', state.replay);
    view.sync(state);
    floors.sync(state);
    // The status line says "Preparing walk mode…", then shows how to look, move and leave only while the hint lasts.
    const shown = state.walkStatus === 'preparing' || (state.walkHint && state.walkStatus !== 'off');
    setText(status, shown ? WALK_STATUS[state.walkStatus] : '');
    if (status.hidden !== !shown) status.hidden = !shown;
    const aiming = state.walkStatus === 'free' || state.walkStatus === 'locked';
    if (crosshair.hidden !== !aiming) crosshair.hidden = !aiming;
    if (state.walkTarget === null) crosshair.removeAttribute('data-target');
    else setAttr(crosshair, 'data-target', state.walkTarget);
    card.sync(state.artCard, state.walkStatus === 'locked');
    const words = aiming ? (state.walkPrompt ?? '') : '';
    setText(prompt, words);
    if (prompt.hidden !== (words === '')) prompt.hidden = words === '';
  };
  sync(initial);
  return { sync, bar: bar.element, held };
}
