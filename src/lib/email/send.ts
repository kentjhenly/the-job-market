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
      ? `Offered salary: HKD ${(offeredSalary / 100).toLocaleString()}`
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
        <p style="color: #444; font-size: 11px; margin-top: 32px;">This pitch expires in 72 hours. Ignoring it will reduce your reputation score.</p>
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
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/employer/postings" style="display: inline-block; background: #00ff41; color: #0a0a0a; font-weight: bold; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 3px;">
          VIEW MATCH →
        </a>
      </div>
    `,
  });
}

interface VerificationEmailParams {
  to: string;
  name: string;
  url: string;
}

export async function sendVerificationEmail({ to, name, url }: VerificationEmailParams) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Verify your email for The Job Market`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #ededed; padding: 32px; max-width: 480px;">
        <p style="color: #00ff41; font-size: 12px; letter-spacing: 4px; margin: 0 0 16px;">THE JOB MARKET</p>
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 8px;">VERIFY YOUR WORK EMAIL</h2>
        <p style="color: #a0a0a0; font-size: 13px; margin: 0 0 24px;">
          Hi <strong style="color: #fff;">${name}</strong>, confirm this address to activate your employer account and start browsing the candidate feed.
        </p>
        <a href="${url}" style="display: inline-block; background: #00ff41; color: #0a0a0a; font-weight: bold; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 3px;">
          VERIFY EMAIL →
        </a>
        <p style="color: #444; font-size: 11px; margin-top: 32px;">This link expires in 1 hour. If you didn't create this account, you can ignore this email.</p>
      </div>
    `,
  });
}

interface EmailChangeVerificationParams {
  to: string;
  name: string;
  newEmail: string;
  url: string;
}

export async function sendEmailChangeVerification({
  to,
  name,
  newEmail,
  url,
}: EmailChangeVerificationParams) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Confirm your email change — The Job Market`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #ededed; padding: 32px; max-width: 480px;">
        <p style="color: #00ff41; font-size: 12px; letter-spacing: 4px; margin: 0 0 16px;">THE JOB MARKET</p>
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 8px;">CONFIRM EMAIL CHANGE</h2>
        <p style="color: #a0a0a0; font-size: 13px; margin: 0 0 24px;">
          Hi <strong style="color: #fff;">${name}</strong>, confirm you want to change your sign-in email to
          <strong style="color: #fff;">${newEmail}</strong>.
        </p>
        <a href="${url}" style="display: inline-block; background: #00ff41; color: #0a0a0a; font-weight: bold; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 3px;">
          CONFIRM CHANGE →
        </a>
        <p style="color: #444; font-size: 11px; margin-top: 32px;">If you didn't request this, you can safely ignore this email and your address will stay the same.</p>
      </div>
    `,
  });
}

interface NewMessageNotificationParams {
  to: string;
  senderName: string;
  matchUrl: string;
}

export async function sendNewMessageNotification({
  to,
  senderName,
  matchUrl,
}: NewMessageNotificationParams) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `New message from ${senderName} - The Job Market`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #ededed; padding: 32px; max-width: 480px;">
        <p style="color: #00ff41; font-size: 12px; letter-spacing: 4px; margin: 0 0 16px;">THE JOB MARKET</p>
        <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 8px;">NEW MESSAGE</h2>
        <p style="color: #a0a0a0; font-size: 13px; margin: 0 0 24px;">
          <strong style="color: #fff;">${senderName}</strong> sent you a message.
        </p>
        <a href="${matchUrl}" style="display: inline-block; background: #00ff41; color: #0a0a0a; font-weight: bold; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 3px;">
          VIEW CHAT →
        </a>
      </div>
    `,
  });
}

interface HireOfferNotificationParams {
  to: string;
  companyName: string;
  offeredSalary: number;
}

export async function sendHireOfferNotification({
  to,
  companyName,
  offeredSalary,
}: HireOfferNotificationParams) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Hire offer from ${companyName} - The Job Market`,
    html: `
      <div style="font-family: monospace; background: #0a0a0a; color: #ededed; padding: 32px; max-width: 480px;">
        <p style="color: #00ff41; font-size: 12px; letter-spacing: 4px; margin: 0 0 16px;">THE JOB MARKET</p>
        <h2 style="color: #ffd700; font-size: 18px; margin: 0 0 8px;">HIRE OFFER RECEIVED</h2>
        <p style="color: #a0a0a0; font-size: 13px; margin: 0 0 24px;">
          <strong style="color: #fff;">${companyName}</strong> has sent you a formal hire offer.
        </p>
        <p style="color: #ffd700; font-size: 16px; font-weight: bold; margin: 0 0 24px;">
          HKD ${(offeredSalary / 100).toLocaleString()} / MO
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/candidate/matches" style="display: inline-block; background: #00ff41; color: #0a0a0a; font-weight: bold; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 3px;">
          VIEW OFFER →
        </a>
        <p style="color: #444; font-size: 11px; margin-top: 32px;">Open the chat to accept or decline this offer.</p>
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
      ? `${process.env.NEXT_PUBLIC_APP_URL}/employer/terminal`
      : `${process.env.NEXT_PUBLIC_APP_URL}/candidate/terminal`;

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
            ? `<p style="color: #ededed; font-size: 13px; margin: 0 0 24px;">Start by adding a project to your portfolio to get your composite score and appear in the employer feed.</p>`
            : `<p style="color: #ededed; font-size: 13px; margin: 0 0 24px;">Browse the ranked candidate feed and send pitches to candidates that match your needs.</p>`
        }
        <a href="${dashboardUrl}" style="display: inline-block; background: #00ff41; color: #0a0a0a; font-weight: bold; padding: 12px 24px; text-decoration: none; font-size: 12px; letter-spacing: 3px;">
          ENTER TERMINAL →
        </a>
      </div>
    `,
  });
}
