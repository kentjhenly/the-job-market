import { betterAuth } from "better-auth";
import { Pool } from "pg";
import {
  sendEmailChangeVerification,
  // sendVerificationEmail, // SHELVED with the emailVerification block below — re-enable for production
  sendWelcomeEmail,
} from "@/lib/email/send";

// Reuse one pool across hot reloads — Turbopack re-evaluates this module on
// every change, and a fresh Pool each time leaks connections until the Supabase
// session-mode pooler hits its client cap (EMAXCONNSESSION). `max` is kept below
// that cap so the migration script and other clients still have headroom.
const globalForPool = globalThis as unknown as { __betterAuthPool?: Pool };
const pool =
  globalForPool.__betterAuthPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL!,
    // Turbopack spawns multiple workers each with their own globalThis, so the
    // singleton only helps within one worker. Keep max low enough that even
    // several workers combined stay under Supabase session-mode's 15-client cap.
    max: 3,
    min: 0,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    // Supabase's pooler (PgBouncer) silently closes idle TCP sockets; keepalive
    // lets the OS detect the dead connection before pg tries to reuse it.
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
if (process.env.NODE_ENV !== "production") globalForPool.__betterAuthPool = pool;

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  // Throttle auth endpoints to blunt credential brute-forcing and signup/abuse.
  // `enabled: true` forces it on in dev too (Better Auth only enables it in
  // production by default). The default in-memory store is per-instance; move
  // to a shared store (e.g. secondaryStorage) if running multiple instances.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/change-password": { window: 60, max: 5 },
      "/change-email": { window: 60, max: 5 },
      "/delete-user": { window: 60, max: 5 },
      "/forget-password": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },
  session: {
    // Cache the session in a signed, short-lived cookie so the common case
    // (getServerSession on the proxy + layout + page of every navigation)
    // is served from the cookie instead of a Postgres round-trip on each
    // call. Better Auth refreshes/invalidates this cookie automatically when
    // the session changes (sign-in/out, changeEmail, role update), so the
    // 5-minute window only ever serves data that's still valid.
    cookieCache: {
      enabled: true,
      maxAge: 300,
    },
  },
  // SHELVED while running locally — employer email verification. Do not delete;
  // re-enable (and uncomment the sendVerificationEmail import + the EmployerLayout
  // redirect in src/app/employer/layout.tsx) for production.
  // emailVerification: {
  //   sendVerificationEmail: async ({ user, url }) => {
  //     const { role, display_name, name, email } = user as typeof user & {
  //       role?: string;
  //       display_name?: string;
  //     };
  //     if (role !== "employer") return;
  //     await sendVerificationEmail({ to: email, name: display_name ?? name, url });
  //   },
  //   sendOnSignUp: true,
  //   autoSignInAfterVerification: true,
  // },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        input: true,
      },
      display_name: {
        type: "string",
        required: false,
        input: true,
      },
    },
    changeEmail: {
      enabled: true,
      // For a verified address, Better Auth sends this approval link to the
      // CURRENT email before switching. Candidates are never verified, so their
      // change applies immediately and this never fires for them.
      sendChangeEmailVerification: async ({
        user,
        newEmail,
        url,
      }: {
        user: { email: string; name: string; display_name?: string };
        newEmail: string;
        url: string;
      }) => {
        await sendEmailChangeVerification({
          to: user.email,
          name: user.display_name ?? user.name,
          newEmail,
          url,
        });
      },
    },
    deleteUser: {
      enabled: true,
      // RESTRICT FKs on matches (-> candidates/employers), reputation_events
      // .actor_id, and salary_data_points.match_id would block the cascade from
      // user -> profiles -> candidates/employers, so clear them first. Salary
      // observations and other parties' reputation history are preserved by
      // nulling the link rather than deleting the rows.
      beforeDelete: async (user) => {
        const id = user.id;
        await pool.query(
          `update salary_data_points set match_id = null
             where match_id in (select id from matches where candidate_id = $1 or employer_id = $1)`,
          [id]
        );
        await pool.query(`delete from matches where candidate_id = $1 or employer_id = $1`, [id]);
        await pool.query(`update reputation_events set actor_id = null where actor_id = $1`, [id]);
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const { id, name, email, role, display_name } = user as typeof user & {
            role: string;
            display_name?: string;
          };
          await pool.query(
            `insert into profiles (id, role, display_name, email)
             values ($1, $2::user_role, $3, $4)
             on conflict (id) do nothing`,
            [id, role, display_name ?? name, email]
          );

          sendWelcomeEmail({
            to: email,
            name: display_name ?? name,
            role: role as "candidate" | "employer",
          }).catch((err) => console.error("sendWelcomeEmail failed:", err));
        },
      },
      update: {
        // Keep profiles.email in sync when Better Auth updates the user's email.
        after: async (user) => {
          await pool.query(`update profiles set email = $2 where id = $1`, [user.id, user.email]);
        },
      },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
