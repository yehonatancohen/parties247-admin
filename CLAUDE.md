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
- Revenue figures here are **our commission** (account1 ₪25/ticket, account2 6%); the
  `real*` columns are GoOut's numbers. Don't mix them in a tile.
- Dark theme, `font-display` jungle styling shared with the website — keep it consistent.
