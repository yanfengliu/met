/**
 * The floor view's state (docs/design/spec.md, Page: Floor picker): the floor in view, the user's own cut it gives back, and the landscape filter.
 * Choosing a floor while every floor shows keeps the cut as the user set it and sets the floor's; choosing another floor keeps that same own cut;
 * choosing All gives it back, on or off at its height, and shows every landscape piece again. A cut set by hand (the slider or the cut toggle) ends
 * the floor view instead and stands as the user's own; walk mode ends it as All does. Camera framing is the page's (src/main.ts, `floorPose`).
 * Bound: the cut and the filter only; it reads nothing of the timeline.
 */
import type { SectionCut } from './section-cut.js';
import { ALL_FLOORS } from './floors.js';
import type { Floor } from './floors.js';

/** What the floor view hides landscape with (src/viewer/floor-view.ts). */
export interface LandscapeFilter {
  /** Hides the landscape over `height`, or none for null; returns whether any mesh changed. */
  apply(height: number | null): boolean;
  /** How many landscape meshes it hides now. */
  readonly hidden: number;
}

interface CutSetting {
  readonly enabled: boolean;
  readonly height: number;
}

export class FloorMode {
  private current: Floor | null = null;
  private own: CutSetting | null = null;
  private filter: LandscapeFilter | null = null;

  /** `makeFilter` builds the landscape filter on the first floor chosen, so a page that never picks one never pays for it. */
  constructor(
    private readonly cut: SectionCut,
    private readonly makeFilter: () => LandscapeFilter,
  ) {}

  /** The floor in view, or null when every floor shows. */
  get floor(): Floor | null {
    return this.current;
  }

  /** The picker's choice in view: the floor's id, or `all`. */
  get id(): string {
    return this.current?.id ?? ALL_FLOORS;
  }

  /** The landscape meshes the floor view hides now. */
  get hidden(): number {
    return this.filter?.hidden ?? 0;
  }

  /** The user's own cut, kept while a floor view sets the cut, or null when every floor shows. */
  get ownCut(): CutSetting | null {
    return this.own;
  }

  /** Shows `next`, or every floor for null, as described in the header. Returns whether the floor in view changed. */
  show(next: Floor | null): boolean {
    if (next === this.current) return false;
    if (this.current === null) this.own = { enabled: this.cut.enabled, height: this.cut.height };
    if (next === null) {
      const own = this.own;
      if (own !== null) this.cut.set(own.enabled, own.height);
      this.own = null;
    } else {
      this.cut.set(true, next.cut);
    }
    this.current = next;
    this.filter ??= this.makeFilter();
    this.filter.apply(next?.cut ?? null);
    return true;
  }

  /** Ends the floor view because the user set the cut by hand: the landscape shows again and the cut stays for the caller to set. Returns whether a floor was in view. */
  leaveForCut(): boolean {
    if (this.current === null) return false;
    this.current = null;
    this.own = null;
    this.filter?.apply(null);
    return true;
  }
}
