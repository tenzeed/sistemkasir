import { describe, it, expect } from 'vitest';
import { rupiah, inRange, rangeForPreset, todayStr, addDaysStr } from './helpers';

describe('rupiah', () => {
  it('formats integers with Indonesian thousand separators', () => {
    expect(rupiah(3000)).toBe('Rp3.000');
    expect(rupiah(1250000)).toBe('Rp1.250.000');
    expect(rupiah(0)).toBe('Rp0');
  });
  it('rounds and coerces non-numeric input safely', () => {
    expect(rupiah(2999.6)).toBe('Rp3.000');
    expect(rupiah(undefined)).toBe('Rp0');
    expect(rupiah(null)).toBe('Rp0');
  });
});

describe('date range helpers', () => {
  it('inRange checks an ISO date/datetime string falls within from..to (inclusive)', () => {
    expect(inRange('2026-08-24T10:00:00.000Z', '2026-08-20', '2026-08-25')).toBe(true);
    expect(inRange('2026-08-19T23:59:00.000Z', '2026-08-20', '2026-08-25')).toBe(false);
    expect(inRange('2026-08-25', '2026-08-20', '2026-08-25')).toBe(true);
  });

  it('rangeForPreset("today") returns the same start/end date', () => {
    const [from, to] = rangeForPreset('today');
    expect(from).toBe(to);
    expect(from).toBe(todayStr());
  });

  it('rangeForPreset("yesterday") is exactly one day before today', () => {
    const [from, to] = rangeForPreset('yesterday');
    expect(from).toBe(to);
    expect(from).toBe(addDaysStr(todayStr(), -1));
  });
});
