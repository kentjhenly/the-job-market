"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { CrossIcon } from "@/components/ui/Glyph";
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
  FLUENCY_LEVELS,
  parseLanguageEntry,
  formatLanguageEntry,
  JOB_ROLES,
  VERTICALS,
  currencyForCountry,
  verticalLabel,
} from "@/lib/utils/constants";
import type { FluencyLevel } from "@/lib/utils/constants";

export default function SettingsPage() {
  const { user } = useSession();

  const [form, setForm] = useState({
    display_name: "",
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
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    // Reject on a non-OK response so a failed load shows an error state instead
    // of destructuring an empty body into the form (which the user could then
    // save back over their real profile).
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load profile"))))
      .then(({ profile, candidate }) => {
        setForm({
          display_name: profile?.display_name ?? "",
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
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  }, [user?.id]);

  function addLanguage(value: string) {
    if (!value) return;
    const existing = form.languages.map((e) => parseLanguageEntry(e).language.toLowerCase());
    if (existing.includes(value.toLowerCase())) return;
    setForm((f) => ({ ...f, languages: [...f.languages, formatLanguageEntry(value, "fluent")] }));
  }

  function removeLanguage(entry: string) {
    setForm((f) => ({ ...f, languages: f.languages.filter((l) => l !== entry) }));
  }

  function changeFluency(entry: string, level: FluencyLevel) {
    setForm((f) => ({
      ...f,
      languages: f.languages.map((l) =>
        l === entry ? formatLanguageEntry(parseLanguageEntry(l).language, level) : l
      ),
    }));
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

  if (loadError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <span className="kicker c-down">COULD NOT LOAD YOUR SETTINGS</span>
        <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>
          RETRY
        </button>
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
          { label: "NOTIFICATIONS", content: <NotificationsForm role="candidate" /> },
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <div className="mb-2 flex flex-col gap-2">
                      {form.languages.map((entry) => {
                        const { language, level } = parseLanguageEntry(entry);
                        return (
                          <div key={entry} className="flex items-center gap-2">
                            <span className="mono" style={{ fontSize: 12, color: "var(--text)", minWidth: 100 }}>
                              {language}
                            </span>
                            <select
                              className="field mono flex-1"
                              style={{ fontSize: 11, padding: "4px 8px" }}
                              value={level}
                              onChange={(e) => changeFluency(entry, e.target.value as FluencyLevel)}
                            >
                              {FLUENCY_LEVELS.map((fl) => (
                                <option key={fl} value={fl}>{fl.toUpperCase()}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => removeLanguage(entry)}
                              className="mono inline-flex items-center"
                              style={{ color: "var(--down)", cursor: "pointer" }}
                              title="Remove"
                              aria-label="Remove"
                            >
                              <CrossIcon size={9} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <Combobox
                    value=""
                    onChange={(v) => addLanguage(v)}
                    options={LANGUAGES.filter(
                      (l) => !form.languages.some((e) => parseLanguageEntry(e).language.toLowerCase() === l.toLowerCase())
                    ).map((l) => ({ value: l }))}
                    placeholder="SEARCH"
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
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="kicker mb-1.5 block">YEARS</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={form.years_exp}
                      onChange={(e) => setForm((f) => ({ ...f, years_exp: e.target.value }))}
                      onWheel={(e) => e.currentTarget.blur()}
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
                      onWheel={(e) => e.currentTarget.blur()}
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block">
                      SALARY ({currencyForCountry(form.current_job_location)}/MONTH)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.current_salary}
                      onChange={(e) => setForm((f) => ({ ...f, current_salary: e.target.value }))}
                      onWheel={(e) => e.currentTarget.blur()}
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
                SAVE
              </Button>
              {saved && (
                <span className="mono" style={{ fontSize: 11, color: "var(--up)" }}>
                  SAVED
                </span>
              )}
            </div>
          </form>
        }
      />
    </div>
  );
}
