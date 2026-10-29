"use client";

import React, { useMemo, useState } from 'react';
import { Panel, Segmented } from './analytics/ui';
import { getExportData } from '../services/api';
import { ExportPreset, israelToday, monthOptions, resolveRange } from '../lib/exportRange';
import { buildWorkbook, exportFileName } from '../lib/exportWorkbook';

const btn = 'h-12 px-5 text-[15px] font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary = `${btn} bg-jungle-accent border-jungle-accent text-white hover:bg-opacity-85`;
const field = 'h-10 bg-jungle-deep border border-wood-brown px-2 text-[15px] focus:outline-none focus:border-jungle-accent';

const PRESETS: { value: ExportPreset; label: string }[] = [
  { value: '7d', label: '7 ימים' },
  { value: '30d', label: '30 ימים' },
  { value: 'month', label: 'חודש' },
  { value: 'year', label: 'השנה' },
  { value: 'all', label: 'כל הזמן' },
  { value: 'custom', label: 'תאריכים' },
];

const monthName = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('he-IL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const showDay = (day: string) => day.split('-').reverse().join('/');

const SHEETS = [
  ['סיכום', 'סה"כ צפיות, קליקים, כרטיסים ועמלה, לפי חשבון, והסבר על כל עמודה'],
  ['מסיבות', 'שורה לכל מסיבה: צפיות, צופים ייחודיים, קליקים, כרטיסים, עמלה, שיעורי מעבר, ומוני גו-אאוט (צפיות, נטישות בקופה)'],
  ['מכירות', 'שורה לכל מכירה, עם הקליקים שקדמו לה: כמה, מתי הקליק האחרון, מאיזה ערוץ וקמפיין'],
  ['קליקים לרכישה', 'שורה לכל לחיצה על כפתור הרכישה: זמן, ערוץ, utm, עמוד נחיתה, מכשיר, והאם הגיעה מכירה ב-24 שעות'],
  ['לפי יום', 'צפיות, קליקים, כרטיסים ועמלה בכל יום'],
  ['מסיבה לפי יום', 'אותו דבר לכל מסיבה בכל יום'],
  ['ערוצים', 'צפיות וקליקים לפי ערוץ, ומכירות לפי ערוץ הקליק האחרון'],
  ['מכירות גו-אאוט ליום', 'כמה כרטיסים נמכרו בכל יום לפי הרישום של גו-אאוט עצמה'],
];

const AdminExport: React.FC = () => {
  const today = israelToday();
  const months = useMemo(() => monthOptions(), []);
  const [preset, setPreset] = useState<ExportPreset>('30d');
  const [month, setMonth] = useState(months[0]);
  const [customFrom, setCustomFrom] = useState(`${today.slice(0, 7)}-01`);
  const [customTo, setCustomTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const range = resolveRange(preset, { month, customFrom, customTo });
  const rangeText = range.from ? `${showDay(range.from)} – ${showDay(range.to)}` : `מתחילת המעקב ועד ${showDay(range.to)}`;

  const run = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const data = await getExportData(range.from, range.to);
      const blob = await buildWorkbook(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName(data.range);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      const t = data.totals;
      setDone(`הורד: ${t.parties} מסיבות, ${t.salesRows} מכירות (${t.tickets} כרטיסים), ${data.clicks.length} קליקים.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'הייצוא נכשל');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">ייצוא לאקסל</h1>
        <p className="max-w-3xl text-sm text-ink-dim">
          בוחרים טווח ומורידים קובץ אקסל עם כל מה שקרה בו: צפיות (מקובצות לפי מסיבה ויום), כל קליק לרכישה וכל מכירה,
          כשכל מכירה מחוברת לקליקים שקדמו לה. השעות והימים בשעון ישראל.
        </p>
      </div>

      <Panel title="טווח" note={rangeText}>
        <div className="space-y-4">
          <Segmented label="טווח הייצוא" options={PRESETS} value={preset} onChange={setPreset} className="max-w-3xl" />

          {preset === 'month' && (
            <div className="flex items-center gap-2">
              <label htmlFor="export-month" className="text-sm text-ink-dim">חודש</label>
              <select id="export-month" value={month} onChange={(e) => setMonth(e.target.value)} className={`${field} w-48`}>
                {months.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
              </select>
            </div>
          )}

          {preset === 'custom' && (
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-ink-dim">
                מתאריך
                <input type="date" value={customFrom} max={today} onChange={(e) => setCustomFrom(e.target.value)} className={field} />
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-dim">
                עד תאריך (כולל)
                <input type="date" value={customTo} max={today} onChange={(e) => setCustomTo(e.target.value)} className={field} />
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={run} disabled={busy} className={btnPrimary}>
              {busy ? 'מכין את הקובץ…' : 'ייצוא לאקסל'}
            </button>
            {busy && <span className="text-sm text-ink-dim">טווח ארוך יכול לקחת עד חצי דקה.</span>}
          </div>
          {done && <p className="text-sm text-ink-sales" role="status">{done}</p>}
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        </div>
      </Panel>

      <Panel title="מה יש בקובץ">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr] text-sm">
          {SHEETS.map(([name, desc]) => (
            <React.Fragment key={name}>
              <dt className="font-semibold">{name}</dt>
              <dd className="text-ink-dim -mt-2 sm:mt-0">{desc}</dd>
            </React.Fragment>
          ))}
        </dl>
      </Panel>
    </div>
  );
};

export default AdminExport;
