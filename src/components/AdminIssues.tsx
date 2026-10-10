"use client";

import React, { useCallback, useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { Segmented } from './analytics/ui';
import {
  getHiddenListings, getListingChanges, getListingIssues, resolveListingIssue, setListingStatus,
  IssueDecision, ListingCard, ListingChange, ListingIssue, ListingIssuesResponse,
} from '../services/listings';

type View = 'open' | 'changes' | 'hidden';

const SITE_URL = 'https://www.parties247.co.il';

const TYPE_LABELS: Record<string, string> = {
  duplicate: 'אותה מסיבה?',
  zero_tier: 'כרטיס ב-₪0',
  location_vague: 'אין מיקום',
  title_date: 'תאריך בכותרת',
  source_gone: 'העמוד בגו-אאוט נעלם',
  price_unverified: 'מחיר לא מאומת',
  stale_sync: 'לא מסונכרן',
  site_render: 'האתר לא תואם',
  test_listing: 'אירוע בדיקה?',
  price_suspicious: 'מחיר חשוד',
};

const FIELD_LABELS: Record<string, string> = {
  name: 'שם', date: 'תאריך', location: 'מיקום', imageUrl: 'תמונה', description: 'תיאור',
  ticketPrice: 'מחיר', soldOut: 'אזל', region: 'אזור', areas: 'אזורים', listingStatus: 'סטטוס',
};

const STATE_LABELS: Record<string, string> = {
  on_sale: 'במכירה', coming_soon: 'מכירה בקרוב', sold_out: 'אזל', closed: 'מכירה סגורה',
};

const TIER_LABELS: Record<string, string> = {
  ACTIVE: 'פעיל', COMING_SOON: 'בקרוב', SOLD_OUT: 'אזל', NOT_ACTIVE: 'סגור',
};

const HIDDEN_REASONS: Record<string, string> = {
  private: 'אירוע פרטי בגו-אאוט', admin: 'הוסתר ידנית',
};

const money = (n: number | null | undefined) =>
  typeof n === 'number' ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 2 })}` : '-';

// GoOut dates are Israel wall-clock without an offset; format them as written.
const when = (iso: string | null | undefined) => {
  if (!iso) return '-';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return iso;
  const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const weekday = day.toLocaleDateString('he-IL', { weekday: 'short' });
  return `${weekday} ${m[3]}.${m[2]}${m[4] ? ` · ${m[4]}:${m[5]}` : ''}`;
};

const stamp = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

const show = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'כן' : 'לא';
  if (Array.isArray(value)) return value.join(', ') || '-';
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
};

const btn = 'h-11 px-4 text-[15px] font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary = `${btn} bg-jungle-accent border-jungle-accent text-white hover:bg-opacity-85`;
const btnQuiet = `${btn} border-wood-brown text-jungle-text hover:bg-white/5`;

const PartyCard: React.FC<{ card: ListingCard; suggested?: boolean; action?: React.ReactNode }> = ({ card, suggested, action }) => {
  const info = card.priceInfo;
  return (
    <div className={`flex flex-col border ${suggested ? 'border-ink-sales' : 'border-wood-brown'} bg-jungle-surface`}>
      <div className="flex gap-3 p-3">
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt="" loading="lazy" className="w-20 h-24 object-cover shrink-0 bg-ink-cell" />
        ) : <div className="w-20 h-24 shrink-0 bg-ink-cell" />}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={`px-1.5 py-0.5 font-bold ${card.account === 'account1' ? 'bg-ink-sales text-jungle-deep' : 'bg-ink-cell text-ink-dim'}`}>
              {card.account === 'account1' ? 'חשבון 1' : 'חשבון 2'}
            </span>
            {card.source.producersName && <span className="text-ink-dim truncate">{card.source.producersName}</span>}
          </div>
          <p className="font-semibold leading-snug break-words">{card.source.title || card.name}</p>
          <p className="text-sm text-ink-dim">{when(card.source.startsAt || card.date)}</p>
          <p className="text-sm text-ink-dim break-words">{card.source.address || card.location || '-'}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 border-t border-wood-brown text-sm">
        <div className="p-3">
          <dt className="text-xs text-ink-dim">מחיר באתר</dt>
          <dd className="font-semibold tabular-nums">
            {info?.onlyFree ? 'כניסה חופשית' : money(card.ticketPrice)}
            {info?.hasFree && !info.onlyFree && <span className="block text-xs font-normal text-ink-dim">+ {info.freeLabel}</span>}
          </dd>
        </div>
        <div className="p-3 border-r border-wood-brown">
          <dt className="text-xs text-ink-dim">עמלה שנצברה</dt>
          <dd className={`font-semibold tabular-nums ${card.commission > 0 ? 'text-ink-sales' : ''}`}>{money(card.commission)}</dd>
        </div>
      </dl>
      {card.source.tiers && card.source.tiers.length > 0 && (
        <ul className="border-t border-wood-brown px-3 py-2 text-xs text-ink-dim space-y-0.5">
          {card.source.tiers.map((tier, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate">{tier.name || 'כרטיס'}</span>
              <span className="shrink-0 tabular-nums">{money(tier.final)} · {TIER_LABELS[tier.display] ?? tier.display}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-wood-brown p-3">
        <span className="flex gap-3 text-sm">
          {card.slug && card.listingStatus === 'live' && (
            <a href={`${SITE_URL}/event/${card.slug}`} target="_blank" rel="noopener noreferrer" className="text-ink-view underline underline-offset-2">באתר</a>
          )}
          {card.canonicalUrl && (
            <a href={card.canonicalUrl} target="_blank" rel="noopener noreferrer" className="text-ink-view underline underline-offset-2">בגו-אאוט</a>
          )}
        </span>
        {action}
      </div>
    </div>
  );
};

const IssueCard: React.FC<{ issue: ListingIssue; onResolve: (issue: ListingIssue, decision: IssueDecision) => Promise<void> }> = ({ issue, onResolve }) => {
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const [location, setLocation] = useState('');
  const act = async (decision: IssueDecision) => {
    setBusy(true);
    try { await onResolve(issue, decision); } finally { setBusy(false); }
  };
  const evidence = issue.evidence;
  const isPair = issue.type === 'duplicate' && issue.parties.length === 2;

  return (
    <article className="border border-wood-brown">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-wood-brown px-3 py-2">
        <h2 className="font-bold">{TYPE_LABELS[issue.type] ?? issue.type}</h2>
        <span className="text-xs text-ink-dim">מאז {stamp(issue.firstSeen)}</span>
      </header>

      <div className="p-3 space-y-3">
        {issue.type === 'duplicate' && (
          <p className="text-sm text-ink-dim">
            {evidence.level === 'certain' ? 'אותה כותרת או אותו פלייר, באותה שעה.' : 'אותו מקום באותה שעה, או שם דומה.'}
            {typeof evidence.distance === 'number' && ` מרחק ${evidence.distance} מ׳.`}
            {typeof evidence.hours === 'number' && evidence.hours > 0 && ` הפרש ${evidence.hours} שעות.`}
            {evidence.sameImage && ' אותו פלייר.'}
          </p>
        )}
        {issue.type === 'zero_tier' && (
          <p className="text-sm">
            יש כרטיס במחיר ₪0 בשם <b>״{evidence.tierName}״</b>. האם זו כניסה חופשית?
            <span className="block text-ink-dim">התשובה תחול על כל המסיבות עם כרטיס בשם הזה ({issue.parties.length} כרגע).</span>
          </p>
        )}
        {issue.type === 'title_date' && (
          <p className="text-sm">הכותרת בגו-אאוט מציינת תאריך אחר מתאריך האירוע ({when(evidence.startsAt)}). כנראה טעות של המפיק.</p>
        )}
        {issue.type === 'location_vague' && (
          <p className="text-sm">בגו-אאוט אין כתובת שימושית ({show(evidence.location)}). אפשר להקליד מיקום, והוא יינעל כך שהסנכרון לא ידרוס אותו.</p>
        )}
        {issue.type === 'source_gone' && <p className="text-sm">העמוד בגו-אאוט לא נטען פעמיים ברצף. ייתכן שהאירוע בוטל או הוסר.</p>}
        {issue.type === 'price_unverified' && <p className="text-sm">לא הצלחנו לקרוא את סוגי הכרטיסים שלוש פעמים ברצף. המחיר באתר הוא האחרון שנראה.</p>}
        {issue.type === 'test_listing' && <p className="text-sm">הכותרת בגו-אאוט נראית כמו אירוע בדיקה של מפיק.</p>}
        {issue.type === 'price_suspicious' && <p className="text-sm">המחיר באתר הוא ₪{show(evidence.ticketPrice)}. כדאי לבדוק מול גו-אאוט.</p>}
        {issue.type === 'stale_sync' && <p className="text-sm">המסיבה לא סונכרנה מול גו-אאוט ביממה האחרונה.</p>}
        {issue.type === 'site_render' && (
          <ul className="text-sm space-y-0.5">
            {'status' in evidence && <li>העמוד באתר החזיר {show(evidence.status)}.</li>}
            {evidence.price && <li>מחיר: באתר {money(evidence.price.site)}, במסד {money(evidence.price.db)}.</li>}
            {evidence.name && <li>שם: באתר ״{show(evidence.name.site)}״, במסד ״{show(evidence.name.db)}״.</li>}
            {evidence.redirectedTo && <li>העמוד מפנה לארכיון.</li>}
          </ul>
        )}

        <div className={`grid gap-3 ${issue.parties.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {(issue.type === 'zero_tier' ? issue.parties.slice(0, 2) : issue.parties).map((card) => (
            <PartyCard
              key={card.id}
              card={card}
              suggested={isPair && issue.suggestion?.keeperId === card.id}
              action={isPair ? (
                <button type="button" disabled={busy} onClick={() => act({ decision: 'keep', keeperId: card.id, remember })}
                  className={issue.suggestion?.keeperId === card.id ? btnPrimary : btnQuiet}>
                  אותה מסיבה, להשאיר את זו
                </button>
              ) : undefined}
            />
          ))}
        </div>

        {isPair && (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy} onClick={() => act({ decision: 'different', remember })} className={btnQuiet}>
              שתי מסיבות שונות
            </button>
            {evidence.seriesKey && evidence.level !== 'certain' && (
              <label className="flex items-center gap-2 text-sm text-ink-dim min-h-11">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-5 h-5 accent-jungle-accent" />
                לזכור לשבועות הבאים (אותו מקום, אותם מפיקים)
              </label>
            )}
          </div>
        )}
        {issue.type === 'zero_tier' && (
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => act({ decision: 'free' })} className={btnPrimary}>כן, כניסה חופשית</button>
            <button type="button" disabled={busy} onClick={() => act({ decision: 'not_free' })} className={btnQuiet}>לא, להתעלם מהכרטיס</button>
          </div>
        )}
        {issue.type === 'location_vague' && (
          <form className="flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); if (location.trim()) act({ decision: 'set', location: location.trim() }); }}>
            <label className="sr-only" htmlFor={`loc-${issue.id}`}>מיקום</label>
            <input id={`loc-${issue.id}`} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="שם המקום, עיר"
              className="h-11 flex-1 min-w-[200px] bg-jungle-surface border border-wood-brown px-3 text-[15px] focus:outline-none focus:border-jungle-accent" />
            <button type="submit" disabled={busy || !location.trim()} className={btnPrimary}>לשמור מיקום</button>
            <button type="button" disabled={busy} onClick={() => act({ decision: 'ignore' })} className={btnQuiet}>להשאיר כך</button>
          </form>
        )}
        {!isPair && issue.type !== 'zero_tier' && issue.type !== 'location_vague' && (
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => act({ decision: 'ignore' })} className={btnQuiet}>בסדר, להתעלם</button>
            {['source_gone', 'title_date', 'test_listing', 'price_suspicious'].includes(issue.type) && (
              <button type="button" disabled={busy} onClick={() => act({ decision: 'hide' })} className={btnQuiet}>להסתיר מהאתר</button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

const AdminIssues: React.FC = () => {
  const [view, setView] = useState<View>('open');
  const [data, setData] = useState<ListingIssuesResponse | null>(null);
  const [changes, setChanges] = useState<ListingChange[] | null>(null);
  const [hidden, setHidden] = useState<ListingCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (target: View) => {
    setError(null);
    try {
      if (target === 'open') setData(await getListingIssues('open'));
      if (target === 'changes') setChanges(await getListingChanges(24));
      if (target === 'hidden') setHidden(await getHiddenListings());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'הטעינה נכשלה');
    }
  }, []);

  useEffect(() => { load(view); }, [view, load]);

  const resolve = async (issue: ListingIssue, decision: IssueDecision) => {
    setError(null);
    try {
      const result = await resolveListingIssue(issue.id, decision);
      setData((prev) => prev && { ...prev, waiting: result.waiting, issues: prev.issues.filter((i) => i.id !== issue.id) });
      setNotice('נשמר.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'השמירה נכשלה');
    }
  };

  const relist = async (card: ListingCard) => {
    setError(null);
    try {
      await setListingStatus(card.id, 'live');
      setHidden((prev) => prev && prev.filter((c) => c.id !== card.id));
      setNotice(`״${card.name}״ חזרה לאתר.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'הפעולה נכשלה');
    }
  };

  const audit = data?.lastAudit;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">בקרת מסיבות</h1>
          <p className="text-sm text-ink-dim">
            {audit
              ? `בדיקה אחרונה ${stamp(audit.at)}: ${audit.checked} מסיבות, ${audit.siteChecked} עמודים באתר, ${audit.merged} כפילויות אוחדו אוטומטית.`
              : 'הבדיקה היומית עוד לא רצה.'}
          </p>
        </div>
        <Segmented<View>
          label="תצוגה"
          size="sm"
          className="w-full sm:w-auto sm:min-w-[420px]"
          value={view}
          onChange={(v) => { setNotice(null); setView(v); }}
          options={[
            { value: 'open', label: `ממתין להחלטה${data ? ` (${data.waiting})` : ''}` },
            { value: 'changes', label: 'מה השתנה ב-24 שעות' },
            { value: 'hidden', label: 'לא מוצגות באתר' },
          ]}
        />
      </div>

      <p role="status" aria-live="polite" className={`text-sm ${error ? 'text-ink-click' : 'text-ink-sales'} ${error || notice ? '' : 'sr-only'}`}>
        {error || notice}
      </p>

      {view === 'open' && (
        !data ? (error ? null : <LoadingSpinner />) : data.issues.length === 0 ? (
          <p className="border border-wood-brown p-6 text-center text-ink-dim">אין כרגע שום דבר שמחכה להחלטה.</p>
        ) : (
          <div className="space-y-4">
            {data.issues.map((issue) => <IssueCard key={issue.id} issue={issue} onResolve={resolve} />)}
          </div>
        )
      )}

      {view === 'changes' && (
        !changes ? (error ? null : <LoadingSpinner />) : changes.length === 0 ? (
          <p className="border border-wood-brown p-6 text-center text-ink-dim">שום דבר לא השתנה ב-24 השעות האחרונות.</p>
        ) : (
          <div className="overflow-x-auto border border-wood-brown">
            <table className="w-full text-sm">
              <thead className="text-right text-ink-dim border-b border-wood-brown">
                <tr>
                  <th className="p-3 font-medium">מתי</th>
                  <th className="p-3 font-medium">מסיבה</th>
                  <th className="p-3 font-medium">שדה</th>
                  <th className="p-3 font-medium">היה</th>
                  <th className="p-3 font-medium">עכשיו</th>
                  <th className="p-3 font-medium">למה</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((c, i) => (
                  <tr key={i} className="border-t border-wood-brown align-top">
                    <td className="p-3 whitespace-nowrap tabular-nums text-ink-dim">{stamp(c.at)}</td>
                    <td className="p-3 min-w-[160px]">{c.partyName || c.partyId}</td>
                    <td className="p-3 whitespace-nowrap">{FIELD_LABELS[c.field] ?? c.field}</td>
                    <td className="p-3 text-ink-dim break-words">{c.field === 'ticketPrice' && typeof c.old === 'number' ? money(c.old) : show(c.old)}</td>
                    <td className="p-3 break-words">{c.field === 'ticketPrice' && typeof c.new === 'number' ? money(c.new) : show(c.new)}</td>
                    <td className="p-3 text-ink-dim">{c.reason === 'sync' ? 'סנכרון מגו-אאוט' : c.reason === 'admin' ? 'ידני' : show(c.reason)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {view === 'hidden' && (
        !hidden ? (error ? null : <LoadingSpinner />) : hidden.length === 0 ? (
          <p className="border border-wood-brown p-6 text-center text-ink-dim">כל המסיבות הקרובות מוצגות באתר.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {hidden.map((card) => (
              <PartyCard
                key={card.id}
                card={card}
                action={
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-ink-dim">
                      {card.listingStatus === 'merged' ? 'אוחדה לכפילות' : HIDDEN_REASONS[card.statusReason ?? ''] ?? 'מוסתרת'}
                      {card.priceInfo ? ` · ${STATE_LABELS[card.priceInfo.salesState] ?? ''}` : ''}
                    </span>
                    <button type="button" onClick={() => relist(card)} className={btnQuiet}>להחזיר לאתר</button>
                  </span>
                }
              />
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default AdminIssues;
