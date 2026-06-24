"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Combobox } from "@/components/ui/Combobox";
import { SkillPicker } from "@/components/ui/SkillPicker";
import { Calendar } from "@/components/ui/Calendar";
import { SalaryScatter } from "@/components/charts/SalaryScatter";
import { SalaryEstimateFootnote } from "@/components/ui/SalaryEstimateFootnote";
import { DataRow } from "@/components/terminal/DataRow";
import { formatSalary, formatSalaryBand } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils/cn";
import {
  WORK_MODES,
  JOB_ROLES,
  VERTICALS,
  COUNTRIES,
  MAX_POSTING_SKILLS,
  NOTICE_PERIODS,
  verticalLabel,
  type VerticalType,
} from "@/lib/utils/constants";
import type { Database, WorkMode } from "@/lib/supabase/types";

type JobPosting = Database["public"]["Tables"]["candidate_job_postings"]["Row"];

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

interface JobPostingFormProps {
  initial: JobPosting | null;
  candYears?: number;
  candLocation?: string;
  candCitizenship?: string;
  vertical?: VerticalType;
  verifiedSkills?: string[];
}

export function JobPostingForm({
  initial,
  candYears,
  candLocation,
  candCitizenship,
  verifiedSkills = [],
}: JobPostingFormProps) {
  const router = useRouter();
  const isEditing = !!initial;

  // Industry drives the market-data cascade (overall → industry → role)
  // and filters the role list + skills. Derived from the saved title when
  // editing; starts at "" (ALL INDUSTRIES / overall market) otherwise.
  const [industry, setIndustry] = useState<VerticalType | "">(() => {
    if (initial?.title) {
      return JOB_ROLES.find((r) => r.title === initial.title)?.vertical ?? "";
    }
    return "";
  });

  const [form, setForm] = useState({
    title: initial?.title ?? "",
    location: initial?.location ?? candLocation ?? "",
    work_modes: initial?.work_modes ?? ([] as WorkMode[]),
    desired_salary_min:
      initial?.desired_salary_min != null ? (initial.desired_salary_min / 100).toString() : "",
    desired_salary_max:
      initial?.desired_salary_max != null ? (initial.desired_salary_max / 100).toString() : "",
    skills: initial?.skills ?? ([] as string[]),
    available_from: initial?.available_from ?? (null as string | null),
    notice_period_days: initial?.notice_period_days ?? (null as number | null),
    work_eligible: initial?.work_eligible ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [marketPoints, setMarketPoints] = useState<ScatterPoint[]>([]);
  const [curvePoints, setCurvePoints] = useState<CurvePoint[]>([]);
  const [stdDev, setStdDev] = useState<number | undefined>(undefined);
  const [medianAtExp, setMedianAtExp] = useState<number | undefined>(undefined);
  const [nPoints, setNPoints] = useState<number | undefined>(undefined);
  const [marginalPerYear, setMarginalPerYear] = useState<number | undefined>(undefined);
  const [expYears, setExpYears] = useState(
    initial?.years_exp != null ? Math.floor(initial.years_exp).toString() : ""
  );
  const [expMonths, setExpMonths] = useState(() => {
    if (initial?.years_exp == null) return "";
    const m = Math.round((initial.years_exp % 1) * 12);
    return m > 0 ? m.toString() : "";
  });

  const expTotal =
    (expYears ? parseInt(expYears) || 0 : 0) + (expMonths ? (parseInt(expMonths) || 0) / 12 : 0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetch("/api/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical: industry || undefined,
          years_exp: expTotal,
          location: candLocation ?? "Hong Kong",
          role: form.title || undefined,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.error) return;
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
  }, [expTotal, candLocation, industry, form.title]);

  function changeIndustry(next: VerticalType | "") {
    setIndustry(next);
    // Role is locked until an industry is picked; clear it when the
    // industry is reset or the role belongs to a different industry
    const match = JOB_ROLES.find((r) => r.title === form.title);
    if (!next || (match && match.vertical !== next)) {
      setForm((f) => ({ ...f, title: "" }));
    }
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
    // The role input skips native validation while disabled (pre-industry)
    if (!form.title) return;

    // Native `required` covers the inputs/selects; the custom widgets
    // (badges, skill picker, calendar) are validated here
    const missing: string[] = [];
    if (form.work_modes.length === 0) missing.push("WORK MODES");
    if (form.skills.length === 0) missing.push("SKILLS");
    if (!form.available_from && form.notice_period_days == null) missing.push("AVAILABILITY OR NOTICE PERIOD");
    if (missing.length > 0) {
      setFormError(`REQUIRED: ${missing.join(" · ")}`);
      return;
    }
    setFormError(null);
    setSaving(true);

    const body = {
      title: form.title,
      location: form.location || null,
      work_modes: form.work_modes,
      desired_salary_min: form.desired_salary_min
        ? Math.round(parseFloat(form.desired_salary_min) * 100)
        : null,
      desired_salary_max: form.desired_salary_max
        ? Math.round(parseFloat(form.desired_salary_max) * 100)
        : null,
      skills: form.skills,
      available_from: form.available_from,
      notice_period_days: form.notice_period_days,
      years_exp: expYears ? parseInt(expYears) + (parseInt(expMonths) || 0) / 12 : null,
      work_eligible:
        candCitizenship && form.location && candCitizenship !== form.location ? form.work_eligible : null,
    };

    const res = await fetch(
      isEditing ? `/api/postings/${initial.id}` : "/api/postings",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    setSaving(false);
    if (res.ok) {
      if (isEditing) {
        router.push(`/candidate/postings/${initial.id}`);
      } else {
        const { id } = await res.json();
        router.push(`/candidate/postings/${id}`);
      }
    } else {
      const json = await res.json().catch(() => ({}));
      setFormError(json.error ?? "FAILED TO SAVE POSITION");
    }
  }

  async function confirmDelete() {
    if (!initial) return;
    setDeleting(true);
    const res = await fetch(`/api/postings/${initial.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) router.push("/candidate/postings");
  }

  const candSalaryMin = form.desired_salary_min
    ? Math.round(parseFloat(form.desired_salary_min) * 100)
    : undefined;
  const candSalaryMax = form.desired_salary_max
    ? Math.round(parseFloat(form.desired_salary_max) * 100)
    : undefined;

  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Suggest median ± 1σ from the active regression as min/max placeholders
  const minSuggestion =
    medianAtExp != null && stdDev != null
      ? (Math.max(0, Math.round((medianAtExp - stdDev) / 100000)) * 1000).toString()
      : "80000";
  const maxSuggestion =
    medianAtExp != null && stdDev != null
      ? (Math.round((medianAtExp + stdDev) / 100000) * 1000).toString()
      : "120000";

  return (
    <div className="view-enter space-y-6">
      <div>
        <Link
          href={isEditing ? `/candidate/postings/${initial.id}` : "/candidate/postings"}
          className="link-up mono"
          style={{ fontSize: 11 }}
        >
          {isEditing ? "← BACK TO POSTING" : "← BACK TO POSTINGS"}
        </Link>
        <h1 className="mono mt-2" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
          {isEditing ? "EDIT JOB POSTING" : "CREATE JOB POSTING"}
        </h1>
      </div>

      <form onSubmit={save} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">LOCATION & WORK MODE</span>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">LOCATION</label>
              <Combobox
                value={form.location || ""}
                onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                options={COUNTRIES.map((c) => ({ value: c }))}
                placeholder="SELECT"
                required
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

            {candCitizenship && form.location && candCitizenship !== form.location && (
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.work_eligible}
                  onChange={(e) => setForm((f) => ({ ...f, work_eligible: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 accent-up"
                />
                <span className="mono" style={{ fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>
                  I am eligible to work in {form.location} (right to work / valid visa). Your citizenship (
                  {candCitizenship}) differs from this location.
                </span>
              </label>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">POSITION</span>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">INDUSTRY</label>
              <Combobox
                value={industry}
                onChange={(v) => changeIndustry(v as VerticalType | "")}
                options={VERTICALS.map((v) => ({ value: v, label: verticalLabel(v) }))}
                placeholder="SELECT"
                required
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">ROLE</label>
              <Combobox
                value={form.title}
                onChange={(title) => setForm((f) => ({ ...f, title }))}
                options={(industry ? JOB_ROLES.filter((r) => r.vertical === industry) : JOB_ROLES)
                  .slice()
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((r) => ({ value: r.title, group: r.vertical.toUpperCase() }))}
                placeholder={industry ? "SEARCH" : undefined}
                disabled={!industry}
                required
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
              <label className="kicker mb-1.5 block">YEARS</label>
              <input
                type="number"
                min={0}
                max={50}
                value={expYears}
                onChange={(e) => setExpYears(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                className="field"
                required
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">MONTHS</label>
              <input
                type="number"
                min={0}
                max={11}
                value={expMonths}
                onChange={(e) => setExpMonths(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                className="field"
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">EXPECTED SALARY (HKD/MONTH)</span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">MINIMUM</label>
              <input
                type="number"
                value={form.desired_salary_min}
                onChange={(e) => setForm((f) => ({ ...f, desired_salary_min: e.target.value }))}
                onWheel={(e) => e.currentTarget.blur()}
                className="field"
                placeholder={minSuggestion}
                required
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">MAXIMUM</label>
              <input
                type="number"
                value={form.desired_salary_max}
                onChange={(e) => setForm((f) => ({ ...f, desired_salary_max: e.target.value }))}
                onWheel={(e) => e.currentTarget.blur()}
                className="field"
                placeholder={maxSuggestion}
                required
              />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">SKILLS</span>
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
              industry={industry}
              verifiedSkills={verifiedSkills}
              max={MAX_POSTING_SKILLS}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">AVAILABILITY</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, notice_period_days: null }))}
                className={cn("badge", form.notice_period_days == null ? "badge-up" : "badge-muted")}
              >
                DATE
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, available_from: null, notice_period_days: f.notice_period_days ?? 0 }))}
                className={cn("badge", form.notice_period_days != null ? "badge-up" : "badge-muted")}
              >
                NOTICE PERIOD
              </button>
            </div>

            {form.notice_period_days == null ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="kicker">AVAILABLE FROM</label>
                  <span className="mono tnum" style={{ fontSize: 12, color: form.available_from ? "var(--up)" : "var(--dim)" }}>
                    {form.available_from
                      ? form.available_from <= todayISO
                        ? "IMMEDIATELY"
                        : form.available_from
                      : "NOT SET"}
                  </span>
                </div>
                <Calendar
                  value={form.available_from}
                  onChange={(date) => setForm((f) => ({ ...f, available_from: date }))}
                  minDate={new Date()}
                />
              </div>
            ) : (
              <div>
                <label className="kicker mb-1.5 block">NOTICE PERIOD</label>
                <div className="flex flex-wrap gap-2">
                  {NOTICE_PERIODS.map((np) => (
                    <button
                      type="button"
                      key={np.value}
                      onClick={() => setForm((f) => ({ ...f, notice_period_days: np.value, available_from: null }))}
                      className={cn("badge", form.notice_period_days === np.value ? "badge-up" : "badge-muted")}
                    >
                      {np.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {formError && (
          <p className="mono" style={{ fontSize: 11, color: "var(--down)" }}>
            {formError}
          </p>
        )}

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>
            SAVE
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(isEditing ? `/candidate/postings/${initial.id}` : "/candidate/postings")}
          >
            CANCEL
          </Button>
          {isEditing && (
            <Button type="button" variant="danger" className="ml-auto" onClick={() => setDeleteOpen(true)}>
              DELETE
            </Button>
          )}
        </div>
        </div>

        <div className="panel lg:sticky lg:top-6">
          <div className="panel-head">
            <span className="panel-title">MARKET DATA</span>
            <span className="kicker" style={{ color: "var(--up)" }}>
              {(form.title || industry || "ALL INDUSTRIES").toUpperCase()}
            </span>
          </div>
          <div className="p-4">
            <SalaryScatter
              points={marketPoints}
              curve={curvePoints}
              nPoints={nPoints ?? marketPoints.length}
              marginalPerYear={marginalPerYear}
              candYears={expTotal}
              candSalaryMin={candSalaryMin}
              candSalaryMax={candSalaryMax}
              tone="candidate"
              height={260}
            />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
              <div className="flex items-center gap-2">
                <span style={{ width: 14, height: 2, background: "var(--up)" }} />
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
                      background: "color-mix(in oklch, var(--up) 22%, transparent)",
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
              {candSalaryMin != null && candSalaryMax != null && (
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
              )}
            </div>
            <SalaryEstimateFootnote />
          </div>
          {curvePoints.length > 0 && (
            <div className="px-4 pb-2" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <DataRow
                label={`MEDIAN @ ${expTotal.toFixed(1).replace(/\.0$/, "")}Y`}
                value={medianAtExp != null ? formatSalary(medianAtExp) : "—"}
                color="up"
              />
              <DataRow
                label="YOUR RANGE"
                value={
                  candSalaryMin != null && candSalaryMax != null
                    ? formatSalaryBand(candSalaryMin, candSalaryMax)
                    : "—"
                }
                color="gold"
              />
              <DataRow label="STD DEVIATION" value={stdDev != null ? `±${formatSalary(stdDev)}` : "—"} />
            </div>
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
