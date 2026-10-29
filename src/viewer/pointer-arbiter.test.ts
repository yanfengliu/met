/**
 * The arbiter of mixed pointer input on its own (src/viewer/pointer-arbiter.ts; docs/design/spec.md, Camera), each consumer a recorder of what its
 * listeners hear, the events plain objects:
 * - the first press holds the camera, fingers join fingers, and every other press is refused while it is held: a pointer of another type and a second
 *   pen; the camera is free once every consumer has heard the end of each pointer it was passed, and not before;
 * - every press while walking is refused, and a passed pointer keeps its whole life through walk mode; a refused pointer stays refused to its end,
 *   once the camera is free and back in the orbit view, and holds nothing;
 * - each consumer hears a passed pointer's press, moves and end once, and nothing of a pointer it never heard press (pressed elsewhere, or hovering);
 * - a press is decided once, by the first consumer that hears it, so every consumer hears the same presses whatever the order of their listeners.
 * The arbiter on the real rig, mixed input that threw inside OrbitControls among it, is src/viewer/mixed-pointers.test.ts.
 * Red proofs: docs/learning/gate-proofs.md ("Mixed pointer input reaches the orbit view's camera input").
 * Bound: the arbiter's own rules, with no DOM: each listener called with the event, as a dispatch would call it.
 */
import { describe, expect, it } from 'vitest';

import { PointerArbiter } from './pointer-arbiter.js';
import type { Hear } from './pointer-arbiter.js';

type Kind = 'mouse' | 'pen' | 'touch';
/** An event as the arbiter reads it. */
const at = (type: string, pointerId: number, pointerType: Kind): PointerEvent => ({ type, pointerId, pointerType }) as unknown as PointerEvent;

/** A consumer: a pointer listener for each event type through its filter, and what they heard, as `type id` strings. */
function consumer(hear: Hear): { readonly heard: string[]; readonly send: (event: PointerEvent) => void } {
  const heard: string[] = [];
  const listener = hear((event) => heard.push(`${event.type.replace('pointer', '')} ${String(event.pointerId)}`));
  return { heard, send: listener };
}

/** An arbiter with two consumers, `walking` its mode, and `send`, which hands one event to both, the first that hears it first. */
function arbitrated(): { walking: (on: boolean) => void; send: (type: string, id: number, kind: Kind, firstB?: boolean) => void; a: string[]; b: string[] } {
  let walk = false;
  const arbiter = new PointerArbiter(() => !walk);
  const [a, b] = [consumer(arbiter.consumer()), consumer(arbiter.consumer())];
  return {
    walking: (on) => {
      walk = on;
    },
    send: (type, id, kind, firstB = false) => {
      const event = at(`pointer${type}`, id, kind);
      for (const c of firstB ? [b, a] : [a, b]) c.send(event);
    },
    a: a.heard,
    b: b.heard,
  };
}

describe('the pointer arbiter', () => {
  it('passes the first press and fingers that join fingers, refuses any other press while the camera is held, and frees it when they end', () => {
    const t = arbitrated();
    // A mouse holds: a finger, a pen and a second pen are refused; the mouse's end frees the camera, and a pen holds it then.
    t.send('down', 1, 'mouse');
    t.send('down', 10, 'touch');
    t.send('down', 2, 'pen');
    t.send('move', 1, 'mouse');
    t.send('move', 10, 'touch');
    t.send('up', 1, 'mouse');
    t.send('down', 3, 'pen');
    t.send('down', 4, 'pen');
    t.send('down', 1, 'mouse');
    t.send('move', 3, 'pen');
    t.send('up', 2, 'pen');
    t.send('up', 10, 'touch');
    t.send('cancel', 3, 'pen');
    // Fingers hold: another finger joins them, a mouse is refused; the camera is free only once both fingers are up.
    t.send('down', 11, 'touch');
    t.send('down', 12, 'touch');
    t.send('down', 5, 'pen');
    t.send('up', 11, 'touch');
    t.send('down', 6, 'pen');
    t.send('up', 12, 'touch');
    t.send('down', 7, 'pen');
    expect(t.a).toEqual(['down 1', 'move 1', 'up 1', 'down 3', 'move 3', 'cancel 3', 'down 11', 'down 12', 'up 11', 'up 12', 'down 7']);
    expect(t.b, 'the other consumer').toEqual(t.a);
  });

  it('refuses every press while walking, keeps a passed pointer’s whole life through walk mode, and keeps a refused pointer refused to its end', () => {
    const t = arbitrated();
    // Passed in the orbit view, it goes on hearing its moves and its end while walking.
    t.send('down', 10, 'touch');
    t.walking(true);
    t.send('move', 10, 'touch');
    t.send('down', 11, 'touch');
    t.send('up', 10, 'touch');
    // Pressed while walking, the finger is refused and holds nothing: back in the orbit view a mouse holds the camera, and the finger stays refused.
    t.walking(false);
    t.send('move', 11, 'touch');
    t.send('down', 1, 'mouse');
    t.send('up', 11, 'touch');
    t.send('up', 1, 'mouse');
    // Refused by a mouse, a finger stays refused once the mouse is up, and the next finger holds the camera.
    t.send('down', 2, 'pen');
    t.send('down', 12, 'touch');
    t.send('up', 2, 'pen');
    t.send('move', 12, 'touch');
    t.send('down', 13, 'touch');
    t.send('up', 12, 'touch');
    t.send('up', 13, 'touch');
    expect(t.a).toEqual(['down 10', 'move 10', 'up 10', 'down 1', 'up 1', 'down 2', 'up 2', 'down 13', 'up 13']);
    expect(t.b, 'the other consumer').toEqual(t.a);
  });

  it('hears nothing of a pointer pressed elsewhere or hovering, and decides each press once, whichever consumer hears it first', () => {
    const t = arbitrated();
    // Pressed elsewhere: no consumer heard its press, so its moves and its end are no one's; a hover likewise.
    t.send('down', 1, 'mouse');
    t.send('move', 10, 'touch');
    t.send('up', 10, 'touch');
    t.send('move', 2, 'pen');
    t.send('up', 1, 'mouse');
    // The second consumer hears this press first: both pass it, and both refuse the pen pressed while it holds.
    t.send('down', 11, 'touch', true);
    t.send('down', 2, 'pen', true);
    t.send('up', 11, 'touch', true);
    t.send('up', 2, 'pen');
    expect(t.a).toEqual(['down 1', 'up 1', 'down 11', 'up 11']);
    expect(t.b).toEqual(t.a);
    // One press: the first consumer passes it, and the second hears the same, though the mode changed in between.
    let walk = false;
    const arbiter = new PointerArbiter(() => !walk);
    const [a, b] = [consumer(arbiter.consumer()), consumer(arbiter.consumer())];
    const down = at('pointerdown', 1, 'mouse');
    a.send(down);
    walk = true;
    b.send(down);
    expect([a.heard, b.heard]).toEqual([['down 1'], ['down 1']]);
  });

  it('frees the camera only once every consumer has heard the end of each pointer it was passed, so none ever holds two kinds of pointer', () => {
    const arbiter = new PointerArbiter(() => true);
    const [a, b] = [consumer(arbiter.consumer()), consumer(arbiter.consumer())];
    const both = (event: PointerEvent): void => {
      a.send(event);
      b.send(event);
    };
    both(at('pointerdown', 1, 'mouse'));
    // Only the first consumer heard the mouse's release: a finger is still refused by both.
    a.send(at('pointerup', 1, 'mouse'));
    both(at('pointerdown', 10, 'touch'));
    b.send(at('pointerup', 1, 'mouse'));
    both(at('pointerdown', 11, 'touch'));
    expect([a.heard, b.heard]).toEqual([['down 1', 'up 1', 'down 11'], ['down 1', 'up 1', 'down 11']]);
  });
});
