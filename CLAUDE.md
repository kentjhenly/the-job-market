# The Job Market — CLAUDE.md

## Overview
Talent marketplace that inverts hiring: employers browse a **ranked feed** of candidates sorted by composite skill score. Candidates build a **portfolio** of projects — files and/or links tagged with skills — instead of submitting a CV. A **salary regression engine** gives both sides a neutral market-anchored compensation reference. Visual identity: neutral-dark trading-terminal aesthetic (desaturated terminal green / muted clay red / gold accents on a neutral slate canvas, OKLCH).

**Revenue:** Employer subscriptions. Employers need an active subscription (`employers.subscription_status = 'active'`, tier `starter` or `pro`) to browse the candidate feed and send pitches. Job postings are free for an employer's first 3 postings; beyond that, an active subscription is required for unlimited postings. Sending and accepting pitches are both free for candidates. See **Employer Subscriptions** under Key Conventions.
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
- **Employer email verification** — ⚠️ **currently SHELVED for local dev** (commented out, not deleted): the `emailVerification` config in `src/lib/auth/auth.ts`, its `sendVerificationEmail` import, and the `EmployerLayout` redirect gate in `src/app/employer/layout.tsx` are all commented out, so employers are not required to verify while running locally. The `/verify-email` page + resend button remain in the codebase but are unreachable until the gate is re-enabled. Re-enable all three for production. The intended behavior when enabled (`src/lib/auth/auth.ts`'s `emailVerification` config): `sendOnSignUp: true` + `autoSignInAfterVerification: true`, with `requireEmailVerification` left `false` (gating happens at the layout level, not at sign-in). `sendVerificationEmail` is called for every new user on sign-up but no-ops unless `role === "employer"`, so candidates never receive a verification email and see no behavior change. For employers, it calls `sendVerificationEmail()` (`src/lib/email/send.ts`) with Better Auth's verification link. `EmployerLayout` (`src/app/employer/layout.tsx`) redirects to `/verify-email` whenever `session.user.emailVerified` is `false`; `/verify-email` (`src/app/(auth)/verify-email/page.tsx`) shows a "check your inbox" message and a resend button that `POST`s `/api/auth/send-verification-email` (Better Auth's built-in endpoint, handled by `src/app/api/auth/[...all]/route.ts`). `/sign-up/employer` passes `callbackURL: "/employer/dashboard"` so the emailed verification link lands the employer back in their dashboard once verified.
- **Change password / email / delete account** (Settings → SECURITY and DANGER ZONE tabs, both roles, via the `authClient` from `src/lib/auth/auth-client.ts`):
  - **Change password** — `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })` (`ChangePasswordForm`). Available because `emailAndPassword` is enabled.
  - **Change email** — `user.changeEmail.enabled: true` in `auth.ts` with `sendChangeEmailVerification` → `sendEmailChangeVerification()`. For a **verified** address (employers) Better Auth emails an approval link to the *current* inbox before switching; for an **unverified** one (candidates) the change applies immediately. `ChangeEmailForm` branches its success message on `session.user.emailVerified`. `databaseHooks.user.update.after` syncs `profiles.email` to the new `user.email`.
  - **Delete account** — `user.deleteUser.enabled: true` with a `beforeDelete` hook. Deletion cascades `user → profiles → candidates/employers` and their dependents, but `matches` (→candidates/employers), `reputation_events.actor_id`, and `salary_data_points.match_id` are `RESTRICT`, so `beforeDelete` first nulls `salary_data_points.match_id` for the user's matches (preserving the observation), deletes the user's `matches` (cascading `match_messages`/`portfolio_feedback`), and nulls `reputation_events.actor_id` (preserving other parties' history). `DeleteAccountForm` requires the password plus a confirmation checkbox, then `authClient.deleteUser({ password })` and redirects home. Orphaned `portfolio-files`/`match-files` storage objects are not cleaned up (TODO).

### Money
- **All monetary values stored as integer cents** in the database (e.g., HKD 80,000 = `8000000`)
- **All salary figures are MONTHLY**, per HK market convention (not annual) — `salary_data_points.monthly_salary`, `desired_salary_*`, `offered_salary`, and ticker `salary_band` strings all represent monthly compensation
- Use `formatSalary()` / `formatSalaryBand()` from `src/lib/utils/formatters.ts` for display

### Employer Subscriptions
- `/employer/feed` and sending a pitch (`POST /api/matches`) require an active employer subscription: `employers.subscription_tier` (`none | starter | pro`), `employers.subscription_status` (`active | past_due | canceled`), `employers.subscription_period_end` (added in `0025_employer_subscriptions.sql`).
- If `subscription_status !== 'active'`, `POST /api/matches` returns `402`, and `/employer/feed` renders `UpgradePanel` instead of `FeedClient`.
- Creating a job posting (`POST /api/employer-postings`) is free for an employer's first `FREE_JOB_POSTINGS` postings (3, `src/lib/utils/constants.ts`), regardless of subscription status, counted live from `employer_job_postings` row count (no separate counter column). The `FREE_JOB_POSTINGS`+1th posting onward returns `402` unless `subscription_status === 'active'`; with an active subscription, postings are unlimited. `/employer/postings` shows a FREE TRIAL indicator (`X / 3 POSTINGS USED`) linking to `/employer/feed` to subscribe once the limit is reached.
- No payment provider is integrated yet, these columns are manually-settable for now. TODO(stripe): a webhook for `customer.subscription.*` events should keep them in sync, see the TODO comments in `src/app/api/matches/route.ts`, `src/app/api/employer-postings/route.ts`, and `src/app/employer/feed/page.tsx`.
- UI surfaces the current tier: `TopBar` employer PLAN stat, `/employer/dashboard`'s SUBSCRIPTION tile (links to `/employer/feed` to upgrade when inactive).
- Accepting a pitch (`POST /api/matches/[matchId]/respond` with `action: "accept"`) is free for candidates, no credit charge — the old `candidates.credits`/`free_accepts_used` and `employers.credits`/`free_postings_used` columns were dropped in `0026_drop_legacy_credits.sql`.

### Design System (src/app/globals.css)
Single hard-coded "terminal green + neutral slate" OKLCH palette — no theme switcher. CSS custom properties on `:root`, mapped into Tailwind v4 `@theme` (CSS-based config, no `tailwind.config.ts`).

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

**Charts** — custom inline SVG in `src/components/charts/`: `Sparkline`, `RadarChart`, `SalaryCurve`, `SalaryScatter`, `DepthBar`, `ScoreBar`. Use these SVG components for any new chart. Both salary charts **lead with honesty over false precision**: the modeled **p25–p75 IQR band is the hero element** (translucent `color-mix` of the tone accent), with the p50 median line inside it and a fainter dashed p90 upper line. Each carries sample-size honesty — below `LOW_N` (8) observations the band fades (11% vs 22% fill) and gains a dashed outline, and the header kicker flips from a dim "MODELED FROM N DATA POINTS" to a gold "LOW CONFIDENCE · MODELED FROM N DATA POINTS"; a "MODELED ESTIMATE" kicker labels the chart and a footer surfaces `marginal_per_year` as "≈ +HK$X /mo per additional year of experience" (with "· think at the margin." in candidate tone). A `tone` prop (`candidate` → `--up` green / `employer` → `--info` blue) sets the accent. Band/dot transitions reuse the `.spark-line`/`.spark-dot` classes, so they respect `prefers-reduced-motion`. All consumers map the `/api/salary` curve with fallbacks (`p25 ?? ci_lower`, `p50 ?? predicted_salary`, …) and `nPoints` (`n_points ?? points.length`) so the charts render correctly against both the new shrinkage-Mincer edge function and the older alias-only response.
  - `SalaryCurve` (candidate dashboard SALARY POSITION panel) plots the candidate's own salary as a gold "you are here" dot at `(years_exp_claimed, current_salary)` with a percentile callout ("62nd · 4Y").
  - `SalaryScatter` (job posting MARKET DATA / COMPETITIVENESS panels, candidate and employer) additionally overlays the raw `salary_data_points` observations behind the fit (`points`, stride-sampled to ≤200) as muted grey dots and match-sourced outcomes as larger green dots (the honesty layer), and plots the candidate's desired / employer's offered min–max as a gold range bar at the EXPERIENCE the form sets (defaulting from `candidates.years_exp_claimed`). The request includes `role: form.title`, so everything reflects the job role selected in the TITLE / JOB ROLE combobox (see `JOB_ROLES` below) when seed data exists for it, falling back to the vertical-level dataset otherwise. If `curve` is absent it falls back to a local least-squares line over `points`; both charts show an "AWAITING MARKET DATA" empty state when there are fewer than 2 points.

### Typography
- `font-mono` and `font-sans` (both IBM Plex Mono) — the entire site is monospace: numbers, scores, salaries, data values, labels, kickers, headings, and body copy
- Sole exception: the landing page hero `<h1>` ("Rational people / think at the margin.") keeps Inter via an explicit `fontFamily: "var(--font-inter), ..."` override, loaded alongside IBM Plex Mono in `src/app/layout.tsx`
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
| `/verify-email` | Employer (signed-in, unverified) | "Check your inbox" page + resend button; `EmployerLayout` redirects here until `session.user.emailVerified` |
| `/candidate/dashboard` | Candidate | Score terminal (live score, radar, salary curve) |
| `/candidate/portfolio` | Candidate | Portfolio grid — projects with files/links and tagged skills |
| `/candidate/portfolio/[projectId]` | Candidate | Create/edit portfolio project |
| `/candidate/postings` | Candidate | Job postings grid (up to 10 positions) |
| `/candidate/postings/[postingId]` | Candidate | Create/edit job posting (incl. market data scatter chart) |
| `/candidate/matches` | Candidate | Incoming pitches (accept/decline); unread indicators + CHAT → opens an in-app chat slide-over for accepted matches. The PITCH DETAIL slide-over has a VERIFY EMPLOYER panel (company name, contact name + email from the employer's `profiles`, industry, company size, headquarters, website, an ABOUT blurb, and a verified badge) so candidates can confirm the sender's legitimacy before accepting. |
| `/candidate/settings` | Candidate | Settings — tabbed PROFILE (display name, biodata: date of birth/age, sex, languages, citizenship, plus overall years of experience + current salary; per-role location/work-mode/salary live in POSTINGS), NOTIFICATIONS (activity-email toggle), SECURITY (change email + password), FAQ, HELP, ACCOUNT (sign out), and DANGER ZONE (delete account) |
| `/employer/dashboard` | Employer | Overview stats |
| `/employer/feed` | Employer | Ranked candidate feed (order book layout). Candidates with `is_founder_verified` show a gold `VERIFIED` badge next to their name. |
| `/employer/postings` | Employer | Job postings grid (create roles, set candidate cap) |
| `/employer/postings/[postingId]` | Employer | Create/edit posting + ranked matched-candidates panel (pitch directly from a match) |
| `/employer/matches` | Employer | Sent pitches + match status; unread indicators + CHAT → opens an in-app chat slide-over for accepted matches |
| `/employer/settings` | Employer | Settings — tabbed PROFILE (contact name + company profile: name, size, industry, website, headquarters, about), PLAN (read-only subscription tier/status/renewal + upgrade link), NOTIFICATIONS (activity-email toggle), SECURITY (change email + password), FAQ, HELP, ACCOUNT (sign out), and DANGER ZONE (delete account). Company details are entered here, not at sign-up. |
| `/ticker` | Public | Live anonymised match feed (marketing) |
| `/admin/concierge` | Internal | Manual matching tool: list `employer_job_postings`, run `candidate-matcher` against any posting, create a pitch on an employer's behalf, and toggle a candidate's `is_founder_verified` flag. Gated by `isAdminEmail()` (`src/lib/auth/admin.ts`, hardcoded email allowlist), 404s for everyone else. No public link. |

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
| `profiles` | id (FK Better Auth `user`), role (candidate/employer), display_name, email, email_notifications |
| `candidates` | composite_score, percentile_rank, years_exp_claimed, current_salary (monthly cents), desired_salary_* (legacy), location (legacy), is_visible, is_founder_verified, date_of_birth, sex, languages, citizenship (biodata + experience + current salary all edited in `/candidate/settings`) |
| `employers` | company_name, company_size, industry, website, headquarters, description, reputation_score, verified, subscription_tier, subscription_status, subscription_period_end (company profile edited in `/employer/settings`, not at sign-up) |
| `salary_data_points` | vertical, role_label, years_exp, location, monthly_salary (cents), source, match_id |
| `matches` | employer_id, candidate_id, posting_id, status, offered_salary, expires_at (72hr), offer_status, offer_salary, offer_sent_at, hired_at, last_message_at, candidate_last_read_at, employer_last_read_at |
| `match_ticker_events` | vertical, salary_band, role_label (anonymised, public) |
| `reputation_events` | subject_id, event_type (ghosted/responded/completed_match), weight |
| `score_history` | candidate_id, composite_score, recorded_at (sparkline data) |
| `candidate_job_postings` | candidate_id, title, location, work_modes, desired_salary_*, skills, available_from, years_exp (per-role experience), work_eligible (right-to-work confirmation when citizenship differs from the posting location; null when N/A) (notice_period_days is legacy/unused) |
| `candidate_portfolio_projects` | candidate_id, title, description, link_url, file_path, file_name, skills |
| `employer_job_postings` | employer_id, title, description, vertical, years_exp_*, location, work_modes, salary_*, skills, max_candidates (default 5), status |
| `match_messages` | match_id, sender_id, body, message_type (text/offer/offer_accepted/offer_declined/file), file_path, file_name, file_size, created_at — chat for `accepted` matches only |
| `portfolio_feedback` | match_id (unique), employer_id, candidate_id, rating (1-5), created_at — employer's rating of "did the portfolio accurately reflect this candidate's ability", one per match |

> **Candidate profile vs postings:** the `/candidate/settings` PROFILE tab holds biodata (display name + `candidates.date_of_birth`/`sex`/`languages`/`citizenship`) plus the candidate's overall **`years_exp_claimed`** and **`current_salary`** (monthly cents) — stable, candidate-level attributes. These two drive the dashboard SALARY POSITION panel (experience positions the market regression; `current_salary` is the candidate's marker) and are read by the salary regression / `recommendation-scorer` / match-sourced `salary_data_points`. Role-specific fields (title, per-role `years_exp`, location, work modes, salary) live separately on `candidate_job_postings` and feed that posting's market scatter; **they are not synced back to `candidates`** (an earlier `syncCandidateExperience` helper was removed — the profile value is canonical). `candidates.location`/`remote_only`/`desired_salary_*` are legacy profile columns no longer edited (the dashboard derives location/remote from postings). `profiles.vertical` is no longer set via the profile; the candidate's vertical is derived from posting titles via `JOB_ROLES` where needed (e.g. the dashboard in-demand-skills gap).

> **Country selects + work eligibility:** all country/territory fields (candidate citizenship, candidate + employer posting `location`, employer `headquarters`) are `<select>`s populated from `COUNTRIES` (`src/lib/utils/constants.ts`). On the candidate posting form, when the candidate's `citizenship` differs from the posting `location`, a "right to work" checkbox appears and its value is stored in `candidate_job_postings.work_eligible` (left null when citizenship matches the location or is unset).

> **Legacy/unused:** `challenges`, `questions`, `challenge_results` — the old skill-challenge system, replaced by `candidate_portfolio_projects`. Tables and RLS policies remain in the DB (not dropped, reversible) but are no longer referenced by any route or Edge Function.

### Storage
- `portfolio-files` bucket (private, 10MB limit) — candidate portfolio project uploads, stored at `${candidateId}/${projectId}/${fileName}`. Accessed only via service-client `createSignedUrl()` (60s expiry) from `/api/portfolio/[projectId]/file`. `candidate_portfolio_projects.file_path` is never selected by client-facing queries (`/candidate/portfolio*` pages, `GET /api/portfolio*`) — only `file_name` (for display) is, so the raw storage path never reaches the browser outside the signed-url route.
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
- portfolio_completeness (0.10) — avg per-project: +0.5 if `file_path` or `link_url` set, +0.5 if `skills` non-empty
- portfolio_feedback (0.10) — avg `portfolio_feedback.rating` (1-5) across the candidate's matches, normalised to 0-1 via `(avg - 1) / 4`; defaults to a neutral 0.5 until an employer has rated the candidate
- reputation_score (0.20), response_rate (0.10), profile_completeness (0.05) — `years_exp_claimed` set + the candidate has ≥1 `candidate_job_postings` row (location/salary/work-mode live on postings, not the profile)

Updates `candidates.composite_score` + `percentile_rank`. Inserts `score_history` row.

### `salary-regression` (POST `{years_exp, vertical?, location?, remote?, role?}`)
**Shrinkage-based Mincer model in log space** (`model: "log_quadratic_shrunk"`), pure Deno math. Same role→vertical→overall cascade (location dropped within each level, `.order("id").limit(1000/500)` unbiased sample, separate match/seed fetches, ≥3 points or 422).

Model (all fitting on `log(monthly_salary)`, predictions `exp()`'d back to cents):
1. **Mincer fit:** unconstrained OLS quadratic `log_salary ≈ b0 + b1·x + b2·x²` (linear term = growth, negative `b2` = the diminishing returns to experience).
2. **Continuous shrinkage** (no hard tier cutoff): `b2 ← s·b2` with `s = n / (n + 15)` (`SHRINK_K = 15` = the n at which curvature is half-trusted, `s(15)=0.5`; `n=3 → s≈0.17` near-linear, `n=45 → s=0.75` near-full-quadratic), then refit `b0/b1` with the shrunk `b2` held fixed. Smoothly slides from linear to quadratic with no visible jump.
3. **Quantile bands as constant log-space offsets** from the median (not separate fits): `n ≥ 20` uses empirical residual quantiles (centered on the residual median); `n < 20` uses a normal assumption with sample sigma when `n ≥ 5`, else a documented default `0.30` (≈±35% multiplicative). Offsets clamped so p25 ≤ p50 ≤ p75 ≤ p90 can't cross.
4. **Monotonicity + extrapolation clamp** (hard, any n): outside the observed `[xmin,xmax]` the slope is held constant at the nearest boundary (no runaway curvature); a concave fit is capped at its vertex; and a running max guarantees the median never decreases as experience rises — more experience can never map to a lower number.

Returns (all MONTHLY HKD cents):
`{ curve: [{years_exp, p25, p50, p75, p90, predicted_salary, ci_lower, ci_upper, n_local}], points, std_dev, candidate_percentile, median_at_exp, marginal_per_year, n_points, model }`
- `predicted_salary`/`ci_lower`/`ci_upper` are **retained aliases** (`= p50`/`p25`/`p75`): the reworked `SalaryCurve`/`SalaryScatter` charts consume `p25/p50/p75/p90` directly but fall back to these aliases (and `points.length` for `n_points`) so they still render correctly if this edge function hasn't been deployed yet. `points` (stride-sampled ≤200) and `std_dev` (raw-space residual SD) are retained for the scatter's raw-observation overlay and the posting forms' STD DEVIATION / min-max placeholder math.
- `n_local` = observations within ±1yr of that curve point (UI density indicator). `n_points` = total points used. `median_at_exp` = p50 at the candidate's exact `years_exp`. `marginal_per_year` = analytic monthly-HKD/yr slope of the p50 curve at the candidate's experience, from the shrunk `b1/b2` and clamped to the monotone curve (never negative).

Called via `/api/salary` proxy route (transparent passthrough — new fields flow straight through).

### `candidate-matcher` (POST `{posting_id}`)
Triggered by `GET /api/employer-postings/[postingId]/candidates`. Ranks every visible `candidate_job_postings` row against the given `employer_job_postings` row across 6 weighted factors:
- skills overlap (0.35), experience-range fit (0.20), salary-range overlap (0.15), location/work-mode fit (0.10), vertical match (0.10), candidate `composite_score` (0.10)

If the employer posting's `work_modes` includes `remote`, the location factor is scored 1 for everyone (location is irrelevant for remote roles). Each match also gets `match_percentile` (0-100): the share of *all* evaluated visible candidates it out-scores for this posting, computed before truncation. Returns the top 25 sorted by `match_score` desc as `{ matches: [{candidate_id, candidate_posting_id, match_score (0-100), match_percentile, ...}] }`. The Route Handler adds `pitchedCandidateIds` and `capacity: { max, active }` (active = `pending`/`accepted` matches on that posting).

---

## Realtime Subscriptions
| Component | Table | Event | Purpose |
|---|---|---|---|
| `MatchTickerTape` | `match_ticker_events` | INSERT | Live anonymous match stream |
| `PublicTickerPage` | `match_ticker_events` | INSERT | Public marketing ticker |

> `match_ticker_events` has a public-read RLS policy with no `auth.uid()` dependency, so these channels deliver `postgres_changes` events correctly via the anon-key browser client.

### Polling (live score updates)
Better Auth issues its own `better-auth.session_token` cookie, never a Supabase Auth JWT, so `auth.uid()` is always NULL for Supabase Realtime connections made via the anon-key browser client. RLS policies like `candidates_select_own` / `candidates_employer_read` (which depend on `auth.uid()`) silently evaluate false for Realtime, so a `postgres_changes` subscription on `candidates` never delivers events. `DashboardClient` and `FeedClient` instead poll a service-client-backed Route Handler every 15 seconds, the same pattern `MatchChat` uses for its 5 second message poll (see Chat & Hire Offers below):
- `DashboardClient` polls `GET /api/candidates/me/score` for its own `composite_score` / `percentile_rank` / `score_history`.
- `FeedClient` polls `GET /api/candidates/feed` (employer-only) and re-sorts the visible candidate list by `composite_score`.

---

## Email (src/lib/email/send.ts)
- `sendPitchNotification()` — employer sends pitch, candidate notified (**activity** email — gated on the recipient's `profiles.email_notifications`)
- `sendMatchAcceptedNotification()` — candidate accepts, employer notified (**activity** email — gated on the recipient's `profiles.email_notifications`)
- `sendWelcomeEmail()` — on registration
- `sendVerificationEmail()` — employer email verification (transactional, always sent)
- `sendEmailChangeVerification()` — change-email approval link (transactional, always sent)

**Activity vs transactional:** activity emails (pitch + match-accepted) are suppressed when the recipient's `profiles.email_notifications` is `false`, gated at the call sites in `POST /api/matches`, `POST /api/matches/[matchId]/respond`, and `POST /api/admin/matches` (check `email_notifications !== false`). Toggled in the Settings → NOTIFICATIONS tab via `GET|PATCH /api/profile/notifications` (`profiles`-only, both roles). Transactional emails (welcome, verification, password/email-change) always send.

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
- The same accepted offer is also inserted into `salary_data_points` with `source: 'match'` (`match_id` links back to the originating match, `role_label` from the employer posting's title, `years_exp`/`location`/`remote` from the candidate's profile and posting work modes, `monthly_salary: offered_salary`) — so every completed match incrementally improves the regression curve that future candidates and employers see. `salary_data_points.match_id` has a partial unique index (`migration 0027_salary_data_points_match_id.sql`), so a retry/race on accept can't insert a second point for the same match (insert hits `23505`, which the route ignores). On success, the route emits a `salary_datapoint_created` event via `captureServerEvent()` (`src/lib/analytics/server.ts` — structured `console.log` plus a best-effort POST to PostHog's capture endpoint if `NEXT_PUBLIC_POSTHOG_KEY` is set) for tracking data-moat growth; `/admin/concierge` surfaces a live count of `source: 'match'` rows. `salary-regression` returns `source` per point and fetches match-sourced rows in a separate uncapped-in-practice query (limit 500) alongside the 1000-row seed sample, so real outcomes always contribute to the fit and are never stride-sampled away; `SalaryScatter` renders `source: 'match'` observations as larger terminal-green dots (REAL MATCHES legend entry) so real outcomes stand out from seed data. Matches accepted before this feedback loop shipped were backfilled by migration `0021_backfill_match_salary_points.sql` (only those with `offered_salary` + candidate `years_exp_claimed` — a regression point needs an x-coordinate).

---

## Chat & Hire Offers (Accepted Matches)
- `match_messages` (match_id, sender_id, body, message_type, file_path, file_name, file_size, created_at) — RLS: participants of the match can read; insert requires `sender_id = auth.uid()` and `matches.status = 'accepted'`. `message_type`: `text` (default) | `offer` | `offer_accepted` | `offer_declined` | `file` — for the offer types, `body` is `JSON.stringify({ offered_salary })`, read back via `parseOfferSalary()`; for `file`, `body` is the original filename and `file_path`/`file_name`/`file_size` describe the `match-files` upload.
- `GET|POST /api/matches/[matchId]/messages` — service client, scoped to the match's `employer_id`/`candidate_id`; POST rejected (409) unless the match is `accepted`. A `multipart/form-data` POST (`file` field) uploads to the `match-files` bucket and inserts a `message_type: 'file'` row (client-validated against `MAX_CHAT_FILE_SIZE_MB`); a JSON POST inserts a `text` message as before. Both paths stamp `matches.last_message_at = now()` (drives the silent-chat rule above) and the sender's own `candidate_last_read_at`/`employer_last_read_at` via `readColumnFor()` (`src/lib/utils/matchReads.ts`), so senders never see their own activity as unread. GET returns `{ messages, currentUserId, match }`, where `match` includes `status, offer_status, offer_salary, offer_sent_at, hired_at, last_message_at`.
- `GET /api/matches/[matchId]/messages/[messageId]/file` — participant-scoped; resolves `match_messages.file_path` to a `match-files` signed URL (60s expiry) and redirects, mirroring `/api/portfolio/[projectId]/file`.
- `POST /api/matches/[matchId]/offer` — hire-offer state machine on `matches.offer_status` (`null → 'pending' → 'accepted' | 'declined'`); each action also stamps the acting user's own read column via `readColumnFor()`:
  - `action: "send"` (employer; match `accepted`, no offer pending, not yet hired) — sets `offer_status: 'pending'`, `offer_salary`, `offer_sent_at`; inserts a `message_type: 'offer'` message
  - `action: "accept"` (candidate; `offer_status: 'pending'`) — sets `offer_status: 'accepted'`, `hired_at: now()`; inserts a `message_type: 'offer_accepted'` message; inserts a `reputation_events` row for **each** party (`event_type: 'completed_match'`, `weight: 10`)
  - `action: "decline"` (candidate; `offer_status: 'pending'`) — sets `offer_status: 'declined'`; inserts a `message_type: 'offer_declined'` message
- `MatchChat` (`src/components/terminal/MatchChat.tsx`) — polling-based (5s interval; no Realtime, per the known `auth.uid()` RLS limitation above), rendered inside a second `.slideover-panel` (titled `CHAT`) on `/candidate/matches` and `/employer/matches`, alongside the existing `PITCH DETAIL` slide-over. Header strip shows the counterpart's name + score/percentile (employer's view of a candidate) or reputation (candidate's view of an employer), plus the pitch's `offered_salary`. Renders `offer`/`offer_accepted`/`offer_declined` messages as centered system cards and `file` messages as a bordered row with filename, `formatFileSize(file_size)`, and a `DOWNLOAD →` link to the file route above; a `+` button opens a file picker to send attachments. Shows the employer a "SEND HIRE OFFER" action when eligible. The candidate's accept/decline is a **multi-layer confirm** (an initial review step, then a final step gated behind a required confirmation checkbox) so an offer can't be accepted or declined with a single accidental tap. Non-`accepted` matches render a "CHAT CLOSED" state; a persistent footer reminds both parties of the `CHAT_GHOST_HOURS` reputation penalty for silence.
- **Chat slide-over & unread tracking**: `/candidate/matches` and `/employer/matches` show a pulsing `.live-dot` on rows with unread activity — `last_message_at` (or `created_at` if no messages) newer than the viewer's `candidate_last_read_at`/`employer_last_read_at` (candidate side treats `NULL` as unread, since `employer_last_read_at` defaults to `now()` at insert but `candidate_last_read_at` starts `NULL`). Both slide-overs share the same `.slideover-panel` position (`right: 0`): `selectedId` state drives `PITCH DETAIL` (opened via row click → `openRow`) and `chatMatchId` state drives `CHAT` (opened via the row's `CHAT →` button or the `PITCH DETAIL` slide-over's `OPEN CHAT →` button → `openChat`, accepted matches only) — each opener clears the other's state so only one slide-over is visible at a time. Both `openRow` and `openChat` call `markRead()`, which stamps the viewer's read column via `POST /api/matches/[matchId]/read` and optimistically mirrors it client-side, clearing the unread dot immediately.
- **Portfolio accuracy feedback**: `GET|POST /api/matches/[matchId]/portfolio-feedback` — service client, scoped to the match. `POST` (employer only, match `accepted`) inserts a `portfolio_feedback` row (`rating` 1-5, "did the portfolio accurately reflect this candidate's ability"); 409 if the match isn't `accepted` or feedback was already submitted for it (`match_id` is unique, insert hits `23505`). `GET` (either participant) returns `{ feedback: { rating, created_at } | null }`. `MatchChat` shows the employer a rating prompt (1-5 buttons) below the header once the match is `accepted`, replaced by "PORTFOLIO RATING SUBMITTED · n/5" after submission. `recommendation-scorer` aggregates these per candidate as the `portfolio_feedback` signal above.

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
