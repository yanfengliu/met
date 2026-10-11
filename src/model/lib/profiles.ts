/**
 * Ready-made moulding profiles for sweeping along a wall face (sweep.ts, moulding.ts).
 *
 * Every profile is a closed section in (d, y): d is the projection out from the wall face (d = 0 is the face, the back of the section), y is height above the moulding's bottom.
 * They are drawn counter-clockwise (outside on the right of travel), in metres for the given height and projection. Proportions follow Vignola's Corinthian entablature.
 */
import { byDetail, positive, type Detail } from './params.js';
import { ProfilePen, type Profile } from './profile.js';

export interface ProfileSize {
  /** Height of the moulding, metres. */
  height?: number;
  /** Projection beyond the wall face, metres; each profile has its own default as a share of the height. */
  projection?: number;
  detail?: Detail;
}

function size(part: string, params: ProfileSize, projectionShare: number): { h: number; p: number; n: number } {
  const h = positive(part, 'height', params.height ?? 1);
  const p = positive(part, 'projection', params.projection ?? h * projectionShare);
  return { h, p, n: byDetail(params.detail ?? 'medium', [2, 3, 5]) };
}

/** Where the modillion and dentil runs of a cornice sit, as shares of its height (y) and projection (d). */
export const CORNICE_BANDS = {
  /** Dentil band: face at d, from y0 to y1. */
  dentil: { d: 0.06, y0: 0.07, y1: 0.2, project: 0.1 },
  /** Modillion zone: bed face at d, soffit at y1, modillions reaching to `reach`. */
  modillion: { d: 0.24, y0: 0.32, y1: 0.5, reach: 0.74 },
} as const;

export interface CorniceProfileParams extends ProfileSize {
  /** Leave a dentil band for `corniceRun` to fill. Default true. */
  dentils?: boolean;
  /** A deep soffit for modillions. Default true; false gives a plainer cornice that projects 0.7 of its height. */
  modillions?: boolean;
}

/**
 * Classical cornice: bed moulding, dentil band, ovolo, modillion soffit, corona with drip, cyma reversa, cymatium and top fillet.
 * Default projection equals the height (with modillions). Dentils and modillions themselves are separate geometries (`corniceRun`).
 */
export function corniceProfile(params: CorniceProfileParams = {}): Profile {
  const modillions = params.modillions ?? true;
  const { h, p, n } = size('corniceProfile', params, modillions ? 1 : 0.7);
  const dentils = params.dentils ?? true;
  const D = CORNICE_BANDS.dentil;
  const M = CORNICE_BANDS.modillion;
  const pen = new ProfilePen(0, 0).cyma(D.d * p, D.y0 * h, 'reversa', n);
  if (dentils) pen.to(D.d * p, D.y1 * h);
  else pen.to(0.1 * p, D.y0 * h).to(0.1 * p, D.y1 * h);
  pen.to(0.14 * p, D.y1 * h).to(0.14 * p, 0.23 * h).quarter(0.1 * p, 0.09 * h, true, n);
  if (modillions) pen.to(M.d * p, M.y1 * h).to(0.8 * p, M.y1 * h);
  else pen.to(0.6 * p, 0.32 * h).to(0.6 * p, 0.34 * h);
  const corona = modillions ? 0.8 * p : 0.6 * p;
  const coronaBottom = modillions ? M.y1 * h : 0.34 * h;
  pen
    .to(corona - 0.02 * p, coronaBottom + 0.015 * h)
    .to(corona, coronaBottom + 0.02 * h)
    .to(corona, 0.7 * h)
    .cyma(0.04 * p, 0.05 * h, 'reversa', n)
    .to(corona + 0.05 * p, 0.76 * h)
    .cyma(p - corona - 0.05 * p, 0.2 * h, 'recta', n + 1)
    .to(p, h)
    .to(0, h);
  return pen.close();
}

/** Architrave: three fasciae stepping out, with a crowning cyma reversa and fillet. Default projection 0.15 × height. */
export function architraveProfile(params: ProfileSize = {}): Profile {
  const { h, p, n } = size('architraveProfile', params, 0.15);
  return new ProfilePen(0, 0)
    .to(0.02 * p, 0)
    .to(0.02 * p, 0.22 * h)
    .to(0.12 * p, 0.24 * h)
    .to(0.12 * p, 0.46 * h)
    .to(0.24 * p, 0.48 * h)
    .to(0.24 * p, 0.74 * h)
    .cyma(0.5 * p, 0.16 * h, 'reversa', n)
    .to(p, 0.92 * h)
    .to(p, h)
    .to(0, h)
    .close();
}

/** Frieze: a plain band standing `projection` proud of the wall (default 0.04 × height), with a small bead at its foot. */
export function friezeProfile(params: ProfileSize = {}): Profile {
  const { h, p, n } = size('friezeProfile', params, 0.04);
  return new ProfilePen(0, 0)
    .to(p, 0)
    .half(0, 0.05 * h, 0.4 * p, n)
    .to(p, h)
    .to(0, h)
    .close();
}

/** String course: a band with a bead below and a drip and sloping wash above. Default projection 0.5 × height. */
export function stringCourseProfile(params: ProfileSize = {}): Profile {
  const { h, p, n } = size('stringCourseProfile', params, 0.5);
  return new ProfilePen(0, 0)
    .to(0.45 * p, 0)
    .half(0, 0.2 * h, 0.2 * p, n)
    .to(0.85 * p, 0.25 * h)
    .to(0.85 * p, 0.3 * h)
    .to(p, 0.32 * h)
    .to(p, 0.82 * h)
    .to(0, h)
    .close();
}

/** Base moulding at the foot of a wall: a projecting plinth face, then a cyma reversa and fillet returning to the wall. Default projection 0.3 × height. */
export function baseMouldingProfile(params: ProfileSize = {}): Profile {
  const { h, p, n } = size('baseMouldingProfile', params, 0.3);
  return new ProfilePen(0, 0)
    .to(p, 0)
    .to(p, 0.55 * h)
    .cyma(-0.65 * p, 0.3 * h, 'reversa', n)
    .to(0.3 * p, 0.92 * h)
    .to(0, h)
    .close();
}

/** Plinth course: a plain block with a chamfered top edge. Default projection 0.2 × height. */
export function plinthProfile(params: ProfileSize = {}): Profile {
  const { h, p } = size('plinthProfile', params, 0.2);
  return new ProfilePen(0, 0)
    .to(p, 0)
    .to(p, 0.82 * h)
    .to(0.4 * p, h)
    .to(0, h)
    .close();
}

export interface ParapetCapParams {
  /** Thickness of the wall the cap sits on, metres. Default 0.6. */
  wall?: number;
  /** Cap height, metres. Default 0.2. */
  height?: number;
  /** Overhang beyond each wall face, metres. Default 0.06. */
  overhang?: number;
}

/** Parapet coping centred on the wall's centre line (d from −wall/2 − overhang to +wall/2 + overhang), with a drip groove under each overhang and a low ridge on top. */
export function parapetCapProfile(params: ParapetCapParams = {}): Profile {
  const w = positive('parapetCapProfile', 'wall', params.wall ?? 0.6) / 2;
  const h = positive('parapetCapProfile', 'height', params.height ?? 0.2);
  const o = positive('parapetCapProfile', 'overhang', params.overhang ?? 0.06);
  return new ProfilePen(-w, 0)
    .to(w, 0)
    .to(w + o * 0.35, 0)
    .to(w + o * 0.35, 0.012)
    .to(w + o * 0.6, 0.012)
    .to(w + o * 0.6, 0)
    .to(w + o, 0)
    .to(w + o, 0.7 * h)
    .to(0, h)
    .to(-w - o, 0.7 * h)
    .to(-w - o, 0)
    .to(-w - o * 0.6, 0)
    .to(-w - o * 0.6, 0.012)
    .to(-w - o * 0.35, 0.012)
    .to(-w - o * 0.35, 0)
    .close();
}

/** Stacks profiles from the bottom up into one section (each shifted to the running height); for an architrave–frieze–cornice entablature. */
export function stackProfiles(parts: readonly Profile[]): Profile {
  const points: [number, number][] = [];
  let base = 0;
  const shifted = parts.map((profile) => {
    const ys = profile.points.map(([, y]) => y);
    const top = Math.max(...ys);
    const moved = profile.points.map(([d, y]) => [d, y + base] as [number, number]);
    base += top;
    return moved;
  });
  // Walk up the front of each profile (dropping its back edge), then down the wall.
  for (const profile of shifted) {
    const front = profile.filter(([d]) => d > 1e-9 || points.length === 0);
    for (const point of front) points.push(point);
  }
  points.push([0, base]);
  return { closed: true, points: [[0, 0], ...points.filter(([d, y]) => !(d === 0 && y === 0))] };
}
