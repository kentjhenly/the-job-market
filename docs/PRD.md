# The Job Market — Product Requirements Document

**Status:** Living document
**Last updated:** 2026-06-24
**Owner:** Product
**Launch vertical:** Tech · Hong Kong
**Revenue model:** Employer subscriptions (Stripe)

---

## Table of Contents

1. [Summary](#1-summary)
2. [Problem & Opportunity](#2-problem--opportunity)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [Users & Personas](#4-users--personas)
5. [Product Principles](#5-product-principles)
6. [Core Concepts](#6-core-concepts)
7. [User Stories & Acceptance Criteria](#7-user-stories--acceptance-criteria)
8. [Detailed Feature Specifications](#8-detailed-feature-specifications)
9. [Match Lifecycle & State Machine](#9-match-lifecycle--state-machine)
10. [Scoring & Algorithms](#10-scoring--algorithms)
11. [Salary Regression Engine](#11-salary-regression-engine)
12. [Data Model](#12-data-model)
13. [API Reference](#13-api-reference)
14. [Edge Functions](#14-edge-functions)
15. [Taxonomy & Reference Data](#15-taxonomy--reference-data)
16. [Authentication & Authorization](#16-authentication--authorization)
17. [Notifications & Email](#17-notifications--email)
18. [Anti-Ghosting & Reputation](#18-anti-ghosting--reputation)
19. [Billing & Subscriptions](#19-billing--subscriptions)
20. [Design System](#20-design-system)
21. [Non-Functional Requirements](#21-non-functional-requirements)
22. [Analytics & Success Metrics](#22-analytics--success-metrics)
23. [Edge Cases & Failure Modes](#23-edge-cases--failure-modes)
24. [Open Questions & Roadmap](#24-open-questions--roadmap)
25. [Glossary](#25-glossary)

---

## 1. Summary

The Job Market is a talent marketplace that inverts the traditional hiring flow. Instead of candidates submitting CVs and waiting for callbacks, **employers browse a ranked feed of candidates** sorted by a composite skill score. Candidates build a **portfolio of real work** (files and/or links tagged with skills) rather than a resume. A **salary regression engine** gives both sides a neutral, market-anchored compensation reference so negotiation starts from shared data rather than guesswork.

The product is presented as a neutral-dark trading-terminal interface (desaturated terminal green, muted clay red, gold accents on a slate canvas, OKLCH color space), reinforcing the central metaphor: hiring as a live, data-driven market with order books, tickers, and price discovery.

The platform launches focused on a single vertical and geography (Technology, Hong Kong) but the data model, taxonomy, and salary engine already support 13 verticals and 60+ countries to enable controlled expansion.

---

## 2. Problem & Opportunity

### 2.1 Problems

1. **Candidates are flattened into a CV.** A one-page document rewards formatting and keyword-stuffing over demonstrable output. Strong builders with weak resumes are systematically overlooked.
2. **Employers spend the first mile triaging.** Inbound application volume forces recruiters to spend their scarcest time on filtering rather than evaluation and outreach.
3. **Compensation is opaque and adversarial.** Neither side knows the true market rate for a role + experience level, so negotiation anchors on bluffing and information asymmetry rather than evidence.
4. **Ghosting is endemic and unaccountable.** Both candidates and employers routinely abandon conversations with no consequence, wasting the other party's time and eroding trust in the channel.

### 2.2 Opportunity

Invert the funnel. Let employers shop a ranked, scored feed of candidates whose position reflects demonstrated work and reliability, not self-description. Anchor every compensation conversation to a transparent regression model built from real published benchmarks and real match outcomes on the platform. Make accountability structural: ghosting lowers the reputation signal that feeds the composite score that drives feed ranking.

### 2.3 Why now / why this wedge

- Hong Kong tech hiring is high-velocity, English-operating, and compensation-sensitive, with published salary benchmarks (Morgan McKinley, JobsDB, C&SD) that seed a credible initial salary model before network effects kick in.
- A single-vertical, single-geo launch keeps the salary model dense and the taxonomy tight, which is exactly where a regression-based reference needs data density to be trustworthy.

---

## 3. Goals & Non-Goals

### 3.1 Goals

| # | Goal | Primary signal |
|---|---|---|
| G1 | Employers can find and act on qualified candidates without manual triage | Pitch send rate; time-to-first-pitch |
| G2 | Candidates are represented by demonstrable work, not a CV | Portfolio completeness distribution |
| G3 | Both sides trust a neutral, shared salary reference | Salary panel engagement; offer-vs-median spread |
| G4 | Ghosting is reduced through structural accountability | Ghost rate (pending + silent) |
| G5 | Sustainable revenue from employer subscriptions while candidates stay free | Active subscriptions; MRR |
| G6 | The salary data moat compounds with each completed match | Growth of `salary_data_points` where `source = 'match'` |

### 3.2 Non-Goals (current phase)

- Multi-region or multi-vertical launch beyond Tech · Hong Kong (infrastructure supports it; go-to-market does not pursue it yet).
- Native mobile apps (responsive web only).
- ATS / HRIS integrations.
- In-platform payroll or payments beyond subscription billing.
- A theme switcher or alternate visual identities (single hard-coded palette by design).
- Candidate-paid features (candidate participation is free, end to end).
- Automated/AI resume parsing or CV import (portfolio is the unit of representation).

---

## 4. Users & Personas

### 4.1 Candidate ("the builder")

A tech professional in Hong Kong who wants to be discovered on the strength of their work.

- **Wants:** to be seen by good employers without spray-and-pray applications; to know their market worth; to control what they expose.
- **Does:** builds a portfolio of projects; defines up to 10 role postings describing what they want (title, location, work modes, salary, skills, experience); receives, accepts/declines inbound pitches; chats and negotiates hire offers in-app.
- **Pays:** nothing. Building a portfolio, receiving pitches, accepting pitches, and chatting are all free.
- **Key screens:** `/candidate/terminal`, `/candidate/portfolio`, `/candidate/postings`, `/candidate/matches`, `/candidate/settings`.

### 4.2 Employer ("the recruiter")

A hiring company in Hong Kong (recruiter, hiring manager, or founder).

- **Wants:** a short, ranked list of strong candidates; confidence the candidate is real and reliable; a defensible salary band to anchor an offer.
- **Does:** browses the ranked candidate feed; posts roles; runs the matcher per posting; sends pitches; negotiates and extends hire offers; rates portfolio accuracy after a match.
- **Pays:** subscription required to browse the feed and send pitches. Job postings free for the first 3, then subscription required. Two tiers: Starter (HKD 150/mo), Pro (HKD 300/mo).
- **Key screens:** `/employer/terminal`, `/employer/feed`, `/employer/postings`, `/employer/postings/[id]` (lobby), `/employer/settings`.

### 4.3 Internal / Admin ("the operator")

Platform operator running concierge matchmaking and trust operations.

- **Does:** lists employer postings, runs the matcher against any posting, creates pitches on an employer's behalf, toggles founder verification, monitors data-moat growth.
- **Access:** gated by a hardcoded email allowlist (`isAdminEmail()`); `/admin/concierge` 404s for everyone else. No public link.

---

## 5. Product Principles

1. **Honesty over false precision.** Every salary surface leads with an uncertainty band and sample-size honesty, never a single confident number. Low data visibly reduces confidence in the UI.
2. **Demonstrated > declared.** Ranking rewards real artifacts (portfolio, completed matches, responsiveness) over self-description.
3. **One shared dataset.** The public ticker, the candidate's salary curve, and the employer's offer anchor all read from the same `salary_data_points`. There is no separate "marketing" number.
4. **Accountability is structural, not social.** Ghosting is penalized in the score that controls visibility, not via reviews or public shaming.
5. **The candidate controls exposure.** Visibility, what's in the portfolio, and which roles are posted are all candidate-controlled. Raw files never leave the server except via short-lived signed URLs.
6. **The interface is the metaphor.** The trading-terminal aesthetic is functional: order books, tickers, depth bars, and percentiles communicate ranking and market position at a glance.

---

## 6. Core Concepts

### 6.1 Composite Score
Every candidate carries a `composite_score` (0–100) and `percentile_rank` computed by the `recommendation-scorer` edge function. It is the sort key for the employer feed and the headline number on the candidate terminal. See [§10](#10-scoring--algorithms).

### 6.2 Portfolio
A candidate's set of projects (max 10), each with title, description, optional file upload and/or link, and tagged skills. Replaces the CV entirely. Files are private; only signed URLs (60s) ever reach the browser.

### 6.3 Candidate Job Postings
A candidate publishes up to 10 role postings describing what they want: title, per-role experience, location, work modes, desired salary band, skills, availability, and right-to-work confirmation when relevant. These feed the matcher and each posting's market scatter chart. They are distinct from candidate-level profile fields (overall experience, current salary) which live on the `candidates` row.

### 6.4 Employer Job Postings
An employer's open roles: title, description, vertical, experience range, location, work modes, salary range, skills, and a candidate cap (`max_candidates`). The matcher ranks candidates against these.

### 6.5 Pitch / Match
A pitch is an employer-initiated outreach to a candidate. It creates a `matches` row that moves through a defined lifecycle (pending → accepted → hired, with declined/ghosted/withdrawn branches). See [§9](#9-match-lifecycle--state-machine).

### 6.6 Salary Regression
A shrinkage-based Mincer model fit in log space, returning percentile bands (p25/p50/p75/p90) for any role + experience. Self-improving: every accepted offer is written back as a data point. See [§11](#11-salary-regression-engine).

### 6.7 Reputation & Anti-Ghosting
Event-driven reputation (ghosting, responsiveness, completed matches) feeds the composite score. Two timeout rules close stale pitches and silent chats. See [§18](#18-anti-ghosting--reputation).

---

## 7. User Stories & Acceptance Criteria

Format: As a `<role>`, I want `<capability>` so that `<outcome>`. AC = acceptance criteria.

### 7.1 Candidate

**C1 — Build a portfolio**
> As a candidate, I want to add projects with files/links and skill tags so that employers can see my real work.
- AC: I can create up to `MAX_PORTFOLIO_PROJECTS` (10) projects; the 11th is rejected.
- AC: Each project accepts a title (≤200 chars), description (≤5000 chars), an optional link URL, an optional file upload (≤10MB), and tagged skills.
- AC: Saving a project triggers a composite-score recompute.
- AC: My uploaded file is never exposed as a raw storage path to the browser; downloads go through a signed-URL route.

**C2 — Post the roles I want**
> As a candidate, I want to define role postings so that the matcher surfaces me for relevant employer roles.
- AC: I can create role postings with title (from `JOB_ROLES` or free text), per-role experience, location (from `COUNTRIES`), work modes, desired salary min/max (monthly), and up to 10 skills.
- AC: When my citizenship differs from the posting location, a right-to-work checkbox appears and its value is stored on the posting; otherwise the field stays null.
- AC: A posting's market scatter chart reflects the selected role/vertical via the salary endpoint.

**C3 — Manage incoming pitches**
> As a candidate, I want to review pitches and accept or decline so that I control who I engage with.
- AC: Each pitch shows the employer's verified company details (name, contact, industry, size, HQ, website, about, verified badge) before I accept.
- AC: Accepting is free (no credit/charge) and opens an in-app chat; it notifies the employer (if they have notifications on) and emits a public anonymized ticker event.
- AC: A pending pitch I never answer is auto-closed after 72 hours with no reputation penalty to me.

**C4 — Negotiate and get hired in-app**
> As a candidate, I want to chat and respond to hire offers so that I can close or exit cleanly.
- AC: In an accepted match I can send text and file messages, accept/decline a pending hire offer, renege after accepting, or withdraw from the match.
- AC: Destructive actions (accept/decline offer, renege, withdraw) require a multi-layer confirmation (review step + checkbox-gated final step).
- AC: If I go silent in an unhired accepted chat for 72 hours and I was the last expected responder, I receive a reputation penalty.

**C5 — Know my market worth**
> As a candidate, I want a salary position panel so that I can see where I sit in the market.
- AC: The terminal plots my `current_salary` as a "you are here" dot at my claimed experience against the modeled curve, with a percentile callout.
- AC: The chart leads with the p25–p75 band and shows low-confidence styling when the sample is small.

### 7.2 Employer

**E1 — Browse a ranked feed**
> As an employer, I want a feed of candidates sorted by composite score so that I skip triage.
- AC: With an active subscription I see the ranked order-book feed; without one I see the upgrade panel instead.
- AC: Founder-verified candidates show a gold VERIFIED badge.
- AC: The feed re-sorts live as scores change (15s polling).

**E2 — Post roles and match**
> As an employer, I want to post roles and run the matcher so that I get a ranked candidate shortlist per role.
- AC: My first 3 postings are free regardless of subscription; the 4th+ requires an active subscription (402 otherwise).
- AC: Running the matcher returns the top 25 candidates with `match_score` (0–100) and `match_percentile`, plus capacity and already-pitched candidate IDs.
- AC: I can set `max_candidates`; the posting auto-closes when hires reach the cap.

**E3 — Send pitches and hire**
> As an employer, I want to pitch candidates and extend hire offers so that I can close.
- AC: Sending a pitch requires an active subscription (402 otherwise) and is scoped to my employer row.
- AC: In an accepted match I can send a hire offer, withdraw a pending offer, or decline the match.
- AC: When the candidate accepts my offer, both parties get a completed-match reputation event, the candidate's matched posting is removed, and the offer is written into the salary dataset.

**E4 — Verify and rate**
> As an employer, I want to confirm legitimacy and rate portfolio accuracy so that the marketplace stays honest.
- AC: After a match is accepted I can submit a one-time portfolio-accuracy rating (1–5); a duplicate submission is rejected.

### 7.3 Admin

**A1 — Concierge matchmaking**
> As an operator, I want to run the matcher and pitch on an employer's behalf so that I can hand-seed liquidity.
- AC: `/admin/concierge` is reachable only by allowlisted emails and 404s otherwise.
- AC: I can toggle a candidate's `is_founder_verified` flag and see a live count of match-sourced salary points.

---

## 8. Detailed Feature Specifications

### 8.1 Route Map

| Path | Role | Description |
|---|---|---|
| `/` | Public | Landing page (hero is the sole Inter-font exception) |
| `/sign-in` | Public | Auth |
| `/sign-up` | Public | Role picker |
| `/sign-up/candidate` | Public | Candidate registration |
| `/sign-up/employer` | Public | Employer registration (company details entered later in settings) |
| `/verify-email` | Employer (unverified) | Check-inbox + resend; gated by `EmployerLayout` (shelved in local dev) |
| `/candidate/terminal` | Candidate | Live score, sparkline, skill radar, salary position |
| `/candidate/portfolio` | Candidate | Portfolio grid |
| `/candidate/portfolio/[projectId]` | Candidate | Create/edit project |
| `/candidate/postings` | Candidate | Role postings grid (up to 10) |
| `/candidate/postings/[postingId]` | Candidate | Create/edit posting + market scatter |
| `/candidate/matches` | Candidate | Incoming pitches; PITCH DETAIL + CHAT slide-overs; verify-employer panel |
| `/candidate/settings` | Candidate | PROFILE, NOTIFICATIONS, SECURITY, FAQ, HELP, ACCOUNT, DANGER ZONE tabs |
| `/employer/terminal` | Employer | Overview stats, subscription tile |
| `/employer/feed` | Employer | Ranked candidate order book (subscription-gated) |
| `/employer/postings` | Employer | Postings grid + free-trial indicator |
| `/employer/postings/[postingId]` | Employer | Edit posting + matched candidates + lobby (sent pitches, chat) |
| `/employer/settings` | Employer | PROFILE, PLAN, NOTIFICATIONS, SECURITY, FAQ, HELP, ACCOUNT, DANGER ZONE tabs |
| `/ticker` | Public | Live anonymized match feed (marketing) |
| `/admin/concierge` | Internal | Manual matching, founder verification, data-moat monitor |

Proxy (`src/proxy.ts`): refreshes session cookie; redirects unauthenticated users to `/sign-in`; redirects each role away from the other role's routes. Server-to-server endpoints (Stripe webhook, cron) must be in `PUBLIC_ROUTES`.

### 8.2 Candidate Terminal
- **Score header:** composite score (count-up animation), percentile rank, score sparkline from `score_history`.
- **Skill radar:** inline SVG `RadarChart` of skill coverage.
- **Salary position:** `SalaryCurve` plotting the candidate's `current_salary` as a gold dot at `years_exp_claimed`, with percentile callout ("62nd · 4Y").
- **In-demand skills gap:** derived from posting titles via `JOB_ROLES` vs open employer postings.
- **Liveness:** polls `GET /api/candidates/me/score` every 15s.

### 8.3 Portfolio Editor
- Grid of up to 10 projects. Each: title, description, optional link, optional file (10MB cap, client + bucket enforced), skills via `SkillPicker` (search-only, uncapped on portfolio).
- Create/update/delete all call Route Handlers backed by the service client and re-trigger `recommendation-scorer`.

### 8.4 Candidate Postings Form
- INDUSTRY select (13 verticals + "ALL INDUSTRIES") and ROLE searchable `Combobox` from `JOB_ROLES`.
- SKILLS via `SkillPicker` (industry-suggested + search-all, capped at 10).
- Market scatter (`SalaryScatter`) driven by `role`/vertical cascade to `/api/salary`; gold range bar at chosen experience for desired min/max.
- Right-to-work checkbox conditional on citizenship vs location.

### 8.5 Employer Feed
- Order-book layout sorted by `composite_score` desc.
- Subscription gate: `UpgradePanel` when `subscription_status !== 'active'`, else `FeedClient`.
- Founder-verified gold badge.
- Polls `GET /api/candidates/feed` every 15s and re-sorts.

### 8.6 Employer Posting Lobby
- Per-posting matched-candidates panel (ranked) with pitch-from-match.
- Sent pitches + match status with unread `.live-dot` indicators.
- CHAT slide-over (`MatchChat`) for accepted matches; PITCH DETAIL slide-over for review.
- No separate `/employer/matches` route; matches are managed per posting, aggregated on the terminal.

### 8.7 Chat (MatchChat)
- 5s polling (Realtime unavailable under this auth model). Text + file messages.
- Renders `offer`/`offer_accepted`/`offer_declined` as centered system cards; `file` as a bordered row with size + download link.
- Surfaces the full offer/exit state machine as buttons gated by party + state.
- Persistent footer reminding both parties of the silent-chat reputation penalty.
- Employer portfolio-accuracy rating prompt (1–5) once accepted, replaced by "RATING SUBMITTED · n/5" after.

### 8.8 Settings (both roles)
- **Candidate PROFILE:** display name, languages (+ fluency), citizenship, overall `years_exp_claimed`, `current_salary` (currency adapts to country).
- **Employer PROFILE:** contact name + company profile (name, size, industry, website, HQ, about).
- **Employer PLAN:** read-only tier/status/renewal + upgrade link.
- **NOTIFICATIONS:** activity-email toggle (`profiles.email_notifications`).
- **SECURITY:** change email, change password.
- **DANGER ZONE:** delete account (password + confirmation checkbox).

---

## 9. Match Lifecycle & State Machine

### 9.1 `matches.status`
`pending → accepted → (hired via offer) | declined | ghosted | withdrawn`

- **pending:** pitch sent, awaiting candidate. Expires after 72h (`expires_at`) → `ghosted` (no penalty).
- **accepted:** candidate accepted; chat opens. Subject to silent-chat ghosting after 72h.
- **declined:** pitch/match declined by either party (disambiguated in UI; see below).
- **ghosted:** auto-closed by timeout (pending expiry or silent chat).
- **withdrawn:** candidate exited the match before hire.

### 9.2 `matches.offer_status` (layered on `accepted`)
`null → pending → accepted | declined`

The `reneged` value was merged into `declined` (migration 0038); variants are disambiguated by `sender_id` + a `reneged` body flag.

### 9.3 Offer / exit actions (`POST /api/matches/[matchId]/offer`)
All require `matches.status = 'accepted'` (409 otherwise), participant-scoped, and stamp the actor's read column.

| Action | Actor | Precondition | Effect |
|---|---|---|---|
| `send` | Employer | no pending offer, not hired | `offer_status=pending`, sets `offer_salary`/`offer_sent_at`; inserts `offer` message; emails candidate |
| `accept` | Candidate | `offer_status=pending` | `offer_status=accepted`, `hired_at=now()`; `offer_accepted` message; `completed_match` reputation (+2) for both; deletes candidate's matched posting; closes employer posting if cap reached; writes `salary_data_points` (source=match) |
| `decline` | Candidate | `offer_status=pending` | `offer_status=declined`; `offer_declined` message; match stays `accepted` |
| `withdraw` | Employer | `offer_status=pending` | retracts offer; `offer_status=declined`; `offer_declined` message (body carries salary); match stays `accepted` |
| `renege` | Candidate | `offer_status=accepted`, hired | `matches.status=declined`, `offer_status=declined`, `hired_at=null`; `offer_declined` message with `{reneged:true}`; reverses side effects (deletes both reputation events + match salary point); re-triggers scorer |
| `withdraw_match` | Candidate | not hired | `matches.status=withdrawn`, clears `offer_salary`, downgrades pending offer; `candidate_withdrew` reputation (+2) vs employer; re-triggers scorer |
| `decline_match` | Employer | not hired | `matches.status=declined`, clears `offer_salary`, downgrades pending offer |

### 9.4 UI disambiguation of `declined`
- `declined` + `offer_salary != null` + `!hired_at` → **RENEGED** (candidate backed out of accepted offer).
- otherwise `declined` → **DECLINED**.
- `withdrawn` → **WITHDRAWN**.

---

## 10. Scoring & Algorithms

### 10.1 Composite Score (`recommendation-scorer`)
Triggered after any create/update/delete on `/api/portfolio*` via `triggerRecommendationScorer()`. Computes a 0–100 `composite_score` from weighted signals:

| Signal | Weight | Definition | Default |
|---|---|---|---|
| portfolio_quality | 0.25 | 50/50 blend of breadth `min(project_count/5,1)` and avg per-project completeness (+0.5 file/link, +0.5 skills) | — |
| portfolio_skill_coverage | 0.25 | `min(distinct_skills/10, 1)` | — |
| reputation_score | 0.25 | event-driven: ghosted −15, responded +5, completed_match +10; starts at 1.0 | 1.0 |
| portfolio_feedback | 0.10 | avg `portfolio_feedback.rating` (1–5), normalized `(avg−1)/4` | 1.0 until feedback |
| demand_alignment | 0.10 | fraction of portfolio skills appearing in open employer postings, capped at 5 matched skills | 1.0 when no skills/openings |
| profile_completeness | 0.05 | `years_exp_claimed` set + ≥1 candidate posting | — |

Writes `candidates.composite_score` + `percentile_rank` and inserts a `score_history` row.

**SCORE_TIERS:** gold ≥ 90, green ≥ 60, red ≥ 30 (UI coloring).

### 10.2 Candidate Matcher (`candidate-matcher`)
Ranks every visible `candidate_job_postings` row against an `employer_job_postings` row across 6 weighted factors:

| Factor | Weight |
|---|---|
| Skills overlap | 0.35 |
| Experience-range fit | 0.20 |
| Salary-range overlap | 0.15 |
| Location / work-mode fit | 0.10 |
| Vertical match | 0.10 |
| Candidate composite_score | 0.10 |

- If employer `work_modes` includes `remote`, the location factor scores 1 for everyone.
- `match_percentile` (0–100) = share of all evaluated visible candidates this match out-scores (computed before truncation).
- Returns top 25 by `match_score` desc. Route Handler adds `pitchedCandidateIds` and `capacity: {max, active}` (active = pending/accepted on that posting).

---

## 11. Salary Regression Engine

`salary-regression` edge function (`model: "log_quadratic_shrunk"`), pure Deno math, all fitting on `log(monthly_salary)` with predictions `exp()`'d back to cents.

### 11.1 Data cascade
role → vertical → overall. Location dropped within each level. Unbiased sample via `.order("id").limit(1000/500)`. Separate match and seed fetches. Requires ≥3 points or returns 422.

### 11.2 Model steps
1. **Mincer fit:** unconstrained OLS quadratic `log_salary ≈ b0 + b1·x + b2·x²` (b1 = growth, negative b2 = diminishing returns).
2. **Continuous shrinkage:** `b2 ← s·b2`, `s = n/(n+15)` (`SHRINK_K=15`; `s(15)=0.5`; `n=3 → ~0.17` near-linear; `n=45 → 0.75`). Refit b0/b1 with shrunk b2 fixed. Smoothly slides linear → quadratic.
3. **Quantile bands as constant log-space offsets** from the median: `n≥20` empirical residual quantiles (centered on residual median); `n<20` normal assumption with sample sigma when `n≥5`, else default `0.30` (≈±35% multiplicative). Clamped so p25 ≤ p50 ≤ p75 ≤ p90.
4. **Monotonicity + extrapolation clamp (any n):** outside observed `[xmin,xmax]` slope held constant; concave fit capped at vertex; running max guarantees median never decreases with experience.

### 11.3 Response (all MONTHLY HKD cents)
```
{ curve: [{years_exp, p25, p50, p75, p90, predicted_salary, ci_lower, ci_upper, n_local}],
  points, std_dev, candidate_percentile, median_at_exp, marginal_per_year, n_points, model }
```
- `predicted_salary`/`ci_lower`/`ci_upper` are retained aliases (= p50/p25/p75) so older chart consumers still render.
- `n_local` = observations within ±1yr of a curve point. `n_points` = total used. `marginal_per_year` = analytic monthly-HKD/yr slope at the candidate's experience (never negative).
- Consumed via `/api/salary` (transparent passthrough).

### 11.4 Chart honesty rules
- IQR band (p25–p75) is the hero element; p50 median line inside; fainter dashed p90 above.
- Below `LOW_N` (8) points: band fades (11% vs 22% fill) + dashed outline; header flips to gold "LOW CONFIDENCE · MODELED FROM N DATA POINTS".
- `tone` prop: candidate → green, employer → blue.
- `SalaryScatter` overlays raw observations (grey, stride-sampled ≤200) and match outcomes (larger green dots), with a gold desired/offered range bar.

---

## 12. Data Model

### 12.1 Core tables

| Table | Key columns |
|---|---|
| `profiles` | id (FK Better Auth `user`), role (candidate/employer), display_name, email, email_notifications |
| `candidates` | composite_score, percentile_rank, years_exp_claimed, current_salary (monthly cents), is_visible, is_founder_verified, languages, citizenship; legacy: date_of_birth, sex, location, remote_only, desired_salary_* |
| `employers` | company_name, company_size, industry, website, headquarters, description, reputation_score, verified, subscription_tier, subscription_status, subscription_period_end |
| `salary_data_points` | vertical, role_label, years_exp, location, monthly_salary (cents), source (seed/match), match_id |
| `matches` | employer_id, candidate_id, posting_id, candidate_posting_id, status, offered_salary, expires_at, offer_status, offer_salary, offer_sent_at, hired_at, last_message_at, candidate_last_read_at, employer_last_read_at, responded_at |
| `match_ticker_events` | vertical, salary_band, role_label, salary, delta_pct (anonymized, public-read) |
| `reputation_events` | subject_id, actor_id, match_id, event_type (ghosted/responded/completed_match/candidate_withdrew), weight |
| `score_history` | candidate_id, composite_score, recorded_at |
| `candidate_job_postings` | candidate_id, title, location, work_modes, desired_salary_*, skills, available_from, years_exp, work_eligible |
| `candidate_portfolio_projects` | candidate_id, title, description, link_url, file_path, file_name, skills |
| `employer_job_postings` | employer_id, title, description, vertical, years_exp_*, location, work_modes, salary_*, skills, max_candidates (default 5), status |
| `match_messages` | match_id, sender_id, body, message_type (text/offer/offer_accepted/offer_declined/file), file_path, file_name, file_size, created_at |
| `portfolio_feedback` | match_id (unique), employer_id, candidate_id, rating (1–5), created_at |

### 12.2 Profile vs postings
Candidate-level attributes (`years_exp_claimed`, `current_salary`, biodata) live on `candidates`/`profiles` and drive the dashboard salary panel and regression inputs. Role-specific fields live on `candidate_job_postings` and are **not** synced back to `candidates` (the profile value is canonical; the old `syncCandidateExperience` helper was removed).

### 12.3 Money & dates
- All monetary values stored as integer cents (HKD 80,000 = `8000000`).
- All salary figures are **monthly** (HK convention).
- Use `formatSalary()` / `formatSalaryBand()` for display.

### 12.4 Storage buckets
- `portfolio-files` (private, 10MB): `${candidateId}/${projectId}/${fileName}`; served via signed URL (60s) from `/api/portfolio/[projectId]/file`. `file_path` never selected by client-facing queries.
- `match-files` (private, 10MB): `${matchId}/${messageId}-${fileName}`; served via signed URL (60s) from the message-file route.

### 12.5 Triggers
- `profile_create_role_row` — after INSERT on `profiles`, auto-creates the `candidates`/`employers` row.
- `profiles_updated_at` — maintains `updated_at`.

### 12.6 Legacy / dropped
- Dropped: `candidates.credits`/`free_accepts_used`, `employers.credits`/`free_postings_used` (migration 0026).
- Legacy/unused tables: `challenges`, `questions`, `challenge_results` (old skill-challenge system, retained but unreferenced).

### 12.7 Field length caps (server-enforced)
`MAX_TITLE_LEN` 200, `MAX_DESCRIPTION_LEN` 5000, `MAX_PITCH_MESSAGE_LEN` 2000, `MAX_CHAT_MESSAGE_LEN` 4000, `MAX_CHAT_FILE_SIZE_MB` 10.

---

## 13. API Reference

All DB access in Route Handlers uses the service client with explicit ownership filters (see [§16](#16-authentication--authorization)).

### 13.1 Candidate / profile
| Route | Methods | Purpose |
|---|---|---|
| `/api/profile` | GET, PATCH | Candidate/employer own profile + biodata |
| `/api/profile/notifications` | GET, PATCH | `profiles.email_notifications` toggle |
| `/api/candidates/me/score` | GET | Own composite_score/percentile/score_history (15s poll) |
| `/api/candidates/feed` | GET | Ranked candidate feed (employer-only, 15s poll) |
| `/api/me/export` | GET | Personal data export |

### 13.2 Portfolio & postings
| Route | Methods | Purpose |
|---|---|---|
| `/api/portfolio` | GET, POST | List/create projects (re-triggers scorer) |
| `/api/portfolio/[projectId]` | GET, PATCH, DELETE | Project CRUD (re-triggers scorer) |
| `/api/portfolio/[projectId]/file` | GET | Signed-URL redirect to portfolio file |
| `/api/postings` | GET, POST | Candidate postings (skills capped at 10) |
| `/api/postings/[postingId]` | GET, PATCH, DELETE | Candidate posting CRUD |
| `/api/employer-postings` | GET, POST | Employer postings (free up to 3, then 402) |
| `/api/employer-postings/[postingId]` | GET, PATCH, DELETE | Employer posting CRUD |
| `/api/employer-postings/[postingId]/candidates` | GET | Runs matcher; adds pitchedCandidateIds + capacity |
| `/api/employer-profile` | GET, PATCH | Company profile |

### 13.3 Matches & chat
| Route | Methods | Purpose |
|---|---|---|
| `/api/matches` | POST | Send pitch (402 if no active subscription) |
| `/api/matches/[matchId]/respond` | POST | accept/decline pitch; ticker + salary point on accept |
| `/api/matches/[matchId]/offer` | POST | Offer/exit state machine (§9.3) |
| `/api/matches/[matchId]/messages` | GET, POST | Chat messages (text or multipart file); 409 unless accepted |
| `/api/matches/[matchId]/messages/[messageId]/file` | GET | Signed-URL redirect to chat file |
| `/api/matches/[matchId]/read` | POST | Stamp viewer's read column |
| `/api/matches/[matchId]/portfolio-feedback` | GET, POST | Employer 1–5 rating (one per match) |

### 13.4 Salary & market
| Route | Methods | Purpose |
|---|---|---|
| `/api/salary` | POST | Proxy to salary-regression (passthrough) |
| `/api/market-snapshot` | GET | Aggregate market stats |

### 13.5 Subscriptions
| Route | Methods | Purpose |
|---|---|---|
| `/api/subscription/checkout` | POST | Create Stripe Checkout session ({tier}) |
| `/api/subscription/success` | GET | Verify session, flip to active |
| `/api/subscription/webhook` | POST | Stripe sync (signature-verified; must be in PUBLIC_ROUTES) |

### 13.6 Cron & admin
| Route | Methods | Purpose |
|---|---|---|
| `/api/cron/expire-matches` | GET, POST | Expire pending pitches + silent chats (Bearer CRON_SECRET; PUBLIC_ROUTES) |
| `/api/admin/postings/[postingId]/candidates` | GET | Admin matcher run |
| `/api/admin/matches` | POST | Create pitch on employer's behalf |
| `/api/admin/matches/[matchId]` | (mutations) | Admin match management |
| `/api/admin/candidates/[candidateId]` | (mutations) | Toggle founder verification |
| `/api/admin/recruiters/[employerId]/matches` | GET | Employer match overview |
| `/api/auth/[...all]` | * | Better Auth handler |

HTTP conventions: `402` = subscription required (feed/pitch/posting-over-limit); `409` = state conflict (chat/offer on non-accepted match, duplicate feedback); `404` = admin routes for non-admins.

---

## 14. Edge Functions

Deploy: `npx supabase functions deploy <name>`. Serve locally: `npx supabase functions serve`.

| Function | Input | Output (summary) |
|---|---|---|
| `recommendation-scorer` | `{candidate_id}` | Updates composite_score + percentile_rank; inserts score_history |
| `salary-regression` | `{years_exp, vertical?, location?, remote?, role?}` | Percentile curve + points + stats (§11.3) |
| `candidate-matcher` | `{posting_id}` | Top 25 ranked candidates with match_score + match_percentile (§10.2) |

---

## 15. Taxonomy & Reference Data

(Source: `src/lib/utils/constants.ts`)

- **Verticals (13):** consulting, design, education, finance, healthcare, hr, legal, marketing, media, ops, property, sales, tech. Display labels uppercase except ops→OPERATIONS, hr→HUMAN RESOURCES, tech→TECHNOLOGY.
- **Job roles (~97):** mapped to verticals (e.g. tech: Fullstack/Backend/Mobile/Frontend/Data/ML/Platform/SRE/Security/Staff Engineer). Used for the salary cascade and skills filtering.
- **Skills (~413):** vertical-tagged skill bank; posting picker suggests by vertical + search-all; capped at `MAX_POSTING_SKILLS` (10) per posting.
- **Countries (~63):** A–Z + "Other"; used for citizenship, posting location, company HQ. Each maps to a currency via `currencyForCountry()` (defaults HKD).
- **Languages:** full Google Translate set; stored as `language:level` with fluency in {native, fluent, conversational, basic}.
- **Work modes:** full_time, part_time, remote, internship.
- **Company sizes:** 1-10, 11-50, 51-200, 201-1000, 1000+.
- **Constants:** `MAX_PORTFOLIO_PROJECTS`=10, `MAX_POSTING_SKILLS`=10, `CHAT_GHOST_HOURS`=72, `FREE_JOB_POSTINGS`=3, `SCORE_TIERS` {gold:90, green:60, red:30}.

### 15.1 Salary seed provenance
Seed rows (`source: 'seed'`) cover ~97 roles across 13 verticals, calibrated to real published HK benchmarks: Morgan McKinley HK Salary Guide 2026, JobsDB employer-disclosed ranges, PayScale/Glassdoor/ERI/Indeed 2025-26, and C&SD 2025 Annual Earnings and Hours Survey. Each role anchors entry + 10-year points to a `base + growth * yrs^0.85` curve with ±10% noise (migrations 0016, 0018; citations in migration headers).

---

## 16. Authentication & Authorization

- **Better Auth** is the source of truth; session via `getServerSession()` (server) / `useSession()` (client).
- Role on `profiles.role` (candidate | employer).
- **Critical constraint:** Better Auth issues its own `better-auth.session_token` cookie, never a Supabase JWT, so `auth.uid()` is always NULL in Postgres for these requests. RLS policies of the form `auth.uid()::text = id` silently return no rows under the anon/cookie server client. **Resolution:** use `getSupabaseServiceClient()` (bypasses RLS) in Route Handlers and Server Components for own-row queries, applying the ownership filter explicitly (`.eq("id", session.user.id)`). RLS stays enabled as defense-in-depth. Client components needing own-data reads/writes call a service-client Route Handler, not Supabase directly.
- **Email verification (employer):** shelved in local dev (commented out in 3 places); re-enable for production. Intended: `sendOnSignUp: true`, `autoSignInAfterVerification: true`, gating at `EmployerLayout` redirecting to `/verify-email` while `emailVerified` is false. Candidates never receive verification email.
- **Account management:** change password (`revokeOtherSessions: true`), change email (verified-address emails an approval link to current inbox; unverified applies immediately), delete account (cascade with RESTRICT handling: null `salary_data_points.match_id`, delete user's matches, null `reputation_events.actor_id`).
- **Admin gate:** `isAdminEmail()` hardcoded allowlist; `/admin/*` 404s otherwise.

---

## 17. Notifications & Email

(`src/lib/email/send.ts`, Resend)

| Email | Type | Gating |
|---|---|---|
| `sendPitchNotification()` | activity | recipient `email_notifications !== false` |
| `sendMatchAcceptedNotification()` | activity | recipient `email_notifications !== false` |
| `sendNewMessageNotification()` | activity | recipient `email_notifications !== false` |
| `sendHireOfferNotification()` | activity | recipient `email_notifications !== false` |
| `sendWelcomeEmail()` | transactional | always |
| `sendVerificationEmail()` | transactional | always |
| `sendEmailChangeVerification()` | transactional | always |

Activity emails are suppressed at the call site when the recipient's toggle is off. Transactional always send. Toggle managed via `/api/profile/notifications`.

---

## 18. Anti-Ghosting & Reputation

Enforced by `GET|POST /api/cron/expire-matches` (`run()` → `{expired, ghosted_chats}`), scheduled hourly (`0 * * * *` in `vercel.json`). If `CRON_SECRET` set, requires `Authorization: Bearer ${CRON_SECRET}`.

- **Pending pitches (`expirePendingPitches`):** `pending` matches with `expires_at < now()` → `status: ghosted`. Accept/decline inserts a `responded` reputation event. No penalty for an unanswered pitch.
- **Silent chats (`expireSilentChats`):** accepted, unhired matches with no `match_messages` within `CHAT_GHOST_HOURS` (72) of last activity (`last_message_at`, else `responded_at`) → `status: ghosted` + `ghosted` reputation event (−10) against the silent party (whoever did not send the last message; defaults to employer if no messages).

Reputation events feed the `reputation_score` signal in the composite score (§10.1).

---

## 19. Billing & Subscriptions

- **Tier:** Starter HKD 150/mo (display copy in `UpgradePanel`; actual charge from Stripe price object `STRIPE_PRICE_STARTER` -- keep in step).
- **Columns:** `subscription_tier` (none/starter), `subscription_status` (active/past_due/canceled), `subscription_period_end`.
- **Gating:** feed access + sending a pitch require `status='active'` (else `UpgradePanel` / 402). Postings free up to `FREE_JOB_POSTINGS` (3, counted live from row count), then 402 unless active; active = unlimited.
- **Checkout:** `POST /api/subscription/checkout` ({tier}) creates a Stripe Checkout subscription session (employer_id + tier in session + subscription metadata), returns redirect url. `GET /api/subscription/success?session_id=...` verifies + flips to active.
- **Webhook:** `POST /api/subscription/webhook` (signature-verified via `STRIPE_WEBHOOK_SECRET`) handles `customer.subscription.created/updated/deleted`, maps status, sets tier/period-end from metadata + first item's `current_period_end`, keyed by employer_id.
- **Fallback:** columns remain manually settable (e.g. via `/admin/concierge`) when Stripe keys aren't configured.
- **UI surfaces:** TopBar PLAN stat, terminal SUBSCRIPTION tile, postings free-trial indicator (`X / 3 POSTINGS USED`).

---

## 20. Design System

(`src/app/globals.css`)

- Single hard-coded "terminal green + neutral slate" OKLCH palette; no theme switcher. CSS custom properties on `:root` mapped into Tailwind v4 `@theme` (no `tailwind.config.ts`).
- **Color tokens:** bg/bg-deep, surface/surface-2/surface-3, border-soft/border/border-strong, text/text-2/muted/dim, up (green, positive), down (red, negative), gold (top-tier), info (blue). `-dim` variants via `color-mix`.
- **Utility classes:** `.mono`/`.tnum`, `.kicker`, color shorthands, `.btn*` (use `Button`), `.panel*`, `.field`, `.badge*` (use `Badge`), `.datarow`/`DataRow`, `.live-dot`/`LiveDot`, `.countup`/`useCountUp`, `.view-enter`, `.ticker-wrap`/`.ticker-track`, `.slideover-panel`, `.grid-tex`.
- **Charts:** custom inline SVG in `src/components/charts/`: Sparkline, RadarChart, SalaryCurve, SalaryScatter, DepthBar, ScoreBar. Salary charts follow the honesty rules in §11.4.
- **Typography:** IBM Plex Mono throughout (sans + mono both Plex Mono); sole exception is the landing hero `<h1>` (Inter). Rule: any number on screen is `font-mono`.
- **Motion:** all animations respect `prefers-reduced-motion`; slide-overs gated by `html.anim-on` via `AnimEnabler`.

---

## 21. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | Never expose `SUPABASE_SERVICE_ROLE_KEY` to client; own-row access via service client + explicit filter; RLS enabled as defense-in-depth |
| Privacy | Private files only via 60s signed URLs; raw storage paths never reach the browser; personal data export via `/api/me/export` |
| Liveness | Score/feed 15s polling; chat 5s polling (Realtime unusable for RLS-gated tables under Better Auth) |
| Realtime | Only `match_ticker_events` (public-read RLS, no `auth.uid()` dependency) uses `postgres_changes` |
| Input safety | Server-enforced length caps (§12.7); skills capped at 10; file size 10MB at bucket level |
| Money integrity | Integer cents; monthly figures; partial unique index on `salary_data_points.match_id` prevents duplicate match points on race |
| Accessibility/motion | `prefers-reduced-motion` honored across all animations |
| Consistency | Single palette; monospace everywhere; shared chart/UI components |
| Deployment | Vercel; hourly cron via `vercel.json` |

---

## 22. Analytics & Success Metrics

PostHog (`NEXT_PUBLIC_POSTHOG_KEY`) + structured server events via `captureServerEvent()` (`src/lib/analytics/server.ts`). E.g. `salary_datapoint_created` emitted on accepted offer for data-moat tracking.

| Metric | Definition | Why it matters |
|---|---|---|
| Active employer subscriptions / MRR | count of `status='active'` × tier price | Primary revenue (G5) |
| Pitch → accept rate | accepted ÷ pitches sent | Feed ranking quality + fit (G1) |
| Accept → hire rate | hired ÷ accepted | End-to-end marketplace efficacy |
| Ghost rate | (ghosted pending + silent) ÷ total matches | Accountability health (G4) |
| Match-sourced salary points | count `source='match'` over time | Data moat / regression accuracy (G6) |
| Portfolio completeness | distribution of per-candidate completeness | Candidate engagement + feed signal (G2) |
| Time-to-first-pitch | sign-up → first pitch received | Discovery efficiency |
| Salary panel engagement | views/interactions on salary charts | Trust in the neutral reference (G3) |

---

## 23. Edge Cases & Failure Modes

- **Stripe not configured:** subscription columns settable manually via admin; gating still enforced on column values.
- **Salary endpoint < 3 points:** returns 422; charts fall back to a local least-squares line over raw points, or "AWAITING MARKET DATA" below 2 points.
- **Salary endpoint not redeployed:** chart consumers fall back to alias fields (`predicted_salary`/`ci_lower`/`ci_upper`, `points.length`).
- **Duplicate salary point on accept race:** insert hits `23505`, ignored (partial unique index).
- **Duplicate portfolio feedback:** `match_id` unique → `23505` → 409.
- **Offer/chat action on non-accepted match:** 409.
- **Pitch/feed/posting without subscription:** 402.
- **Hired candidate's posting:** deleted on accept so it leaves the matching pool; employer posting auto-closes at `max_candidates`.
- **Renege after hire:** reverses both reputation events + the salary point, re-scores candidate.
- **Account deletion with RESTRICT FKs:** `beforeDelete` nulls/deletes dependents in order; orphaned storage objects are a known cleanup TODO.

---

## 24. Open Questions & Roadmap

### 24.1 Known gaps / TODO
- Re-enable employer email verification for production (currently shelved in 3 places for local dev).
- Clean up orphaned `portfolio-files` / `match-files` storage objects on account deletion.

### 24.2 Open product questions
- Candidate-side discovery: should candidates see who viewed them, or browse demand signals more directly?
- Pricing validation: are Starter/Pro boundaries right for HK employer willingness-to-pay?
- Should founder verification be self-serve (e.g. domain/email proof) rather than admin-toggled?
- Do we need an employer-side "saved candidates" / shortlist beyond pitching?

### 24.3 Phased roadmap (indicative)
- **Phase 1 (launch):** Tech · Hong Kong; subscriptions live; salary model on seed + early match data; concierge-assisted liquidity.
- **Phase 2:** Re-enable verification; storage cleanup; self-serve founder verification; richer employer analytics.
- **Phase 3:** Open additional verticals already in the taxonomy (finance, design, etc.) as salary density allows.
- **Phase 4:** Geographic expansion (requires per-region seed calibration + currency handling, already partly modeled).

---

## 25. Glossary

| Term | Meaning |
|---|---|
| Composite score | 0–100 candidate ranking signal driving feed order |
| Percentile rank | Candidate's position relative to all candidates |
| Pitch | Employer-initiated outreach to a candidate; becomes a match |
| Match | Relationship object tracking a pitch through its lifecycle |
| Hire offer | A salary offer layered on an accepted match (`offer_status`) |
| Renege | Candidate backing out after accepting an offer (reverses side effects) |
| Salary data point | One observation (seed or match) feeding the regression |
| IQR band | p25–p75 interquartile band, the hero element of salary charts |
| Mincer model | Log-space quadratic earnings model (experience → salary) |
| Shrinkage | Continuous down-weighting of curvature when sample size is small |
| Vertical | Top-level industry taxonomy (13 total) |
| Role | A job title mapped to a vertical (~97 total) |
| Ghosting | Abandoning a pitch or accepted chat; penalized via reputation |
| Founder verified | Admin-set trust flag; shows a gold VERIFIED badge in the feed |

---

*This PRD documents the product as implemented in the codebase as of the date above. For deeper implementation detail, see `CLAUDE.md`, `src/lib/utils/constants.ts`, the `supabase/migrations/` history, and the edge functions under `supabase/functions/`.*
