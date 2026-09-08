"use client";

import React, { useCallback, useEffect, useState } from 'react';
import * as api from '../services/api';
import { WaOverview, WaGroup, WaTemplate, WaCampaign, WaFunnelResponse } from '../data/types';
import { useParties } from '../hooks/useParties';
import LoadingSpinner from './LoadingSpinner';

type WaTab = 'overview' | 'send' | 'campaigns' | 'groups' | 'templates';

const TABS: { key: WaTab; label: string }[] = [
  { key: 'overview', label: 'סקירה' },
  { key: 'send', label: 'שליחה חדשה' },
  { key: 'campaigns', label: 'קמפיינים' },
  { key: 'groups', label: 'קבוצות' },
  { key: 'templates', label: 'תבניות' },
];

const STATUS_LABELS: Record<string, string> = {
  queued: 'ממתין',
  running: 'בשליחה',
  done: 'הושלם',
  aborted: 'הופסק (שגיאה)',
  cancelled: 'בוטל',
};

const TARGET_STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  sent: 'נשלח',
  failed: 'נכשל',
  skipped: 'דולג',
};

const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel = 'אישור', onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
    <div className="bg-jungle-surface rounded-lg shadow-2xl w-full max-w-sm border border-wood-brown p-6">
      <h3 className="text-lg font-display text-jungle-text mb-2">{title}</h3>
      <p className="text-sm text-jungle-text/70 mb-6 whitespace-pre-wrap">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-opacity-80 text-sm">
          ביטול
        </button>
        <button onClick={onConfirm} className="bg-jungle-accent hover:opacity-90 font-bold py-2 px-4 rounded-md text-sm text-white">
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

const Panel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-jungle-deep p-4 rounded-md border border-wood-brown/50 space-y-4">{children}</div>
);

const FunnelCard: React.FC<{ label: string; stage?: { count: number | null; of?: number; confidence: string; note?: string } }> = ({ label, stage }) => (
  <div className="bg-jungle-surface p-4 rounded-lg border border-wood-brown">
    <div className="text-xs text-jungle-text/50 mb-1">{label}</div>
    <div className="text-2xl font-bold text-jungle-text">
      {stage?.count == null ? '—' : stage.count}
      {stage?.of != null && <span className="text-sm text-jungle-text/40"> / {stage.of}</span>}
    </div>
    <div className="text-[11px] text-jungle-text/40 mt-1">{stage?.confidence}</div>
    {stage?.note && <div className="text-[11px] text-jungle-lime/70 mt-1">{stage.note}</div>}
  </div>
);

// --- Overview ---------------------------------------------------------

const OverviewTab: React.FC = () => {
  const [overview, setOverview] = useState<WaOverview | null>(null);
  const [funnel, setFunnel] = useState<WaFunnelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getWaOverview(), api.getWaFunnel(undefined, 30)])
      .then(([o, f]) => {
        if (cancelled) return;
        setOverview(o);
        setFunnel(f);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-6 flex justify-center"><LoadingSpinner /></div>;
  if (error) return <div className="p-4 bg-red-500/10 text-red-300 rounded-xl border border-red-500/30 text-sm">{error}</div>;
  if (!overview) return null;

  const engineStale = !overview.engineHeartbeat ||
    Date.now() - new Date(overview.engineHeartbeat).getTime() > 20 * 60 * 1000;

  return (
    <div className="space-y-4">
      {engineStale && (
        <div className="p-3 bg-red-500/10 text-red-300 rounded-lg border border-red-500/30 text-sm">
          ⚠️ המנוע לא דיווח פעילות לאחרונה{overview.engineHeartbeat ? ` (פעם אחרונה: ${new Date(overview.engineHeartbeat).toLocaleString('he-IL')})` : ' — אין דיווח כלל'}.
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-jungle-surface p-4 rounded-lg border border-wood-brown">
          <div className="text-xs text-jungle-text/50">קמפיינים היום</div>
          <div className="text-2xl font-bold text-jungle-text">{overview.todayCampaigns} / {overview.dailyCap}</div>
        </div>
        <div className="bg-jungle-surface p-4 rounded-lg border border-wood-brown">
          <div className="text-xs text-jungle-text/50">קבוצות יעד</div>
          <div className="text-2xl font-bold text-jungle-text">{overview.targetGroupCount}</div>
        </div>
        <div className="bg-jungle-surface p-4 rounded-lg border border-wood-brown">
          <div className="text-xs text-jungle-text/50">חברים ייחודיים</div>
          <div className="text-2xl font-bold text-jungle-text">{overview.memberCount}</div>
        </div>
        <div className="bg-jungle-surface p-4 rounded-lg border border-wood-brown">
          <div className="text-xs text-jungle-text/50">שליחה פעילה</div>
          <div className="text-2xl font-bold text-jungle-text">{overview.settings.sendingEnabled ? 'כן' : 'כבוי'}</div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-jungle-lime">משפך המרה (30 יום אחרונים)</h3>
      {funnel && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <FunnelCard label="נשלחו" stage={funnel.funnel.sent} />
          <FunnelCard label="נקראו" stage={funnel.funnel.reads} />
          <FunnelCard label="קליקים" stage={funnel.funnel.clicks} />
          <FunnelCard label="קליקי רכישה" stage={funnel.funnel.buyClicks} />
          <FunnelCard label="מכירות" stage={funnel.funnel.sales} />
        </div>
      )}
    </div>
  );
};

// --- New Send -----------------------------------------------------------

const SendTab: React.FC = () => {
  const { parties } = useParties();
  const [groups, setGroups] = useState<WaGroup[]>([]);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [partyId, setPartyId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [text, setText] = useState('');
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduledFor, setScheduledFor] = useState('');
  const [override, setOverride] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getWaGroups().then((gs) => {
      setGroups(gs);
      setSelectedChatIds(gs.filter((g) => g.isTarget).map((g) => g.chatId));
    }).catch(() => {});
    api.getWaTemplates().then(setTemplates).catch(() => {});
  }, []);

  const upcomingParties = parties
    .filter((p) => new Date(p.date).getTime() >= Date.now() - 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const tpl = templates.find((t) => t._id === id);
    if (tpl) setText(tpl.body);
  };

  const handlePreview = async () => {
    setError(null);
    try {
      const res = await api.previewWaTemplate(text, partyId || undefined);
      setPreview(res.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בתצוגה מקדימה');
    }
  };

  const toggleGroup = (chatId: string) => {
    setSelectedChatIds((prev) => (prev.includes(chatId) ? prev.filter((c) => c !== chatId) : [...prev, chatId]));
  };

  const canSubmit = !!partyId && text.includes('{link}') && selectedChatIds.length > 0;

  const submit = async () => {
    setConfirming(false);
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const campaign = await api.createWaCampaign({
        partyId,
        templateId: templateId || undefined,
        text,
        scheduledFor: scheduleNow ? undefined : new Date(scheduledFor).toISOString(),
        targetChatIds: selectedChatIds,
        override,
      });
      setResult(`נוצר קמפיין (${campaign._id}) ל-${campaign.targets.length} קבוצות.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת קמפיין');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPartyName = parties.find((p) => p.id === partyId)?.name;

  return (
    <Panel>
      {confirming && (
        <ConfirmDialog
          title="אישור שליחה"
          message={`שליחת ההודעה ל-${selectedChatIds.length} קבוצות${scheduleNow ? ' עכשיו' : ` בשעה ${new Date(scheduledFor).toLocaleString('he-IL')}`}.\nמסיבה: ${selectedPartyName || partyId}`}
          confirmLabel="שלח"
          onConfirm={submit}
          onCancel={() => setConfirming(false)}
        />
      )}

      {error && <div className="p-3 bg-red-500/10 text-red-300 rounded-lg border border-red-500/30 text-sm">{error}</div>}
      {result && <div className="p-3 bg-green-500/10 text-green-300 rounded-lg border border-green-500/30 text-sm">{result}</div>}

      <div>
        <label className="block text-sm text-jungle-text/70 mb-1">מסיבה</label>
        <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full bg-jungle-surface border border-wood-brown rounded-md p-2 text-sm text-jungle-text">
          <option value="">בחר מסיבה עתידית...</option>
          {upcomingParties.map((p) => (
            <option key={p.id} value={p.id}>{p.name} · {new Date(p.date).toLocaleDateString('he-IL')}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-jungle-text/70 mb-1">תבנית (אופציונלי)</label>
        <select value={templateId} onChange={(e) => handleTemplateChange(e.target.value)} className="w-full bg-jungle-surface border border-wood-brown rounded-md p-2 text-sm text-jungle-text">
          <option value="">— טקסט חופשי —</option>
          {templates.filter((t) => t.active).map((t) => (
            <option key={t._id} value={t._id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-jungle-text/70 mb-1">
          טקסט ההודעה — חובה לכלול <code className="text-jungle-lime">{'{link}'}</code>
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full bg-jungle-surface border border-wood-brown rounded-md p-2 text-sm text-jungle-text font-mono"
          placeholder={'🎉 {party}\n📅 {date} · {time}\n📍 {venue}, {city}\n🎟️ {price} · קוד הנחה {code}\n{link}'}
        />
        <div className="flex gap-2 mt-2">
          <button onClick={handlePreview} className="text-xs bg-white/5 hover:bg-white/10 text-jungle-text/70 px-3 py-1.5 rounded-md border border-wood-brown">
            תצוגה מקדימה
          </button>
        </div>
        {preview && (
          <pre className="mt-2 text-xs text-jungle-text/80 whitespace-pre-wrap bg-jungle-surface p-3 rounded-md border border-wood-brown/50">{preview}</pre>
        )}
      </div>

      <div>
        <label className="block text-sm text-jungle-text/70 mb-1">קבוצות יעד ({selectedChatIds.length} נבחרו)</label>
        <div className="max-h-56 overflow-y-auto bg-jungle-surface border border-wood-brown rounded-md p-2 space-y-1">
          {groups.length === 0 && <div className="text-xs text-jungle-text/40 p-2">אין עדיין קבוצות מסונכרנות מהמנוע.</div>}
          {groups.map((g) => (
            <label key={g.chatId} className="flex items-center gap-2 text-sm text-jungle-text/80 px-2 py-1 hover:bg-white/5 rounded">
              <input type="checkbox" checked={selectedChatIds.includes(g.chatId)} onChange={() => toggleGroup(g.chatId)} />
              {g.name} {g.memberCount != null && <span className="text-jungle-text/40 text-xs">({g.memberCount})</span>}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-jungle-text/80">
          <input type="radio" checked={scheduleNow} onChange={() => setScheduleNow(true)} /> עכשיו
        </label>
        <label className="flex items-center gap-2 text-sm text-jungle-text/80">
          <input type="radio" checked={!scheduleNow} onChange={() => setScheduleNow(false)} /> תזמון:
        </label>
        {!scheduleNow && (
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="bg-jungle-surface border border-wood-brown rounded-md p-1.5 text-sm text-jungle-text"
          />
        )}
        <label className="flex items-center gap-2 text-sm text-jungle-text/80 ms-auto">
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
          עקוף מגבלת שעות שקט / תקרה יומית
        </label>
      </div>

      <button
        onClick={() => setConfirming(true)}
        disabled={!canSubmit || submitting || (!scheduleNow && !scheduledFor)}
        className="bg-jungle-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md text-sm"
      >
        {submitting ? <LoadingSpinner size="sm" /> : 'שלח לאישור'}
      </button>
    </Panel>
  );
};

// --- Campaigns ------------------------------------------------------------

const CampaignsTab: React.FC = () => {
  const [campaigns, setCampaigns] = useState<WaCampaign[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getWaCampaigns().then(setCampaigns).catch((err) => setError(err instanceof Error ? err.message : 'שגיאה')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    try {
      await api.cancelWaCampaign(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בביטול');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.resumeWaCampaign(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהמשך השליחה');
    }
  };

  if (loading) return <div className="p-6 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-3">
      {error && <div className="p-3 bg-red-500/10 text-red-300 rounded-lg border border-red-500/30 text-sm">{error}</div>}
      {campaigns.length === 0 && <div className="p-6 text-center text-jungle-text/50">אין קמפיינים עדיין</div>}
      {campaigns.map((c) => {
        const sentCount = c.targets.filter((t) => t.status === 'sent').length;
        return (
          <div key={c._id} className="bg-jungle-surface border border-wood-brown rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-jungle-text">
                  {STATUS_LABELS[c.status] || c.status} · {sentCount}/{c.targets.length} נשלחו
                </div>
                <div className="text-xs text-jungle-text/50">
                  {new Date(c.scheduledFor).toLocaleString('he-IL')} · {c.createdBy === 'relay#21' ? 'מ-#21' : 'ידני'}
                  {c.deferredForQuietHours && ' · נדחה (שעות שקט)'}
                </div>
              </div>
              <div className="flex gap-2">
                {c.status === 'queued' && (
                  <button onClick={() => handleCancel(c._id)} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-300 px-3 py-1.5 rounded-md border border-red-500/30">
                    בטל
                  </button>
                )}
                {c.status === 'aborted' && (
                  <button onClick={() => handleResume(c._id)} className="text-xs bg-jungle-accent/10 hover:bg-jungle-accent/20 text-jungle-lime px-3 py-1.5 rounded-md border border-jungle-accent/30">
                    המשך שליחה
                  </button>
                )}
                <button onClick={() => setExpanded(expanded === c._id ? null : c._id)} className="text-xs text-jungle-lime hover:underline">
                  {expanded === c._id ? 'הסתר' : 'פרטים'}
                </button>
              </div>
            </div>
            {expanded === c._id && (
              <div className="mt-3 space-y-2">
                <pre className="text-xs text-jungle-text/70 whitespace-pre-wrap bg-jungle-deep p-2 rounded border border-wood-brown/50">{c.text}</pre>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-jungle-text/40 border-b border-wood-brown">
                      <th className="text-right py-1">קבוצה</th>
                      <th className="text-right py-1">סטטוס</th>
                      <th className="text-right py-1">קליקים</th>
                      <th className="text-right py-1">שגיאה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.targets.map((t) => (
                      <tr key={t.chatId} className="border-b border-wood-brown/30">
                        <td className="py-1 text-jungle-text/80">{t.name}</td>
                        <td className="py-1 text-jungle-text/60">{TARGET_STATUS_LABELS[t.status] || t.status}</td>
                        <td className="py-1 text-jungle-text/60">{t.clicks ?? '-'}</td>
                        <td className="py-1 text-red-300/70">{t.error || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// --- Groups -----------------------------------------------------------

const GroupsTab: React.FC = () => {
  const [groups, setGroups] = useState<WaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getWaGroups().then(setGroups).catch((err) => setError(err instanceof Error ? err.message : 'שגיאה')).finally(() => setLoading(false));
  }, []);

  const toggle = async (g: WaGroup) => {
    try {
      await api.patchWaGroup(g.chatId, !g.isTarget);
      setGroups((prev) => prev.map((x) => (x.chatId === g.chatId ? { ...x, isTarget: !x.isTarget } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון');
    }
  };

  if (loading) return <div className="p-6 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-2">
      {error && <div className="p-3 bg-red-500/10 text-red-300 rounded-lg border border-red-500/30 text-sm">{error}</div>}
      {groups.length === 0 && <div className="p-6 text-center text-jungle-text/50">אין עדיין קבוצות מסונכרנות מהמנוע (שלב 2 בתוכנית).</div>}
      {groups.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-jungle-text/50 text-xs border-b border-wood-brown">
                <th className="text-right py-2 px-3">שם</th>
                <th className="text-right py-2 px-3">חברים</th>
                <th className="text-right py-2 px-3">יעד שליחה</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.chatId} className="border-b border-wood-brown/50">
                  <td className="py-2 px-3 text-jungle-text">{g.name}</td>
                  <td className="py-2 px-3 text-jungle-text/60">{g.memberCount ?? '-'}</td>
                  <td className="py-2 px-3">
                    <input type="checkbox" checked={g.isTarget} onChange={() => toggle(g)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// --- Templates ----------------------------------------------------------

const TemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getWaTemplates().then(setTemplates).catch((err) => setError(err instanceof Error ? err.message : 'שגיאה')).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setName(''); setBody(''); setEditingId(null); };

  const save = async () => {
    if (!name.trim() || !body.trim()) return;
    try {
      if (editingId) {
        await api.updateWaTemplate(editingId, { name, body, active: true });
      } else {
        await api.createWaTemplate({ name, body, active: true });
      }
      reset();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    }
  };

  const edit = (t: WaTemplate) => { setEditingId(t._id); setName(t.name); setBody(t.body); };

  const remove = async (id: string) => {
    try {
      await api.deleteWaTemplate(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקה');
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-500/10 text-red-300 rounded-lg border border-red-500/30 text-sm">{error}</div>}
      <Panel>
        <div className="text-xs text-jungle-text/50 mb-2">
          פלייסהולדרים זמינים: <code>{'{party} {date} {time} {venue} {city} {price} {code} {link}'}</code>
          {' '}— <code>{'{code}'}</code> ו-<code>{'{link}'}</code> ממולאים לכל קבוצה בנפרד בזמן השליחה.
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם תבנית" className="w-full bg-jungle-surface border border-wood-brown rounded-md p-2 text-sm text-jungle-text" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="תוכן ההודעה" className="w-full bg-jungle-surface border border-wood-brown rounded-md p-2 text-sm text-jungle-text font-mono" />
        <div className="flex gap-2">
          <button onClick={save} className="bg-jungle-accent hover:opacity-90 text-white font-bold py-2 px-4 rounded-md text-sm">
            {editingId ? 'עדכן' : 'צור תבנית'}
          </button>
          {editingId && (
            <button onClick={reset} className="bg-gray-600 hover:opacity-80 text-white font-bold py-2 px-4 rounded-md text-sm">ביטול עריכה</button>
          )}
        </div>
      </Panel>

      {loading ? (
        <div className="p-6 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t._id} className="bg-jungle-surface border border-wood-brown rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-jungle-text">{t.name}</div>
                <div className="text-xs text-jungle-text/50 truncate max-w-md">{t.body}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => edit(t)} className="text-xs text-jungle-lime hover:underline">ערוך</button>
                <button onClick={() => remove(t._id)} className="text-xs text-red-300 hover:underline">מחק</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Root -----------------------------------------------------------------

const AdminWhatsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WaTab>('overview');

  return (
    <div className="bg-jungle-surface p-6 rounded-lg shadow-lg border border-wood-brown w-full space-y-6">
      <h2 className="text-3xl font-display text-jungle-text">וואטסאפ</h2>

      <div className="flex flex-wrap gap-1 bg-jungle-deep p-1.5 rounded-lg border border-wood-brown">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === tab.key ? 'bg-jungle-accent text-white' : 'text-jungle-text/60 hover:text-jungle-text hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'send' && <SendTab />}
      {activeTab === 'campaigns' && <CampaignsTab />}
      {activeTab === 'groups' && <GroupsTab />}
      {activeTab === 'templates' && <TemplatesTab />}
    </div>
  );
};

export default AdminWhatsApp;
