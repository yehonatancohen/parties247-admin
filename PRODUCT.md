# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One user: the owner of parties247.co.il, a Hebrew (RTL) party-ticket referral site. They check the dashboard mostly on their phone, in short glances, throughout the day. Desktop is secondary.

## Product Purpose

Owner-only admin at admin.parties247.co.il for a site that refers visitors to GoOut and earns commission per ticket (account1 ₪25/ticket, account2 6%). The analytics page is the one the owner lives in. Success is answering four questions in one glance: did we sell today or this week, where are the traffic peaks, where does traffic come from, and which party sells.

## Positioning

Internal tool. Not a general analytics suite; it joins the site's own views and clicks with GoOut's real sales and revenue per party and per account.

## Operating Context

Data comes from parties247_backend (`/api/admin/analytics/*`) through `src/services/api.ts`. Revenue figures are our commission; `real*` fields are GoOut's gross numbers and must never be mixed in one tile. A click is not a confirmed sale. Ticket, commission and GoOut revenue are cumulative per event month; clicks and views are windowed. JWT is kept in localStorage.

## Capabilities and Constraints

- Hebrew RTL throughout. Next.js 16, Tailwind, deployed on Vercel by push to master.
- Pages: catalog management (`/`), analytics, attribution (purchase sources), WhatsApp, promo drafter, audit log.
- Existing analytics features to preserve: month filter, sales-by-party table, view-to-click-to-ticket funnel, traffic sources and devices, time-series trend, visitors tab with CSV export, per-party performance table with account filter.
- Scope of this rewrite (confirmed): analytics page rebuilt from scratch plus the shell/navigation/global look, so every admin page shares the new language. Other pages inherit tokens without behavior changes.

## Brand Commitments

None binding. The owner disliked the current look (jungle-dark cards with emoji and rainbow accent colors) and found it not comfortable to use.

## Evidence on Hand

Live data from the backend. No fabricated data is needed.

## Product Principles

1. Answer before explaining: the numbers the owner opens the page for come first, full stop.
2. Peaks are the story: time-based views must make spikes obvious.
3. Never blur commission with GoOut gross, or clicks with sales.
4. Phone first: one thumb, one glance.

## Accessibility & Inclusion

Hebrew RTL; phone-first, so tap targets and text must hold up on a small screen. (Lighting conditions of use were not confirmed.)
