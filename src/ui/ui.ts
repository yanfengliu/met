/**
 * The page chrome: timeline bar, chapter menu, view menu, floor picker and keyboard shortcuts, wired to app actions. Plain DOM; `sync` is cheap to
 * call every frame.
 */
import type { Chapter } from '../build/types.js';
import { FloorPicker } from './floor-picker.js';
import type { FloorEntry } from './floor-picker.js';
import { bindKeys } from './keyboard.js';
import { chapterAt } from './label.js';
import type { LabelStep } from './label.js';
import { ChapterMenu, ViewMenu, closeOnOutside } from './menus.js';
import type { ChapterEntry, PresetEntry, SpawnEntry, ViewActions, ViewState } from './menus.js';
import { el, setText } from './dom.js';
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
  goToChapter(first: number): void;
  jump(): void;
  /** Chooses a floor picker entry by id. */
  chooseFloor(id: string): void;
  floorUp(): void;
  floorDown(): void;
}

/** What the walk status line says: nothing in the orbit view, then preparing, walking with the pointer free, or with it locked to the view. */
export type WalkStatus = 'off' | 'preparing' | 'free' | 'locked';

export type UiState = BarState & ViewState & {
  readonly walkStatus: WalkStatus;
  /** The floor picker's entry in view. */
  readonly floor: string;
};

export interface Ui {
  sync(state: UiState): void;
  /** The timeline bar, whose height the camera keeps clear of. */
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
  const chapters = new ChapterMenu(info.ranges, (first) => { actions.goToChapter(first); });
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
  ui.append(menus, status, floors.element, bar.element);
  root.appendChild(ui);
  closeOnOutside([chapters.disclosure, view.disclosure]);
  const held = bindKeys(actions, walking);

  // Panels never reach under the bar, and the floor picker centres in the view above it: both follow the bar's height.
  const fit = (): void => {
    document.documentElement.style.setProperty('--met-bar-h', `${String(Math.ceil(bar.element.getBoundingClientRect().height))}px`);
  };
  new ResizeObserver(fit).observe(bar.element);
  fit();

  const sync = (state: UiState): void => {
    bar.sync(state);
    chapters.sync(chapterAt(state.t, info.ranges, info.steps.length));
    view.sync(state);
    floors.sync(state);
    setText(status, WALK_STATUS[state.walkStatus]);
    if (status.hidden !== (state.walkStatus === 'off')) status.hidden = state.walkStatus === 'off';
  };
  sync(initial);
  return { sync, bar: bar.element, held };
}
