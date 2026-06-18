"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { SkillPicker } from "@/components/ui/SkillPicker";
import { Combobox } from "@/components/ui/Combobox";
import { SalaryScatter } from "@/components/charts/SalaryScatter";
import { SalaryEstimateFootnote } from "@/components/ui/SalaryEstimateFootnote";
import { DataRow } from "@/components/terminal/DataRow";
import { formatSalary, formatSalaryBand, formatPercentile } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";
import { WORK_MODES, VERTICALS, COUNTRIES, MAX_POSTING_SKILLS, verticalLabel, type VerticalType } from "@/lib/utils/constants";
import type { Database, WorkMode, Vertical, PostingStatus } from "@/lib/supabase/types";

type EmployerPosting = Database["public"]["Tables"]["employer_job_postings"]["Row"];

interface ScatterPoint {
  years_exp: number;
  salary: number;
  source?: string;
}

interface CurvePoint {
  years_exp: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface EmployerJobPostingFormProps {
  initial: EmployerPosting | null;
}

// Standard normal CDF (Abramowitz & Stegun 26.2.17) — used to translate the
// offered range's distance from the regression median (in std devs) into a
// percentile for the COMPETITIVENESS panel.
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

type CompetitivenessBand = "below" | "at" | "above";

const BAND_CONFIG: Record<CompetitivenessBand, { label: string; variant: "down" | "up" | "gold"; copy: string }> = {
  below: {
    label: "BELOW MARKET",
    variant: "down",
    copy:
      "This range sits below the market for this role and experience level. Candidates weighing other offers may look elsewhere — moving it toward the median widens the pool of strong candidates willing to engage.",
  },
  at: {
    label: "AT MARKET",
    variant: "up",
    copy:
      "This range is in line with the market for this role and experience level — competitive enough to attract strong candidates and keep them engaged through the process.",
  },
  above: {
    label: "ABOVE MARKET",
    variant: "gold",
    copy:
      "This range leads the market for this role and experience level. That's a strong signal to candidates and should help you win top talent and close faster.",
  },
};

export function EmployerJobPostingForm({ initial }: EmployerJobPostingFormProps) {
  const router = useRouter();
  const isEditing = !!initial;

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    vertical: (initial?.vertical ?? "tech") as Vertical,
    years_exp_min: initial?.years_exp_min?.toString() ?? "",
    years_exp_max: initial?.years_exp_max?.toString() ?? "",
    location: initial?.location ?? "",
    work_modes: initial?.work_modes ?? ([] as WorkMode[]),
    salary_min: initial?.salary_min != null ? (initial.salary_min / 100).toString() : "",
    salary_max: initial?.salary_max != null ? (initial.salary_max / 100).toString() : "",
    skills: initial?.skills ?? ([] as string[]),
    max_candidates: initial?.max_candidates ?? 5,
    status: (initial?.status ?? "open") as PostingStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [marketPoints, setMarketPoints] = useState<ScatterPoint[]>([]);
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>([]);
  const [stdDev, setStdDev] = useState<number | undefined>(undefined);
  const [medianAtExp, setMedianAtExp] = useState<number | undefined>(undefined);
  const [nPoints, setNPoints] = useState<number | undefined>(undefined);
  const [marginalPerYear, setMarginalPerYear] = useState<number | undefined>(undefined);

  const expMinNum = form.years_exp_min ? parseInt(form.years_exp_min) : null;
  const expMaxNum = form.years_exp_max ? parseInt(form.years_exp_max) : null;
  const expMid = expMinNum != null && expMaxNum != null ? (expMinNum + expMaxNum) / 2 : expMinNum ?? expMaxNum ?? 0;

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetch("/api/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: form.vertical,
          years_exp: expMid,
          location: form.location || "Hong Kong",
          role: form.title || undefined,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.error) {
            setCurvePoints([]);
            setMarketPoints([]);
            setStdDev(undefined);
            setMedianAtExp(undefined);
            setNPoints(undefined);
            setMarginalPerYear(undefined);
            return;
          }
          if (Array.isArray(d.curve)) {
            setCurvePoints(
              d.curve.map(
                (c: {
                  years_exp: number;
                  predicted_salary: number;
                  p25?: number;
                  p50?: number;
                  p75?: number;
                  p90?: number;
                  ci_lower?: number;
                  ci_upper?: number;
                }) => ({
                  years_exp: c.years_exp,
                  p25: c.p25 ?? c.ci_lower ?? c.predicted_salary,
                  p50: c.p50 ?? c.predicted_salary,
                  p75: c.p75 ?? c.ci_upper ?? c.predicted_salary,
                  p90: c.p90 ?? c.ci_upper ?? c.predicted_salary,
                })
              )
            );
          }
          setMarketPoints(
            Array.isArray(d.points)
              ? d.points.map((p: { years_exp: number; monthly_salary: number; source?: string }) => ({
                  years_exp: p.years_exp,
                  salary: p.monthly_salary,
                  source: p.source,
                }))
              : []
          );
          setStdDev(typeof d.std_dev === "number" ? d.std_dev : undefined);
          setMedianAtExp(typeof d.median_at_exp === "number" ? d.median_at_exp : undefined);
          setNPoints(typeof d.n_points === "number" ? d.n_points : undefined);
          setMarginalPerYear(typeof d.marginal_per_year === "number" ? d.marginal_per_year : undefined);
        })
        .catch(() => null);
    }, 350);

    return () => clearTimeout(timeout);
  }, [expMid, form.vertical, form.location, form.title]);

  const salaryMinCents = form.salary_min ? Math.round(parseFloat(form.salary_min) * 100) : undefined;
  const salaryMaxCents = form.salary_max ? Math.round(parseFloat(form.salary_max) * 100) : undefined;
  const offerMid =
    salaryMinCents != null && salaryMaxCents != null
      ? (salaryMinCents + salaryMaxCents) / 2
      : salaryMinCents ?? salaryMaxCents;

  let percentile: number | undefined;
  let band: CompetitivenessBand | undefined;
  if (offerMid != null && medianAtExp != null) {
    percentile = stdDev && stdDev > 0 ? normalCdf((offerMid - medianAtExp) / stdDev) * 100 : offerMid >= medianAtExp ? 100 : 0;
    band = percentile < 40 ? "below" : percentile > 60 ? "above" : "at";
  }

  function toggleWorkMode(mode: WorkMode) {
    setForm((f) => ({
      ...f,
      work_modes: f.work_modes.includes(mode)
        ? f.work_modes.filter((m) => m !== mode)
        : [...f.work_modes, mode],
    }));
  }

  function toggleSkill(skill: string) {
    setForm((f) => {
      if (f.skills.includes(skill)) {
        return { ...f, skills: f.skills.filter((s) => s !== skill) };
      }
      if (f.skills.length >= MAX_POSTING_SKILLS) return f;
      return { ...f, skills: [...f.skills, skill] };
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      title: form.title,
      description: form.description || null,
      vertical: form.vertical,
      years_exp_min: form.years_exp_min ? parseInt(form.years_exp_min) : null,
      years_exp_max: form.years_exp_max ? parseInt(form.years_exp_max) : null,
      location: form.location || null,
      work_modes: form.work_modes,
      salary_min: form.salary_min ? Math.round(parseFloat(form.salary_min) * 100) : null,
      salary_max: form.salary_max ? Math.round(parseFloat(form.salary_max) * 100) : null,
      skills: form.skills,
      max_candidates: form.max_candidates,
      status: form.status,
    };

    const res = await fetch(
      isEditing ? `/api/employer-postings/${initial.id}` : "/api/employer-postings",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    setSaving(false);
    if (res.ok) {
      if (isEditing) {
        router.refresh();
      } else {
        const { id } = await res.json();
        router.push(`/employer/postings/${id}`);
      }
    } else {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "FAILED TO SAVE POSTING");
    }
  }

  async function confirmDelete() {
    if (!initial) return;
    setDeleting(true);
    const res = await fetch(`/api/employer-postings/${initial.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) router.push("/employer/postings");
  }

  return (
    <div className="view-enter max-w-2xl space-y-6">
      <div>
        <Link href="/employer/postings" className="link-up mono" style={{ fontSize: 11 }}>
          ← BACK TO POSTINGS
        </Link>
        <h1 className="mono mt-2" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
          {isEditing ? "EDIT JOB POSTING" : "CREATE JOB POSTING"}
        </h1>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">ROLE</span>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">TITLE / JOB ROLE</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="field"
                placeholder="Senior Frontend Engineer"
                required
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">DESCRIPTION</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="field"
                rows={4}
                placeholder="What this role involves, team context, etc."
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">VERTICAL</label>
              <Combobox
                value={form.vertical}
                onChange={(v) => setForm((f) => ({ ...f, vertical: v as Vertical }))}
                options={VERTICALS.map((v) => ({ value: v, label: verticalLabel(v) }))}
                placeholder="SELECT"
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">EXPERIENCE</span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">MIN YEARS</label>
              <input
                type="number"
                min={0}
                value={form.years_exp_min}
                onChange={(e) => setForm((f) => ({ ...f, years_exp_min: e.target.value }))}
                className="field"
                placeholder="2"
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">MAX YEARS</label>
              <input
                type="number"
                min={0}
                value={form.years_exp_max}
                onChange={(e) => setForm((f) => ({ ...f, years_exp_max: e.target.value }))}
                className="field"
                placeholder="6"
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">SALARY (HKD/MONTH)</span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">MINIMUM</label>
              <input
                type="number"
                value={form.salary_min}
                onChange={(e) => setForm((f) => ({ ...f, salary_min: e.target.value }))}
                className="field"
                placeholder="80000"
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">MAXIMUM</label>
              <input
                type="number"
                value={form.salary_max}
                onChange={(e) => setForm((f) => ({ ...f, salary_max: e.target.value }))}
                className="field"
                placeholder="120000"
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">COMPETITIVENESS</span>
            {band && <Badge variant={BAND_CONFIG[band].variant}>{BAND_CONFIG[band].label}</Badge>}
          </div>
          <div className="p-4">
            {offerMid == null ? (
              <p className="kicker">ENTER A SALARY RANGE TO SEE HOW IT COMPARES TO THE MARKET</p>
            ) : (
              <SalaryScatter
                points={marketPoints}
                curve={curvePoints}
                nPoints={nPoints ?? marketPoints.length}
                marginalPerYear={marginalPerYear}
                candYears={expMid}
                candSalaryMin={salaryMinCents}
                candSalaryMax={salaryMaxCents}
                tone="employer"
                height={220}
              />
            )}
            {offerMid != null && medianAtExp != null && band && (
              <>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ width: 14, height: 2, background: "var(--info)" }} />
                    <span className="mono" style={{ fontSize: 9, color: "var(--dim)", letterSpacing: "0.06em" }}>
                      MEDIAN
                    </span>
                  </div>
                  {curvePoints.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          width: 14,
                          height: 8,
                          background: "color-mix(in oklch, var(--info) 22%, transparent)",
                        }}
                      />
                      <span className="mono" style={{ fontSize: 9, color: "var(--dim)", letterSpacing: "0.06em" }}>
                        P25–P75 RANGE
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--muted)",
                        opacity: 0.6,
                      }}
                    />
                    <span className="mono" style={{ fontSize: 9, color: "var(--dim)", letterSpacing: "0.06em" }}>
                      MARKET
                    </span>
                  </div>
                  {marketPoints.some((p) => p.source === "match") && (
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "var(--up)",
                        }}
                      />
                      <span className="mono" style={{ fontSize: 9, color: "var(--dim)", letterSpacing: "0.06em" }}>
                        REAL MATCHES
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "var(--gold)",
                      }}
                    />
                    <span className="mono" style={{ fontSize: 9, color: "var(--dim)", letterSpacing: "0.06em" }}>
                      YOUR RANGE
                    </span>
                  </div>
                </div>
                <p className="mono mt-4" style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}>
                  {BAND_CONFIG[band].copy}
                </p>
                <SalaryEstimateFootnote />
              </>
            )}
          </div>
          {offerMid != null && medianAtExp != null && (
            <div className="px-4 pb-3" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <DataRow
                label={`MARKET MEDIAN @ ${expMid.toFixed(1).replace(/\.0$/, "")}Y`}
                value={formatSalary(medianAtExp)}
                color="up"
              />
              <DataRow
                label="YOUR RANGE"
                value={
                  salaryMinCents != null && salaryMaxCents != null
                    ? formatSalaryBand(salaryMinCents, salaryMaxCents)
                    : formatSalary(offerMid)
                }
                color="gold"
              />
              {percentile != null && band && (
                <DataRow
                  label="YOUR OFFER SITS AT"
                  value={formatPercentile(percentile)}
                  color={band === "below" ? "down" : band === "above" ? "gold" : "up"}
                />
              )}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">LOCATION & WORK MODE</span>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">LOCATION</label>
              <Combobox
                value={form.location}
                onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                options={COUNTRIES.map((c) => ({ value: c }))}
                placeholder="SELECT"
              />
            </div>

            <div>
              <label className="kicker mb-1.5 block">WORK MODES</label>
              <div className="flex flex-wrap gap-2">
                {WORK_MODES.map((mode) => {
                  const selected = form.work_modes.includes(mode.value);
                  return (
                    <button
                      type="button"
                      key={mode.value}
                      onClick={() => toggleWorkMode(mode.value)}
                      className={cn("badge", selected ? "badge-up" : "badge-muted")}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">REQUIRED SKILLS</span>
            <span
              className="kicker"
              style={{ color: form.skills.length >= MAX_POSTING_SKILLS ? "var(--gold)" : "var(--muted)" }}
            >
              {form.skills.length}/{MAX_POSTING_SKILLS}
            </span>
          </div>
          <div className="p-4">
            <SkillPicker
              selected={form.skills}
              onToggle={toggleSkill}
              industry={form.vertical as VerticalType}
              max={MAX_POSTING_SKILLS}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">CAPACITY & STATUS</span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">MAX ACTIVE CANDIDATES</label>
              <input
                type="number"
                min={1}
                value={form.max_candidates}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_candidates: parseInt(e.target.value) || 1 }))
                }
                className="field"
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">STATUS</label>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: "open" }))}
                  className={cn("badge", form.status === "open" ? "badge-up" : "badge-muted")}
                >
                  OPEN
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: "closed" }))}
                  className={cn("badge", form.status === "closed" ? "badge-down" : "badge-muted")}
                >
                  CLOSED
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="kicker c-down" style={{ fontSize: 11 }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>
            SAVE POSTING
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/employer/postings")}>
            CANCEL
          </Button>
          {isEditing && (
            <Button type="button" variant="danger" className="ml-auto" onClick={() => setDeleteOpen(true)}>
              DELETE
            </Button>
          )}
        </div>
      </form>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="DELETE POSTING">
        <div className="space-y-4">
          <p className="mono" style={{ fontSize: 12, color: "var(--text)" }}>
            Delete &quot;{initial?.title}&quot;? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>
              DELETE
            </Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              CANCEL
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
