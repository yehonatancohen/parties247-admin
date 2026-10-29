// Turns GET /api/admin/export into an .xlsx file. exceljs (~1 MB) is loaded only
// when the owner clicks export, never on page load.

/* eslint-disable @typescript-eslint/no-explicit-any -- raw API rows, typed per column below */

import { CHANNEL_LABELS } from './channels';
import { excelDate } from './exportRange';

export interface ExportData {
  range: { from: string | null; to: string; generatedAt: string };
  totals: Record<string, any> & { byAccount: { account: string; tickets: number; commission: number; gross: number }[] };
  parties: any[];
  sales: any[];
  clicks: any[];
  daily: any[];
  partyDaily: any[];
  channels: any[];
  goOutDaily: any[];
}

type Kind = 'text' | 'int' | 'money' | 'pct' | 'num' | 'datetime' | 'date' | 'bool' | 'url' | 'channel';

interface Column {
  key: string;
  header: string;
  kind: Kind;
  width?: number;
}

const FORMATS: Partial<Record<Kind, string>> = {
  int: '#,##0',
  num: '#,##0.0',
  money: '"₪"#,##0.00',
  pct: '0.0%',
  datetime: 'dd/mm/yyyy hh:mm',
  date: 'dd/mm/yyyy',
};

const ACCOUNT_LABELS: Record<string, string> = { account1: 'חשבון 1', account2: 'חשבון 2' };
const STATUS_LABELS: Record<string, string> = { listed: 'מוצגת', hidden: 'מוסתרת', merged: 'אוחדה' };

function cellValue(kind: Kind, value: any): any {
  if (value === null || value === undefined || value === '') return null;
  switch (kind) {
    case 'datetime':
    case 'date':
      return excelDate(String(value));
    case 'pct':
      return Number(value) / 100; // the API sends 4.5 for 4.5%
    case 'int':
    case 'num':
    case 'money':
      return Number(value);
    case 'bool':
      return value ? 'כן' : 'לא';
    case 'channel':
      return CHANNEL_LABELS[value] ?? value;
    case 'url':
      return { text: value, hyperlink: value };
    default:
      return String(value);
  }
}

const PARTY_COLUMNS: Column[] = [
  { key: 'partyName', header: 'מסיבה', kind: 'text', width: 40 },
  { key: 'partyDate', header: 'תאריך המסיבה', kind: 'datetime', width: 17 },
  { key: 'status', header: 'סטטוס באתר', kind: 'text', width: 11 },
  { key: 'accounts', header: 'חשבון', kind: 'text', width: 18 },
  { key: 'region', header: 'אזור', kind: 'text', width: 12 },
  { key: 'location', header: 'מקום', kind: 'text', width: 22 },
  { key: 'musicType', header: 'סגנון', kind: 'text', width: 12 },
  { key: 'ticketPrice', header: 'מחיר כרטיס', kind: 'money', width: 11 },
  { key: 'views', header: 'צפיות באתר', kind: 'int', width: 11 },
  { key: 'uniqueViewers', header: 'צופים ייחודיים', kind: 'int', width: 12 },
  { key: 'botViews', header: 'מתוכן בוטים', kind: 'int', width: 11 },
  { key: 'clicks', header: 'קליקים לרכישה', kind: 'int', width: 12 },
  { key: 'uniqueClickers', header: 'מקליקים ייחודיים', kind: 'int', width: 13 },
  { key: 'clickRate', header: 'שיעור קליק', kind: 'pct', width: 10 },
  { key: 'tickets', header: 'כרטיסים', kind: 'int', width: 9 },
  { key: 'ticketsPerClick', header: 'כרטיסים לקליק', kind: 'pct', width: 12 },
  { key: 'commission', header: 'עמלה שלנו', kind: 'money', width: 12 },
  { key: 'commissionPer100Views', header: 'עמלה ל-100 צפיות', kind: 'money', width: 14 },
  { key: 'gross', header: 'מחזור (גו-אאוט)', kind: 'money', width: 13 },
  { key: 'goOutViews', header: 'צפיות בגו-אאוט (מצטבר)', kind: 'int', width: 16 },
  { key: 'goOutAccepted', header: 'אושרו בגו-אאוט (מצטבר)', kind: 'int', width: 16 },
  { key: 'goOutPending', header: 'ממתינים (מצטבר)', kind: 'int', width: 13 },
  { key: 'goOutRejected', header: 'נדחו (מצטבר)', kind: 'int', width: 11 },
  { key: 'goOutAbandoned', header: 'נטשו בקופה (מצטבר)', kind: 'int', width: 15 },
  { key: 'goOutGross', header: 'מחזור גו-אאוט (מצטבר)', kind: 'money', width: 16 },
  { key: 'lifetimeTickets', header: 'כרטיסים שלנו (מצטבר)', kind: 'int', width: 15 },
  { key: 'lifetimeCommission', header: 'עמלה שלנו (מצטבר)', kind: 'money', width: 15 },
  { key: 'goOutEventId', header: 'מזהה גו-אאוט', kind: 'text', width: 11 },
  { key: 'siteUrl', header: 'קישור', kind: 'url', width: 45 },
];

const SALE_COLUMNS: Column[] = [
  { key: 'recordedAt', header: 'זמן רישום המכירה', kind: 'datetime', width: 17 },
  { key: 'source', header: 'נרשם ע"י', kind: 'text', width: 12 },
  { key: 'account', header: 'חשבון', kind: 'text', width: 10 },
  { key: 'partyName', header: 'מסיבה', kind: 'text', width: 40 },
  { key: 'partyDate', header: 'תאריך המסיבה', kind: 'datetime', width: 17 },
  { key: 'daysBeforeParty', header: 'ימים לפני המסיבה', kind: 'num', width: 13 },
  { key: 'tickets', header: 'כרטיסים', kind: 'int', width: 9 },
  { key: 'ticketPrice', header: 'מחיר כרטיס', kind: 'money', width: 11 },
  { key: 'grossDelta', header: 'מחזור (גו-אאוט)', kind: 'money', width: 13 },
  { key: 'commission', header: 'עמלה שלנו', kind: 'money', width: 11 },
  { key: 'clicks24hBefore', header: 'קליקים ב-24 שעות לפני', kind: 'int', width: 16 },
  { key: 'lastClickAt', header: 'קליק אחרון לפני', kind: 'datetime', width: 17 },
  { key: 'minutesFromLastClick', header: 'דקות מהקליק', kind: 'int', width: 11 },
  { key: 'lastClickChannel', header: 'ערוץ הקליק האחרון', kind: 'channel', width: 15 },
  { key: 'lastClickSource', header: 'מקור (utm)', kind: 'text', width: 12 },
  { key: 'lastClickCampaign', header: 'קמפיין', kind: 'text', width: 14 },
  { key: 'lastClickDevice', header: 'מכשיר', kind: 'text', width: 9 },
  { key: 'corrected', header: 'תוקן ידנית', kind: 'bool', width: 10 },
  { key: 'goOutEventId', header: 'מזהה גו-אאוט', kind: 'text', width: 11 },
];

const CLICK_COLUMNS: Column[] = [
  { key: 'clickedAt', header: 'זמן הקליק', kind: 'datetime', width: 17 },
  { key: 'partyName', header: 'מסיבה', kind: 'text', width: 40 },
  { key: 'partyDate', header: 'תאריך המסיבה', kind: 'datetime', width: 17 },
  { key: 'channel', header: 'ערוץ', kind: 'channel', width: 14 },
  { key: 'source', header: 'מקור (utm)', kind: 'text', width: 12 },
  { key: 'medium', header: 'מדיום', kind: 'text', width: 10 },
  { key: 'campaign', header: 'קמפיין', kind: 'text', width: 14 },
  { key: 'referrerHost', header: 'הגיע מאתר', kind: 'text', width: 20 },
  { key: 'landingPath', header: 'עמוד נחיתה', kind: 'text', width: 30 },
  { key: 'device', header: 'מכשיר', kind: 'text', width: 9 },
  { key: 'waCode', header: 'קוד וואטסאפ', kind: 'text', width: 11 },
  { key: 'session', header: 'סשן', kind: 'text', width: 10 },
  { key: 'saleWithin24h', header: 'מכירה ב-24 שעות אחרי', kind: 'bool', width: 16 },
];

const DAILY_COLUMNS: Column[] = [
  { key: 'day', header: 'יום', kind: 'date', width: 12 },
  { key: 'views', header: 'צפיות', kind: 'int', width: 10 },
  { key: 'clicks', header: 'קליקים לרכישה', kind: 'int', width: 12 },
  { key: 'clickRate', header: 'שיעור קליק', kind: 'pct', width: 10 },
  { key: 'tickets', header: 'כרטיסים', kind: 'int', width: 9 },
  { key: 'commission', header: 'עמלה שלנו', kind: 'money', width: 12 },
  { key: 'gross', header: 'מחזור (גו-אאוט)', kind: 'money', width: 13 },
];

const PARTY_DAILY_COLUMNS: Column[] = [
  { key: 'day', header: 'יום', kind: 'date', width: 12 },
  { key: 'partyName', header: 'מסיבה', kind: 'text', width: 40 },
  { key: 'views', header: 'צפיות', kind: 'int', width: 10 },
  { key: 'clicks', header: 'קליקים לרכישה', kind: 'int', width: 12 },
  { key: 'tickets', header: 'כרטיסים', kind: 'int', width: 9 },
  { key: 'commission', header: 'עמלה שלנו', kind: 'money', width: 12 },
];

const CHANNEL_COLUMNS: Column[] = [
  { key: 'channel', header: 'ערוץ', kind: 'channel', width: 18 },
  { key: 'views', header: 'צפיות', kind: 'int', width: 10 },
  { key: 'clicks', header: 'קליקים לרכישה', kind: 'int', width: 12 },
  { key: 'clickRate', header: 'שיעור קליק', kind: 'pct', width: 10 },
  { key: 'salesAfterClick', header: 'מכירות שזה הקליק האחרון לפניהן', kind: 'int', width: 22 },
  { key: 'ticketsAfterClick', header: 'כרטיסים', kind: 'int', width: 9 },
  { key: 'commissionAfterClick', header: 'עמלה', kind: 'money', width: 12 },
];

const GOOUT_DAILY_COLUMNS: Column[] = [
  { key: 'day', header: 'יום (לפי גו-אאוט)', kind: 'date', width: 14 },
  { key: 'partyName', header: 'מסיבה', kind: 'text', width: 40 },
  { key: 'account', header: 'חשבון', kind: 'text', width: 10 },
  { key: 'tickets', header: 'כרטיסים שנמכרו', kind: 'int', width: 13 },
  { key: 'goOutEventId', header: 'מזהה גו-אאוט', kind: 'text', width: 11 },
];

function relabel(row: any): any {
  const out = { ...row };
  if (out.account) out.account = ACCOUNT_LABELS[out.account] ?? out.account;
  if (out.accounts) out.accounts = String(out.accounts).split(', ').map((a) => ACCOUNT_LABELS[a] ?? a).join(', ');
  if (out.status) out.status = STATUS_LABELS[out.status] ?? out.status;
  return out;
}

function addTable(wb: any, name: string, columns: Column[], rows: any[]) {
  const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 14, style: FORMATS[c.kind] ? { numFmt: FORMATS[c.kind] } : {} }));
  for (const raw of rows) {
    const row = relabel(raw);
    ws.addRow(Object.fromEntries(columns.map((c) => [c.key, cellValue(c.kind, row[c.key])])));
  }
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: 'middle', wrapText: true };
  header.height = 32;
  if (columns.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

function rangeLabel(range: ExportData['range']): string {
  const fmt = (d: string) => d.split('-').reverse().join('/');
  return range.from ? `${fmt(range.from)} – ${fmt(range.to)}` : `כל הזמן (עד ${fmt(range.to)})`;
}

function addSummary(wb: any, data: ExportData) {
  const ws = wb.addWorksheet('סיכום', { views: [{ rightToLeft: true }] });
  ws.columns = [{ width: 34 }, { width: 18 }, { width: 14 }, { width: 14 }];
  const t = data.totals;
  const line = (label: string, value: any, numFmt?: string) => {
    const row = ws.addRow([label, value]);
    if (numFmt) row.getCell(2).numFmt = numFmt;
    return row;
  };
  ws.addRow(['ייצוא נתונים — Parties 24/7']).font = { bold: true, size: 14 };
  line('טווח', rangeLabel(data.range));
  line('הופק', excelDate(data.range.generatedAt), FORMATS.datetime);
  ws.addRow([]);
  line('צפיות במסיבות באתר', t.views, FORMATS.int);
  line('מתוכן בוטים', t.botViews, FORMATS.int);
  line('קליקים לרכישה (מעבר לגו-אאוט)', t.clicks, FORMATS.int);
  line('שיעור קליק', t.clickRate == null ? null : t.clickRate / 100, FORMATS.pct);
  line('כרטיסים שנמכרו', t.tickets, FORMATS.int);
  line('כרטיסים לקליק', t.ticketsPerClick == null ? null : t.ticketsPerClick / 100, FORMATS.pct);
  line('עמלה שלנו', t.commission, FORMATS.money);
  line('מחזור בגו-אאוט', t.gross, FORMATS.money);
  line('מסיבות עם פעילות', t.parties, FORMATS.int);
  ws.addRow([]);
  ws.addRow(['חשבון', 'כרטיסים', 'עמלה', 'מחזור']).font = { bold: true };
  for (const a of t.byAccount) {
    const row = ws.addRow([ACCOUNT_LABELS[a.account] ?? a.account, a.tickets, a.commission, a.gross]);
    row.getCell(2).numFmt = FORMATS.int;
    row.getCell(3).numFmt = FORMATS.money;
    row.getCell(4).numFmt = FORMATS.money;
  }
  ws.addRow([]);
  ws.addRow(['איך לקרוא את הקובץ']).font = { bold: true };
  const notes = [
    'הטווח לפי ימים בשעון ישראל, כולל היום האחרון. הוא חל על מתי הייתה הצפייה, הקליק או המכירה — לא על תאריך המסיבה.',
    'כל השעות בשעון ישראל.',
    'צפיות: מקובצות לפי מסיבה ויום (גיליונות "לפי יום" ו"מסיבה לפי יום"), בלי שורה לכל צפייה. בוטים נספרים כמו בדשבורד ומופיעים גם בנפרד.',
    'קליקים לרכישה: כל לחיצה על כפתור הרכישה, שורה לכל קליק.',
    'מכירות: כל שורה היא מכירה שנרשמה. "זמן רישום" הוא מתי המערכת ראתה אותה — בדיקה כל 20 דקות, או כל 4 שעות בשורות "4h run". היום המדויק של המכירה לפי גו-אאוט נמצא בגיליון "מכירות גו-אאוט ליום".',
    '"קליקים ב-24 שעות לפני" ו"הקליק האחרון" מחברים כל מכירה לקליקים שקדמו לה באותה מסיבה. זה רמז, לא שיוך ודאי — גו-אאוט לא מוסרת מאיפה הגיע כל קונה.',
    'עמודות "מצטבר" הן מוני גו-אאוט לכל חיי האירוע, נכון לרגע הייצוא, ולא מוגבלות לטווח.',
    'עמלה שלנו: חשבון 1 = ₪15 לכרטיס (₪25 עד ספטמבר 2026), חשבון 2 = 6% מהמחזור. מסיבה שאוחדה לכפילות נספרת תחת המסיבה שנשארה.',
    'לא נכללים פרטי קונים, כתובות IP או מזהי דפדפן.',
  ];
  for (const n of notes) {
    const row = ws.addRow([n]);
    ws.mergeCells(row.number, 1, row.number, 4);
    row.alignment = { wrapText: true, vertical: 'top' };
    row.height = 48;
  }
}

export async function buildWorkbook(data: ExportData): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Parties 24/7';
  wb.created = new Date();
  addSummary(wb, data);
  addTable(wb, 'מסיבות', PARTY_COLUMNS, data.parties);
  addTable(wb, 'מכירות', SALE_COLUMNS, data.sales);
  addTable(wb, 'קליקים לרכישה', CLICK_COLUMNS, data.clicks);
  addTable(wb, 'לפי יום', DAILY_COLUMNS, data.daily);
  addTable(wb, 'מסיבה לפי יום', PARTY_DAILY_COLUMNS, data.partyDaily);
  addTable(wb, 'ערוצים', CHANNEL_COLUMNS, data.channels);
  addTable(wb, 'מכירות גו-אאוט ליום', GOOUT_DAILY_COLUMNS, data.goOutDaily);
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function exportFileName(range: ExportData['range']): string {
  return `parties247_${range.from ?? 'all'}_${range.to}.xlsx`;
}
