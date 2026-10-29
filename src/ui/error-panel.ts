/**
 * The panel the page shows when it cannot start (docs/design/spec.md, Page: No WebGL 2): a renderer that cannot start is not the model's fault, so it
 * says WebGL 2 is not available, with the browser's reason and what to do (src/viewer/renderer-error.ts); any other failure says the model could not be
 * built. Styled inline, because the failure may come before the page styles are installed.
 */
import { RendererError } from '../viewer/renderer-error.js';

export function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const panel = document.createElement('pre');
  panel.className = 'met-error';
  panel.dataset['testid'] = 'error';
  panel.style.cssText = 'position:fixed;inset:16px auto auto 16px;max-width:calc(100vw - 64px);margin:0;padding:14px 16px;border-radius:10px;background:#3a1514;color:#ffd9d4;white-space:pre-wrap;font:13px/1.4 ui-monospace,Consolas,monospace;';
  const heading = error instanceof RendererError ? 'WebGL 2 is not available.' : 'The model could not be built.';
  panel.textContent = `${heading}\n\n${message}`;
  document.body.appendChild(panel);
  console.error(error);
}
