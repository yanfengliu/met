/**
 * Keyboard shortcuts (docs/design/spec.md, Page: Keyboard), in two modes.
 * - Orbit view: Space play/pause, Shift+Space play backward, Right step forward, Left step back, Home start, End end; W A S D move the camera
 *   over the ground and Q E down and up while held (Shift doubles the speed; src/viewer/orbit-keys.ts); F enters walk mode.
 * - Walk mode: W A S D and the arrow keys walk while held, Shift runs, Space jumps, F returns to the orbit view; the timeline keys are off.
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
