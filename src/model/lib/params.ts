/**
 * Parameter checks shared by every part. Each failure names the part, the parameter, the value it got and what would satisfy it.
 */

/** Triangle cost level. 'low' for distant or heavily repeated pieces, 'medium' (the default) for the facade at street distance, 'high' for close-ups. */
export type Detail = 'low' | 'medium' | 'high';

export const DETAILS: readonly Detail[] = ['low', 'medium', 'high'];

/** Picks the value for a detail level from `[low, medium, high]` (segment counts, step lists, ...). */
export function byDetail<T>(detail: Detail, options: readonly [T, T, T]): T {
  return detail === 'low' ? options[0] : detail === 'high' ? options[2] : options[1];
}

export function checkDetail(part: string, detail: string): Detail {
  if ((DETAILS as readonly string[]).includes(detail)) return detail as Detail;
  throw new Error(`${part}: detail is "${detail}"; use one of ${DETAILS.map((d) => `'${d}'`).join(', ')}.`);
}

export function positive(part: string, name: string, value: number): number {
  if (Number.isFinite(value) && value > 0) return value;
  throw new Error(`${part}: ${name} is ${String(value)}; it must be a finite number above 0 (metres unless the header says otherwise).`);
}

export function nonNegative(part: string, name: string, value: number): number {
  if (Number.isFinite(value) && value >= 0) return value;
  throw new Error(`${part}: ${name} is ${String(value)}; it must be a finite number of at least 0.`);
}

export function finite(part: string, name: string, value: number): number {
  if (Number.isFinite(value)) return value;
  throw new Error(`${part}: ${name} is ${String(value)}; it must be a finite number.`);
}

export function integer(part: string, name: string, value: number, min: number, max: number): number {
  if (Number.isInteger(value) && value >= min && value <= max) return value;
  throw new Error(`${part}: ${name} is ${String(value)}; it must be a whole number from ${String(min)} to ${String(max)}.`);
}

export function inRange(part: string, name: string, value: number, min: number, max: number): number {
  if (Number.isFinite(value) && value >= min && value <= max) return value;
  throw new Error(`${part}: ${name} is ${String(value)}; it must be from ${String(min)} to ${String(max)}.`);
}

export function oneOf<T extends string>(part: string, name: string, value: string, options: readonly T[]): T {
  if ((options as readonly string[]).includes(value)) return value as T;
  throw new Error(`${part}: ${name} is "${value}"; use one of ${options.map((o) => `'${o}'`).join(', ')}.`);
}

/** Throws unless `condition`, with a message naming the part. */
export function require(part: string, condition: boolean, message: string): void {
  if (!condition) throw new Error(`${part}: ${message}`);
}
