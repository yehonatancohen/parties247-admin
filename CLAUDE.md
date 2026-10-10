# parties247-admin

Owner-only Next.js 16 dashboard at `https://admin.parties247.co.il`. Split out of the
website so admin traffic stops polluting GTM/GA/Clarity. `X-Robots-Tag: noindex` on every
route. Business model and data flow: workspace root `../CLAUDE.md`.

## What it does

- `/` (`AdminDashboard.tsx`) — default referral code, bulk operations, party table with
  edit / clone-as-promotion / delete, carousel and section management.
- `/analytics` (`AdminAnalytics.tsx`) — the page the owner actually lives in: summary tiles,
  detailed time series, visitor breakdown, and the merged **sales + funnel table** sourced
  from `/api/admin/analytics/sales` and `/api/admin/analytics/funnel` (with the
  `realMonth` filter for GoOut's own views/revenue). Shows `accountIds` per party so
  account1 vs account2 revenue is visible.
- `/promo` (`PromoDrafter.tsx`) — WhatsApp promo drafter: parties ranked by expected
  commission (account1 first) for the next 3/7/14 days, each with an editable Hebrew
  message + copy / "open in WhatsApp" buttons, plus one roundup digest. Data and text come
  from `GET /api/admin/promo/whatsapp` (backend `promo.py`); this page only edits/copies.
- `/issues` (`AdminIssues.tsx`, `services/listings.ts`) — the Listing Guard review queue:
  questions the backend could not decide alone (same party listed twice? is this ₪0 ticket
  free entry? no usable location), what the sync changed in the last 24 h, and upcoming
  parties that are not listed (private / merged / hidden) with an undo. Rules live in the
  backend's `listings.py`; this page only shows and answers.
- `/audit-log` — backend `adminAuditLog`.

All data comes from `parties247_backend` via `src/services/api.ts`; JWT is kept in
`localStorage` under `jwtAuthToken` (login persists across restarts).

## Working here

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL
npm run dev                    # :3000
npm run lint && npx tsc --noEmit
```

Deploy: push to `master` → Vercel. No test runner yet; when adding one, unit-test the
aggregation/sorting helpers in `AdminAnalytics.tsx` (month filtering, unique-by-event
totals — both had bugs fixed in 2026-08) after extracting them into `src/lib/`.

## Notes

- `src/services/api.ts`, `src/data/types.ts`, `src/lib/seoparties.ts` and `src/hooks/useParties.ts`
  are copied from the website repo and have drifted. Keep type changes (e.g. new fields on
  `PartySalesRecord` / `FunnelResponse`) in sync with the backend response, not the website.
- Editing a party locks the fields you changed against the GoOut sync (backend
  `party.locks`). The per-party refresh button calls the backend `resync`; there is no
  client-side GoOut scraper any more (`scrapeService.ts` was deleted — saving a browser
  scrape as an edit would lock every field).
- Revenue figures here are **our commission** (account1 ₪25/ticket, account2 6%); the
  `real*` columns are GoOut's numbers. Don't mix them in a tile.
- Look: 2026-10-02 redesign, "running order" world (ink-indigo ground, three data inks: yellow=sales/commission, orange=clicks, periwinkle=views; Rubik). Tokens live in `tailwind.config.cjs` (legacy `jungle-*` names remapped). The old jungle styling is intentionally gone; do not restore it. Analytics UI is in `src/components/analytics/`, aggregation helpers in `src/lib/analytics.ts`.
- Hero = tickets/commission for parties whose EVENT date is in the chosen month (or all), via `mergePartyRows`/`monthTotals` in `src/lib/analytics.ts` (same logic as the parties table). It is not "sales made during the month"; that would need a backend endpoint over `goout_sales_log.recorded_at`. Time-series `purchases` are only GoOut clicks; day buckets are UTC dates; visits history is capped at 35 days by a TTL, so the chart shows views/clicks only.
