/**
 * A click on the orbit view (docs/design/spec.md, Collection: Labels): a press of the primary button, a pen or one finger that travels less than
 * `CLICK_SLOP` pixels (src/walk/walk-mode.ts, walk mode's click) before it is released, the travel summed over its moves as walk mode sums it; a press
 * that travels more is a drag, which the orbit controls turn into an orbit, a pan or a zoom, and never counts. Another pointer going down during the
 * press (a second finger's pinch) makes it no click either. It only listens: the controls see every press as before, so a click moves nothing.
 */
import { CLICK_SLOP } from '../walk/walk-mode.js';

/** Calls `onClick` with the release point of each click on `element` while `active()` holds, at the press and at the release. */
export function bindClick(element: HTMLElement, onClick: (clientX: number, clientY: number) => void, active: () => boolean): void {
  let press: { readonly id: number; x: number; y: number; moved: number } | null = null;
  /** Adds the travel from the press's last point to the event's. */
  const travel = (event: PointerEvent): void => {
    if (press === null) return;
    press.moved += Math.abs(event.clientX - press.x) + Math.abs(event.clientY - press.y);
    press.x = event.clientX;
    press.y = event.clientY;
  };
  element.addEventListener('pointerdown', (event) => {
    if (press !== null) {
      // A second pointer: a pinch or a chord, never a click.
      press = null;
      return;
    }
    if (!active() || !event.isPrimary || event.button !== 0) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0 };
  });
  element.addEventListener('pointermove', (event) => {
    if (press?.id === event.pointerId) travel(event);
  });
  element.addEventListener('pointerup', (event) => {
    if (press?.id !== event.pointerId) return;
    travel(event);
    const moved = press.moved;
    press = null;
    if (moved < CLICK_SLOP && active()) onClick(event.clientX, event.clientY);
  });
  element.addEventListener('pointercancel', (event) => {
    if (press?.id === event.pointerId) press = null;
  });
}
