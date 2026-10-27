/**
 * Keyboard shortcuts (docs/design/spec.md, Page: Keyboard), in two modes.
 * - Orbit view: Space play/pause, Shift+Space play backward, Right step forward, Left step back, Home start, End end; W A S D move the camera
 *   over the ground and Q E down and up while held (Shift doubles the speed; src/viewer/orbit-keys.ts); Page Up and Page Down go up and down a
 *   floor (src/viewer/floors.ts); F enters walk mode.
 * - Walk mode: W A S D and the arrow keys walk while held, Shift runs, Space jumps, E opens or closes the door looked at (docs/design/spec.md, Doors),
 *   F returns to the orbit view; the timeline and floor keys are off. E is taken before the held keys, so in walk mode it is never held.
 * Held keys are physical keys (`event.code`), so W A S D sit in the same place on any layout; `bindKeys` returns the set of those held, which the
 * frame loop reads, and empties it when the page loses focus. A focused button keeps Space and Enter for itself, a focused slider other than the
 * scrubber keeps the keys it moves by (arrows, Home, End, Page Up and Page Down), and a text field keeps every key.
 */

export interface KeyActions {
  togglePlay(): void;
  togglePlayBackward(): void;
  stepForward(): void;
  stepBack(): void;
  toStart(): void;
  toEnd(): void;
  toggleWalk(): void;
  jump(): void;
  /** E while walking: opens or closes the door the walking eye looks at. */
  act(): void;
  floorUp(): void;
  floorDown(): void;
}

/** Keys whose holding the frame loop reads, by `event.code`. */
const MOVE_CODES: ReadonlySet<string> = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight']);
/** The arrows walk in walk mode only; in the orbit view they step the timeline. */
const ARROW_CODES: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const SLIDER_KEYS: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);

function keepsKey(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    if (target.type !== 'range') return true;
    return target.dataset['testid'] !== 'scrubber' && SLIDER_KEYS.has(key);
  }
  if (target instanceof HTMLButtonElement) return key === ' ' || key === 'Enter';
  return false;
}

/** Binds the shortcuts; `walking()` says which mode applies. Returns the physical keys held now (read-only, kept up to date). */
export function bindKeys(actions: KeyActions, walking: () => boolean): ReadonlySet<string> {
  const held = new Set<string>();
  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (keepsKey(event.target, event.key)) return;
    const walk = walking();
    // Walking, E uses the door looked at; it must come before the held keys, where the orbit view's E moves the camera up.
    if (walk && event.code === 'KeyE') {
      if (!event.repeat) actions.act();
      event.preventDefault();
      return;
    }
    if (MOVE_CODES.has(event.code) || (walk && ARROW_CODES.has(event.code))) {
      held.add(event.code);
      if (walk && ARROW_CODES.has(event.code)) event.preventDefault();
      return;
    }
    let handled = true;
    if (event.code === 'KeyF') {
      if (!event.repeat) actions.toggleWalk();
    } else if (walk) {
      if (event.key === ' ') {
        if (!event.repeat) actions.jump();
      } else {
        handled = false;
      }
    } else {
      switch (event.key) {
        case ' ':
          if (event.repeat) break;
          if (event.shiftKey) actions.togglePlayBackward();
          else actions.togglePlay();
          break;
        case 'ArrowRight':
          actions.stepForward();
          break;
        case 'ArrowLeft':
          actions.stepBack();
          break;
        case 'Home':
          actions.toStart();
          break;
        case 'End':
          actions.toEnd();
          break;
        case 'PageUp':
          actions.floorUp();
          break;
        case 'PageDown':
          actions.floorDown();
          break;
        default:
          handled = false;
      }
    }
    if (handled) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  const release = (): void => {
    held.clear();
  };
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release();
  });
  return held;
}
