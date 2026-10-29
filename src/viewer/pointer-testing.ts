/**
 * Test helpers for the orbit view's pointer input (imported only by `*.test.ts`): a document with a canvas and another element on it that pass a
 * pointer event as the page does, through the document's capture listeners, the target's, then, when it bubbles, the document's others; pointer
 * capture held by the canvas, taken for a finger as it presses and let go as a pointer ends, as the browser does, with `lostpointercapture` fired
 * after the event that let it go; and a stand-in for PointerEvent that copies an event as the browser's constructor does.
 * Bound: listeners run in the order they were added within each phase, and one removed during a dispatch no longer hears it; no layout, so a pointer
 * without capture lands on whichever element the test sends it to; page and client coordinates alike, as on a page that does not scroll.
 */

/** A listener as a test adds it: it reads the stand-in's fields. */
export type Handler = (event: Pointer) => void;
type Options = boolean | { readonly capture?: boolean; readonly passive?: boolean } | undefined;

/** A listener: its event type, function and phase. */
interface Entry {
  readonly type: string;
  readonly fn: Handler;
  readonly capture: boolean;
}

/** The number of the input event being sent (`Page.send`): a copy made while it is dispatched, with no number of its own, carries it. */
let sending = 0;

/** The fields of a PointerEvent the page reads, as its constructor takes them; `seq` numbers the input event a stand-in is or copies. */
export interface PointerInit {
  readonly pointerId?: number;
  readonly pointerType?: string;
  readonly button?: number;
  readonly buttons?: number;
  readonly isPrimary?: boolean;
  readonly clientX?: number;
  readonly clientY?: number;
  readonly screenX?: number;
  readonly screenY?: number;
  readonly bubbles?: boolean;
  readonly seq?: number;
}

/** A PointerEvent as the listeners read it: what the browser's constructor copies from its init (no bubbling unless asked), and the dispatch's flags. */
export class Pointer {
  target: unknown = null;
  stopped = false;
  immediate = false;
  defaultPrevented = false;
  readonly pointerId: number;
  readonly pointerType: string;
  readonly button: number;
  readonly buttons: number;
  readonly isPrimary: boolean;
  readonly clientX: number;
  readonly clientY: number;
  readonly pageX: number;
  readonly pageY: number;
  readonly screenX: number;
  readonly screenY: number;
  readonly bubbles: boolean;
  readonly seq: number;
  readonly ctrlKey = false;
  readonly metaKey = false;
  readonly shiftKey = false;
  constructor(
    readonly type: string,
    init: PointerInit = {},
  ) {
    this.pointerId = init.pointerId ?? 0;
    this.pointerType = init.pointerType ?? 'mouse';
    this.button = init.button ?? 0;
    this.buttons = init.buttons ?? 0;
    this.isPrimary = init.isPrimary ?? false;
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
    this.pageX = this.clientX;
    this.pageY = this.clientY;
    this.screenX = init.screenX ?? this.clientX;
    this.screenY = init.screenY ?? this.clientY;
    this.bubbles = init.bubbles ?? false;
    this.seq = init.seq ?? sending;
  }
  stopPropagation(): void {
    this.stopped = true;
  }
  stopImmediatePropagation(): void {
    this.stopped = true;
    this.immediate = true;
  }
  preventDefault(): void {
    this.defaultPrevented = true;
  }
}

const captureOf = (options: Options): boolean => (typeof options === 'boolean' ? options : options?.capture === true);

/** An event target that keeps its listeners in the order they were added, with their phase. */
export class Target {
  readonly entries: Entry[] = [];
  addEventListener(type: string, fn: Handler, options?: Options): void {
    this.entries.push({ type, fn, capture: captureOf(options) });
  }
  removeEventListener(type: string, fn: Handler, options?: Options): void {
    const capture = captureOf(options);
    const i = this.entries.findIndex((e) => e.type === type && e.fn === fn && e.capture === capture);
    if (i !== -1) this.entries.splice(i, 1);
  }
}

/** An element on the document: events sent to it pass the document's capture listeners, its own, then the document's others when they bubble. */
export class PageElement extends Target {
  constructor(readonly ownerDocument: Target) {
    super();
  }
  dispatchEvent(event: Pointer): boolean {
    event.target = this;
    event.stopped = false;
    event.immediate = false;
    const run = (at: Target, keep: (e: Entry) => boolean): void => {
      for (const entry of [...at.entries]) {
        if (entry.type !== event.type || !keep(entry) || !at.entries.includes(entry)) continue;
        entry.fn(event);
        if (event.immediate) return;
      }
    };
    // Read through a call: a listener may have stopped the event since.
    const stopped = (): boolean => event.stopped;
    run(this.ownerDocument, (e) => e.capture);
    if (!stopped()) run(this, () => true);
    if (!stopped() && event.bubbles) run(this.ownerDocument, (e) => !e.capture);
    return !event.defaultPrevented;
  }
}

/** A canvas as far as the click, OrbitControls and the zoom's input read one: a size, a box, its document, and the pointers it holds captured. */
export class Canvas extends PageElement {
  readonly style: Record<string, string> = {};
  readonly clientWidth = 1280;
  readonly clientHeight = 720;
  readonly captured = new Set<number>();
  /** Pointers whose capture was let go during the input event being sent, whose loss fires after it. */
  readonly released: number[] = [];
  getRootNode(): Target {
    return this.ownerDocument;
  }
  getBoundingClientRect(): { left: number; top: number; width: number; height: number; right: number; bottom: number; x: number; y: number } {
    return { left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720, x: 0, y: 0 };
  }
  setPointerCapture(id: number): void {
    this.captured.add(id);
  }
  releasePointerCapture(id: number): void {
    if (this.captured.delete(id)) this.released.push(id);
  }
  hasPointerCapture(id: number): boolean {
    return this.captured.has(id);
  }
}

/** A document with the canvas and one other element on it, and every input event sent to them, numbered from 1 in the order sent. */
export class Page {
  readonly document = new Target();
  readonly canvas = new Canvas(this.document);
  readonly outside = new PageElement(this.document);
  readonly sent: Pointer[] = [];
  /** The number of the input event being sent, or of the last one. */
  get current(): number {
    return this.sent.length;
  }
  /**
   * Sends an input event to `target`, bubbling, as the browser does: a finger pressing on the canvas is captured by it before any listener hears the
   * press, a pointer released or cancelled lets its capture go, and each capture let go during the event fires `lostpointercapture` at the canvas
   * after it, an input event of its own.
   */
  send(target: PageElement, type: string, init: PointerInit): Pointer {
    const event = new Pointer(type, { ...init, bubbles: true, seq: this.sent.length + 1 });
    this.sent.push(event);
    sending = event.seq;
    if (type === 'pointerdown' && target === this.canvas && event.pointerType === 'touch') this.canvas.captured.add(event.pointerId);
    target.dispatchEvent(event);
    if (type === 'pointerup' || type === 'pointercancel') this.canvas.releasePointerCapture(event.pointerId);
    for (const id of this.canvas.released.splice(0)) this.send(this.canvas, 'lostpointercapture', { ...init, pointerId: id });
    return event;
  }
  /** Takes the canvas's capture of a pointer away, as another element's capture or the canvas leaving the page would, and fires its loss. */
  loseCapture(init: PointerInit & { readonly pointerId: number }): void {
    if (this.canvas.captured.delete(init.pointerId)) this.send(this.canvas, 'lostpointercapture', init);
  }
}
