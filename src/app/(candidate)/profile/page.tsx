"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { VERTICALS, type VerticalType } from "@/lib/utils/constants";

export default function ProfilePage() {
  const { user } = useSession();
  const supabase = getSupabaseBrowserClient();

  const [form, setForm] = useState({
    display_name: "",
    vertical: "" as VerticalType | "",
    years_exp: "",
    location: "",
    remote_only: false,
    desired_salary_min: "",
    desired_salary_max: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      supabase.from("profiles").select("display_name, vertical").eq("id", user.id).single(),
      supabase
        .from("candidates")
        .select("years_exp_claimed, location, remote_only, desired_salary_min, desired_salary_max")
        .eq("id", user.id)
        .single(),
    ]).then(([{ data: profile }, { data: candidate }]) => {
      setForm({
        display_name: profile?.display_name ?? "",
        vertical: (profile?.vertical as VerticalType) ?? "",
        years_exp: candidate?.years_exp_claimed?.toString() ?? "",
        location: candidate?.location ?? "",
        remote_only: candidate?.remote_only ?? false,
        desired_salary_min: candidate?.desired_salary_min
          ? (candidate.desired_salary_min / 100).toString()
          : "",
        desired_salary_max: candidate?.desired_salary_max
          ? (candidate.desired_salary_max / 100).toString()
          : "",
      });
      setLoading(false);
    });
  }, [user?.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);

    await Promise.all([
      supabase
        .from("profiles")
        .update({
          display_name: form.display_name,
          vertical: form.vertical || null,
        })
        .eq("id", user.id),
      supabase
        .from("candidates")
        .update({
          years_exp_claimed: form.years_exp ? parseInt(form.years_exp) : null,
          location: form.location || null,
          remote_only: form.remote_only,
          desired_salary_min: form.desired_salary_min
            ? Math.round(parseFloat(form.desired_salary_min) * 100)
            : null,
          desired_salary_max: form.desired_salary_max
            ? Math.round(parseFloat(form.desired_salary_max) * 100)
            : null,
        })
        .eq("id", user.id),
    ]);

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="kicker animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="view-enter max-w-2xl space-y-6">
      <div>
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          PROFILE
        </h1>
        <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
          THIS INFORMATION IS VISIBLE TO EMPLOYERS IN THE FEED
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">IDENTITY</span>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">DISPLAY NAME</label>
              <input
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                className="field"
              />
            </div>

            <div>
              <label className="kicker mb-1.5 block">PRIMARY VERTICAL</label>
              <select
                value={form.vertical}
                onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value as VerticalType }))}
                className="field"
              >
                <option value="">SELECT VERTICAL</option>
                {VERTICALS.map((v) => (
                  <option key={v} value={v}>{v.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">EXPERIENCE & LOCATION</span>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">YEARS OF EXPERIENCE</label>
              <input
                type="number"
                min="0"
                max="40"
                value={form.years_exp}
                onChange={(e) => setForm((f) => ({ ...f, years_exp: e.target.value }))}
                className="field"
                placeholder="3"
              />
            </div>

            <div>
              <label className="kicker mb-1.5 block">LOCATION</label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="field"
                placeholder="Singapore"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.remote_only}
                onChange={(e) => setForm((f) => ({ ...f, remote_only: e.target.checked }))}
                className="h-4 w-4 accent-up"
              />
              <span className="kicker">REMOTE ONLY</span>
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">SALARY EXPECTATIONS (SGD)</span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <label className="kicker mb-1.5 block">MINIMUM</label>
              <input
                type="number"
                value={form.desired_salary_min}
                onChange={(e) => setForm((f) => ({ ...f, desired_salary_min: e.target.value }))}
                className="field"
                placeholder="80000"
              />
            </div>
            <div>
              <label className="kicker mb-1.5 block">MAXIMUM</label>
              <input
                type="number"
                value={form.desired_salary_max}
                onChange={(e) => setForm((f) => ({ ...f, desired_salary_max: e.target.value }))}
                className="field"
                placeholder="120000"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>
            SAVE PROFILE
          </Button>
          {saved && (
            <span className="mono" style={{ fontSize: 11, color: "var(--up)" }}>
              SAVED ✓
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
