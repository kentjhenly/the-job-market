import { resend, FROM } from "./resend";

interface PitchNotificationParams {
  to: string;
  companyName: string;
  pitchMessage: string | null;
  offeredSalary: number | null;
}

export async function sendPitchNotification({
  to,
  companyName,
  pitchMessage,
  offeredSalary,
}: PitchNotificationParams) {
  const salaryLine =
    offeredSalary != null
      ? `Offered salary: SGD ${(offeredSalary / 100).toLocaleString()}`
      : "";

  return resend.emails.send({
    from: FROM,
    to,
    subject: `New pitch from ${companyName} — The Job Market`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #ededed; padding: 32px; max-width: 480px;">
        <p style="color: #00ff41; font-size: 12px; letter-spacing: 4px; margin: 0 0 16px;">THE JOB MARKET</p>
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 8px;">NEW PITCH RECEIVED</h2>
        <p style="color: #a0a0a0; font-size: 13px; margin: 0 0 24px;">From: <strong style="color: #fff;">${companyName}</strong></p>
        ${pitchMessage ? `<p style="color: #ededed; font-size: 13px; border-left: 2px solid #00ff41; padding-left: 12px; margin: 0 0 24px;">${pitchMessage}</p>` : ""}
        ${salaryLine ? `<p style="color: #ffd700; font-size: 13px; margin: 0 0 24px;">${salaryLine}</p>` : ""}
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/candidate/matches" style="display: inline-block; background: #00ff41; color: #0a0a0a; font-weight: bold; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 3px;">
          VIEW PITCH →
        </a>
        <p style="color: #444; font-size: 11px; margin-top: 32px;">This pitch expires in 72 hours. Ignoring pitches reduces your employer's reputation score.</p>
      </div>
    `,
  });
}

interface MatchAcceptedParams {
  to: string;
  candidateName: string;
}

export async function sendMatchAcceptedNotification({
  to,
  candidateName,
}: MatchAcceptedParams) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Match accepted — The Job Market`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #ededed; padding: 32px; max-width: 480px;">
        <p style="color: #00ff41; font-size: 12px; letter-spacing: 4px; margin: 0 0 16px;">THE JOB MARKET</p>
        <h2 style="color: #00ff41; font-size: 18px; margin: 0 0 8px;">MATCH ACCEPTED</h2>
        <p style="color: #a0a0a0; font-size: 13px; margin: 0 0 24px;">
          <strong style="color: #fff;">${candidateName}</strong> has accepted your pitch.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/employer/matches" style="display: inline-block; background: #00ff41; color: #0a0a0a; font-weight: bold; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 3px;">
          VIEW MATCH →
        </a>
      </div>
    `,
  });
}

interface WelcomeEmailParams {
  to: string;
  name: string;
  role: "candidate" | "employer";
}

export async function sendWelcomeEmail({ to, name, role }: WelcomeEmailParams) {
  const dashboardUrl =
    role === "employer"
      ? `${process.env.NEXT_PUBLIC_APP_URL}/employer/dashboard`
      : `${process.env.NEXT_PUBLIC_APP_URL}/candidate/dashboard`;

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Welcome to The Job Market`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #ededed; padding: 32px; max-width: 480px;">
        <p style="color: #00ff41; font-size: 12px; letter-spacing: 4px; margin: 0 0 16px;">THE JOB MARKET</p>
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 8px;">ACCOUNT ACTIVATED</h2>
        <p style="color: #a0a0a0; font-size: 13px; margin: 0 0 24px;">
          Welcome, <strong style="color: #fff;">${name}</strong>. Your ${role} account is ready.
        </p>
        ${
          role === "candidate"
            ? `<p style="color: #ededed; font-size: 13px; margin: 0 0 24px;">Start by completing a skill challenge to get your composite score and appear in the employer feed.</p>`
            : `<p style="color: #ededed; font-size: 13px; margin: 0 0 24px;">Browse the ranked candidate feed and send pitches to candidates that match your needs.</p>`
        }
        <a href="${dashboardUrl}" style="display: inline-block; background: #00ff41; color: #0a0a0a; font-weight: bold; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 3px;">
          ENTER TERMINAL →
        </a>
      </div>
    `,
  });
}
