/**
 * Small DOM helpers for the page chrome.
 */

export interface ElementOptions {
  readonly className?: string;
  readonly testid?: string;
  readonly text?: string;
  readonly html?: string;
  readonly attrs?: Readonly<Record<string, string>>;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, options: ElementOptions = {}, children: readonly Node[] = []): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className !== undefined) element.className = options.className;
  if (options.testid !== undefined) element.dataset['testid'] = options.testid;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.html !== undefined) element.innerHTML = options.html;
  for (const [name, value] of Object.entries(options.attrs ?? {})) element.setAttribute(name, value);
  for (const child of children) element.appendChild(child);
  return element;
}

/** A button with an accessible name. A pointer click leaves focus on the page, so Space keeps meaning play/pause; keyboard activation keeps focus. */
export function button(label: string, testid: string, onActivate: () => void, options: { readonly icon?: string; readonly text?: string; readonly className?: string } = {}): HTMLButtonElement {
  const element = el('button', {
    className: options.className ?? (options.icon !== undefined ? 'met-button met-icon' : 'met-button'),
    testid,
    attrs: { type: 'button', 'aria-label': label, title: label },
  });
  if (options.icon !== undefined) element.innerHTML = options.icon;
  if (options.text !== undefined) element.append(options.text);
  element.addEventListener('click', (event) => {
    onActivate();
    if (event.detail > 0) element.blur();
  });
  return element;
}

/** Sets an attribute only when it changes, so per-frame syncing does not touch the DOM needlessly. */
export function setAttr(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

export function setText(element: Element, value: string): void {
  if (element.textContent !== value) element.textContent = value;
}
