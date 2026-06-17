"use client";

import { useState } from "react";
import { DataRow } from "./DataRow";
import { SignOutButton } from "./SignOutButton";
import type { FaqEntry } from "@/lib/utils/faq";

export interface SettingsTab {
  label: string;
  content: React.ReactNode;
}

interface SettingsTabsProps {
  profile: React.ReactNode;
  // Role-specific tabs inserted after PROFILE, sorted by importance by the caller
  extraTabs?: SettingsTab[];
  // Tabs appended after ACCOUNT (e.g. a DANGER ZONE delete tab)
  trailingTabs?: SettingsTab[];
  faq: FaqEntry[];
  email?: string | null;
}

export function SettingsTabs({ profile, extraTabs = [], trailingTabs = [], faq, email }: SettingsTabsProps) {
  const tabs: SettingsTab[] = [
    { label: "PROFILE", content: profile },
    ...extraTabs,
    { label: "FAQ", content: <FaqPanel items={faq} /> },
    { label: "HELP", content: <HelpPanel /> },
    { label: "ACCOUNT", content: <AccountPanel email={email} /> },
    ...trailingTabs,
  ];
  const [active, setActive] = useState(tabs[0].label);

  return (
    <div className="flex gap-6">
      <nav className="flex w-44 shrink-0 flex-col overflow-hidden rounded-md border border-border bg-surface">
        {tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            className={`navitem w-full border-0 bg-transparent text-left ${active === t.label ? "active" : ""}`}
            onClick={() => setActive(t.label)}
          >
            <span className="ni-dot" />
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1">{tabs.find((t) => t.label === active)?.content}</div>
    </div>
  );
}

function FaqPanel({ items }: { items: FaqEntry[] }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">FREQUENTLY ASKED QUESTIONS</span>
      </div>
      <div className="p-4">
        {items.map((item, i) => (
          <div key={item.q} className="py-3" style={i > 0 ? { borderTop: "1px solid var(--border-soft)" } : undefined}>
            <p className="mono" style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>
              {item.q}
            </p>
            <p className="mono mt-1.5" style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HelpPanel() {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">HELP</span>
      </div>
      <div className="space-y-4 p-4">
        <p className="mono" style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
          Most questions are answered in the FAQ tab above. If you&apos;re stuck on something specific, reach out and
          we&apos;ll get back to you.
        </p>
        <DataRow label="SUPPORT" value="support@thejobmarket.com" />
        <DataRow label="RESPONSE TIME" value="WITHIN 1 BUSINESS DAY" />
      </div>
    </div>
  );
}

function AccountPanel({ email }: { email?: string | null }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">ACCOUNT</span>
      </div>
      <div className="space-y-4 p-4">
        {email && <DataRow label="EMAIL" value={email} />}
        <div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
