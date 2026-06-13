import { describe, expect, it } from 'vitest';
import { localDateISO, toMillis } from './format.js';

describe('date formatting helpers', () => {
  it('formats local calendar dates without UTC shifting', () => {
    expect(localDateISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });

  it('normalizes Firestore-style timestamps', () => {
    expect(toMillis({ seconds: 10, nanoseconds: 500000000 })).toBe(10500);
    expect(toMillis({ toMillis: () => 12345 })).toBe(12345);
  });
});
