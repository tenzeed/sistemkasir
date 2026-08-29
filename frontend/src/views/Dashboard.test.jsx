import { describe, it, expect } from 'vitest';
import { formatChartTick } from './Dashboard.jsx';

describe('formatChartTick — label sumbu grafik penjualan', () => {
  it('angka di bawah 1000 tampil apa adanya', () => {
    expect(formatChartTick(0)).toBe('0');
    expect(formatChartTick(250)).toBe('250');
    expect(formatChartTick(999)).toBe('999');
  });

  it('ribuan disingkat "rb"', () => {
    expect(formatChartTick(1000)).toBe('1rb');
    expect(formatChartTick(3000)).toBe('3rb');
    expect(formatChartTick(12500)).toBe('12.5rb');
  });

  it('jutaan disingkat "jt" — ini yang tadinya bikin label kepotong (mis. "2500rb")', () => {
    expect(formatChartTick(1000000)).toBe('1jt');
    expect(formatChartTick(2500000)).toBe('2.5jt');
    expect(formatChartTick(15000000)).toBe('15jt');
    expect(formatChartTick(125000000)).toBe('125jt');
  });

  it('hasil selalu pendek (maks ~6 karakter) supaya muat di lebar sumbu-Y yang sempit', () => {
    const samples = [999, 12500, 2500000, 125000000, 999000000];
    samples.forEach((v) => {
      expect(formatChartTick(v).length).toBeLessThanOrEqual(7);
    });
  });
});
