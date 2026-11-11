/**
 * The page chrome: the View menu, the walk strip with the Walk toggle, the floor picker, the walk mode's crosshair and status line, and keyboard
 * shortcuts, wired to app actions. Plain DOM; `sync` is cheap to call every frame. The artwork's card (src/ui/art-card.ts) shows the label of the
 * artwork looked at or clicked.
 */
import { ArtCard } from './art-card.js';
import type { ArtCardContent } from './art-card.js';
import { FloorPicker } from './floor-picker.js';
import type { FloorEntry } from './floor-picker.js';
import { bindKeys } from './keyboard.js';
import { ViewMenu, closeOnOutside } from './menus.js';
import type { PresetEntry, SpawnEntry, ViewActions, ViewState } from './menus.js';
import { el, setAttr, setText } from './dom.js';
import { installStyles } from './styles.js';
import { WalkStrip } from './walk-strip.js';

export interface UiInfo {
  readonly presets: readonly PresetEntry[];
  readonly spawns: readonly SpawnEntry[];
  /** Top of the section-cut slider, in metres. */
  readonly cutMax: number;
  /** The floor picker's entries from the top of its column down: All, then the floors from the highest. */
  readonly floors: readonly FloorEntry[];
}

export interface UiActions extends ViewActions {
  /** The Walk toggle, F and Esc while walking: into walk mode, or back to the orbit view. */
  toggleWalk(): void;
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

export type UiState = ViewState & {
  /** Walk mode is on (or being prepared). */
  readonly walking: boolean;
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
  /** The physical keys held now (src/ui/keyboard.ts). */
  readonly held: ReadonlySet<string>;
}

const WALK_STATUS: Readonly<Record<WalkStatus, string>> = {
  off: '',
  preparing: 'Preparing walk mode…',
  free: 'Walk mode. Click the view to look with the mouse, or drag. W A S D or the arrows walk, Shift runs, Space jumps, Esc or F leaves.',
  locked: 'Walk mode. Move the mouse to look. W A S D or the arrows walk, Shift runs, Space jumps, Esc or F leaves.',
};

/**
 * Builds the chrome into `root`. `walking()` says whether walk mode is on now; the keys read it at each press, so a key right after one that
 * changes the mode (F, then Space before the next frame) takes the new mode's meaning.
 */
export function createUi(root: HTMLElement, info: UiInfo, actions: UiActions, initial: UiState, walking: () => boolean): Ui {
  installStyles();
  const strip = new WalkStrip(() => { actions.toggleWalk(); });
  const view = new ViewMenu(info.presets, info.spawns, info.cutMax, initial, actions);
  const floors = new FloorPicker(info.floors, (id) => { actions.chooseFloor(id); });
  const menus = document.createElement('div');
  menus.className = 'met-menus';
  menus.append(view.disclosure.element);
  const ui = document.createElement('div');
  ui.className = 'met-ui';
  ui.dataset['testid'] = 'ui';
  const status = el('div', { className: 'met-walk-status', testid: 'walk-status', attrs: { role: 'status', 'aria-live': 'polite' } });
  status.hidden = true;
  // The crosshair marks the eye's ray: the canvas's centre, where walk mode's projection is centred.
  const crosshair = el('div', { className: 'met-crosshair', testid: 'crosshair', attrs: { 'aria-hidden': 'true' } });
  crosshair.hidden = true;
  ui.append(crosshair, menus, status, floors.element, strip.element);
  // The artwork's card comes after the floor picker and the strip, whose places its own follows (src/ui/styles.ts).
  const card = new ArtCard();
  ui.append(card.element);
  // The door prompt, centred under the crosshair in the band M3b's label card keeps out of (docs/design/spec.md, Doors: Use).
  const prompt = el('div', { className: 'met-door-prompt', testid: 'door-prompt', attrs: { role: 'status', 'aria-live': 'polite' } });
  prompt.hidden = true;
  crosshair.after(prompt);
  root.appendChild(ui);
  closeOnOutside([view.disclosure]);
  const held = bindKeys(actions, walking);

  // Panels never reach under the strip: they follow its height (src/ui/styles.ts).
  const fit = (): void => {
    document.documentElement.style.setProperty('--met-strip-h', `${String(Math.ceil(strip.element.getBoundingClientRect().height))}px`);
  };
  new ResizeObserver(fit).observe(strip.element);
  fit();
  // The artwork's card stands clear of the floor picker in the orbit view: it follows the picker's width.
  const fitPicker = (): void => {
    document.documentElement.style.setProperty('--met-floors-w', `${String(Math.ceil(floors.element.getBoundingClientRect().width))}px`);
  };
  new ResizeObserver(fitPicker).observe(floors.element);
  fitPicker();

  /** The walk status the last sync showed, so a menu closes when the pointer locks and not after. */
  let shownStatus = initial.walkStatus;
  const sync = (state: UiState): void => {
    strip.sync(state.walking);
    view.sync(state);
    floors.sync(state);
    // A menu open when the pointer locks closes: the locked pointer cannot reach it, and the browser keeps the Esc that would (review 0, F6). One
    // the keyboard opens while it is locked stays (review 1, F12).
    if (state.walkStatus === 'locked' && shownStatus !== 'locked' && view.disclosure.open) view.disclosure.setOpen(false);
    shownStatus = state.walkStatus;
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
  return { sync, held };
}
