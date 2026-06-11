// Applies a single .sql migration file to the remote database via
// DATABASE_URL from .env.local. Used instead of `supabase db push`
// because the CLI's migration history doesn't track 0010+ (they were
// applied directly through the pooler).
//
// Usage: node scripts/apply-migration.cjs supabase/migrations/00XX_name.sql
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const envFile = fs.readFileSync(path.resolve(".env.local"), "utf8");
for (const line of envFile.split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
}

const file = process.argv[2];
const sql = fs.readFileSync(path.resolve(file), "utf8");

const client = new Client({ connectionString: process.env.DATABASE_URL });

(async () => {
  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied ${file}`);
  } finally {
    await client.end();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
