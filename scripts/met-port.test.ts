/**
 * Bound: `metPort` is checked on injected environments only; whether the port is free is the server's job, not this module's.
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_MET_PORT, metPort } from './met-port.js';

describe('metPort', () => {
  it('defaults to 5310 when MET_PORT is unset, empty or blank', () => {
    expect(DEFAULT_MET_PORT).toBe(5310);
    expect(metPort({})).toBe(5310);
    expect(metPort({ MET_PORT: '' })).toBe(5310);
    expect(metPort({ MET_PORT: '  ' })).toBe(5310);
  });

  it('reads a whole port number from 1024 to 65535', () => {
    expect(metPort({ MET_PORT: '5311' })).toBe(5311);
    expect(metPort({ MET_PORT: ' 5314 ' })).toBe(5314);
    expect(metPort({ MET_PORT: '1024' })).toBe(1024);
    expect(metPort({ MET_PORT: '65535' })).toBe(65535);
  });

  it.each(['abc', '5310.5', '-1', '80', '1023', '65536', '0x1F90', '1e4', '53 10'])(
    'rejects %s and names the input and the accepted range',
    (value) => {
      expect(() => metPort({ MET_PORT: value })).toThrow(
        new RegExp(`MET_PORT must be a whole number from 1024 to 65535.*got "${value}"`),
      );
    },
  );
});
