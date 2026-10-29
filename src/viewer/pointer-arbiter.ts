/**
 * Which pointers the orbit view's camera input hears (docs/design/spec.md, Camera; work unit 10). Its consumers are OrbitControls and the zoom's
 * input (src/viewer/zoom.ts `bindZoomInput`). OrbitControls keeps a finger's position, for its two-finger pan, but not a mouse's or a pen's, and
 * takes every pointer it hears for one of its own. So a mouse and a finger down together threw inside it (`Cannot read properties of undefined
 * (reading 'x')`, work unit 2, review 11, F39), and so did a mouse and a pen, a middle button pressed while a finger turned the view, and a finger
 * released elsewhere on the page while a mouse dragged; and a pen hovering while a mouse dragged turned the view by the pen.
 * So one kind of pointer holds the camera at a time, the fingers on the screen, any number, or one mouse or pen (the wheel is no pointer):
 * - a press on the canvas in the orbit view is passed on when nothing holds the camera, or when it is a finger and fingers hold it;
 * - every other press is refused: a pointer of another type, a second pen, and every press while walking;
 * - each consumer hears a passed press, then that pointer's moves and its end (its release or cancel) wherever they land, and nothing else: nothing of
 *   a refused pointer, nor of a pointer pressed elsewhere, nor of a hover. A passed pointer keeps its whole life in every consumer, through a change of
 *   mode; a refused one stays refused to its end, even once the camera is free;
 * - the camera is free again once every consumer has heard the end of every pointer it was passed, so no consumer ever holds two kinds of pointer.
 * Each press is decided once, by the first consumer that hears it, so every consumer hears the same presses whatever the order of their listeners.
 * Bound: a pointer whose end a consumer never hears holds the camera until the same pointer presses again, as a mouse does; a finger's or a pen's id
 * may never come back, as with Chrome's touches, so a lost end of one would hold it until the page reloads. Pointer Events 3 gives every press an end,
 * and on this page every end reaches the document, a cancel landing off the canvas being relayed to the controls (src/viewer/camera-rig.ts).
 */

/** A pointer listener as a consumer adds it. */
export type PointerListener = (event: PointerEvent) => void;
/** One consumer's filter: each of its pointer listeners put through it. */
export type Hear = (listener: PointerListener) => PointerListener;

export class PointerArbiter {
  /** Each pointer a consumer holds, by its id: whether it is a finger. */
  private readonly held = new Map<number, boolean>();
  /** The pointers each consumer holds: passed to it, and not yet ended there. */
  private readonly consumers: Set<number>[] = [];
  /** Each press decided, by its event: whether it was passed. */
  private readonly decided = new WeakMap<object, boolean>();

  /** `active()` holds in the orbit view: a press while it does not is refused. */
  constructor(private readonly active: () => boolean) {}

  /** Whether the press `down` is passed on, decided by the first consumer that hears it. */
  private passes(down: PointerEvent): boolean {
    const known = this.decided.get(down);
    if (known !== undefined) return known;
    const finger = down.pointerType === 'touch';
    const holders = [...this.held.values()];
    // A pointer held and pressed again (its end was lost) goes on as it was.
    const pass = this.held.has(down.pointerId) || (this.active() && (holders.length === 0 || (finger && holders.every((f) => f))));
    this.decided.set(down, pass);
    if (pass) this.held.set(down.pointerId, finger);
    return pass;
  }

  /**
   * A new consumer's filter: each of its pointer listeners, put through it, hears a passed press, then that pointer's moves and its end, and nothing
   * else, so together they hear each passed pointer's whole life once.
   */
  consumer(): Hear {
    const open = new Set<number>();
    this.consumers.push(open);
    return (listener) => (event) => {
      const id = event.pointerId;
      if (event.type === 'pointerdown') {
        if (!this.passes(event)) return;
        open.add(id);
      } else if (!open.has(id)) {
        return;
      } else if (event.type === 'pointerup' || event.type === 'pointercancel') {
        open.delete(id);
        if (!this.consumers.some((o) => o.has(id))) this.held.delete(id);
      }
      listener(event);
    };
  }
}
