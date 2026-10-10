"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getHolidayCuration, getParties, getPartyCommission, saveHolidayCuration } from '../services/api';
import { Party, PartyCommission } from '../data/types';
import {
  HOLIDAYS, HolidayCuration, getHolidayWindow, partiesInWindow, previewHolidayList,
} from '../lib/holidays';
import { GhostButton, Panel, Skeleton } from './analytics/ui';

const SITE_URL = 'https://www.parties247.co.il';
const EMPTY: HolidayCuration = { partyIds: [], hiddenIds: [] };

const SLUGS = Object.keys(HOLIDAYS);

const shortDate = (ymd: string) => {
  const [, m, d] = ymd.split('-');
  return `${parseInt(d, 10)}.${parseInt(m, 10)}`;
};

// Party dates are naive Israel wall-clock strings: read the parts, don't convert.
const partyWhen = (date: string) => {
  const ymd = (date || '').slice(0, 10);
  const time = (date || '').slice(11, 16);
  return ymd ? `${shortDate(ymd)}${time ? ` · ${time}` : ''}` : '';
};

const sameCuration = (a: HolidayCuration, b: HolidayCuration) =>
  a.partyIds.join(',') === b.partyIds.join(',') && a.hiddenIds.join(',') === b.hiddenIds.join(',');

const shekels = (n: number) => `₪${n.toLocaleString('he-IL', { maximumFractionDigits: n < 100 ? 2 : 0 })}`;

// Our commission (not GoOut's gross): rate per ticket, then what it earned so far.
const CommissionLine: React.FC<{ c?: PartyCommission }> = ({ c }) => {
  if (!c) return null;
  const rate = c.tier === 'account1'
    ? `${shekels(c.perTicket)} לכרטיס`
    : `6% · ${c.perTicketEstimated ? '~' : ''}${shekels(c.perTicket)} לכרטיס`;
  return (
    <p className="text-[13px] truncate">
      <span className="text-ink-sales">{rate}</span>
      <span className="text-ink-dim">
        {c.ticketsSold > 0
          ? ` · הרווחת ${shekels(c.earned)} (${c.ticketsSold === 1 ? 'כרטיס אחד' : `${c.ticketsSold} כרטיסים`})`
          : ' · עוד אין מכירות'}
      </span>
    </p>
  );
};

const PartyLine: React.FC<{ party: Party; badge?: string; commission?: PartyCommission; children?: React.ReactNode }> = ({ party, badge, commission, children }) => (
  <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2 border-b border-wood-brown last:border-b-0">
    {party.imageUrl
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={party.imageUrl} alt="" className="w-11 h-11 object-cover shrink-0" loading="lazy" />
      : <div className="w-11 h-11 bg-ink-cell shrink-0" aria-hidden />}
    <div className="min-w-0 flex-1">
      <p className="text-white text-[15px] font-medium truncate">
        {badge && <span className="text-ink-sales text-[13px] ml-2">{badge}</span>}
        {party.name}
      </p>
      <p className="text-ink-dim text-[13px] truncate">{partyWhen(party.date)}{party.location?.name ? ` · ${party.location.name}` : ''}</p>
      <CommissionLine c={commission} />
    </div>
    {/* Own row on phones so the name isn't squeezed to a few letters. */}
    <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-end">{children}</div>
  </li>
);

const SmallButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...props }) => (
  <GhostButton {...props} className={`h-9 px-2.5 text-[13px] ${className}`} />
);

const AdminHolidayPages: React.FC = () => {
  const [slug, setSlug] = useState<string>(() => {
    // Open on the next holiday coming up.
    const now = new Date();
    return [...SLUGS].sort((a, b) => getHolidayWindow(HOLIDAYS[a], now).end.localeCompare(getHolidayWindow(HOLIDAYS[b], now).end))[0];
  });
  const [parties, setParties] = useState<Party[] | null>(null);
  const [saved, setSaved] = useState<HolidayCuration>(EMPTY);
  const [draft, setDraft] = useState<HolidayCuration>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [commission, setCommission] = useState<Record<string, PartyCommission>>({});

  const def = HOLIDAYS[slug];
  const holidayWindow = useMemo(() => getHolidayWindow(def), [def]);

  useEffect(() => {
    // Commission is a nice-to-have on this screen: rows just render without it if it fails.
    getPartyCommission().then(setCommission).catch(err => console.error('Failed to load party commission', err));
    getParties()
      .then(setParties)
      .catch(() => setMessage({ kind: 'error', text: 'לא הצלחתי לטעון את רשימת המסיבות. נסה לרענן.' }));
  }, []);

  const loadCuration = useCallback(async (s: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const c = await getHolidayCuration(s);
      setSaved(c);
      setDraft(c);
    } catch {
      setSaved(EMPTY);
      setDraft(EMPTY);
      setMessage({ kind: 'error', text: 'לא הצלחתי לטעון את ההגדרות של העמוד הזה.' });
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadCuration(slug); }, [slug, loadCuration]);

  const dirty = !sameCuration(saved, draft);

  const changeSlug = (next: string) => {
    if (dirty && !confirm('יש שינויים שלא נשמרו. לעבור עמוד בלי לשמור?')) return;
    setQuery('');
    setSlug(next);
  };

  const all = useMemo(() => parties ?? [], [parties]);
  const byId = useMemo(() => new Map(all.map(p => [p.id, p])), [all]);
  const inWindow = useMemo(() => partiesInWindow(all, holidayWindow), [all, holidayWindow]);
  const list = useMemo(() => previewHolidayList(inWindow, all, draft), [inWindow, all, draft]);
  const pinnedSet = useMemo(() => new Set(draft.partyIds), [draft.partyIds]);
  const hiddenParties = useMemo(
    () => draft.hiddenIds.map(id => byId.get(id)).filter((p): p is Party => !!p),
    [draft.hiddenIds, byId],
  );
  // Pinned parties that have passed or were deleted: the site skips them, so say so.
  const stalePins = draft.partyIds.filter(id => parties && !byId.has(id)).length;

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const shown = new Set(list.map(p => p.id));
    return all
      .filter(p => !shown.has(p.id) && (p.name.toLowerCase().includes(q) || (p.location?.name || '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [query, all, list]);

  const pin = (id: string) => setDraft(d => ({
    partyIds: d.partyIds.includes(id) ? d.partyIds : [...d.partyIds, id],
    hiddenIds: d.hiddenIds.filter(x => x !== id),
  }));
  const unpin = (id: string) => setDraft(d => ({ ...d, partyIds: d.partyIds.filter(x => x !== id) }));
  const hide = (id: string) => setDraft(d => ({
    partyIds: d.partyIds.filter(x => x !== id),
    hiddenIds: d.hiddenIds.includes(id) ? d.hiddenIds : [...d.hiddenIds, id],
  }));
  const unhide = (id: string) => setDraft(d => ({ ...d, hiddenIds: d.hiddenIds.filter(x => x !== id) }));
  const move = (id: string, delta: -1 | 1) => setDraft(d => {
    const ids = [...d.partyIds];
    const i = ids.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return d;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    return { ...d, partyIds: ids };
  });
  // A pinned party that isn't in the date window would vanish when unpinned,
  // so "remove" for it just unpins; in-window ones get hidden.
  const remove = (id: string) => (inWindow.some(p => p.id === id) ? hide(id) : unpin(id));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    // Drop pins for parties that no longer exist so the list doesn't grow forever.
    const clean: HolidayCuration = {
      partyIds: parties ? draft.partyIds.filter(id => byId.has(id)) : draft.partyIds,
      hiddenIds: draft.hiddenIds,
    };
    try {
      await saveHolidayCuration(slug, clean);
      setSaved(clean);
      setDraft(clean);
      setMessage({ kind: 'ok', text: 'נשמר. העמוד באתר יתעדכן תוך דקה בערך.' });
    } catch (err) {
      setMessage({ kind: 'error', text: `השמירה נכשלה: ${err instanceof Error ? err.message : 'שגיאה'}` });
    } finally {
      setSaving(false);
    }
  };

  const busy = loading || !parties;
  const pageEarned = list.reduce((sum, p) => sum + (commission[p.id]?.earned ?? 0), 0);

  return (
    <div className="max-w-[900px] mx-auto space-y-4">
      <div className="flex overflow-x-auto border border-wood-brown" role="group" aria-label="עמוד חג">
        {SLUGS.map((s, i) => (
          <button
            key={s}
            type="button"
            aria-pressed={slug === s}
            onClick={() => changeSlug(s)}
            className={`h-12 px-4 text-[15px] font-medium whitespace-nowrap ${i > 0 ? 'border-r border-wood-brown' : ''} ${slug === s ? 'bg-jungle-accent text-white' : 'text-ink-dim hover:text-white hover:bg-white/5'}`}
          >
            {HOLIDAYS[s].hebrewName}
          </button>
        ))}
      </div>

      <Panel
        title={`${def.hebrewName} ${holidayWindow.year}`}
        note={`ברירת המחדל: כל המסיבות בין ${shortDate(holidayWindow.start)} ל-${shortDate(holidayWindow.end)}, לפי תאריך. מסיבות נעוצות מופיעות ראשונות בסדר שקבעת, גם אם הן מחוץ לתאריכים.`}
        actions={
          <a href={`${SITE_URL}/${slug}`} target="_blank" rel="noreferrer" className="text-[13px] text-ink-view underline whitespace-nowrap">
            לעמוד באתר
          </a>
        }
      >
        <div className="flex items-center gap-3 mb-3">
          <GhostButton onClick={save} disabled={!dirty || saving || busy} className={`h-11 px-5 ${dirty ? 'bg-jungle-accent text-white border-jungle-accent' : ''}`}>
            {saving ? 'שומר…' : 'שמירה'}
          </GhostButton>
          {dirty && !saving && (
            <GhostButton onClick={() => setDraft(saved)} className="h-11">ביטול שינויים</GhostButton>
          )}
          <span className="text-[13px] text-ink-dim">{dirty ? 'יש שינויים שלא נשמרו' : ''}</span>
        </div>

        {message && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} className={`mb-3 text-[14px] ${message.kind === 'error' ? 'text-ink-click' : 'text-ink-sales'}`}>
            {message.text}
          </p>
        )}

        {stalePins > 0 && (
          <p className="mb-3 text-[13px] text-ink-dim">
            {stalePins === 1 ? 'מסיבה נעוצה אחת כבר עברה או נמחקה' : `${stalePins} מסיבות נעוצות כבר עברו או נמחקו`}, והיא לא תופיע באתר. השמירה הבאה תנקה אותה.
          </p>
        )}

        <h4 className="text-white font-bold text-[15px] mb-1">
          כך זה יופיע באתר ({busy ? '…' : list.length})
          {!busy && pageEarned > 0 && <span className="text-ink-sales text-[13px] font-medium mr-2">· הרווחת מהמסיבות בעמוד {shekels(pageEarned)}</span>}
        </h4>
        {busy ? (
          <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-14" />)}</div>
        ) : list.length === 0 ? (
          <p className="text-ink-dim text-[14px] py-3">אין כרגע מסיבות בעמוד הזה. אפשר להוסיף מסיבה דרך החיפוש למטה.</p>
        ) : (
          <ol>
            {list.map(p => {
              const pinned = pinnedSet.has(p.id);
              const idx = draft.partyIds.indexOf(p.id);
              return (
                <PartyLine key={p.id} party={p} commission={commission[p.id]} badge={pinned ? `נעוץ ${idx + 1}` : undefined}>
                  {pinned ? (
                    <>
                      <SmallButton onClick={() => move(p.id, -1)} disabled={idx === 0} aria-label={`הזז למעלה: ${p.name}`}>▲</SmallButton>
                      <SmallButton onClick={() => move(p.id, 1)} disabled={idx === draft.partyIds.length - 1} aria-label={`הזז למטה: ${p.name}`}>▼</SmallButton>
                      {inWindow.some(w => w.id === p.id) && <SmallButton onClick={() => unpin(p.id)}>בטל נעיצה</SmallButton>}
                    </>
                  ) : (
                    <SmallButton onClick={() => pin(p.id)}>נעץ למעלה</SmallButton>
                  )}
                  <SmallButton onClick={() => remove(p.id)} aria-label={`הסר מהעמוד: ${p.name}`}>הסר</SmallButton>
                </PartyLine>
              );
            })}
          </ol>
        )}

        <div className="mt-5">
          <label htmlFor="holiday-add" className="text-white font-bold text-[15px] block mb-1">הוספת מסיבה לעמוד</label>
          <input
            id="holiday-add"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם או מקום"
            className="w-full h-11 px-3 bg-jungle-deep border border-wood-brown text-white placeholder:text-ink-dim"
          />
          {query.trim() && (
            searchResults.length === 0 ? (
              <p className="text-ink-dim text-[13px] mt-2">לא נמצאו מסיבות קרובות בשם הזה.</p>
            ) : (
              <ul className="mt-2">
                {searchResults.map(p => (
                  <PartyLine key={p.id} party={p} commission={commission[p.id]}>
                    <SmallButton onClick={() => { pin(p.id); setQuery(''); }}>הוסף</SmallButton>
                  </PartyLine>
                ))}
              </ul>
            )
          )}
        </div>

        {hiddenParties.length > 0 && (
          <div className="mt-5">
            <h4 className="text-white font-bold text-[15px] mb-1">מוסתרות מהעמוד ({hiddenParties.length})</h4>
            <ul>
              {hiddenParties.map(p => (
                <PartyLine key={p.id} party={p} commission={commission[p.id]}>
                  <SmallButton onClick={() => unhide(p.id)}>החזר</SmallButton>
                </PartyLine>
              ))}
            </ul>
          </div>
        )}
      </Panel>
    </div>
  );
};

export default AdminHolidayPages;
