/**
 * A renderer that cannot start (no WebGL 2 context) is not a model failure: the page says so apart from a build error, with the browser's reason and
 * what would fix it (docs/design/spec.md, Page). Pure, so the message is unit-tested.
 */

/** Thrown by the viewer when WebGL 2 cannot start; its message is `rendererFailureMessage`. */
export class RendererError extends Error {
  override readonly name = 'RendererError';
}

/** What the page says when WebGL 2 cannot start: what happened, the browser's own reason, and what would fix it. */
export function rendererFailureMessage(cause: unknown): string {
  const raw = (cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '').trim();
  const reason = raw === '' ? 'it gave no reason' : `it said: ${raw}`;
  return (
    `This page draws the model with WebGL 2, and the browser could not start it (${reason}). ` +
    "Turn on hardware (graphics) acceleration in the browser's settings, update the graphics driver, or open the page in a current browser that supports WebGL 2, then reload."
  );
}
