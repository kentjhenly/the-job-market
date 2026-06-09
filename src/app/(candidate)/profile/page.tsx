"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VERTICALS, type VerticalType } from "@/lib/utils/constants";

const SIZES_LABEL: Record<string, string> = {
  "1-10": "1–10",
  "11-50": "11–50",
  "51-200": "51–200",
  "201-1000": "201–1000",
  "1000+": "1000+",
};

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
      <div className="flex items-center justify-center h-64">
        <span className="font-mono text-muted text-xs animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-mono text-green text-sm tracking-widest">PROFILE</h1>
        <p className="text-muted text-xs font-mono mt-1">
          THIS INFORMATION IS VISIBLE TO EMPLOYERS IN THE FEED
        </p>
      </div>

      <form onSubmit={save}>
        <Card noPadding className="mb-4">
          <CardHeader>
            <CardTitle>IDENTITY</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
                DISPLAY NAME
              </label>
              <input
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                className="w-full bg-bg border border-border text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-green"
              />
            </div>

            <div>
              <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
                PRIMARY VERTICAL
              </label>
              <select
                value={form.vertical}
                onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value as VerticalType }))}
                className="w-full bg-bg border border-border text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-green"
              >
                <option value="">SELECT VERTICAL</option>
                {VERTICALS.map((v) => (
                  <option key={v} value={v}>{v.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card noPadding className="mb-4">
          <CardHeader>
            <CardTitle>EXPERIENCE & LOCATION</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
                YEARS OF EXPERIENCE
              </label>
              <input
                type="number"
                min="0"
                max="40"
                value={form.years_exp}
                onChange={(e) => setForm((f) => ({ ...f, years_exp: e.target.value }))}
                className="w-full bg-bg border border-border text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-green"
                placeholder="3"
              />
            </div>

            <div>
              <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
                LOCATION
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full bg-bg border border-border text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-green"
                placeholder="Singapore"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.remote_only}
                onChange={(e) => setForm((f) => ({ ...f, remote_only: e.target.checked }))}
                className="w-4 h-4 accent-green"
              />
              <span className="font-mono text-xs text-muted tracking-widest">REMOTE ONLY</span>
            </label>
          </div>
        </Card>

        <Card noPadding className="mb-6">
          <CardHeader>
            <CardTitle>SALARY EXPECTATIONS (SGD)</CardTitle>
          </CardHeader>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
                MINIMUM
              </label>
              <input
                type="number"
                value={form.desired_salary_min}
                onChange={(e) => setForm((f) => ({ ...f, desired_salary_min: e.target.value }))}
                className="w-full bg-bg border border-border text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-green"
                placeholder="80000"
              />
            </div>
            <div>
              <label className="block text-muted text-xs font-mono mb-1 tracking-widest">
                MAXIMUM
              </label>
              <input
                type="number"
                value={form.desired_salary_max}
                onChange={(e) => setForm((f) => ({ ...f, desired_salary_max: e.target.value }))}
                className="w-full bg-bg border border-border text-white font-mono text-sm px-3 py-2 focus:outline-none focus:border-green"
                placeholder="120000"
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>
            SAVE PROFILE
          </Button>
          {saved && (
            <span className="font-mono text-green text-xs">SAVED ✓</span>
          )}
        </div>
      </form>
    </div>
  );
}
