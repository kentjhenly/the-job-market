# The Job Market — CLAUDE.md

## Overview
Talent marketplace that inverts hiring: employers browse a **ranked feed** of candidates sorted by composite skill score. Candidates complete **skill challenges** (no CVs). A **salary regression engine** gives both sides a neutral market-anchored compensation reference. Visual identity: warm-dark trading-terminal aesthetic (desaturated terminal green / muted clay red / gold accents on a warm slate canvas, OKLCH).

**Revenue:** Transaction fees — employer pays per pitch sent; candidate pays on match accepted.
**Launch vertical:** Tech · Singapore.

---

## Stack
| Layer | Tool | Version |
|---|---|---|
| Framework | Next.js App Router (TypeScript) | 16.x |
| Styling | Tailwind CSS v4 (CSS-based config — no tailwind.config.ts) | 4.x |
| Database | Supabase (PostgreSQL + Realtime + Edge Functions) | — |
| Auth | Better Auth | 1.x |
| Email | Resend | — |
| Analytics | PostHog | — |
| Charts | Custom inline SVG (`src/components/charts/`) | — |
| Server state | TanStack Query | 5.x |
| Deployment | Vercel | — |

---

## Key Conventions

### Components
- **Server Components by default** — only add `"use client"` when using hooks, browser APIs, or event handlers
- All DB queries in Server Components or Route Handlers — never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Supabase browser client: `src/lib/supabase/client.ts` (singleton, anon key)
- Supabase server client: `src/lib/supabase/server.ts` (cookie-based via `@supabase/ssr`)
- Service client: `getSupabaseServiceClient()` in `server.ts` — use only in Route Handlers and Edge Functions

### Auth
- Better Auth session is the source of truth for authentication
- `getServerSession()` from `src/lib/auth/session.ts` for server-side session access
- `useSession()` from `src/hooks/useSession.ts` for client-side session (wraps Better Auth)
- Role stored on `profiles.role` (enum: candidate | employer)

### Money
- **All monetary values stored as integer cents** in the database (e.g., SGD 80,000 = `8000000`)
- Use `formatSalary()` / `formatSalaryBand()` from `src/lib/utils/formatters.ts` for display

### Design System (src/app/globals.css)
Single hard-coded "terminal green + warm slate" OKLCH palette — no theme switcher. CSS custom properties on `:root`, mapped into Tailwind v4 `@theme` (CSS-based config, no `tailwind.config.ts`).

**Color tokens** (`--var` → Tailwind utility):
| `--var` | Tailwind utility | Use |
|---|---|---|
| `--bg` / `--bg-deep` | `bg-bg` / `bg-bg-deep` | Page background (deep = body/html base) |
| `--surface` / `--surface-2` / `--surface-3` | `bg-surface` / `bg-surface-2` / `bg-surface-3` | Panel backgrounds, increasing elevation |
| `--border-soft` | `border-border` (default) | Standard panel/row borders |
| `--border-strong` | `border-border-strong` | Emphasized borders |
| `--border` (medium) | *no utility* — use `style={{ borderColor: 'var(--border)' }}` | Inputs, dividers needing more contrast than soft |
| `--text` / `--text-2` | `text-text` / `text-text-2` | Primary / secondary copy |
| `--muted` / `--dim` | `text-muted` / `text-dim` | Labels, captions, placeholders |
| `--up` (+`-dim`) | `text-up`/`bg-up`/`bg-up-dim` (alias `text-green`/`bg-green`) | Positive, active, primary accent |
| `--down` (+`-dim`) | `text-down`/`bg-down`/`bg-down-dim` (alias `text-danger`/`bg-danger`) | Negative, errors, declined |
| `--gold` (+`-dim`) | `text-gold`/`bg-gold`/`bg-gold-dim` | Top-tier rank, gold signals |
| `--info` | `text-info` | Informational accent |

`-dim` variants and translucent borders use `color-mix(in oklch, var(--x) N%, transparent)`.

**Utility classes** (defined in globals.css — prefer these over ad-hoc Tailwind):
- `.mono` / `.tnum` — JetBrains Mono + tabular numerals
- `.kicker` — uppercase mono label (10.5px, letter-spaced, `--muted`)
- `.c-up` / `.c-down` / `.c-gold` / `.c-muted` / `.c-text` / `.c-dim` — text color shorthands
- `.btn`, `.btn-primary`, `.btn-danger`, `.btn-ghost`, `.btn-sm`, `.btn-lg` — buttons (use `Button` component)
- `.panel`, `.panel-head`, `.panel-title` — card/panel chrome (use raw classes; `Card`/`CardHeader`/`CardTitle` were removed)
- `.field` — inputs, selects, textareas
- `.badge`, `.badge-up`, `.badge-down`, `.badge-gold`, `.badge-muted` — status pills (use `Badge` component)
- `.datarow`, `.dr-label`, `.dr-value` — `key: value` rows (use `DataRow` component, `color` prop = `up`/`down`/`gold`)
- `.live-dot` (+ `livepulse` animation) — realtime indicator (use `LiveDot` component)
- `.countup` (+ `countup` animation) — paired with `useCountUp` hook for number tickers
- `.view-enter` — staggered rise-in for top-level page sections (apply once per page, max ~6 direct children)
- `.ticker-wrap` / `.ticker-track` (+ `tickerscroll`, `--tdur` var) — horizontal marquee (`MatchTickerTape`)
- `.slideover-panel` (+ `slideover` animation, gated by `html.anim-on` via `AnimEnabler`) — slide-in detail drawers
- `.grid-tex` — subtle grid texture (landing hero)
- `.link-up`, `.hr`, `.navitem`/`.active`/`.ni-dot`, `.tabbar`/`.tab`/`.active`
- All animations respect `prefers-reduced-motion`

**Charts** — custom inline SVG in `src/components/charts/`: `Sparkline`, `RadarChart`, `SalaryCurve`, `DepthBar`, `ScoreBar`. Recharts remains an installed dependency but is unused — prefer the SVG components for any new chart.

### Typography
- `font-mono` (JetBrains Mono) — ALL numbers, scores, salaries, data values, labels, kickers
- `font-sans` (Inter) — headings, body copy, marketing text
- Monospace rule: if it's a number on screen, it must be `font-mono` / `.mono`

---

## Route Map
| Path | Role | Description |
|---|---|---|
| `/` | Public | Landing page |
| `/sign-in` | Public | Auth |
| `/sign-up` | Public | Role picker |
| `/sign-up/candidate` | Public | Candidate registration |
| `/sign-up/employer` | Public | Employer registration |
| `/dashboard` | Candidate | Score terminal (live score, radar, salary curve) |
| `/challenges` | Candidate | Challenge list |
| `/challenges/[id]` | Candidate | Challenge runner |
| `/challenges/[id]/results` | Candidate | Post-challenge score breakdown |
| `/salary` | Candidate | Full salary curve + market position |
| `/matches` | Candidate | Incoming pitches (accept/decline) |
| `/profile` | Candidate | Edit profile (exp, location, salary range) |
| `/employer/dashboard` | Employer | Overview stats |
| `/employer/feed` | Employer | Ranked candidate feed (order book layout) |
| `/employer/matches` | Employer | Sent pitches + match status |
| `/ticker` | Public | Live anonymised match feed (marketing) |

### Middleware (src/middleware.ts)
- Refreshes Supabase session cookie on every request
- Redirects unauthenticated users to `/sign-in`
- Redirects employers from candidate routes to `/employer/dashboard`
- Redirects candidates from employer routes to `/dashboard`

---

## Database
### Run migrations
```bash
npx supabase db push
```

### Generate types
```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

### Tables
| Table | Key columns |
|---|---|
| `profiles` | id (FK auth.users), role (candidate/employer), display_name |
| `candidates` | composite_score, percentile_rank, years_exp_claimed, desired_salary_*, is_visible |
| `employers` | company_name, credits, reputation_score |
| `challenges` | vertical, title, time_limit_sec, max_score, is_active |
| `questions` | challenge_id, type, prompt, options (JSONB), correct_answer, weight |
| `challenge_results` | candidate_id, challenge_id, raw_score, normalised_score, answers (JSONB) |
| `salary_data_points` | vertical, years_exp, location, annual_salary (cents), source |
| `matches` | employer_id, candidate_id, status, offered_salary, expires_at (72hr) |
| `match_ticker_events` | vertical, salary_band, role_label (anonymised, public) |
| `reputation_events` | subject_id, event_type (ghosted/responded/completed_match), weight |
| `score_history` | candidate_id, composite_score, recorded_at (sparkline data) |

### DB triggers
- `profile_create_role_row` — after INSERT on `profiles`, auto-creates `candidates` or `employers` row
- `profiles_updated_at` — auto-updates `profiles.updated_at`

---

## Edge Functions
Deploy: `npx supabase functions deploy <name>`
Serve locally: `npx supabase functions serve`

### `recommendation-scorer` (POST `{candidate_id}`)
Triggered by challenge submit route (`/api/challenges/[id]/submit`). Computes `composite_score` (0-100) from weighted signals:
- challenge_score_avg (0.40), recency with decay (0.10), speed (0.05), breadth (0.10)
- reputation_score (0.20), response_rate (0.10), profile_completeness (0.05)

Updates `candidates.composite_score` + `percentile_rank`. Inserts `score_history` row.

### `salary-regression` (POST `{vertical, years_exp, location?, remote?}`)
Queries `salary_data_points`, fits degree-2 polynomial regression (pure Deno math). Returns:
`{ curve: [{years_exp, predicted_salary, ci_lower, ci_upper}], candidate_percentile, median_at_exp }`

Called via `/api/salary` proxy route.

---

## Realtime Subscriptions
| Component | Table | Event | Purpose |
|---|---|---|---|
| `DashboardClient` | `candidates` | UPDATE (own row) | Live score updates |
| `FeedClient` | `candidates` | UPDATE (all visible) | Reorder feed when scores change |
| `MatchTickerTape` | `match_ticker_events` | INSERT | Live anonymous match stream |
| `PublicTickerPage` | `match_ticker_events` | INSERT | Public marketing ticker |

---

## Email (src/lib/email/send.ts)
- `sendPitchNotification()` — employer sends pitch, candidate notified
- `sendMatchAcceptedNotification()` — candidate accepts, employer notified
- `sendWelcomeEmail()` — on registration

---

## Anti-Ghosting System
- Matches expire after 72 hours (`expires_at` default)
- Accept/decline inserts `reputation_events` row (`event_type: 'responded'`)
- A scheduled function should mark expired pending matches as `ghosted` and insert employer reputation event
- `recommendation-scorer` reads `reputation_events` to adjust reputation signal in composite score

---

## Development Commands
```bash
npm run dev                   # Start Next.js dev server
npx supabase start            # Start local Supabase instance
npx supabase db push          # Apply migrations
npx supabase functions serve  # Serve Edge Functions locally
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
npm run build                 # Production build
```

---

## Environment Variables
See `.env.example`. Required:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Route Handlers + Edge Functions only)
- `DATABASE_URL` (direct Postgres for Better Auth)
- `BETTER_AUTH_SECRET` (32-char random string)
- `RESEND_API_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`
