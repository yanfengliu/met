/**
 * The message the page shows when WebGL 2 cannot start (src/viewer/renderer-error.ts): it names WebGL 2, carries the browser's reason and says what
 * would fix it. Bound: the message text; that the page shows it in place of the build error is checked in tests/e2e/smoke.spec.ts.
 */
import { describe, expect, it } from 'vitest';

import { RendererError, rendererFailureMessage } from './renderer-error.js';

describe('rendererFailureMessage', () => {
  it("names WebGL 2, quotes the browser's reason and says what to do", () => {
    const message = rendererFailureMessage(new Error('THREE.WebGLRenderer: Error creating WebGL context.'));
    expect(message).toContain('WebGL 2');
    expect(message).toContain('it said: THREE.WebGLRenderer: Error creating WebGL context.');
    expect(message).toMatch(/hardware \(graphics\) acceleration/);
    expect(message).toMatch(/update the graphics driver/);
    expect(message).toMatch(/then reload\.$/);
  });

  it('copes with a thrown value that is not an Error, and with no reason at all', () => {
    expect(rendererFailureMessage('context lost')).toContain('it said: context lost');
    expect(rendererFailureMessage(new Error('  '))).toContain('it gave no reason');
    expect(rendererFailureMessage(undefined)).toContain('it gave no reason');
  });

  it('is carried by a RendererError the page can tell from a build error', () => {
    const error = new RendererError(rendererFailureMessage(new Error('no context')), { cause: 'x' });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('RendererError');
    expect(error.cause).toBe('x');
  });
});
