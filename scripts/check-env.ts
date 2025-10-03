// scripts/check-env.ts
import fs from "fs";
import path from "path";

type RecordString = Record<string, string>;

function assertVars(vars: string[], scope: string) {
  const missing = vars.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing ${scope} environment variables: ${missing.join(", ")}`);
  }
}

async function main() {
  // Skip validation in production environments (Vercel, etc.) where env vars are provided differently
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    console.log("Production environment detected - skipping .env.local validation");

    // Just verify critical vars are present in production
    const required = {
      server: [
        "SUPABASE_SERVICE_ROLE_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "APP_URL",
      ],
      client: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    };

    assertVars(required.server, "server");
    assertVars(required.client, "client");
    console.log("All required environment variables are present.");
    process.exit(0);
  }

  // Local development: Compare .env.local against .env.example
  const examplePath = path.resolve(".env.example");
  const localPath = path.resolve(".env.local");

  const exampleKeys = fs
    .readFileSync(examplePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0]);

  let missing: string[] = [];

  if (fs.existsSync(localPath)) {
    const envLines = fs.readFileSync(localPath, "utf8").split(/\r?\n/);
    const env: RecordString = {};
    for (const line of envLines) {
      if (!line || line.startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      env[key] = value;
    }
    missing = exampleKeys.filter((key) => !env[key]);
  } else {
    console.error("Missing .env.local. Create it from .env.example.");
    missing = exampleKeys;
  }

  if (missing.length) {
    console.error("Missing keys:\n" + missing.join("\n"));
    process.exit(1);
  }

  // Extra safety: required keys for server & client
  const required = {
    server: [
      "SUPABASE_SERVICE_ROLE_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "APP_URL",
    ],
    client: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  };

  assertVars(required.server, "server");
  assertVars(required.client, "client");

  console.log("All required environment variables are present.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
