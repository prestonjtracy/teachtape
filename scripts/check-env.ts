/**
 * Checks required environment variables for server and client contexts.
 * Run during build to fail fast if any critical vars are missing.
 */

const required = {
  server: [
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "APP_URL",
  ],
  client: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ],
};

function assertVars(vars: string[], scope: string) {
  const missing = vars.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `Missing ${scope} environment variables: ${missing.join(", ")}`,
    );
  }
}

assertVars(required.server, "server");
assertVars(required.client, "client");

console.log("All required environment variables are present.");
