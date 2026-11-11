/**
 * The walk strip (docs/design/spec.md, Page: Walk toggle): a strip at the bottom right holding the Walk toggle (`walk-toggle`), pressed in walk mode, in
 * either mode.
 */
import { button, el, setAttr } from './dom.js';
import { ICONS } from './icons.js';

export class WalkStrip {
  readonly element: HTMLElement;
  private readonly walk: HTMLButtonElement;

  constructor(toggleWalk: () => void) {
    this.walk = button('Walk', 'walk-toggle', toggleWalk, { icon: ICONS.walk, text: 'Walk', className: 'met-button met-walk' });
    setAttr(this.walk, 'aria-pressed', 'false');
    setAttr(this.walk, 'title', 'Walk in first person (F)');
    this.element = el('div', { className: 'met-strip', testid: 'walk-strip', attrs: { role: 'region', 'aria-label': 'Walk' } }, [this.walk]);
  }

  /** Shows whether walk mode is on (or being prepared). */
  sync(walking: boolean): void {
    setAttr(this.walk, 'aria-pressed', String(walking));
    setAttr(this.walk, 'title', walking ? 'Leave walk mode (F)' : 'Walk in first person (F)');
  }
}
