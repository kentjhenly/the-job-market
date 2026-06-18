"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { SettingsTabs } from "@/components/terminal/SettingsTabs";
import { Combobox } from "@/components/ui/Combobox";
import { ChangePasswordForm } from "@/components/terminal/ChangePasswordForm";
import { ChangeEmailForm } from "@/components/terminal/ChangeEmailForm";
import { NotificationsForm } from "@/components/terminal/NotificationsForm";
import { DeleteAccountForm } from "@/components/terminal/DeleteAccountForm";
import { CANDIDATE_FAQ } from "@/lib/utils/faq";
import {
  COUNTRIES,
  LANGUAGES,
  JOB_ROLES,
  VERTICALS,
  currencyForCountry,
  verticalLabel,
} from "@/lib/utils/constants";

const SEX_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

function ageFrom(iso: string): number | null {
  if (!iso) return null;
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

// Date of birth is shown/entered as DD/MM/YYYY but stored as ISO (YYYY-MM-DD).
function isoToDdmmyyyy(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}
function ddmmyyyyToIso(s: string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

export default function SettingsPage() {
  const { user } = useSession();

  const [form, setForm] = useState({
    display_name: "",
    date_of_birth: "",
    sex: "",
    languages: [] as string[],
    citizenship: "",
    location: "",
    years_exp: "",
    exp_months: "",
    current_salary: "",
    current_job_location: "",
    current_job_vertical: "",
    current_job_role: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    fetch("/api/profile")
      .then((res) => res.json())
      .then(({ profile, candidate }) => {
        setForm({
          display_name: profile?.display_name ?? "",
          date_of_birth: isoToDdmmyyyy(candidate?.date_of_birth ?? ""),
          sex: candidate?.sex ?? "",
          languages: candidate?.languages ?? [],
          citizenship: candidate?.citizenship ?? "",
          location: candidate?.location ?? "",
          years_exp: candidate?.years_exp_claimed?.toString() ?? "",
          exp_months: candidate?.exp_months != null ? candidate.exp_months.toString() : "",
          current_salary: candidate?.current_salary ? (candidate.current_salary / 100).toString() : "",
          current_job_location: candidate?.current_job_location ?? "",
          current_job_vertical: candidate?.current_job_vertical ?? "",
          current_job_role: candidate?.current_job_role ?? "",
        });
        setLoading(false);
      });
  }, [user?.id]);

  function addLanguage(value: string) {
    if (!value) return;
    setForm((f) =>
      f.languages.some((l) => l.toLowerCase() === value.toLowerCase())
        ? f
        : { ...f, languages: [...f.languages, value] }
    );
  }

  function removeLanguage(lang: string) {
    setForm((f) => ({ ...f, languages: f.languages.filter((l) => l !== lang) }));
  }

  function changeJobIndustry(vertical: string) {
    setForm((f) => {
      const role = JOB_ROLES.find((r) => r.title === f.current_job_role);
      return {
        ...f,
        current_job_vertical: vertical,
        current_job_role: role && role.vertical === vertical ? f.current_job_role : "",
      };
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);

    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: form.display_name,
        date_of_birth: ddmmyyyyToIso(form.date_of_birth) || null,
        sex: form.sex || null,
        languages: form.languages,
        citizenship: form.citizenship || null,
        location: form.location || null,
        years_exp_claimed: form.years_exp ? parseInt(form.years_exp) : null,
        exp_months: form.exp_months ? parseInt(form.exp_months) : null,
        current_salary: form.current_salary ? Math.round(parseFloat(form.current_salary) * 100) : null,
        current_job_location: form.current_job_location || null,
        current_job_vertical: form.current_job_vertical || null,
        current_job_role: form.current_job_role || null,
      }),
    });

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
    <div className="view-enter space-y-6">
      <div>
        <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
          SETTINGS
        </h1>
      </div>

      <SettingsTabs
        email={user?.email}
        faq={CANDIDATE_FAQ}
        extraTabs={[
          { label: "NOTIFICATIONS", content: <NotificationsForm /> },
          {
            label: "SECURITY",
            content: (
              <div className="space-y-6">
                <ChangeEmailForm settingsHref="/candidate/settings" />
                <ChangePasswordForm />
              </div>
            ),
          },
        ]}
        trailingTabs={[{ label: "DANGER ZONE", content: <DeleteAccountForm /> }]}
        profile={
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
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">BIODATA</span>
              </div>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="kicker mb-1.5 block">DATE OF BIRTH</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.date_of_birth}
                      onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                      className="field"
                      placeholder="DD/MM/YYYY"
                      style={{ textTransform: "uppercase" }}
                    />
                    {ageFrom(ddmmyyyyToIso(form.date_of_birth)) != null && (
                      <span className="mono mt-1 block" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                        AGE {ageFrom(ddmmyyyyToIso(form.date_of_birth))}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block">SEX</label>
                    <Combobox
                      value={form.sex}
                      onChange={(v) => setForm((f) => ({ ...f, sex: v }))}
                      options={SEX_OPTIONS.map((s) => ({ value: s }))}
                      placeholder="SELECT"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="kicker mb-1.5 block">CITIZENSHIP</label>
                    <Combobox
                      value={form.citizenship}
                      onChange={(v) => setForm((f) => ({ ...f, citizenship: v }))}
                      options={COUNTRIES.map((c) => ({ value: c }))}
                      placeholder="SELECT"
                    />
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block">COUNTRY OF RESIDENCE</label>
                    <Combobox
                      value={form.location}
                      onChange={(v) => setForm((f) => ({ ...f, location: v }))}
                      options={COUNTRIES.map((c) => ({ value: c }))}
                      placeholder="SELECT"
                    />
                  </div>
                </div>

                <div>
                  <label className="kicker mb-1.5 block">LANGUAGES</label>
                  {form.languages.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {form.languages.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => removeLanguage(lang)}
                          className="badge badge-up"
                          title="Remove"
                        >
                          {lang} ✕
                        </button>
                      ))}
                    </div>
                  )}
                  <Combobox
                    value=""
                    onChange={(v) => addLanguage(v)}
                    options={LANGUAGES.filter((l) => !form.languages.includes(l)).map((l) => ({ value: l }))}
                    placeholder="SELECT"
                  />
                </div>

              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <span className="panel-title">CURRENT JOB</span>
                <span className="kicker" style={{ color: "var(--dim)" }}>
                  PRIVATE
                </span>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <label className="kicker mb-1.5 block">LOCATION</label>
                  <Combobox
                    value={form.current_job_location}
                    onChange={(v) => setForm((f) => ({ ...f, current_job_location: v }))}
                    options={COUNTRIES.map((c) => ({ value: c }))}
                    placeholder="SELECT"
                  />
                </div>
                <div>
                  <label className="kicker mb-1.5 block">INDUSTRY</label>
                  <Combobox
                    value={form.current_job_vertical}
                    onChange={(v) => changeJobIndustry(v)}
                    options={VERTICALS.map((v) => ({ value: v, label: verticalLabel(v) }))}
                    placeholder="SELECT"
                  />
                </div>
                <div>
                  <label className="kicker mb-1.5 block">ROLE</label>
                  <Combobox
                    value={form.current_job_role}
                    onChange={(v) => setForm((f) => ({ ...f, current_job_role: v }))}
                    options={(form.current_job_vertical
                      ? JOB_ROLES.filter((r) => r.vertical === form.current_job_vertical)
                      : JOB_ROLES
                    )
                      .slice()
                      .sort((a, b) => a.title.localeCompare(b.title))
                      .map((r) => ({ value: r.title, group: r.vertical.toUpperCase() }))}
                    placeholder={form.current_job_vertical ? "SELECT" : undefined}
                    disabled={!form.current_job_vertical}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="kicker mb-1.5 block">YEARS</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={form.years_exp}
                      onChange={(e) => setForm((f) => ({ ...f, years_exp: e.target.value }))}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block">MONTHS</label>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={form.exp_months}
                      onChange={(e) => setForm((f) => ({ ...f, exp_months: e.target.value }))}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block">
                      SALARY ({currencyForCountry(form.current_job_location)})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.current_salary}
                      onChange={(e) => setForm((f) => ({ ...f, current_salary: e.target.value }))}
                      className="field"
                    />
                  </div>
                </div>
                <p className="mono" style={{ fontSize: 10.5, color: "var(--dim)", lineHeight: 1.6 }}>
                  Not visible to employers. Used only to plot your own position on the salary curve.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" loading={saving}>
                SAVE SETTINGS
              </Button>
              {saved && (
                <span className="mono" style={{ fontSize: 11, color: "var(--up)" }}>
                  SAVED ✓
                </span>
              )}
            </div>
          </form>
        }
      />
    </div>
  );
}
