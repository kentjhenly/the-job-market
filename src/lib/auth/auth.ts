import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
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
