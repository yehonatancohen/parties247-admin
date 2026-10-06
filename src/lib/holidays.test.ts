import { describe, expect, it } from 'vitest';
import { HOLIDAYS, getHolidayWindow, partiesInWindow, previewHolidayList } from './holidays';
import { Party } from '@/data/types';

const mk = (id: string, date: string): Party => ({
  id, slug: id, name: id, imageUrl: '', date, musicGenres: '', location: { name: 'Tel Aviv' },
  description: '', originalUrl: '', region: 'מרכז', musicType: 'אחר', eventType: 'אחר', age: 'כל הגילאים', tags: [],
});
const ids = (ps: Party[]) => ps.map(p => p.id);

describe('holiday windows (copied from the website)', () => {
  it('matches the site for Halloween and Sukkot', () => {
    expect(getHolidayWindow(HOLIDAYS.halloween, new Date('2026-10-06T10:00:00Z'))).toEqual({ start: '2026-10-28', end: '2026-10-31', year: 2026 });
    expect(getHolidayWindow(HOLIDAYS.sukkot, new Date('2026-09-16T10:00:00Z'))).toEqual({ start: '2026-09-25', end: '2026-10-03', year: 2026 });
  });
});

describe('previewHolidayList', () => {
  const all = [mk('c', '2026-10-31T23:00:00'), mk('a', '2026-10-28T23:30:00'), mk('b', '2026-10-30T22:00:00'), mk('out', '2026-11-05T22:00:00')];
  const window = { start: '2026-10-28', end: '2026-10-31', year: 2026 };
  const inWindow = partiesInWindow(all, window);

  it('defaults to in-window parties by date', () => {
    expect(ids(inWindow)).toEqual(['a', 'b', 'c']);
    expect(ids(previewHolidayList(inWindow, all, { partyIds: [], hiddenIds: [] }))).toEqual(['a', 'b', 'c']);
  });

  it('pins in order, admits out-of-window pins, drops hidden and missing ids', () => {
    expect(ids(previewHolidayList(inWindow, all, { partyIds: ['out', 'gone', 'c'], hiddenIds: ['a'] }))).toEqual(['out', 'c', 'b']);
  });
});
