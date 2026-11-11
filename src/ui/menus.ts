/**
 * The View menu (docs/design/spec.md, Page: View menu), a disclosure button with a panel; Escape or a click outside closes it: exterior and interior
 * presets, the walk spawns (each enters walk mode there) and the section cut (a toggle and a height slider).
 */
import { button, el, setAttr, setText } from './dom.js';

class Disclosure {
  readonly element: HTMLElement;
  readonly trigger: HTMLButtonElement;
  readonly panel: HTMLElement;

  constructor(label: string, testid: string, panelLabel: string, role: 'menu' | 'group') {
    const id = `met-${testid}`;
    this.panel = el('div', { className: 'met-panel', testid, attrs: { id, role, 'aria-label': panelLabel } });
    this.panel.hidden = true;
    this.trigger = button(label, `${testid}-button`, () => { this.toggle(); }, { text: label });
    this.trigger.setAttribute('aria-haspopup', role === 'menu' ? 'menu' : 'true');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-controls', id);
    this.element = el('div', { className: 'met-menu' }, [this.trigger, this.panel]);
  }

  get open(): boolean {
    return !this.panel.hidden;
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  setOpen(open: boolean): void {
    this.panel.hidden = !open;
    setAttr(this.trigger, 'aria-expanded', String(open));
  }
}

export interface PresetEntry {
  readonly id: string;
  readonly label: string;
  readonly group: 'exterior' | 'interior';
}

export interface ViewActions {
  applyPreset(id: string): void;
  setCut(enabled: boolean, height: number): void;
  walkFrom(spawn: string): void;
}

export interface SpawnEntry {
  readonly id: string;
  readonly label: string;
}

export interface ViewState {
  readonly preset: string | null;
  readonly cutEnabled: boolean;
  readonly cutHeight: number;
}

export class ViewMenu {
  readonly disclosure: Disclosure;
  private readonly presets = new Map<string, HTMLButtonElement>();
  private readonly cutToggle: HTMLButtonElement;
  private readonly cutSlider: HTMLInputElement;
  private readonly cutValue: HTMLOutputElement;
  private state: ViewState;

  constructor(presets: readonly PresetEntry[], spawns: readonly SpawnEntry[], cutMax: number, initial: ViewState, actions: ViewActions) {
    this.state = initial;
    this.disclosure = new Disclosure('View', 'view-menu', 'View', 'group');
    const panel = this.disclosure.panel;
    for (const group of ['exterior', 'interior'] as const) {
      const entries = presets.filter((p) => p.group === group);
      if (entries.length === 0) continue;
      panel.appendChild(el('h2', { text: group === 'exterior' ? 'Exterior' : 'Interior' }));
      for (const preset of entries) {
        const item = button(preset.label, `preset-${preset.id}`, () => { actions.applyPreset(preset.id); }, { text: preset.label, className: 'met-item' });
        setAttr(item, 'aria-pressed', 'false');
        this.presets.set(preset.id, item);
        panel.appendChild(item);
      }
    }
    panel.appendChild(el('h2', { text: 'Walk' }));
    for (const spawn of spawns) {
      const label = `Walk from ${spawn.label}`;
      panel.appendChild(button(label, `walk-spawn-${spawn.id}`, () => {
        actions.walkFrom(spawn.id);
        this.disclosure.setOpen(false);
      }, { text: label, className: 'met-item' }));
    }
    panel.appendChild(el('h2', { text: 'Section cut' }));
    this.cutToggle = button('Section cut', 'cut-toggle', () => { actions.setCut(!this.state.cutEnabled, this.state.cutHeight); }, { text: 'Cut', className: 'met-button' });
    this.cutSlider = el('input', {
      testid: 'cut-slider',
      attrs: { type: 'range', min: '0', max: cutMax.toFixed(1), step: '0.1', value: initial.cutHeight.toFixed(1), 'aria-label': 'Section cut height in metres' },
    });
    this.cutSlider.addEventListener('input', () => {
      actions.setCut(true, Number(this.cutSlider.value));
    });
    this.cutValue = el('output', { testid: 'cut-value', attrs: { 'aria-label': 'Section cut height' } });
    panel.appendChild(el('div', { className: 'met-row' }, [this.cutToggle, this.cutSlider, this.cutValue]));
    this.sync(initial);
  }

  sync(state: ViewState): void {
    this.state = state;
    for (const [id, item] of this.presets) setAttr(item, 'aria-pressed', String(id === state.preset));
    setAttr(this.cutToggle, 'aria-pressed', String(state.cutEnabled));
    if (document.activeElement !== this.cutSlider && Math.abs(Number(this.cutSlider.value) - state.cutHeight) > 1e-9) this.cutSlider.value = state.cutHeight.toFixed(1);
    setText(this.cutValue, state.cutEnabled ? `${state.cutHeight.toFixed(1)} m` : 'off');
  }
}

/**
 * Closes open panels on Escape and on a pointer press outside them. An Escape that closes a panel is taken (`preventDefault`), so walking, it closes
 * the menu and the next one leaves walk mode (src/ui/keyboard.ts, whose listener comes after this one).
 */
export function closeOnOutside(disclosures: readonly Disclosure[]): void {
  window.addEventListener('pointerdown', (event) => {
    for (const d of disclosures) if (d.open && event.target instanceof Node && !d.element.contains(event.target)) d.setOpen(false);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    for (const d of disclosures) {
      if (!d.open) continue;
      d.setOpen(false);
      d.trigger.focus();
      event.preventDefault();
    }
  });
}

export type { Disclosure };
