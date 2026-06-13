# The Job Market — CLAUDE.md

## Overview
Talent marketplace that inverts hiring: employers browse a **ranked feed** of candidates sorted by composite skill score. Candidates build a **portfolio** of projects — files and/or links tagged with skills — instead of submitting a CV. A **salary regression engine** gives both sides a neutral market-anchored compensation reference. Visual identity: warm-dark trading-terminal aesthetic (desaturated terminal green / muted clay red / gold accents on a warm slate canvas, OKLCH).

**Revenue:** Credits — employers spend 1 credit to create a job posting, candidates spend 1 credit to accept a pitch (sending pitches is always free). Each side gets a 3-action free trial before credits are required — see **Credits & Free Trial** under Key Conventions.
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

### Credits & Free Trial
- Browsing the feed and sending pitches is **free** for employers. Two actions cost 1 credit each:
  - Employers: creating a job posting — `POST /api/employer-postings`, decrements `employers.credits`
  - Candidates: accepting a pitch — `POST /api/matches/[matchId]/respond` with `action: "accept"`, decrements `candidates.credits`
- Each side gets a free trial before credits are charged, tracked via counter columns compared against constants in `src/lib/utils/constants.ts`:
  - `employers.free_postings_used` vs `FREE_JOB_POSTINGS` (3)
  - `candidates.free_accepts_used` vs `FREE_MATCH_ACCEPTS` (3)
- `usingFreeTrial = counter < limit`. If `!usingFreeTrial && credits < 1`, the route returns `402` with an error message (surfaced inline in the UI); otherwise the relevant counter or `credits` column is updated after the underlying insert/update succeeds.
- UI surfaces remaining free actions / balances: `TopBar` stats (employer CREDITS; candidate SCORE + CREDITS), `/employer/postings` header + "+CREATE POSTING" tile, `EmployerJobPostingForm`'s cost banner (disables SAVE when exhausted), `/candidate/dashboard` POSITION SUMMARY ("MATCH CREDITS" row), and `/candidate/matches` header + accept-button note.

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

**Charts** — custom inline SVG in `src/components/charts/`: `Sparkline`, `RadarChart`, `SalaryCurve`, `SalaryScatter`, `DepthBar`, `ScoreBar`. Use these SVG components for any new chart. `SalaryScatter` is used in the job posting form's MARKET DATA panel, fed from `/api/salary`: it plots the *actual* `salary_data_points` observations behind the fit (`points`, stride-sampled to ≤200 by the Edge Function) as grey dots, the polynomial regression `curve` as the green line, a ±1σ band shaded from `std_dev`, and the candidate's desired min/max as gold markers at the experience set via the form's EXPERIENCE — YEARS / MONTHS inputs (defaulting from `candidates.years_exp_claimed`). The request includes `role: form.title`, so everything reflects the job role selected in the TITLE / JOB ROLE combobox (see `JOB_ROLES` below) when seed data exists for it, falling back to the vertical-level dataset otherwise. If `curve` is absent it falls back to a local least-squares line over `points`; shows an "AWAITING MARKET DATA" empty state when both are missing.

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
| `/candidate/matches` | Candidate | Incoming pitches (accept/decline); unread indicators + CHAT → opens an in-app chat slide-over for accepted matches |
| `/candidate/profile` | Candidate | Profile — settings & biodata (display name, vertical, experience, location, salary) |
| `/employer/dashboard` | Employer | Overview stats |
| `/employer/feed` | Employer | Ranked candidate feed (order book layout) |
| `/employer/postings` | Employer | Job postings grid (create roles, set candidate cap) |
| `/employer/postings/[postingId]` | Employer | Create/edit posting + ranked matched-candidates panel (pitch directly from a match) |
| `/employer/matches` | Employer | Sent pitches + match status; unread indicators + CHAT → opens an in-app chat slide-over for accepted matches |
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
| `candidates` | composite_score, percentile_rank, years_exp_claimed, desired_salary_*, is_visible, credits, free_accepts_used |
| `employers` | company_name, credits, free_postings_used, reputation_score |
| `salary_data_points` | vertical, role_label, years_exp, location, monthly_salary (cents), source |
| `matches` | employer_id, candidate_id, posting_id, status, offered_salary, expires_at (72hr), offer_status, offer_salary, offer_sent_at, hired_at, last_message_at, candidate_last_read_at, employer_last_read_at |
| `match_ticker_events` | vertical, salary_band, role_label (anonymised, public) |
| `reputation_events` | subject_id, event_type (ghosted/responded/completed_match), weight |
| `score_history` | candidate_id, composite_score, recorded_at (sparkline data) |
| `candidate_job_postings` | candidate_id, title, location, work_modes, desired_salary_*, skills, available_from (notice_period_days is legacy/unused) |
| `candidate_portfolio_projects` | candidate_id, title, description, link_url, file_path, file_name, skills |
| `employer_job_postings` | employer_id, title, description, vertical, years_exp_*, location, work_modes, salary_*, skills, max_candidates (default 5), status |
| `match_messages` | match_id, sender_id, body, message_type (text/offer/offer_accepted/offer_declined/file), file_path, file_name, file_size, created_at — chat for `accepted` matches only |

> **Legacy/unused:** `challenges`, `questions`, `challenge_results` — the old skill-challenge system, replaced by `candidate_portfolio_projects`. Tables and RLS policies remain in the DB (not dropped, reversible) but are no longer referenced by any route or Edge Function.

### Storage
- `portfolio-files` bucket (private, 10MB limit) — candidate portfolio project uploads, stored at `${candidateId}/${projectId}/${fileName}`. Accessed only via service-client `createSignedUrl()` (60s expiry) from `/api/portfolio/[projectId]/file`.
- `match-files` bucket (private, 10MB limit) — chat file attachments for accepted matches, stored at `${matchId}/${messageId}-${fileName}`. Accessed only via service-client `createSignedUrl()` (60s expiry) from `/api/matches/[matchId]/messages/[messageId]/file`.

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

### `salary-regression` (POST `{years_exp, vertical?, location?, remote?, role?}`)
Queries `salary_data_points`, fits degree-2 polynomial regression (pure Deno math). Cascades from most to least specific until ≥3 points are found: role(+location) → vertical(+location) → overall market(+location), dropping the location filter within each level first. Queries are `.order("id").limit(1000)` (uuid order ≈ random) so the cap stays an unbiased sample. Returns:
`{ curve: [{years_exp, predicted_salary, ci_lower, ci_upper}], points: [{years_exp, monthly_salary}], std_dev, candidate_percentile, median_at_exp }`
`points` is the actual observation set behind the fit (stride-sampled to ≤200); `std_dev` is the residual standard deviation. All salary figures are MONTHLY HKD in cents.

Called via `/api/salary` proxy route.

### `candidate-matcher` (POST `{posting_id}`)
Triggered by `GET /api/employer-postings/[postingId]/candidates`. Ranks every visible `candidate_job_postings` row against the given `employer_job_postings` row across 6 weighted factors:
- skills overlap (0.35), experience-range fit (0.20), salary-range overlap (0.15), location/work-mode fit (0.10), vertical match (0.10), candidate `composite_score` (0.10)

If the employer posting's `work_modes` includes `remote`, the location factor is scored 1 for everyone (location is irrelevant for remote roles). Each match also gets `match_percentile` (0-100): the share of *all* evaluated visible candidates it out-scores for this posting, computed before truncation. Returns the top 25 sorted by `match_score` desc as `{ matches: [{candidate_id, candidate_posting_id, match_score (0-100), match_percentile, ...}] }`. The Route Handler adds `pitchedCandidateIds` and `capacity: { max, active }` (active = `pending`/`accepted` matches on that posting).

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
Two independent timeout rules, both enforced by `GET|POST /api/cron/expire-matches` (`run()` → `{ expired, ghosted_chats }`). Scheduled hourly via `vercel.json` (`0 * * * *`). If `CRON_SECRET` is set, the route requires `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sends this automatically).

- **Pending pitches** (`expirePendingPitches()`): matches expire after 72 hours (`expires_at` default). Accept/decline inserts a `reputation_events` row (`event_type: 'responded'`). Finds `pending` matches where `expires_at < now()`, sets `status: 'ghosted'`, and inserts a `reputation_events` row per match (`subject_id: candidate_id`, `actor_id: employer_id`, `event_type: 'ghosted'`, `weight: -15`).
- **Silent chats** (`expireSilentChats()`): an `accepted` match that hasn't reached a hire (`hired_at IS NULL`) is auto-ghosted if neither party sends a `match_messages` row within `CHAT_GHOST_HOURS` (72, `src/lib/utils/constants.ts`) of the last activity — `last_message_at` if a message has been sent, otherwise `responded_at`. The silent party is whoever did **not** send the most recent message (defaults to the employer if no messages were ever sent, since the employer is expected to open the chat). Sets `status: 'ghosted'` and inserts a `reputation_events` row (`event_type: 'ghosted'`, `weight: -15`) against the silent party.
- `recommendation-scorer` reads `reputation_events` to adjust the reputation signal in composite score

---

## Salary Data Flow
All salary signals — the ticker, the regression curve, and real outcomes — share one underlying dataset (`salary_data_points`), so the market reference stays grounded in the same numbers shown to users:
- `salary_data_points` rows seeded with `source: 'seed'` drive the initial `salary-regression` curve and `candidate_percentile`/`median_at_exp` shown on `/candidate/dashboard` and the job posting MARKET DATA panel. Seed rows are tagged with both `vertical` and `role_label` (97 roles across the 13 verticals, see `JOB_ROLES` in `src/lib/utils/constants.ts`) so the regression can be filtered per-role. Per migrations `0016_real_salary_benchmarks.sql` (original 5 verticals) and `0018_new_vertical_salary_data.sql` (8 white-collar verticals added by `0017_expand_verticals.sql`: legal, healthcare, education, sales, hr, consulting, property, media), each role's seed curve is calibrated to real published HK benchmarks (Morgan McKinley HK Salary Guide 2026, JobsDB employer-disclosed ranges, PayScale/Glassdoor/ERI/Indeed 2025-26, and the C&SD 2025 Annual Earnings and Hours Survey) — entry and 10-year points per role anchor a `base + growth * yrs^0.85` curve with ±10% noise; full citations are in the migration headers.
- The POSITION panel on `/candidate/postings/[postingId]` (`JobPostingForm.tsx`) has an INDUSTRY select (13 verticals + "ALL INDUSTRIES" default) above a ROLE searchable combobox (`src/components/ui/Combobox.tsx`) populated from `JOB_ROLES` (filtered to the chosen industry, grouped by vertical). The pair drives a market-data cascade sent to `/api/salary`: no industry → overall market regression; industry chosen → that vertical's regression; role chosen → that role's regression. The industry choice also filters the SKILLS panel to that vertical's skills. Changing industry clears the role if it belongs to a different industry's role list. Skills are picked via `SkillPicker` (`src/components/ui/SkillPicker.tsx`: industry-suggested badges + a SEARCH ALL SKILLS input across the full ~413-skill bank), capped at `MAX_POSTING_SKILLS` (10) per posting — enforced in the picker and in all four posting API routes. The employer posting form and the portfolio project form use the same picker (the portfolio form is search-only, uncapped).
- `POST /api/matches/[matchId]/respond` (`action: "accept"`) derives a `match_ticker_events` row from the *real* match: `vertical`/`role_label` from the linked `employer_job_postings` row (falls back to `tech`/`ENGINEER` if the pitch wasn't sent from a posting), `salary` = the accepted `matches.offered_salary`, and `delta_pct` = % the accepted salary sits above/below the `salary-regression` median for that role & the candidate's experience (best-effort internal call; null if unavailable). The tape and `/ticker` page render `ROLE · HKD xK · ▲ +x.x%` (green above median, red ▼ below); rows without `delta_pct` fall back to `salary_band`/`▲ MATCH`.
- The same accepted offer is also inserted into `salary_data_points` with `source: 'match'` (`role_label` from the employer posting's title, `years_exp`/`location`/`remote` from the candidate's profile and posting work modes, `monthly_salary: offered_salary`) — so every completed match incrementally improves the regression curve that future candidates and employers see. `salary-regression` returns `source` per point and fetches match-sourced rows in a separate uncapped-in-practice query (limit 500) alongside the 1000-row seed sample, so real outcomes always contribute to the fit and are never stride-sampled away; `SalaryScatter` renders `source: 'match'` observations as larger terminal-green dots (REAL MATCHES legend entry) so real outcomes stand out from seed data. Matches accepted before this feedback loop shipped were backfilled by migration `0021_backfill_match_salary_points.sql` (only those with `offered_salary` + candidate `years_exp_claimed` — a regression point needs an x-coordinate).

---

## Chat & Hire Offers (Accepted Matches)
- `match_messages` (match_id, sender_id, body, message_type, file_path, file_name, file_size, created_at) — RLS: participants of the match can read; insert requires `sender_id = auth.uid()` and `matches.status = 'accepted'`. `message_type`: `text` (default) | `offer` | `offer_accepted` | `offer_declined` | `file` — for the offer types, `body` is `JSON.stringify({ offered_salary })`, read back via `parseOfferSalary()`; for `file`, `body` is the original filename and `file_path`/`file_name`/`file_size` describe the `match-files` upload.
- `GET|POST /api/matches/[matchId]/messages` — service client, scoped to the match's `employer_id`/`candidate_id`; POST rejected (409) unless the match is `accepted`. A `multipart/form-data` POST (`file` field) uploads to the `match-files` bucket and inserts a `message_type: 'file'` row (client-validated against `MAX_CHAT_FILE_SIZE_MB`); a JSON POST inserts a `text` message as before. Both paths stamp `matches.last_message_at = now()` (drives the silent-chat rule above) and the sender's own `candidate_last_read_at`/`employer_last_read_at` via `readColumnFor()` (`src/lib/utils/matchReads.ts`), so senders never see their own activity as unread. GET returns `{ messages, currentUserId, match }`, where `match` includes `status, offer_status, offer_salary, offer_sent_at, hired_at, last_message_at`.
- `GET /api/matches/[matchId]/messages/[messageId]/file` — participant-scoped; resolves `match_messages.file_path` to a `match-files` signed URL (60s expiry) and redirects, mirroring `/api/portfolio/[projectId]/file`.
- `POST /api/matches/[matchId]/offer` — hire-offer state machine on `matches.offer_status` (`null → 'pending' → 'accepted' | 'declined'`); each action also stamps the acting user's own read column via `readColumnFor()`:
  - `action: "send"` (employer; match `accepted`, no offer pending, not yet hired) — sets `offer_status: 'pending'`, `offer_salary`, `offer_sent_at`; inserts a `message_type: 'offer'` message
  - `action: "accept"` (candidate; `offer_status: 'pending'`) — sets `offer_status: 'accepted'`, `hired_at: now()`; inserts a `message_type: 'offer_accepted'` message; inserts a `reputation_events` row for **each** party (`event_type: 'completed_match'`, `weight: 10`)
  - `action: "decline"` (candidate; `offer_status: 'pending'`) — sets `offer_status: 'declined'`; inserts a `message_type: 'offer_declined'` message
- `MatchChat` (`src/components/terminal/MatchChat.tsx`) — polling-based (5s interval; no Realtime, per the known `auth.uid()` RLS limitation above), rendered inside a second `.slideover-panel` (titled `CHAT`) on `/candidate/matches` and `/employer/matches`, alongside the existing `PITCH DETAIL` slide-over. Header strip shows the counterpart's name + score/percentile (employer's view of a candidate) or reputation (candidate's view of an employer), plus the pitch's `offered_salary`. Renders `offer`/`offer_accepted`/`offer_declined` messages as centered system cards and `file` messages as a bordered row with filename, `formatFileSize(file_size)`, and a `DOWNLOAD →` link to the file route above; a 📎 button opens a file picker to send attachments. Shows the employer a "SEND HIRE OFFER" action when eligible. The candidate's accept/decline is a **multi-layer confirm** (an initial review step, then a final step gated behind a required confirmation checkbox) so an offer can't be accepted or declined with a single accidental tap. Non-`accepted` matches render a "CHAT CLOSED" state; a persistent footer reminds both parties of the `CHAT_GHOST_HOURS` reputation penalty for silence.
- **Chat slide-over & unread tracking**: `/candidate/matches` and `/employer/matches` show a pulsing `.live-dot` on rows with unread activity — `last_message_at` (or `created_at` if no messages) newer than the viewer's `candidate_last_read_at`/`employer_last_read_at` (candidate side treats `NULL` as unread, since `employer_last_read_at` defaults to `now()` at insert but `candidate_last_read_at` starts `NULL`). Both slide-overs share the same `.slideover-panel` position (`right: 0`): `selectedId` state drives `PITCH DETAIL` (opened via row click → `openRow`) and `chatMatchId` state drives `CHAT` (opened via the row's `CHAT →` button or the `PITCH DETAIL` slide-over's `OPEN CHAT →` button → `openChat`, accepted matches only) — each opener clears the other's state so only one slide-over is visible at a time. Both `openRow` and `openChat` call `markRead()`, which stamps the viewer's read column via `POST /api/matches/[matchId]/read` and optimistically mirrors it client-side, clearing the unread dot immediately.

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
