/**
 * The timeline bar (docs/design/spec.md, Page): start, step back, play backward, play/pause, step forward, end; speed; a scrubber over [0, N] with
 * chapter boundaries marked; the label and the step's detail. Every control has an accessible name and a `data-testid`.
 */
import type { PlayerMode, Speed } from '../build/player.js';
import { SPEEDS } from '../build/player.js';
import type { Chapter } from '../build/types.js';
import { button, el, setAttr, setText } from './dom.js';
import { ICONS } from './icons.js';
import { stepLabel, stepInView } from './label.js';
import type { LabelStep } from './label.js';

export interface BarActions {
  toStart(): void;
  stepBack(): void;
  togglePlayBackward(): void;
  togglePlay(): void;
  stepForward(): void;
  toEnd(): void;
  setSpeed(speed: Speed): void;
  scrub(t: number): void;
}

export interface BarState {
  readonly t: number;
  readonly mode: PlayerMode;
  readonly direction: 1 | -1;
  readonly speed: Speed;
}

export interface BarInfo {
  readonly steps: readonly LabelStep[];
  readonly chapters: readonly Chapter[];
  /** Chapter boundaries: 0-based index of each chapter's first step, with its title. */
  readonly boundaries: readonly { readonly first: number; readonly title: string }[];
}

export class TimelineBar {
  readonly element: HTMLElement;
  private readonly title: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly scrubber: HTMLInputElement;
  private readonly play: HTMLButtonElement;
  private readonly playBackward: HTMLButtonElement;
  private readonly speeds: Map<Speed, HTMLButtonElement>;
  private dragging = false;

  constructor(
    private readonly info: BarInfo,
    actions: BarActions,
  ) {
    const n = info.steps.length;
    this.title = el('div', { className: 'met-title', testid: 'step-label', attrs: { 'aria-live': 'polite' } });
    this.detail = el('div', { className: 'met-detail', testid: 'step-detail' });
    this.scrubber = el('input', {
      className: 'met-scrubber',
      testid: 'scrubber',
      attrs: { type: 'range', min: '0', max: String(n), step: 'any', value: '0', 'aria-label': 'Build timeline' },
    });
    this.scrubber.addEventListener('pointerdown', () => {
      this.dragging = true;
    });
    window.addEventListener('pointerup', () => {
      this.dragging = false;
    });
    this.scrubber.addEventListener('input', () => {
      actions.scrub(Number(this.scrubber.value));
    });
    const marks = el(
      'div',
      { className: 'met-marks', attrs: { 'aria-hidden': 'true' } },
      info.boundaries
        .filter((b) => b.first > 0 && b.first < n)
        .map((b) => el('div', { className: 'met-mark', testid: 'chapter-mark', attrs: { style: `left: ${String((b.first / n) * 100)}%`, title: b.title } })),
    );
    this.play = button('Play', 'btn-play', () => { actions.togglePlay(); }, { icon: ICONS.play });
    this.playBackward = button('Play backward', 'btn-play-backward', () => { actions.togglePlayBackward(); }, { icon: ICONS.playBackward });
    setAttr(this.playBackward, 'aria-pressed', 'false');
    const transport = el('div', { className: 'met-group met-transport', attrs: { role: 'group', 'aria-label': 'Playback' } }, [
      button('Go to start', 'btn-start', () => { actions.toStart(); }, { icon: ICONS.start }),
      button('Step back', 'btn-step-back', () => { actions.stepBack(); }, { icon: ICONS.stepBack }),
      this.playBackward,
      this.play,
      button('Step forward', 'btn-step-forward', () => { actions.stepForward(); }, { icon: ICONS.stepForward }),
      button('Go to end', 'btn-end', () => { actions.toEnd(); }, { icon: ICONS.end }),
    ]);
    this.speeds = new Map(
      SPEEDS.map((speed) => {
        const text = `${String(speed)}×`;
        const b = button(`Speed ${text}`, `speed-${String(speed)}`, () => { actions.setSpeed(speed); }, { text });
        setAttr(b, 'aria-pressed', 'false');
        return [speed, b] as const;
      }),
    );
    const speedGroup = el('div', { className: 'met-group met-speed', attrs: { role: 'group', 'aria-label': 'Speed' } }, [...this.speeds.values()]);
    this.element = el('div', { className: 'met-bar', testid: 'timeline-bar', attrs: { role: 'region', 'aria-label': 'Build timeline controls' } }, [
      el('div', { className: 'met-label' }, [this.title, this.detail]),
      el('div', { className: 'met-scrub' }, [this.scrubber, marks]),
      el('div', { className: 'met-controls' }, [transport, speedGroup]),
    ]);
  }

  sync(state: BarState): void {
    const label = stepLabel(state.t, this.info.steps, this.info.chapters);
    setText(this.title, label.text);
    setText(this.detail, label.detail);
    if (!this.dragging && Number(this.scrubber.value) !== state.t) this.scrubber.value = String(state.t);
    const k = stepInView(state.t, this.info.steps.length);
    const step = this.info.steps[k - 1];
    setAttr(this.scrubber, 'aria-valuetext', step === undefined ? `Step 0 of ${String(this.info.steps.length)}` : `Step ${String(k)} of ${String(this.info.steps.length)}: ${step.title}`);
    const moving = state.mode !== 'paused';
    setAttr(this.play, 'aria-label', moving ? 'Pause' : 'Play');
    setAttr(this.play, 'title', moving ? 'Pause (Space)' : 'Play (Space)');
    if (this.play.dataset['icon'] !== (moving ? 'pause' : 'play')) {
      this.play.dataset['icon'] = moving ? 'pause' : 'play';
      this.play.innerHTML = moving ? ICONS.pause : ICONS.play;
    }
    setAttr(this.playBackward, 'aria-pressed', String(state.mode === 'playing' && state.direction === -1));
    for (const [speed, b] of this.speeds) setAttr(b, 'aria-pressed', String(speed === state.speed));
  }
}
