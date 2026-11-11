/**
 * The query contract (docs/design/spec.md, Query contract). This module is the only reader of the page URL.
 * A malformed or unknown value is ignored with a warning that names the parameter, the value and what would be accepted.
 */

export interface Query {
  /** Capture mode: no animation, the requested state drawn from the first frame. */
  readonly shot: boolean;
  readonly view: string | null;
  /** Camera position then target, in metres. */
  readonly cam: readonly [number, number, number, number, number, number] | null;
  readonly cut: number | null;
  readonly solo: string | null;
  readonly noui: boolean;
  /** `walk=1`: start in walk mode. */
  readonly walk: boolean;
  /** A walk spawn id or a place `x,y,z,tx,ty,tz` (src/walk/spawns.ts `placeOf`); resolved by src/main.ts, which warns about one that names neither. */
  readonly spawn: string | null;
  /** `all` or a floor id (src/viewer/floors.ts); resolved by `startFloor`, which warns about one that names no floor. */
  readonly floor: string | null;
  /** `doors=open` or `doors=closed`: the state every unlocked door takes at load (src/viewer/doors.ts); null when absent or malformed. */
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

/** Parses a query string such as `?view=top&cut=6.5`. Pure: no URL access. */
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
    view: text('view'),
    cam,
    cut: number(params, 'cut', warnings, 'metres'),
    solo: text('solo'),
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

