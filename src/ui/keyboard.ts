/**
 * Keyboard shortcuts (docs/design/spec.md, Page): Space play/pause, Right step forward, Left step back, Shift+Space play backward, Home start, End end.
 * A focused button keeps Space and Enter for itself, and a focused slider other than the scrubber keeps its arrows, Home and End.
 */

export interface KeyActions {
  togglePlay(): void;
  togglePlayBackward(): void;
  stepForward(): void;
  stepBack(): void;
  toStart(): void;
  toEnd(): void;
}

function keepsKey(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    if (target.type !== 'range') return true;
    return target.dataset['testid'] !== 'scrubber' && key !== ' ';
  }
  if (target instanceof HTMLButtonElement) return key === ' ' || key === 'Enter';
  return false;
}

export function bindKeys(actions: KeyActions): void {
  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (keepsKey(event.target, event.key)) return;
    let handled = true;
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
    if (handled) event.preventDefault();
  });
}
