/**
 * The page chrome: timeline bar, chapter menu, view menu and keyboard shortcuts, wired to app actions. Plain DOM; `sync` is cheap to call every frame.
 */
import type { Chapter } from '../build/types.js';
import { bindKeys } from './keyboard.js';
import { chapterAt } from './label.js';
import type { LabelStep } from './label.js';
import { ChapterMenu, ViewMenu, closeOnOutside } from './menus.js';
import type { ChapterEntry, PresetEntry, ViewActions, ViewState } from './menus.js';
import { installStyles } from './styles.js';
import { TimelineBar } from './timeline-bar.js';
import type { BarActions, BarState } from './timeline-bar.js';

export interface UiInfo {
  readonly steps: readonly LabelStep[];
  readonly chapters: readonly Chapter[];
  readonly ranges: readonly ChapterEntry[];
  readonly presets: readonly PresetEntry[];
  /** Top of the section-cut slider, in metres. */
  readonly cutMax: number;
}

export interface UiActions extends BarActions, ViewActions {
  goToChapter(first: number): void;
}

export type UiState = BarState & ViewState;

export interface Ui {
  sync(state: UiState): void;
  /** The timeline bar, whose height the camera keeps clear of. */
  readonly bar: HTMLElement;
}

export function createUi(root: HTMLElement, info: UiInfo, actions: UiActions, initial: UiState): Ui {
  installStyles();
  const bar = new TimelineBar(
    { steps: info.steps, chapters: info.chapters, boundaries: info.ranges.filter((r) => r.count > 0).map((r) => ({ first: r.first, title: r.title })) },
    actions,
  );
  const chapters = new ChapterMenu(info.ranges, (first) => { actions.goToChapter(first); });
  const view = new ViewMenu(info.presets, info.cutMax, initial, actions);
  const menus = document.createElement('div');
  menus.className = 'met-menus';
  menus.append(chapters.disclosure.element, view.disclosure.element);
  const ui = document.createElement('div');
  ui.className = 'met-ui';
  ui.dataset['testid'] = 'ui';
  ui.append(menus, bar.element);
  root.appendChild(ui);
  closeOnOutside([chapters.disclosure, view.disclosure]);
  bindKeys(actions);

  // Panels never reach under the bar: their max height follows the bar's height.
  const fit = (): void => {
    document.documentElement.style.setProperty('--met-bar-h', `${String(Math.ceil(bar.element.getBoundingClientRect().height))}px`);
  };
  new ResizeObserver(fit).observe(bar.element);
  fit();

  const sync = (state: UiState): void => {
    bar.sync(state);
    chapters.sync(chapterAt(state.t, info.ranges, info.steps.length));
    view.sync(state);
  };
  sync(initial);
  return { sync, bar: bar.element };
}
