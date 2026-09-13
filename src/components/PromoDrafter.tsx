"use client"
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as api from '@/services/api';
import { PromoCandidate, PromoResponse } from '@/data/types';
import LoadingSpinner from './LoadingSpinner';

// WhatsApp promo drafter: the parties most worth pushing to the promo groups
// right now, ranked by expected commission (account1 flat ₪25/ticket first,
// then account2 6%), each with a ready-to-paste Hebrew message. Copy, paste
// into WhatsApp, done. Ranking + text come from the backend (promo.py); this
// page only lets you tweak the text before copying.

const DAY_OPTIONS = [3, 7, 14] as const;

const formatCurrency = (value: number) => `₪${value.toLocaleString('he-IL', { maximumFractionDigits: 1 })}`;

const useClipboard = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      // Clipboard API can be unavailable on http:// or denied — fall back to select-all.
      setCopiedKey(null);
    }
  }, []);
  return { copiedKey, copy };
};

const TierBadge = ({ tier }: { tier: PromoCandidate['tier'] }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
      tier === 'account1'
        ? 'bg-yellow-400/15 text-yellow-300 border border-yellow-400/30'
        : 'bg-jungle-lime/10 text-jungle-lime border border-jungle-lime/20'
    }`}
    title={tier === 'account1' ? 'מסיבת שותפים — ₪25 לכרטיס' : 'GoOut כללי — 6% מהמחיר'}
  >
    {tier === 'account1' ? '₪25 לכרטיס' : '6%'}
  </span>
);

const CandidateCard = ({
  candidate,
  index,
  onCopy,
  copied,
}: {
  candidate: PromoCandidate;
  index: number;
  onCopy: (key: string, text: string) => void;
  copied: boolean;
}) => {
  // Parent remounts this card (key includes generatedAt) whenever a fresh
  // draft arrives, so local edits never go stale without an effect.
  const [text, setText] = useState(candidate.message);
  const router = useRouter();

  const promoteViaCampaign = () => {
    const params = new URLSearchParams({
      tab: 'send',
      partyId: candidate.partyId,
      text: candidate.campaignTemplate,
    });
    router.push(`/whatsapp?${params.toString()}`);
  };

  return (
    <div className="bg-jungle-surface border border-wood-brown rounded-2xl shadow-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-jungle-text/50 text-sm font-mono">#{index + 1}</span>
            <h3 className="text-lg font-display font-bold text-jungle-text truncate">{candidate.name}</h3>
            <TierBadge tier={candidate.tier} />
          </div>
          <p className="text-sm text-jungle-text/70 mt-1">
            {candidate.dateLabel}
            {candidate.location ? ` · ${candidate.location}` : ''}
            {candidate.ticketPrice ? ` · ₪${candidate.ticketPrice}` : ''}
          </p>
        </div>
        <div className="text-left shrink-0">
          <p className="text-xs text-jungle-text/50">ציון</p>
          <p className="text-xl font-bold text-jungle-accent">{candidate.score.toFixed(1)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-jungle-deep rounded-lg p-2">
          <p className="text-jungle-text/50">עמלה לכרטיס</p>
          <p className="text-jungle-text font-semibold">{formatCurrency(candidate.expectedPerTicket)}</p>
        </div>
        <div className="bg-jungle-deep rounded-lg p-2">
          <p className="text-jungle-text/50">נמכרו (30 יום)</p>
          <p className="text-jungle-text font-semibold">{candidate.ticketsLast30d}</p>
        </div>
        <div className="bg-jungle-deep rounded-lg p-2">
          <p className="text-jungle-text/50">בעוד</p>
          <p className="text-jungle-text font-semibold">{candidate.daysUntil < 1 ? 'היום' : `${Math.ceil(candidate.daysUntil)} ימים`}</p>
        </div>
      </div>

      <textarea
        dir="rtl"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(10, text.split('\n').length + 1)}
        className="w-full bg-jungle-deep text-jungle-text text-sm p-3 rounded-lg border border-wood-brown focus:ring-2 focus:ring-jungle-accent focus:border-jungle-accent focus:outline-none font-sans leading-relaxed"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={promoteViaCampaign}
          className="bg-jungle-lime text-jungle-deep font-bold py-2 px-4 rounded-md hover:opacity-90 transition-opacity text-sm"
          title="פותח את טאב 'שליחה חדשה' בוואטסאפ עם המסיבה והטקסט כבר ממולאים — רק לבחור קבוצות ולשלוח"
        >
          🚀 קדם בקמפיין
        </button>
        <button
          onClick={() => onCopy(candidate.partyId, text)}
          className="bg-jungle-accent text-white font-bold py-2 px-4 rounded-md hover:opacity-90 transition-opacity text-sm"
        >
          {copied ? '✓ הועתק' : 'העתק הודעה'}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          className="border border-wood-brown text-jungle-text font-semibold py-2 px-4 rounded-md hover:bg-white/5 transition-colors text-sm"
        >
          פתח בוואטסאפ
        </a>
        {candidate.siteUrl && (
          <a href={candidate.siteUrl} target="_blank" rel="noreferrer" className="text-xs text-jungle-text/60 hover:text-jungle-text underline">
            דף האירוע באתר
          </a>
        )}
        <button
          onClick={() => setText(candidate.message)}
          className="text-xs text-jungle-text/50 hover:text-jungle-text mr-auto"
          disabled={text === candidate.message}
        >
          שחזר טקסט מקורי
        </button>
      </div>
    </div>
  );
};

const PromoDrafter: React.FC = () => {
  const [days, setDays] = useState<number>(7);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<PromoResponse | null>(null);
  const [digest, setDigest] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { copiedKey, copy } = useClipboard();

  // The synchronous "now loading" flip happens in the event handlers; the
  // effect only talks to the network and sets state from its callbacks.
  const changeDays = (d: number) => {
    if (d === days) return;
    setLoading(true);
    setDays(d);
  };
  const refresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    api.getWhatsappPromo(days, 15)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setDigest(res.digest);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'טעינת ההצעות נכשלה');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, refreshKey]);

  const totals = useMemo(() => {
    const candidates = data?.candidates ?? [];
    return {
      count: candidates.length,
      account1: candidates.filter((c) => c.tier === 'account1').length,
      tickets: candidates.reduce((sum, c) => sum + c.ticketsLast30d, 0),
    };
  }, [data]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display text-jungle-text">קידום בוואטסאפ</h2>
          <p className="text-sm text-jungle-text/60 mt-1">
            המסיבות שהכי שווה לדחוף עכשיו, לפי העמלה הצפויה (שותפים ₪25 לכרטיס קודם), מכירות אחרונות ודחיפות.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-jungle-deep rounded-xl p-1 border border-wood-brown">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => changeDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  days === d ? 'bg-jungle-accent text-white' : 'text-jungle-text/70 hover:text-jungle-text'
                }`}
              >
                {d} ימים
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            className="border border-wood-brown text-jungle-text font-semibold py-1.5 px-3 rounded-lg hover:bg-white/5 text-sm"
          >
            רענן
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-900/20 text-red-200 rounded-xl border border-red-500/30">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : data && data.candidates.length === 0 ? (
        <div className="bg-jungle-surface border border-wood-brown rounded-2xl p-8 text-center text-jungle-text/60">
          אין מסיבות עתידיות בטווח הזה.
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-jungle-surface border border-wood-brown rounded-2xl shadow-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-jungle-lime">הודעת סיכום לקבוצות</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copy('digest', digest)}
                    className="bg-jungle-accent text-white font-bold py-1.5 px-3 rounded-md hover:opacity-90 text-sm"
                  >
                    {copiedKey === 'digest' ? '✓ הועתק' : 'העתק סיכום'}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(digest)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-wood-brown text-jungle-text font-semibold py-1.5 px-3 rounded-md hover:bg-white/5 text-sm"
                  >
                    פתח בוואטסאפ
                  </a>
                </div>
              </div>
              <textarea
                dir="rtl"
                value={digest}
                onChange={(e) => setDigest(e.target.value)}
                rows={Math.min(18, digest.split('\n').length + 1)}
                className="w-full bg-jungle-deep text-jungle-text text-sm p-3 rounded-lg border border-wood-brown focus:ring-2 focus:ring-jungle-accent focus:outline-none leading-relaxed"
              />
            </div>
            <div className="bg-jungle-surface border border-wood-brown rounded-2xl shadow-lg p-5 space-y-3">
              <h3 className="text-lg font-semibold text-jungle-lime">מה יש כאן</h3>
              <div className="flex justify-between text-sm"><span className="text-jungle-text/60">מסיבות מוצעות</span><span className="text-jungle-text font-semibold">{totals.count}</span></div>
              <div className="flex justify-between text-sm"><span className="text-jungle-text/60">מתוכן של שותפים (₪25)</span><span className="text-yellow-300 font-semibold">{totals.account1}</span></div>
              <div className="flex justify-between text-sm"><span className="text-jungle-text/60">כרטיסים שנמכרו ב-30 יום</span><span className="text-jungle-text font-semibold">{totals.tickets}</span></div>
              <p className="text-xs text-jungle-text/50 pt-2 border-t border-wood-brown">
                הציון = עמלה לכרטיס × (1 + כרטיסים ב-30 יום) × דחיפות (×2 עד יומיים, ×1.5 עד 4 ימים).
                הקישורים כבר כוללים את קוד ההפניה.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {data.candidates.map((candidate, index) => (
              <CandidateCard
                key={`${candidate.partyId}-${data.generatedAt}`}
                candidate={candidate}
                index={index}
                onCopy={copy}
                copied={copiedKey === candidate.partyId}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default PromoDrafter;
