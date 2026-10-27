/**
 * A click on the orbit view (docs/design/spec.md, Collection: Labels): a press of the primary button, a pen or one finger that travels less than
 * `CLICK_SLOP` pixels (src/walk/walk-mode.ts, walk mode's click) before it is released, the travel summed over its moves as walk mode sums it.
 * A click moves nothing. Until a press has travelled `CLICK_SLOP`, its moves are held in the document's capture phase from every listener after it, the
 * orbit controls' (on the document) among them, so the camera, the follow camera and the preset in view stay as they were (review 6, F25). A press
 * that travels the slop is a drag and never a click: its moves go on to the controls from then on, the first of them carrying the whole travel since
 * the press, as the controls turn and pan by the distance from where the press began. Another pointer going down during the press (a second finger's
 * pinch) makes it no click either: before that pointer's press reaches anyone, a copy of the first pointer's last held move goes on, so the zoom's
 * pinch and the controls' two-finger pan start from where the first finger is now, as they would had nothing been held (review 7, F29).
 */
import { CLICK_SLOP } from '../walk/walk-mode.js';

/** A copy of a held move to send on: a PointerEvent with its fields where the page has the type (an event is not sent twice), else the move itself. */
function copyOf(event: PointerEvent): Event {
  return typeof PointerEvent === 'function' ? new PointerEvent(event.type, event) : event;
}

/** Calls `onClick` with the release point of each click on `element` while `active()` holds, at the press and at the release. */
export function bindClick(element: HTMLElement, onClick: (clientX: number, clientY: number) => void, active: () => boolean): void {
  let press: { readonly id: number; x: number; y: number; moved: number; held: PointerEvent | null } | null = null;
  /** The travel from the press's last point to the event's. */
  const step = (event: PointerEvent): number => (press === null ? 0 : Math.abs(event.clientX - press.x) + Math.abs(event.clientY - press.y));
  const doc = element.ownerDocument;
  // Another pointer going down ends the press before its own press reaches any listener: the press's last held move goes on first.
  doc.addEventListener(
    'pointerdown',
    (event) => {
      if (press === null || event.pointerId === press.id) return;
      const held = press.held;
      press = null;
      if (held !== null) element.dispatchEvent(copyOf(held));
    },
    { capture: true },
  );
  element.addEventListener('pointerdown', (event) => {
    if (press !== null) {
      // A second pointer the capture phase did not see: a pinch or a chord, never a click.
      press = null;
      return;
    }
    if (!active() || !event.isPrimary || event.button !== 0) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0, held: null };
  });
  // The capture phase at the document comes before every other listener of a move over the page, the controls' on the document included.
  doc.addEventListener(
    'pointermove',
    (event) => {
      if (press?.id !== event.pointerId || press.moved >= CLICK_SLOP) return;
      press.moved += step(event);
      press.x = event.clientX;
      press.y = event.clientY;
      if (press.moved < CLICK_SLOP) {
        press.held = event;
        event.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
  element.addEventListener('pointerup', (event) => {
    if (press?.id !== event.pointerId) return;
    const moved = press.moved + (press.moved < CLICK_SLOP ? step(event) : 0);
    press = null;
    if (moved < CLICK_SLOP && active()) onClick(event.clientX, event.clientY);
  });
  element.addEventListener('pointercancel', (event) => {
    if (press?.id === event.pointerId) press = null;
  });
}
