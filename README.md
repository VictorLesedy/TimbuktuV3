# Timbuktu UI

Front-end for Timbuktu, a Tanzanian marketplace for every kind of entertainment: concerts, match days, festivals, family days, cinemas, arcades, galleries, tours, classes, nightlife and talent to hire. Fans find and book events, venues, services and professionals. Entertainers run their listings from a studio. Timbuktu staff approve listings and watch revenue from an admin console.

This is a working UI on a mock data layer. There is no real authentication, payment or database. Everything runs in the browser and is shaped so a Node + PostgreSQL API can replace the mock layer later without touching components.

## Run it

Requires Node 22 or later and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `pnpm build` then `pnpm start` | Production build and server |
| `pnpm typecheck` | TypeScript, strict |
| `pnpm lint` | Biome lint and format check |
| `npx tsx tests/flows.mts` | End-to-end checks against the repository layer |
| `python3 tests/browser/journeys.py` | Browser journeys: tickets, declined and timed-out payments, the hire loop, door check-in, wizard to approval, registration gate, mobile overflow |
| `python3 tests/browser/smoke.py` | Loads every route at 375 px and 1280 px and reports errors and sideways scrolling |

The browser scripts need Playwright for Python (`pip install playwright && playwright install chromium`) and a running app. Set `BASE_URL` if it isn't on port 3000.

## Changing the home hero

Photos, words, crop and text sizes for each theme: see [docs/editing-the-hero.md](docs/editing-the-hero.md).

## Stack

Next.js 16 (App Router, Turbopack, React Compiler), React 19, Tailwind CSS 4, Motion, TanStack Query, Zustand, Zod, React Hook Form, nuqs (URL state), Recharts, Radix primitives, Sonner, qrcode.react, Lucide. Fonts (Anton, Space Grotesk) are self-hosted.

## Trying the demo

A floating **Demo controls** button sits in the bottom-right corner of every page.

- **View as** switches between Fan, Entertainer (studio) and Admin.
- **Fan level** switches between Explorer (signed out), Member and Ambassador.
- **Simulate a flaky network** makes one in four requests fail, so you can see error and retry states.
- **Reset demo data** restores the seeded world.

Other things worth knowing:

- At checkout, **Demo outcome** chooses whether the mobile-money payment succeeds, is declined or never responds. "No response" runs the real 60-second countdown. Cancel payment skips straight to the timeout screen.
- Promo codes: `KARIBU10` (10% off) and `USIKU20` (20% off).
- The demo fan is Asha Mrema. The demo entertainer is Juma Kweka, who owns Kilele Rooftop, DJ Kivuli, Sunset Sessions and a few others.
- A live simulation adds real bookings, saves and shares every 20 to 30 seconds, so signals and badges move while you watch.
- Data is stored in `localStorage` and reseeds each day.

A full loop to try: send a hire request on DJ Kivuli, answer it in Studio → Bookings → Hire requests, accept and pay as the fan, then scan a ticket at Studio → Door check-in.

## Routes

| Surface | Routes |
| --- | --- |
| Fan | `/`, `/explore`, `/a/[slug]`, `/checkout`, `/me`, `/me/ambassador`, `/onboarding` |
| Studio | `/studio`, `/studio/activations`, `/studio/activations/new`, `/studio/bookings`, `/studio/check-in`, `/studio/payouts` |
| Admin | `/admin`, `/admin/approvals`, `/admin/activations`, `/admin/revenue`, `/admin/settings` |

Explore filters, profile tabs, the revenue period and admin search all live in the URL, so they survive refresh and can be shared.

## How the code is organised

```
app/                    routes; (fan) and (bare) are layout groups
components/ui/          primitives: buttons, fields, dialogs, tabs, skeletons, states
components/activation/  cards, detail page, the four booking panels, living-signal panels
components/fan/         home, explore, checkout, profile, ambassador, onboarding
components/studio/      overview, listings, wizard, bookings, check-in, payouts
components/admin/       overview, approvals, listings, revenue, settings
components/shell/       navigation, console shell, demo controls, providers
lib/schemas.ts          every entity as a Zod schema; types come from here
lib/repo/               the data API the UI calls (see below)
lib/mock/               seeded world and in-browser store
lib/signals.ts          reputation, rhythm, crowd, momentum and badges
lib/ledger.ts           commission and revenue split for each order
lib/queries.ts          TanStack Query hooks; components only read data through these
messages/en.ts          all UI copy
```

### Living signals

Nothing about how busy or popular a listing is gets hard-coded. `lib/signals.ts` computes it from ~8,500 seeded interactions over 90 days, with recent weeks weighted more (21-day half-life).

- **Rating** comes only from verified attendees.
- **Rhythm** is a day-by-time-band heatmap. A night that runs past midnight counts towards the day it started.
- **Crowd mix and average spend** come from bookings. The public crowd label shows only when the admin setting is on and at least 30 bookings back it.
- **Momentum** covers the last 48 hours.
- **Badges** (Trending tonight, Rising, Top rated, Busiest on a given day, New on Timbuktu) are derived from these signals.

### Moving to a real back end

Components never import from `lib/mock`. They call hooks in `lib/queries.ts`, which call functions in `lib/repo/*`. To connect an API, replace the body of each repo function with a `fetch` call that returns the same Zod-typed shape. The hooks and components stay as they are.

| Repo module | Suggested endpoints |
| --- | --- |
| `activations.ts` | `GET /activations`, `GET /home`, `GET /activations/:slug`, `POST /activations/:id/views` |
| `orders.ts` | `POST /promos/validate`, `POST /orders`, `POST /orders/:id/confirm` (mobile-money webhook), `POST /orders/:id/expire`, `GET /me/orders` |
| `hire.ts` | `POST /activations/:id/hire-requests`, `GET /me/hire-requests`, `POST /hire-requests/:id/quote`, `POST /hire-requests/:id/respond`, `POST /hire-requests/:id/decline` |
| `reviews.ts` | `GET /me/reviewable`, `GET /me/reviews`, `POST /orders/:id/review` |
| `me.ts` | `GET /me`, `POST /auth/quick-register`, `POST /onboarding`, `POST /me/ambassador`, saves, shares, activity, ambassador stats and payouts |
| `studio.ts` | overview, listings CRUD, bookings, `POST /check-ins`, payouts |
| `admin.ts` | totals, approvals, featuring and pausing, revenue report, settings |
| `realtime.ts` | replace the in-memory subscription with a WebSocket or server-sent events channel, then invalidate queries on each message |

Business rules already live on the repository side and should move to the server: inventory re-checked at payment, double-scan protection at the door, review eligibility, the ledger split, and hiding non-live listings from anyone but their owner. `tests/flows.mts` describes these rules and can be pointed at the real API.

`lib/session.ts` stands in for a session cookie. `lib/repo/client.ts` adds 300 to 900 ms of latency and the optional failure rate.

## Quality notes

- Three themes the user picks from the header (and the studio and admin sidebars): Morning sunrise (light, the default), Sunset (warm light) and Moonlight (dark). Each has one accent colour plus a separate "live" colour reserved for things that are busy right now. Each theme also has its own home hero: a photo (in `public/hero/`), a Swahili greeting, a headline and a call to action. The photo fills the hero on every screen size, with the words over it. Only the active theme's photo is downloaded.
- Components use semantic colour classes (`bg-canvas`, `text-ink`, `text-muted`, `bg-accent`, `text-on-accent`, `bg-tint/5`). The values live in `app/globals.css` under `[data-theme=…]`, so a fourth theme is one CSS block plus an entry in `lib/theme.ts`. A small script in `<head>` applies the saved theme before first paint, so there is no flash. Every text colour pairing passes WCAG AA (4.5:1) in all three themes.
- Mobile-first from 360 px, with no sideways scrolling at any width. Wide tables scroll inside their own container.
- Every data view has loading, empty and error states. Forms validate inline and move focus sensibly.
- Keyboard-reachable throughout, with a skip link, visible focus, labelled controls and text summaries for charts.
- Motion respects `prefers-reduced-motion`.

## Known limits

- Photos use Unsplash URLs. Each image sits on a generated colour fallback, so pages still look right when a photo can't load.
- The Activity tab on the profile is an early placeholder, as the brief specified.
- Swahili copy is not written yet. Add `messages/sw.ts` with the same shape as `messages/en.ts`.
