"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/Button";
import { SettingsTabs } from "@/components/terminal/SettingsTabs";
import { ChangePasswordForm } from "@/components/terminal/ChangePasswordForm";
import { ChangeEmailForm } from "@/components/terminal/ChangeEmailForm";
import { NotificationsForm } from "@/components/terminal/NotificationsForm";
import { DeleteAccountForm } from "@/components/terminal/DeleteAccountForm";
import { DataRow } from "@/components/terminal/DataRow";
import Link from "next/link";
import { EMPLOYER_FAQ } from "@/lib/utils/faq";
import { COMPANY_SIZES, COUNTRIES } from "@/lib/utils/constants";

interface Subscription {
  tier: string;
  status: string;
  period_end: string | null;
}

export default function EmployerSettingsPage() {
  const { user } = useSession();

  const [form, setForm] = useState({
    display_name: "",
    company_name: "",
    company_size: "",
    industry: "",
    website: "",
    headquarters: "",
    description: "",
  });
  const [subscription, setSubscription] = useState<Subscription>({
    tier: "none",
    status: "canceled",
    period_end: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    fetch("/api/employer-profile")
      .then((res) => res.json())
      .then(({ profile, employer }) => {
        setForm({
          display_name: profile?.display_name ?? "",
          company_name: employer?.company_name ?? "",
          company_size: employer?.company_size ?? "",
          industry: employer?.industry ?? "",
          website: employer?.website ?? "",
          headquarters: employer?.headquarters ?? "",
          description: employer?.description ?? "",
        });
        setSubscription({
          tier: employer?.subscription_tier ?? "none",
          status: employer?.subscription_status ?? "canceled",
          period_end: employer?.subscription_period_end ?? null,
        });
        setLoading(false);
      });
  }, [user?.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);

    await fetch("/api/employer-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: form.display_name,
        company_name: form.company_name,
        company_size: form.company_size || null,
        industry: form.industry || null,
        website: form.website || null,
        headquarters: form.headquarters || null,
        description: form.description || null,
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
      </div>

      <SettingsTabs
        email={user?.email}
        faq={EMPLOYER_FAQ}
        extraTabs={[
          {
            label: "PLAN",
            content: (
              <div className="panel">
                <div className="panel-head">
                  <span className="panel-title">SUBSCRIPTION</span>
                  {subscription.status !== "active" && (
                    <Link href="/employer/feed" className="link-up mono" style={{ fontSize: 11 }}>
                      UPGRADE →
                    </Link>
                  )}
                </div>
                <div className="px-4">
                  <DataRow
                    label="TIER"
                    value={subscription.tier.toUpperCase()}
                    color={subscription.status === "active" ? "up" : undefined}
                  />
                  <DataRow
                    label="STATUS"
                    value={subscription.status.toUpperCase()}
                    color={subscription.status === "active" ? "up" : "down"}
                  />
                  <DataRow
                    label="RENEWS"
                    value={
                      subscription.period_end
                        ? new Date(subscription.period_end).toLocaleDateString()
                        : "—"
                    }
                  />
                </div>
                <div className="p-4">
                  <p className="mono" style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
                    An active subscription unlocks the ranked candidate feed, sending pitches, and unlimited job
                    postings beyond your first 3.
                  </p>
                </div>
              </div>
            ),
          },
          { label: "NOTIFICATIONS", content: <NotificationsForm /> },
          {
            label: "SECURITY",
            content: (
              <div className="space-y-6">
                <ChangeEmailForm settingsHref="/employer/settings" />
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
                <span className="panel-title">CONTACT</span>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <label className="kicker mb-1.5 block">CONTACT NAME</label>
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
                <span className="panel-title">COMPANY</span>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <label className="kicker mb-1.5 block">COMPANY NAME</label>
                  <input
                    value={form.company_name}
                    onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                    className="field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="kicker mb-1.5 block">COMPANY SIZE</label>
                    <select
                      value={form.company_size}
                      onChange={(e) => setForm((f) => ({ ...f, company_size: e.target.value }))}
                      className="field"
                    >
                      <option value="">SELECT SIZE</option>
                      {COMPANY_SIZES.map((s) => (
                        <option key={s} value={s}>{s} EMPLOYEES</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block">INDUSTRY</label>
                    <input
                      value={form.industry}
                      onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                      className="field"
                      placeholder="Technology"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="kicker mb-1.5 block">WEBSITE</label>
                    <input
                      value={form.website}
                      onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                      className="field"
                      placeholder="https://acme.com"
                    />
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block">HEADQUARTERS</label>
                    <select
                      value={form.headquarters}
                      onChange={(e) => setForm((f) => ({ ...f, headquarters: e.target.value }))}
                      className="field"
                    >
                      <option value="">SELECT LOCATION</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="kicker mb-1.5 block">ABOUT</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="field"
                    rows={4}
                    placeholder="What your company does. Shown to candidates on your pitches."
                  />
                </div>
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
