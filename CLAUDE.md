# The Job Market — CLAUDE.md

## Overview
Talent marketplace that inverts hiring: employers browse a **ranked feed** of candidates sorted by composite skill score. Candidates build a **portfolio** of projects — files and/or links tagged with skills — instead of submitting a CV. A **salary regression engine** gives both sides a neutral market-anchored compensation reference. Visual identity: warm-dark trading-terminal aesthetic (desaturated terminal green / muted clay red / gold accents on a warm slate canvas, OKLCH).

**Revenue:** Transaction fees — employer pays per pitch sent; candidate pays on match accepted.
**Launch vertical:** Tech · Hong Kong.

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
| Deployment | Vercel | — |

---

## Key Conventions

### Components
- **Server Components by default** — only add `"use client"` when using hooks, browser APIs, or event handlers
- All DB queries in Server Components or Route Handlers — never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Supabase browser client: `src/lib/supabase/client.ts` (singleton, anon key)
- Supabase server client: `src/lib/supabase/server.ts` (cookie-based via `@supabase/ssr`) — only useful for tables with RLS policies that don't depend on `auth.uid()` (e.g. `match_ticker_events`'s public-read policy)
- Service client: `getSupabaseServiceClient()` in `server.ts` — use in Route Handlers, Edge Functions, **and Server Components for any "select/update own row" query**

**Why service client in Server Components:** Better Auth issues its own `better-auth.session_token` cookie, never a Supabase Auth JWT, so `auth.uid()` is always `NULL` in Postgres for these requests. Every RLS policy of the form `using (auth.uid()::text = id)` (or via `get_user_role(auth.uid()::text)`) silently returns no rows under the anon/cookie-based server client. The fix: use `getSupabaseServiceClient()` (bypasses RLS) and apply the ownership filter explicitly in the query (e.g. `.eq("id", session.user.id)` / `.eq("candidate_id", session.user.id)`). RLS remains enabled as defense-in-depth against direct API abuse. Client components that need "own data" reads/writes (e.g. `/profile`, the portfolio editor) call a Route Handler backed by the service client instead of querying Supabase directly.

### Auth
- Better Auth session is the source of truth for authentication
- `getServerSession()` from `src/lib/auth/session.ts` for server-side session access
- `useSession()` from `src/hooks/useSession.ts` for client-side session (wraps Better Auth)
- Role stored on `profiles.role` (enum: candidate | employer)

### Money
- **All monetary values stored as integer cents** in the database (e.g., HKD 80,000 = `8000000`)
- **All salary figures are MONTHLY**, per HK market convention (not annual) — `salary_data_points.monthly_salary`, `desired_salary_*`, `offered_salary`, and ticker `salary_band` strings all represent monthly compensation
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

**Charts** — custom inline SVG in `src/components/charts/`: `Sparkline`, `RadarChart`, `SalaryCurve`, `SalaryScatter`, `DepthBar`, `ScoreBar`. Use these SVG components for any new chart. `SalaryScatter` (linear regression over per-position market data) is used in the job posting form's MARKET DATA panel, fed from the `/api/salary` regression curve (curve points mapped to `{years_exp, salary}`); the request includes `role: form.title`, so the curve reflects the job role selected in the TITLE / JOB ROLE combobox (see `JOB_ROLES` below) when seed data exists for it, falling back to the vertical-level curve otherwise. Shows an "AWAITING MARKET DATA" empty state if fewer than 2 points are returned.

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
| `/candidate/dashboard` | Candidate | Score terminal (live score, radar, salary curve) |
| `/candidate/portfolio` | Candidate | Portfolio grid — projects with files/links and tagged skills |
| `/candidate/portfolio/[projectId]` | Candidate | Create/edit portfolio project |
| `/candidate/postings` | Candidate | Job postings grid (up to 10 positions) |
| `/candidate/postings/[postingId]` | Candidate | Create/edit job posting (incl. market data scatter chart) |
| `/candidate/matches` | Candidate | Incoming pitches (accept/decline) + chat for accepted matches |
| `/candidate/profile` | Candidate | Profile — settings & biodata (display name, vertical, experience, location, salary) |
| `/employer/dashboard` | Employer | Overview stats |
| `/employer/feed` | Employer | Ranked candidate feed (order book layout) |
| `/employer/postings` | Employer | Job postings grid (create roles, set candidate cap) |
| `/employer/postings/[postingId]` | Employer | Create/edit posting + ranked matched-candidates panel (pitch directly from a match) |
| `/employer/matches` | Employer | Sent pitches + match status + chat for accepted matches |
| `/ticker` | Public | Live anonymised match feed (marketing) |

### Proxy (src/proxy.ts)
- Refreshes Supabase session cookie on every request
- Redirects unauthenticated users to `/sign-in`
- Redirects employers from candidate routes to `/employer/dashboard`
- Redirects candidates from employer routes to `/candidate/dashboard`

---

## Database
### Run migrations
```bash
node scripts/apply-migration.cjs supabase/migrations/00XX_name.sql
```
> Migrations 0010+ were applied directly through the pooler (`DATABASE_URL` in `.env.local`) via this script, so the Supabase CLI's migration history doesn't track them — `npx supabase db push` would try to re-apply them and fail. Confirm with the user before running this against the live DB.

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
| `salary_data_points` | vertical, role_label, years_exp, location, monthly_salary (cents), source |
| `matches` | employer_id, candidate_id, posting_id, status, offered_salary, expires_at (72hr) |
| `match_ticker_events` | vertical, salary_band, role_label (anonymised, public) |
| `reputation_events` | subject_id, event_type (ghosted/responded/completed_match), weight |
| `score_history` | candidate_id, composite_score, recorded_at (sparkline data) |
| `candidate_job_postings` | candidate_id, title, location, work_modes, desired_salary_*, skills, notice_period_days |
| `candidate_portfolio_projects` | candidate_id, title, description, link_url, file_path, file_name, skills |
| `employer_job_postings` | employer_id, title, description, vertical, years_exp_*, location, work_modes, salary_*, skills, max_candidates (default 5), status |
| `match_messages` | match_id, sender_id, body, created_at — chat for `accepted` matches only |

> **Legacy/unused:** `challenges`, `questions`, `challenge_results` — the old skill-challenge system, replaced by `candidate_portfolio_projects`. Tables and RLS policies remain in the DB (not dropped, reversible) but are no longer referenced by any route or Edge Function.

### Storage
- `portfolio-files` bucket (private, 10MB limit) — candidate portfolio project uploads, stored at `${candidateId}/${projectId}/${fileName}`. Accessed only via service-client `createSignedUrl()` (60s expiry) from `/api/portfolio/[projectId]/file`.

### DB triggers
- `profile_create_role_row` — after INSERT on `profiles`, auto-creates `candidates` or `employers` row
- `profiles_updated_at` — auto-updates `profiles.updated_at`

---

## Edge Functions
Deploy: `npx supabase functions deploy <name>`
Serve locally: `npx supabase functions serve`

### `recommendation-scorer` (POST `{candidate_id}`)
Triggered via `triggerRecommendationScorer()` (`src/lib/scoring/recommendation-scorer.ts`) after any create/update/delete on `/api/portfolio*`. Computes `composite_score` (0-100) from weighted signals:
- portfolio_breadth (0.20) — `min(project_count / 5, 1)`
- portfolio_skill_coverage (0.25) — `min(distinct_skills / 10, 1)`
- portfolio_completeness (0.20) — avg per-project: +0.5 if `file_path` or `link_url` set, +0.5 if `skills` non-empty
- reputation_score (0.20), response_rate (0.10), profile_completeness (0.05)

Updates `candidates.composite_score` + `percentile_rank`. Inserts `score_history` row.

### `salary-regression` (POST `{vertical, years_exp, location?, remote?, role?}`)
Queries `salary_data_points`, fits degree-2 polynomial regression (pure Deno math). If `role` is given, filters by `salary_data_points.role_label` first and falls back to the vertical-level dataset if fewer than 3 role-specific points exist. Returns:
`{ curve: [{years_exp, predicted_salary, ci_lower, ci_upper}], candidate_percentile, median_at_exp }`
All salary figures (`predicted_salary`, `ci_lower`/`ci_upper`, `median_at_exp`) are MONTHLY HKD in cents.

Called via `/api/salary` proxy route.

### `candidate-matcher` (POST `{posting_id}`)
Triggered by `GET /api/employer-postings/[postingId]/candidates`. Ranks every visible `candidate_job_postings` row against the given `employer_job_postings` row across 6 weighted factors:
- skills overlap (0.35), experience-range fit (0.20), salary-range overlap (0.15), location/work-mode fit (0.10), vertical match (0.10), candidate `composite_score` (0.10)

Returns the top 25 as `{ matches: [{candidate_id, candidate_posting_id, match_score (0-100), ...}] }`. The Route Handler adds `pitchedCandidateIds` and `capacity: { max, active }` (active = `pending`/`accepted` matches on that posting).

---

## Realtime Subscriptions
| Component | Table | Event | Purpose |
|---|---|---|---|
| `DashboardClient` | `candidates` | UPDATE (own row) | Live score updates |
| `FeedClient` | `candidates` | UPDATE (all visible) | Reorder feed when scores change |
| `MatchTickerTape` | `match_ticker_events` | INSERT | Live anonymous match stream |
| `PublicTickerPage` | `match_ticker_events` | INSERT | Public marketing ticker |

> **Known limitation:** `DashboardClient`'s and `FeedClient`'s `candidates` channels subscribe via the anon-key browser client, so Supabase Realtime evaluates the same `auth.uid()`-dependent RLS policies (`candidates_select_own` / `candidates_employer_read`) — both always evaluate false, so these two channels never deliver `postgres_changes` events. `MatchTickerTape`/`PublicTickerPage` are unaffected (`match_ticker_events` has a public-read policy with no `auth.uid()` dependency). Initial page loads for `/dashboard` and `/employer/feed` are correct (service client); only the *live* reorder/score-update behavior is silently inert. Fixing this requires either a broader public RLS policy or replacing these channels with polling against a Route Handler — not yet decided.

---

## Email (src/lib/email/send.ts)
- `sendPitchNotification()` — employer sends pitch, candidate notified
- `sendMatchAcceptedNotification()` — candidate accepts, employer notified
- `sendWelcomeEmail()` — on registration

---

## Anti-Ghosting System
- Matches expire after 72 hours (`expires_at` default)
- Accept/decline inserts `reputation_events` row (`event_type: 'responded'`)
- `GET|POST /api/cron/expire-matches` finds `pending` matches where `expires_at < now()`, sets `status: 'ghosted'`, and inserts a `reputation_events` row per match (`subject_id: candidate_id`, `actor_id: employer_id`, `event_type: 'ghosted'`, `weight: -15`). Scheduled hourly via `vercel.json` (`0 * * * *`). If `CRON_SECRET` is set, the route requires `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends this automatically).
- `recommendation-scorer` reads `reputation_events` to adjust reputation signal in composite score

---

## Salary Data Flow
All salary signals — the ticker, the regression curve, and real outcomes — share one underlying dataset (`salary_data_points`), so the market reference stays grounded in the same numbers shown to users:
- `salary_data_points` rows seeded with `source: 'seed'` drive the initial `salary-regression` curve and `candidate_percentile`/`median_at_exp` shown on `/candidate/dashboard` and the job posting MARKET DATA panel. Seed rows are tagged with both `vertical` and `role_label` (42 roles across the 5 verticals, see `JOB_ROLES` in `src/lib/utils/constants.ts`) so the regression can be filtered per-role. Per migration `0016_real_salary_benchmarks.sql`, each role's seed curve is calibrated to real published HK benchmarks (Morgan McKinley HK Salary Guide 2026, JobsDB employer-disclosed ranges, PayScale/Glassdoor 2026, and the C&SD 2025 Annual Earnings and Hours Survey) — entry and 10-year points per role anchor a `base + growth * yrs^0.85` curve with ±10% noise; full citations are in the migration header.
- The TITLE / JOB ROLE field on `/candidate/postings/[postingId]` (`JobPostingForm.tsx`) is a searchable combobox (`src/components/ui/Combobox.tsx`) populated from `JOB_ROLES`, grouped by vertical. Selecting (or typing) a role is sent to `/api/salary` as `role`, driving the `SalaryScatter` regression below it.
- `POST /api/matches/[matchId]/respond` (`action: "accept"`) derives a `match_ticker_events` row from the *real* match: `vertical`/`role_label` from the linked `employer_job_postings` row (falls back to `tech`/`ENGINEER` if the pitch wasn't sent from a posting), and `salary_band` as a ±5% band around `matches.offered_salary` via `formatSalaryBand()`.
- The same accepted offer is also inserted into `salary_data_points` with `source: 'match'` (`years_exp`/`location`/`remote` from the candidate's profile and posting work modes, `monthly_salary: offered_salary`) — so every completed match incrementally improves the regression curve that future candidates and employers see.

---

## Chat (Accepted Matches)
- `match_messages` (match_id, sender_id, body, created_at) — RLS: participants of the match can read; insert requires `sender_id = auth.uid()` and `matches.status = 'accepted'`
- `GET|POST /api/matches/[matchId]/messages` — service client, scoped to the match's `employer_id`/`candidate_id`; POST rejected (409) unless the match is `accepted`
- `MatchChat` (`src/components/terminal/MatchChat.tsx`) — polling-based (5s interval; no Realtime, per the known `auth.uid()` RLS limitation above), rendered inside accepted-match cards on `/candidate/matches` and `/employer/matches`

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
- `CRON_SECRET` (optional — verifies `/api/cron/*` requests)
