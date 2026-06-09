# The Job Market — CLAUDE.md

## Overview
Talent marketplace that inverts hiring: employers browse a **ranked feed** of candidates sorted by composite skill score. Candidates complete **skill challenges** (no CVs). A **salary regression engine** gives both sides a neutral market-anchored compensation reference. Visual identity: Bloomberg/trading terminal aesthetic.

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
| Charts | Recharts | 3.x |
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

### Tailwind v4 Config
Color tokens live in `src/app/globals.css` under `@theme`. Use Tailwind classes:
| Class | Hex | Use |
|---|---|---|
| `bg-bg` | `#0A0A0A` | Page background |
| `bg-surface` | `#111111` | Card/panel background |
| `text-green` / `bg-green` | `#00FF41` | Primary accent, active, positive |
| `text-danger` / `bg-danger` | `#FF3B30` | Errors, declined, negative |
| `text-muted` | `#A0A0A0` | Secondary text, labels |
| `text-gold` | `#FFD700` | Top-tier rank, gold signals |
| `border-border` | `#1A1A1A` | All borders |

### Typography
- `font-mono` — **JetBrains Mono** — ALL numbers, scores, salaries, data values, labels
- `font-sans` — **Inter** — headings, body copy, marketing text
- Monospace rule: if it's a number on screen, it must be `font-mono`

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
