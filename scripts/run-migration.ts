import { createClient } from "@/supabase/server";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  const supabase = createClient();
  
  try {
    const migrationPath = join(process.cwd(), "supabase/migrations/001_create_rls_policies.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    console.log("🚀 Running RLS policies migration...");
    console.log("SQL:", migrationSQL);
    
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    }
    
    console.log("✅ RLS policies migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

runMigration();