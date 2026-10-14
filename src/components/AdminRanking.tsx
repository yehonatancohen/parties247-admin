"use client"
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CommissionDeal, CommissionType, RankedParty, RankingResponse, getRanking, setPartyCommission } from '@/services/ranking';

const SITE_URL = 'https://www.parties247.co.il';

const btn = 'h-10 px-3 text-[15px] font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary = `${btn} bg-jungle-accent border-jungle-accent text-white hover:bg-opacity-85`;
const btnQuiet = `${btn} border-wood-brown text-jungle-text hover:bg-white/5`;
const field = 'h-10 bg-jungle-deep border border-wood-brown px-2 text-[15px] focus:outline-none focus:border-jungle-accent';

const money = (n: number | null | undefined, digits = 2) =>
  typeof n === 'number' ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: digits })}` : '-';

// Backend dates are Israel wall-clock without an offset; format them as written.
const when = (iso: string | null) => {
  if (!iso) return '-';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return iso;
  const weekday = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('he-IL', { weekday: 'short' });
  return `${weekday} ${m[3]}.${m[2]}${m[4] ? ` · ${m[4]}:${m[5]}` : ''}`;
};

type Mode = 'default' | CommissionType;

const defaultLabel = (party: RankedParty, defaults: RankingResponse['defaults']) =>
  party.tier === 'account1'
    ? `ברירת מחדל: ${money(defaults.account1FlatFee)} לכרטיס (חשבון 1)`
    : `ברירת מחדל: ${defaults.account2Percent}% מהמחיר (חשבון 2)`;

const CommissionEditor: React.FC<{
  party: RankedParty;
  defaults: RankingResponse['defaults'];
  onSave: (party: RankedParty, deal: CommissionDeal | null) => Promise<void>;
}> = ({ party, defaults, onSave }) => {
  const [mode, setMode] = useState<Mode>(party.commission?.type ?? 'default');
  const [value, setValue] = useState(party.commission ? String(party.commission.value) : '');
  const [busy, setBusy] = useState(false);

  const parsed = Number(value);
  const valid = mode === 'default' || (value.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && (mode === 'fixed' || parsed <= 100));
  const current: Mode = party.commission?.type ?? 'default';
  const dirty = mode !== current || (mode !== 'default' && parsed !== party.commission?.value);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(party, mode === 'default' ? null : { type: mode, value: parsed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (valid && dirty) save(); }}>
      <label className="sr-only" htmlFor={`mode-${party.partyId}`}>סוג עמלה</label>
      <select id={`mode-${party.partyId}`} value={mode} onChange={(e) => setMode(e.target.value as Mode)} className={field}>
        <option value="default">ברירת מחדל</option>
        <option value="fixed">₪ לכרטיס</option>
        <option value="percent">% ממחיר הכרטיס</option>
      </select>
      {mode !== 'default' && (
        <>
          <label className="sr-only" htmlFor={`value-${party.partyId}`}>{mode === 'fixed' ? 'שקלים לכרטיס' : 'אחוז ממחיר הכרטיס'}</label>
          <input
            id={`value-${party.partyId}`}
            type="number"
            inputMode="decimal"
            min={0}
            max={mode === 'percent' ? 100 : undefined}
            step="0.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`${field} w-24 tabular-nums`}
          />
          <span className="text-sm text-ink-dim">{mode === 'fixed' ? '₪' : '%'}</span>
        </>
      )}
      <button type="submit" disabled={busy || !valid || !dirty} className={dirty ? btnPrimary : btnQuiet}>
        {busy ? 'שומר…' : 'לשמור'}
      </button>
      {mode === 'default' && <span className="basis-full text-xs text-ink-dim">{defaultLabel(party, defaults)}</span>}
    </form>
  );
};

const PartyRow: React.FC<{
  party: RankedParty;
  defaults: RankingResponse['defaults'];
  onSave: (party: RankedParty, deal: CommissionDeal | null) => Promise<void>;
}> = ({ party, defaults, onSave }) => (
  <li className="border border-wood-brown bg-jungle-surface">
    <div className="flex gap-3 p-3">
      <span className="w-8 shrink-0 pt-0.5 text-lg font-bold tabular-nums text-ink-dim">{party.position}</span>
      {party.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={party.imageUrl} alt="" loading="lazy" className="h-20 w-16 shrink-0 bg-ink-cell object-cover" />
      ) : <div className="h-20 w-16 shrink-0 bg-ink-cell" />}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={`px-1.5 py-0.5 font-bold ${party.tier === 'account1' ? 'bg-ink-sales text-jungle-deep' : 'bg-ink-cell text-ink-dim'}`}>
            {party.tier === 'account1' ? 'חשבון 1' : 'חשבון 2'}
          </span>
          {party.commission && <span className="px-1.5 py-0.5 border border-ink-sales text-ink-sales">עמלה מותאמת</span>}
          {party.soldOut && <span className="px-1.5 py-0.5 bg-ink-cell text-ink-dim">אזל</span>}
        </div>
        {party.slug ? (
          <a href={`${SITE_URL}/event/${party.slug}`} target="_blank" rel="noopener noreferrer" className="block font-semibold leading-snug break-words hover:underline underline-offset-2">
            {party.name}
          </a>
        ) : <p className="font-semibold leading-snug break-words">{party.name}</p>}
        <p className="text-sm text-ink-dim">{when(party.date)} · מחיר {money(party.ticketPrice, 0)}</p>
      </div>
    </div>
    <dl className="grid grid-cols-2 border-t border-wood-brown text-sm sm:grid-cols-4">
      <div className="p-3">
        <dt className="text-xs text-ink-dim">אנחנו מקבלים לכרטיס</dt>
        <dd className="font-semibold tabular-nums text-ink-sales">
          {money(party.perTicket)}{party.perTicketEstimated && <span className="block text-xs font-normal text-ink-dim">הערכה, אין מחיר</span>}
        </dd>
      </div>
      <div className="p-3 border-r border-wood-brown">
        <dt className="text-xs text-ink-dim">צפיות · קליקים · כרטיסים</dt>
        <dd className="font-semibold tabular-nums">
          <span className="text-ink-view">{party.views}</span> · <span className="text-ink-click">{party.redirects}</span> · <span className="text-ink-sales">{party.tickets}</span>
        </dd>
      </div>
      <div className="p-3 border-t border-wood-brown sm:border-t-0 sm:border-r">
        <dt className="text-xs text-ink-dim">סיכוי קנייה</dt>
        <dd className="font-semibold tabular-nums">{party.ticketsPer100Views.toLocaleString('he-IL', { maximumFractionDigits: 2 })} כרטיסים ל-100 צפיות</dd>
      </div>
      <div className="p-3 border-t border-r border-wood-brown sm:border-t-0">
        <dt className="text-xs text-ink-dim">ציון (₪ ל-100 צפיות)</dt>
        <dd className="font-semibold tabular-nums">{money(party.score)}</dd>
      </div>
    </dl>
    <div className="border-t border-wood-brown p-3">
      <CommissionEditor key={`${party.partyId}-${party.commission?.type ?? 'd'}-${party.commission?.value ?? ''}`} party={party} defaults={defaults} onSave={onSave} />
    </div>
  </li>
);

const AdminRanking: React.FC = () => {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const next = await getRanking();
      setData(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'הטעינה נכשלה');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    getRanking()
      .then((next) => { if (alive) setData(next); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'הטעינה נכשלה'); });
    return () => { alive = false; };
  }, []);

  const save = async (party: RankedParty, deal: CommissionDeal | null) => {
    setError(null);
    setNotice(null);
    try {
      await setPartyCommission(party.partyId, deal);
      await load();
      setNotice(deal
        ? `״${party.name}״: ${deal.type === 'fixed' ? `${money(deal.value)} לכרטיס` : `${deal.value}% מהמחיר`}.`
        : `״${party.name}״ חזרה לעמלת ברירת המחדל.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'השמירה נכשלה');
    }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.parties ?? []).filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">דירוג ועמלות</h1>
        <p className="max-w-3xl text-sm text-ink-dim">
          הסדר באתר = כמה אנחנו מקבלים לכרטיס × כמה סביר שמי שנכנס למסיבה יקנה. בתוך כל לילה מסיבות עם ציון גבוה מוצגות ראשונות,
          ובקיר הפליירים בעמוד הבית הדירוג קובע את הסדר. שינוי עמלה כאן משנה את הדירוג, את טיוטות הוואטסאפ ואת הבחירה בין כפילויות.
          ההכנסות שכבר נרשמו באנליטיקס לא משתנות. האתר מתעדכן תוך כמה דקות.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="ranking-search">חיפוש מסיבה</label>
        <input id="ranking-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי שם"
          className={`${field} w-full sm:w-72`} />
        <button type="button" onClick={load} className={btnQuiet}>לרענן</button>
      </div>

      {error && <p role="alert" className="border border-ink-click p-3 text-sm text-ink-click">{error}</p>}
      {notice && <p role="status" className="border border-ink-sales p-3 text-sm text-ink-sales">{notice}</p>}

      {!data ? (error ? null : <LoadingSpinner />) : shown.length === 0 ? (
        <p className="border border-wood-brown p-6 text-center text-ink-dim">{query ? 'אין מסיבה בשם הזה.' : 'אין מסיבות קרובות.'}</p>
      ) : (
        <ol className="grid gap-3 xl:grid-cols-2">
          {shown.map((party) => (
            <PartyRow key={party.partyId} party={party} defaults={data.defaults} onSave={save} />
          ))}
        </ol>
      )}
    </div>
  );
};

export default AdminRanking;
