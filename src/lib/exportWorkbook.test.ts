import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildWorkbook, exportFileName, type ExportData } from './exportWorkbook';

const DATA: ExportData = {
  range: { from: '2026-10-01', to: '2026-10-31', generatedAt: '2026-10-29T14:00:00' },
  totals: {
    views: 60, botViews: 5, clicks: 2, clickRate: 3.33, tickets: 3, ticketsPerClick: 150,
    commission: 36, gross: 300, parties: 1, salesRows: 2,
    byAccount: [{ account: 'account1', tickets: 2, commission: 30, gross: 200 }],
  },
  parties: [{ partyName: 'Moon', partyDate: '2026-10-30T22:00:00', status: 'merged', accounts: 'account1, account2',
    views: 50, clickRate: 4, commission: 30, siteUrl: 'https://www.parties247.co.il/event/moon' }],
  sales: [{ recordedAt: '2026-10-28T12:30:00', account: 'account1', partyName: 'Moon', tickets: 2, commission: 30,
    lastClickChannel: 'instagram', corrected: false }],
  clicks: [{ clickedAt: '2026-10-28T11:00:00', partyName: 'Moon', channel: 'google', saleWithin24h: true }],
  daily: [{ day: '2026-10-28', views: 50, clicks: 2, clickRate: 4, tickets: 2, commission: 30, gross: 200 }],
  partyDaily: [],
  channels: [],
  goOutDaily: [],
};

describe('buildWorkbook', () => {
  it('writes every sheet, right-to-left, with typed cells', async () => {
    const blob = await buildWorkbook(DATA);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());

    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'סיכום', 'מסיבות', 'מכירות', 'קליקים לרכישה', 'לפי יום', 'מסיבה לפי יום', 'ערוצים', 'מכירות גו-אאוט ליום',
    ]);
    const parties = wb.getWorksheet('מסיבות')!;
    expect(parties.views[0].rightToLeft).toBe(true);
    const row = parties.getRow(2);
    expect(row.getCell(1).value).toBe('Moon');
    expect((row.getCell(2).value as Date).toISOString()).toBe('2026-10-30T22:00:00.000Z'); // Israel time as-is
    expect(row.getCell(3).value).toBe('אוחדה');
    expect(row.getCell(4).value).toBe('חשבון 1, חשבון 2');
    expect(row.getCell(14).value).toBe(0.04); // 4% stored as a real percentage
    expect(row.getCell(14).numFmt).toBe('0.0%');

    const sale = wb.getWorksheet('מכירות')!.getRow(2);
    expect(sale.getCell(14).value).toBe('אינסטגרם');
    expect(wb.getWorksheet('קליקים לרכישה')!.getRow(2).getCell(13).value).toBe('כן');
  });

  it('names the file after the range', () => {
    expect(exportFileName(DATA.range)).toBe('parties247_2026-10-01_2026-10-31.xlsx');
    expect(exportFileName({ ...DATA.range, from: null })).toBe('parties247_all_2026-10-31.xlsx');
  });
});
