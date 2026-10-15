/**
 * The floor picker (docs/design/spec.md, Page: Floor picker): a column of buttons at the left of the view, All at the top and the floors under it from
 * the highest down, the choice in view pressed. Page Up and Page Down move along it (src/ui/keyboard.ts). It belongs to the orbit view, so it hides
 * in walk mode, which leaves the floor view.
 */
import { button, el, setAttr } from './dom.js';

export interface FloorEntry {
  /** `all` or a floor id; the button's test id is `floor-<id>`. */
  readonly id: string;
  /** The button's text. */
  readonly label: string;
  /** Its accessible name. */
  readonly name: string;
}

export interface FloorPickerState {
  /** The choice in view: an entry's id. */
  readonly floor: string;
  readonly walking: boolean;
}

export class FloorPicker {
  readonly element: HTMLElement;
  private readonly items = new Map<string, HTMLButtonElement>();

  /** `entries` from the top of the column down. */
  constructor(entries: readonly FloorEntry[], choose: (id: string) => void) {
    const buttons = entries.map((entry) => {
      const item = button(entry.name, `floor-${entry.id}`, () => { choose(entry.id); }, { text: entry.label, className: 'met-button met-floor' });
      setAttr(item, 'aria-pressed', 'false');
      setAttr(item, 'title', `${entry.name} (Page Up, Page Down)`);
      this.items.set(entry.id, item);
      return item;
    });
    this.element = el('div', { className: 'met-floors', testid: 'floor-picker', attrs: { role: 'group', 'aria-label': 'Floor' } }, buttons);
  }

  sync(state: FloorPickerState): void {
    for (const [id, item] of this.items) setAttr(item, 'aria-pressed', String(id === state.floor));
    if (this.element.hidden !== state.walking) this.element.hidden = state.walking;
  }
}
