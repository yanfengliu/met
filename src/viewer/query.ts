/**
 * The query contract (docs/design/spec.md, Query contract). This module is the only reader of the page URL.
 * A malformed or unknown value is ignored with a warning that names the parameter, the value and what would be accepted.
 */

export interface Query {
  /** Capture mode: no autoplay, no follow camera, no animation. */
  readonly shot: boolean;
  readonly t: number | null;
  /** A step id or a 1-based index; resolved against the steps by `startPosition`. */
  readonly step: string | null;
  readonly view: string | null;
  /** Camera position then target, in metres. */
  readonly cam: readonly [number, number, number, number, number, number] | null;
  readonly cut: number | null;
  readonly solo: string | null;
  /** `autoplay=0` gives false, `autoplay=1` true, absent null. */
  readonly autoplay: boolean | null;
  /** `replay=1` gives true (open the build replay at load, paused; docs/design/spec.md, Page: Build replay), `replay=0` false, absent null; `opensReplay` gives the whole rule. */
  readonly replay: boolean | null;
  readonly noui: boolean;
  /** `walk=1`: start in walk mode. */
  readonly walk: boolean;
  /** A walk spawn id or a place `x,y,z,tx,ty,tz` (src/walk/spawns.ts `placeOf`); resolved by src/main.ts, which warns about one that names neither. */
  readonly spawn: string | null;
  /** `all` or a floor id (src/viewer/floors.ts); resolved by `startFloor`, which warns about one that names no floor. */
  readonly floor: string | null;
  /** `doors=open` or `doors=closed`: the state every unlocked door takes when its step completes (src/viewer/doors.ts); null when absent or malformed. */
  readonly doors: 'open' | 'closed' | null;
  readonly warnings: readonly string[];
}

/** `doors=`: open or closed, else a warning naming the value and what is accepted. */
function doorState(params: URLSearchParams, warnings: string[]): 'open' | 'closed' | null {
  const value = params.get('doors');
  if (value === null) return null;
  const state = value.trim().toLowerCase();
  if (state === 'open' || state === 'closed') return state;
  warnings.push(`Query parameter doors="${value}" is not a door state; use doors=open or doors=closed. It is ignored.`);
  return null;
}

function flag(params: URLSearchParams, name: string, warnings: string[]): boolean | null {
  const value = params.get(name);
  if (value === null) return null;
  if (value === '1' || value === 'true' || value === '') return true;
  if (value === '0' || value === 'false') return false;
  warnings.push(`Query parameter ${name}="${value}" is not a flag; use ${name}=1 or ${name}=0. It is ignored.`);
  return null;
}

function number(params: URLSearchParams, name: string, warnings: string[], unit: string): number | null {
  const value = params.get(name);
  if (value === null) return null;
  const parsed = value.trim() === '' ? Number.NaN : Number(value);
  if (Number.isFinite(parsed)) return parsed;
  warnings.push(`Query parameter ${name}="${value}" is not a number; use ${name}=<${unit}>. It is ignored.`);
  return null;
}

/** Parses a query string such as `?t=3.5&view=top`. Pure: no URL access. */
export function parseQuery(search: string): Query {
  const params = new URLSearchParams(search);
  const warnings: string[] = [];
  let cam: Query['cam'] = null;
  const camText = params.get('cam');
  if (camText !== null) {
    const values = camText.split(',').map((v) => (v.trim() === '' ? Number.NaN : Number(v)));
    const [px, py, pz, tx, ty, tz] = values;
    if (values.length === 6 && px !== undefined && py !== undefined && pz !== undefined && tx !== undefined && ty !== undefined && tz !== undefined && values.every(Number.isFinite)) {
      cam = [px, py, pz, tx, ty, tz];
    } else {
      warnings.push(`Query parameter cam="${camText}" is not six numbers; use cam=px,py,pz,tx,ty,tz in metres. It is ignored.`);
    }
  }
  const text = (name: string): string | null => {
    const value = params.get(name);
    return value === null || value.trim() === '' ? null : value.trim();
  };
  return {
    shot: flag(params, 'shot', warnings) === true,
    t: number(params, 't', warnings, 'number from 0 to N'),
    step: text('step'),
    view: text('view'),
    cam,
    cut: number(params, 'cut', warnings, 'metres'),
    solo: text('solo'),
    autoplay: flag(params, 'autoplay', warnings),
    replay: flag(params, 'replay', warnings),
    noui: flag(params, 'noui', warnings) === true,
    walk: flag(params, 'walk', warnings) === true,
    spawn: text('spawn'),
    floor: text('floor'),
    doors: doorState(params, warnings),
    warnings,
  };
}

/** Reads the page's own URL. */
export function readQuery(): Query {
  return parseQuery(window.location.search);
}

export interface Start {
  /** Where the timeline starts. */
  readonly t: number;
  /** Whether the query set a position (`step` or `t`). */
  readonly positioned: boolean;
  /** Whether the build replay is open at load (`opensReplay`). */
  readonly replay: boolean;
  readonly warnings: readonly string[];
}

/**
 * The start position: `step` (an id or 1-based index, meaning the end of that step) wins over `t`; `t` is clamped to [0, N]. With neither, the finished
 * building (N), or the empty site (0) when `autoplay=1` asks to watch the build. And whether the build replay is open at load (`opensReplay`), with a
 * warning when `replay=0` asks for it closed but the position or `autoplay=1` opens it.
 */
export function startPosition(query: Query, stepIds: readonly string[]): Start {
  const warnings: string[] = [];
  const { t, by } = position(query, stepIds, warnings);
  const replay = opensReplay(query, { positioned: by !== null });
  if (query.replay === false && replay) {
    // Every parameter that opens the replay on its own: t still would once a step= that won over it is left out.
    const openers = [...(by === 'step' ? ['step'] : []), ...(query.t !== null ? ['t'] : []), ...(query.autoplay === true ? ['autoplay'] : [])];
    const named = openers.length === 1 ? (openers[0] ?? '') : `${openers.slice(0, -1).join(', ')} and ${openers.at(-1) ?? ''}`;
    warnings.push(`Query parameter replay asks for the build replay closed, but ${named} ${openers.length === 1 ? 'opens' : 'open'} it. Leave out ${named} to open the page on the finished building with the replay closed.`);
  }
  return { t, positioned: by !== null, replay, warnings };
}

/** Where the timeline starts, and the parameter that set it (null when none did). */
function position(query: Query, stepIds: readonly string[], warnings: string[]): { readonly t: number; readonly by: 'step' | 't' | null } {
  const n = stepIds.length;
  if (query.step !== null) {
    const byId = stepIds.indexOf(query.step);
    if (byId !== -1) return { t: byId + 1, by: 'step' };
    if (/^\d+$/.test(query.step)) {
      const index = Number(query.step);
      if (index >= 1 && index <= n) return { t: index, by: 'step' };
    }
    warnings.push(`Query parameter step="${query.step}" names no step; use a step id or an index from 1 to ${String(n)}. It is ignored.`);
  }
  if (query.t !== null) {
    if (query.t < 0 || query.t > n) warnings.push(`Query parameter t=${String(query.t)} is outside [0, ${String(n)}]; it is clamped.`);
    return { t: Math.min(Math.max(query.t, 0), n), by: 't' };
  }
  return { t: query.autoplay === true ? 0 : n, by: null };
}

/** Whether the page starts playing: only when `autoplay=1` asks for it, and never in shot mode. */
export function shouldAutoplay(query: Query): boolean {
  return !query.shot && query.autoplay === true;
}

/**
 * Whether the build replay is open at load (docs/design/spec.md, Page: Build replay): when `replay=1` asks for it, when `autoplay=1` asks to watch the
 * build, and when `t=` or `step=` sets a position, since a part-built model shows only inside the replay. Shot mode changes none of this; it only
 * keeps the replay from playing. Closed, the page shows the finished building, paused.
 */
function opensReplay(query: Query, start: Pick<Start, 'positioned'>): boolean {
  return query.replay === true || query.autoplay === true || start.positioned;
}
