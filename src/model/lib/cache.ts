/**
 * Part cache. Equal parameters give the identical geometry object, which is what lets the kit batch every piece of one shape into one InstancedMesh (docs/design/spec.md, Build-step API, Batching).
 *
 * The key is the part name plus a canonical text of its fully defaulted parameters: object keys sorted, `undefined` members dropped, numbers rounded to the nearest micrometre.
 * So `column({})` and `column({ diameter: 1 })` are the same call when 1 is the default, and two widths that differ only by float noise share one geometry.
 * Cached results are shared by every caller: never mutate, translate or dispose them; place a piece through its matrix.
 */

const store = new Map<string, unknown>();

/** Numbers in a key are rounded to this step (1 µm), so float noise does not split a cache entry. */
const KEY_STEP = 1e-6;

function canonicalNumber(value: number, path: string): string {
  if (!Number.isFinite(value)) {
    throw new Error(`part parameter ${path} is ${String(value)}: every number a part takes must be finite.`);
  }
  const rounded = Math.round(value / KEY_STEP) * KEY_STEP;
  return String(Object.is(rounded, -0) ? 0 : Number(rounded.toFixed(6)));
}

/** A stable text for a parameter value: same value, same text, whatever the key order. */
export function canonical(value: unknown, path = 'params'): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'number':
      return canonicalNumber(value, path);
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'undefined':
      return 'undefined';
    case 'object': {
      if (Array.isArray(value)) {
        return `[${value.map((item: unknown, index) => canonical(item, `${path}[${String(index)}]`)).join(',')}]`;
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort();
      return `{${keys.map((key) => `${key}:${canonical(record[key], `${path}.${key}`)}`).join(',')}}`;
    }
    default:
      throw new Error(`part parameter ${path} has type ${typeof value}: parts take numbers, strings, booleans, arrays and plain objects only.`);
  }
}

/** Returns the cached result for `part` with these (already defaulted) parameters, building it on the first call. */
export function cached<T>(part: string, params: unknown, build: () => T): T {
  const key = `${part}|${canonical(params)}`;
  if (store.has(key)) return store.get(key) as T;
  const made = build();
  store.set(key, made);
  return made;
}

/** How many distinct part results are cached. */
export function cacheSize(): number {
  return store.size;
}
