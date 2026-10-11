/**
 * Every gallery exhibit, in gallery order: one array per part family.
 */
import { architectureEntries } from './catalogue-architecture.js';
import { glazingEntries } from './catalogue-glazing.js';
import { landscapeEntries } from './catalogue-landscape.js';
import { orderEntries } from './catalogue-orders.js';
import type { PartEntry } from './entry.js';

export const catalogue: readonly PartEntry[] = [...orderEntries, ...architectureEntries, ...glazingEntries, ...landscapeEntries];

const seen = new Set<string>();
for (const entry of catalogue) {
  if (seen.has(entry.id)) throw new Error(`Gallery exhibit id "${entry.id}" is used twice; ids must be unique (they name captures and ?part=).`);
  seen.add(entry.id);
}
