import fs from "fs";
import path from "path";

const examplePath = path.resolve(".env.example");
const localPath = path.resolve(".env.local");

const example = fs.readFileSync(examplePath, "utf8")
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => line.split("=")[0]);

let missing: string[] = [];

if (fs.existsSync(localPath)) {
  const envLines = fs.readFileSync(localPath, "utf8").split(/\r?\n/);
  const env: Record<string, string> = {};
  for (const line of envLines) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    env[key] = value;
  }
  missing = example.filter((key) => !env[key]);
  if (!missing.length) {
    console.log("All required environment variables are present.");
  }
} else {
  console.error("Missing .env.local. Create it from .env.example.");
  missing = example;
}

if (missing.length) {
  console.error("Missing keys:\n" + missing.join("\n"));
  process.exit(1);
}
process.exit(0);
