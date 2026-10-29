/**
 * A click on the orbit view (docs/design/spec.md, Collection: Labels): a press of the primary button, a pen or one finger that travels less than
 * `CLICK_SLOP` pixels (src/walk/walk-mode.ts, walk mode's click) before it is released, the travel summed over its moves as walk mode sums it.
 * A click moves nothing: its moves are held, in the document's capture phase, from every listener after it, the orbit controls' and the zoom's among
 * them, so the camera, the follow camera and the preset in view stay as they were. Every other press goes through as if nothing were there. The gate
 * is a small state machine over the pointers down on the canvas (review 10, F36, after F25 and F29; review 11, F37 and F38):
 * - idle, nothing down: a press of the primary button, a pen or a finger while the orbit view is on starts pressing; any other press starts passing;
 * - pressing, one pointer below the slop: its moves are held, only the latest kept; its release below the slop in the orbit view is a click, the
 *   held move dropped (released while walking, it is none, and the held move goes on as below);
 * - the slop passed (a move, or the release, takes the travel to CLICK_SLOP), another pointer landing, a change of the pointer's buttons (a chord
 *   arrives as a move with new `buttons`) or the loss of its capture: the held move goes on once, before the event that ended the hold reaches anyone,
 *   so every listener starts from where the pointer is now; then passing;
 * - passing: every event goes on, nothing is held, until no pointer is down, then idle; a pointer landing then is never a click (two are never one);
 * - a cancelled press drops the held move and its pointer. A lost capture ends no pointer (Pointer Events 3): it stays down until its own release or
 *   cancel, which the document hears wherever it lands.
 */
import { CLICK_SLOP } from '../walk/walk-mode.js';

/** The pointer a click may be: the buttons it pressed with, where it pressed or last moved, how far it has travelled, and its latest held move. */
interface Pressing {
  readonly kind: 'pressing';
  readonly id: number;
  readonly buttons: number;
  x: number;
  y: number;
  moved: number;
  held: PointerEvent | null;
}
type Gate = { readonly kind: 'idle' } | Pressing | { readonly kind: 'passing' };

/** Calls `onClick` with the release point of each click on `element` while `active()` holds, at the press and at the release. */
export function bindClick(element: HTMLElement, onClick: (clientX: number, clientY: number) => void, active: () => boolean): void {
  let gate: Gate = { kind: 'idle' };
  /** The pointers down on the canvas now, until their release or cancel. */
  const down = new Set<number>();
  const doc = element.ownerDocument;
  /** The travel from the press's last point to the event's. */
  const step = (press: Pressing, event: PointerEvent): number => Math.abs(event.clientX - press.x) + Math.abs(event.clientY - press.y);
  /** Ends pressing: the held move goes on once, a copy (an event is not sent twice), then everything passes. */
  const pass = (press: Pressing): void => {
    gate = { kind: 'passing' };
    if (press.held !== null) element.dispatchEvent(new PointerEvent(press.held.type, press.held));
  };
  /** One pointer is no longer down: back to idle once none is. */
  const lift = (id: number): void => {
    down.delete(id);
    if (down.size === 0) gate = { kind: 'idle' };
  };
  // The capture phase at the document comes before every other listener of the page, the controls' and the zoom's included.
  doc.addEventListener(
    'pointerdown',
    (event) => {
      if (event.target !== element) return;
      down.add(event.pointerId);
      if (gate.kind === 'pressing') pass(gate);
      else if (gate.kind === 'idle') {
        const eligible = down.size === 1 && active() && event.isPrimary && event.button === 0;
        gate = eligible ? { kind: 'pressing', id: event.pointerId, buttons: event.buttons, x: event.clientX, y: event.clientY, moved: 0, held: null } : { kind: 'passing' };
      }
    },
    { capture: true },
  );
  doc.addEventListener(
    'pointermove',
    (event) => {
      if (gate.kind !== 'pressing' || gate.id !== event.pointerId) return;
      const press = gate;
      // Another button pressed or let go during the press: a chord, never a click (F38).
      if (event.buttons !== press.buttons) {
        pass(press);
        return;
      }
      press.moved += step(press, event);
      press.x = event.clientX;
      press.y = event.clientY;
      if (press.moved < CLICK_SLOP) {
        press.held = event;
        event.stopImmediatePropagation();
      } else {
        pass(press);
      }
    },
    { capture: true },
  );
  doc.addEventListener(
    'pointerup',
    (event) => {
      if (!down.has(event.pointerId)) return;
      let click = false;
      if (gate.kind === 'pressing' && gate.id === event.pointerId) {
        const press = gate;
        // Released while walking, it is no click, and its held move goes on as a drag's does (work unit 10).
        click = press.moved + step(press, event) < CLICK_SLOP && active();
        if (click) gate = { kind: 'passing' };
        else pass(press);
      }
      lift(event.pointerId);
      if (click) onClick(event.clientX, event.clientY);
    },
    { capture: true },
  );
  doc.addEventListener(
    'pointercancel',
    (event) => {
      if (!down.has(event.pointerId)) return;
      if (gate.kind === 'pressing' && gate.id === event.pointerId) gate = { kind: 'passing' };
      lift(event.pointerId);
    },
    { capture: true },
  );
  // A press whose capture is lost is no click, and stays down until its release or cancel: its later events may land on any element (F37).
  element.addEventListener('lostpointercapture', (event) => {
    if (gate.kind === 'pressing' && gate.id === event.pointerId) pass(gate);
  });
}
