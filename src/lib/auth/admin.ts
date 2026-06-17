// Hardcoded allowlist for internal admin tooling (e.g. /admin/concierge).
// No UI links to these routes -- access is gated purely by this list.
const ADMIN_EMAILS = ["kentjhenly@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
