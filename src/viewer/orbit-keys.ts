/**
 * The orbit view's movement keys (docs/design/spec.md, Keyboard): W and S move the camera and its target together along the view direction laid
 * flat on the ground, A and D sideways, Q and E down and up. Speed is ORBIT_KEY_SPEED of the camera's distance to its target per second, at least
 * ORBIT_KEY_MIN_SPEED, and Shift doubles it, so a move covers about the same share of the view from an aerial preset as from inside a hall.
 * Pure: the caller passes the seconds of the frame, so the speed is the same at any frame rate.
 */
import { Vector3 } from 'three';

/** Metres per second per metre of distance to the target. */
export const ORBIT_KEY_SPEED = 0.5;
/** The least speed, metres per second. */
export const ORBIT_KEY_MIN_SPEED = 1.5;

/** Which ways the keys ask for: each -1, 0 or 1. */
export interface OrbitKeys {
  readonly forward: number;
  readonly right: number;
  readonly up: number;
  readonly fast: boolean;
}

/** The keys held, from physical key codes: W S, D A, E Q and either Shift. */
export function orbitKeys(held: ReadonlySet<string>): OrbitKeys {
  const axis = (plus: string, minus: string): number => (held.has(plus) ? 1 : 0) - (held.has(minus) ? 1 : 0);
  return { forward: axis('KeyW', 'KeyS'), right: axis('KeyD', 'KeyA'), up: axis('KeyE', 'KeyQ'), fast: held.has('ShiftLeft') || held.has('ShiftRight') };
}

/**
 * How far the keys move the camera and target in `seconds`, seen from a camera at `position` looking at `target` with screen-up `up` (world).
 * Looking straight down, "forward" is the screen's up laid flat. Diagonals are as fast as straight moves.
 */
export function orbitKeyMove(position: Vector3, target: Vector3, up: Vector3, keys: OrbitKeys, seconds: number): Vector3 {
  const move = new Vector3();
  if ((keys.forward === 0 && keys.right === 0 && keys.up === 0) || !(seconds > 0)) return move;
  const distance = position.distanceTo(target);
  const speed = Math.max(ORBIT_KEY_MIN_SPEED, distance * ORBIT_KEY_SPEED) * (keys.fast ? 2 : 1);
  const forward = target.clone().sub(position).setY(0);
  if (forward.lengthSq() < 1e-12 * Math.max(1, distance * distance)) forward.copy(up).setY(0);
  if (forward.lengthSq() < 1e-24) forward.set(0, 0, -1);
  forward.normalize();
  const right = new Vector3(-forward.z, 0, forward.x);
  move.addScaledVector(forward, keys.forward).addScaledVector(right, keys.right);
  if (move.lengthSq() > 0) move.normalize();
  move.y = keys.up;
  return move.multiplyScalar(speed * seconds);
}
