/**
 * The Build menu and the View menu (docs/design/spec.md, Page). Each is a disclosure button with a panel; Escape or a click outside closes it.
 * Build menu: the Build replay item, which opens and closes the build replay, and the chapters in order; choosing one opens the replay at the start of
 * its first step.
 * View menu: exterior and interior presets, the follow-camera toggle (while the build replay is open: it belongs to playback), the walk spawns (each
 * enters walk mode there) and the section cut (a toggle and a height slider).
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

export interface ChapterEntry {
  readonly id: string;
  readonly title: string;
  readonly years: string;
  readonly summary: string;
  /** 0-based index of the chapter's first step. */
  readonly first: number;
  /** Steps in the chapter; a chapter with none is shown disabled. */
  readonly count: number;
}

/** The menu is named Build by the owner's choice (2026-10-29); its test ids keep the chapter menu's. */
export class BuildMenu {
  readonly disclosure: Disclosure;
  private readonly replay: HTMLButtonElement;
  private readonly replayState: HTMLElement;
  private readonly items: HTMLButtonElement[];

  constructor(chapters: readonly ChapterEntry[], choose: (first: number) => void, toggleReplay: () => void) {
    this.disclosure = new Disclosure('Build', 'chapter-menu', 'Build', 'menu');
    // The Build replay item: a checkbox item, checked while the replay is open, its state also as a word for the eye and its summary as text.
    this.replayState = el('span', { className: 'met-years', text: 'Off', attrs: { 'aria-hidden': 'true' } });
    this.replay = el('button', {
      className: 'met-item met-chapter met-replay',
      testid: 'replay-toggle',
      attrs: { type: 'button', role: 'menuitemcheckbox', 'aria-checked': 'false', 'aria-label': 'Build replay', 'aria-describedby': 'met-replay-summary' },
    }, [
      el('span', { text: 'Build replay' }),
      this.replayState,
      el('span', { className: 'met-summary', text: 'The timeline: play, step and scrub the build from the empty site.', attrs: { id: 'met-replay-summary' } }),
    ]);
    this.activate(this.replay, toggleReplay);
    this.items = chapters.map((chapter) => {
      const empty = chapter.count === 0;
      // The summary is text in the item, not only a tooltip, so touch screens show it too; it describes the item for screen readers.
      const summaryId = `met-chapter-summary-${chapter.id}`;
      const item = el('button', {
        className: 'met-item met-chapter',
        testid: `chapter-${chapter.id}`,
        attrs: {
          type: 'button',
          role: 'menuitem',
          'aria-label': `${chapter.title}, ${chapter.years}${empty ? ', no steps yet' : ''}`,
          'aria-describedby': summaryId,
        },
      }, [
        el('span', { text: chapter.title }),
        el('span', { className: 'met-years', text: empty ? `${chapter.years} · no steps yet` : chapter.years }),
        el('span', { className: 'met-summary', testid: `chapter-summary-${chapter.id}`, text: chapter.summary, attrs: { id: summaryId } }),
      ]);
      item.disabled = empty;
      this.activate(item, () => { choose(chapter.first); });
      return item;
    });
    // A menu holds menu items and groups only, so the chapters' visible heading is hidden from assistive technology, which hears the group's label.
    const group = el('div', { className: 'met-group-chapters', attrs: { role: 'group', 'aria-label': 'Chapters' } }, [
      el('div', { className: 'met-heading', text: 'Chapters', attrs: { 'aria-hidden': 'true' } }),
      ...this.items,
    ]);
    this.disclosure.panel.append(this.replay, el('div', { className: 'met-separator', attrs: { role: 'separator' } }), group);
  }

  /** Marks the chapter at `index` as current and the Build replay item as checked while `replay` is open. */
  sync(index: number, replay: boolean): void {
    this.items.forEach((item, i) => {
      setAttr(item, 'aria-current', String(i === index));
    });
    setAttr(this.replay, 'aria-checked', String(replay));
    setText(this.replayState, replay ? 'On' : 'Off');
  }

  /** Runs `action` on a click and closes the menu, leaving focus on the page after a pointer click and on the menu's button after the keyboard's. */
  private activate(item: HTMLButtonElement, action: () => void): void {
    item.addEventListener('click', (event) => {
      action();
      this.disclosure.setOpen(false);
      if (event.detail > 0) item.blur();
      else this.disclosure.trigger.focus();
    });
  }
}

export interface PresetEntry {
  readonly id: string;
  readonly label: string;
  readonly group: 'exterior' | 'interior';
}

export interface ViewActions {
  applyPreset(id: string): void;
  setFollow(on: boolean): void;
  setCut(enabled: boolean, height: number): void;
  walkFrom(spawn: string): void;
}

export interface SpawnEntry {
  readonly id: string;
  readonly label: string;
}

export interface ViewState {
  readonly preset: string | null;
  readonly follow: boolean;
  readonly cutEnabled: boolean;
  readonly cutHeight: number;
  /** The build replay is open, so the follow-camera toggle shows. */
  readonly replay: boolean;
}

export class ViewMenu {
  readonly disclosure: Disclosure;
  private readonly presets = new Map<string, HTMLButtonElement>();
  private readonly follow: HTMLButtonElement;
  /** The Camera section, which holds the follow-camera toggle: shown while the build replay is open. */
  private readonly camera: HTMLElement;
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
    this.follow = button('Follow the build', 'follow-toggle', () => { actions.setFollow(!this.state.follow); }, { text: 'Follow the build', className: 'met-item' });
    this.camera = el('div', { className: 'met-section' }, [el('h2', { text: 'Camera' }), this.follow]);
    panel.appendChild(this.camera);
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
    setAttr(this.follow, 'aria-pressed', String(state.follow));
    if (this.camera.hidden !== !state.replay) this.camera.hidden = !state.replay;
    setAttr(this.cutToggle, 'aria-pressed', String(state.cutEnabled));
    if (document.activeElement !== this.cutSlider && Math.abs(Number(this.cutSlider.value) - state.cutHeight) > 1e-9) this.cutSlider.value = state.cutHeight.toFixed(1);
    setText(this.cutValue, state.cutEnabled ? `${state.cutHeight.toFixed(1)} m` : 'off');
  }
}

/** Closes open panels on Escape and on a pointer press outside them. */
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
    }
  });
}

export type { Disclosure };
