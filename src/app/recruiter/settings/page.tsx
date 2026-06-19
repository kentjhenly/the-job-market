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
import { DataRow } from "@/components/terminal/DataRow";
import Link from "next/link";
import { EMPLOYER_FAQ } from "@/lib/utils/faq";
import { COMPANY_SIZES, COUNTRIES, VERTICALS, verticalLabel } from "@/lib/utils/constants";

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

    fetch("/api/recruiter-profile")
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

    await fetch("/api/recruiter-profile", {
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
        <h1 className="mono" style={{ color: "var(--up)", fontSize: 14, letterSpacing: "0.16em" }}>
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
                    <Link href="/recruiter/feed" className="link-up mono" style={{ fontSize: 11 }}>
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
              </div>
            ),
          },
          { label: "NOTIFICATIONS", content: <NotificationsForm /> },
          {
            label: "SECURITY",
            content: (
              <div className="space-y-6">
                <ChangeEmailForm settingsHref="/recruiter/settings" />
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
                <span className="panel-title">RECRUITER</span>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <label className="kicker mb-1.5 block">RECRUITER NAME</label>
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
                    <Combobox
                      value={form.company_size}
                      onChange={(v) => setForm((f) => ({ ...f, company_size: v }))}
                      options={COMPANY_SIZES.map((s) => ({ value: s, label: `${s} EMPLOYEES` }))}
                      placeholder="SELECT"
                    />
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block">INDUSTRY</label>
                    <Combobox
                      value={form.industry}
                      onChange={(v) => setForm((f) => ({ ...f, industry: v }))}
                      options={VERTICALS.map((v) => ({ value: v, label: verticalLabel(v) }))}
                      placeholder="SELECT"
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
                    />
                  </div>
                  <div>
                    <label className="kicker mb-1.5 block">HEADQUARTERS</label>
                    <Combobox
                      value={form.headquarters}
                      onChange={(v) => setForm((f) => ({ ...f, headquarters: v }))}
                      options={COUNTRIES.map((c) => ({ value: c }))}
                      placeholder="SELECT"
                    />
                  </div>
                </div>

                <div>
                  <label className="kicker mb-1.5 block">ABOUT</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="field"
                    rows={4}
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
