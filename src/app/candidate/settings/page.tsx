"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { SettingsTabs } from "@/components/terminal/SettingsTabs";
import { ChangePasswordForm } from "@/components/terminal/ChangePasswordForm";
import { ChangeEmailForm } from "@/components/terminal/ChangeEmailForm";
import { NotificationsForm } from "@/components/terminal/NotificationsForm";
import { DeleteAccountForm } from "@/components/terminal/DeleteAccountForm";
import { CANDIDATE_FAQ } from "@/lib/utils/faq";

const SEX_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

function ageFrom(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export default function SettingsPage() {
  const { user } = useSession();

  const [form, setForm] = useState({
    display_name: "",
    date_of_birth: "",
    sex: "",
    languages: [] as string[],
    citizenship: "",
  });
  const [langInput, setLangInput] = useState("");
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
          date_of_birth: candidate?.date_of_birth ?? "",
          sex: candidate?.sex ?? "",
          languages: candidate?.languages ?? [],
          citizenship: candidate?.citizenship ?? "",
        });
        setLoading(false);
      });
  }, [user?.id]);

  function addLanguage() {
    const value = langInput.trim();
    if (!value) return;
    setForm((f) =>
      f.languages.some((l) => l.toLowerCase() === value.toLowerCase())
        ? f
        : { ...f, languages: [...f.languages, value] }
    );
    setLangInput("");
  }

  function removeLanguage(lang: string) {
    setForm((f) => ({ ...f, languages: f.languages.filter((l) => l !== lang) }));
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
        date_of_birth: form.date_of_birth || null,
        sex: form.sex || null,
        languages: form.languages,
        citizenship: form.citizenship || null,
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
        <h1 className="kicker" style={{ color: "var(--up)", fontSize: 12 }}>
          SETTINGS
        </h1>
        <p className="mono mt-1" style={{ fontSize: 11, color: "var(--muted)" }}>
          PROFILE, NOTIFICATIONS, SECURITY, AND ACCOUNT
        </p>
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
                      type="date"
                      value={form.date_of_birth}
                      onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                      className="field"
                      max={new Date().toISOString().slice(0, 10)}
                    />
                    {ageFrom(form.date_of_birth) != null && (
                      <span className="mono mt-1 block" style={{ fontSize: 10.5, color: "var(--dim)" }}>
                        AGE {ageFrom(form.date_of_birth)}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block">SEX</label>
                    <select
                      value={form.sex}
                      onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
                      className="field"
                    >
                      <option value="">SELECT</option>
                      {SEX_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="kicker mb-1.5 block">CITIZENSHIP</label>
                  <input
                    value={form.citizenship}
                    onChange={(e) => setForm((f) => ({ ...f, citizenship: e.target.value }))}
                    className="field"
                    placeholder="Hong Kong SAR"
                  />
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
                  <input
                    value={langInput}
                    onChange={(e) => setLangInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addLanguage();
                      }
                    }}
                    onBlur={addLanguage}
                    className="field"
                    placeholder="Type a language and press Enter"
                  />
                </div>

                <p className="mono" style={{ fontSize: 10.5, color: "var(--dim)", lineHeight: 1.6 }}>
                  Role, experience, location, work mode, and salary are set per position in{" "}
                  <Link href="/candidate/postings" className="link-up">
                    POSTINGS
                  </Link>
                  , so they can differ for each role you&apos;re open to.
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
