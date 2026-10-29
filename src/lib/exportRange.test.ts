import { describe, expect, it } from 'vitest';
import { excelDate, israelToday, monthOptions, resolveRange } from './exportRange';

// 2026-10-29 01:30 Israel (UTC+2): still the 28th in UTC.
const NOW = new Date('2026-10-28T23:30:00Z');

describe('exportRange', () => {
  it('uses the Israel calendar day', () => {
    expect(israelToday(NOW)).toBe('2026-10-29');
  });

  it('resolves the presets, end day inclusive', () => {
    expect(resolveRange('7d', { now: NOW })).toEqual({ from: '2026-10-23', to: '2026-10-29' });
    expect(resolveRange('30d', { now: NOW })).toEqual({ from: '2026-09-30', to: '2026-10-29' });
    expect(resolveRange('year', { now: NOW })).toEqual({ from: '2026-01-01', to: '2026-10-29' });
    expect(resolveRange('all', { now: NOW })).toEqual({ from: null, to: '2026-10-29' });
  });

  it('a past month is whole, the current month stops today', () => {
    expect(resolveRange('month', { month: '2026-09', now: NOW })).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(resolveRange('month', { month: '2026-10', now: NOW })).toEqual({ from: '2026-10-01', to: '2026-10-29' });
  });

  it('custom swaps a reversed pick', () => {
    expect(resolveRange('custom', { customFrom: '2026-10-20', customTo: '2026-10-05', now: NOW }))
      .toEqual({ from: '2026-10-05', to: '2026-10-20' });
  });

  it('lists months newest first', () => {
    expect(monthOptions('2026-08', NOW)).toEqual(['2026-10', '2026-09', '2026-08']);
  });

  it('keeps Israel local time as the Excel time', () => {
    expect(excelDate('2026-10-28T12:30:00')?.toISOString()).toBe('2026-10-28T12:30:00.000Z');
    expect(excelDate('2026-10-28')?.toISOString()).toBe('2026-10-28T00:00:00.000Z');
    expect(excelDate(null)).toBeNull();
  });
});
