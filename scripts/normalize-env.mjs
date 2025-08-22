import fs from 'fs';
import path from 'path';

const examplePath = path.resolve('.env.example');
const localPath = path.resolve('.env.local');

if (!fs.existsSync(localPath)) {
  console.error('.env.local not found. Create it from .env.example first.');
  process.exit(1);
}

const exampleLines = fs.readFileSync(examplePath, 'utf8').split(/\r?\n/);
const localLines = fs.readFileSync(localPath, 'utf8').split(/\r?\n/);

const envMap = {};
for (const line of localLines) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx === -1) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1);
  envMap[key] = value;
}

const output = [];
const seen = [];
for (const line of exampleLines) {
  if (!line || line.startsWith('#')) {
    output.push(line);
    continue;
  }
  const idx = line.indexOf('=');
  const key = line.slice(0, idx);
  seen.push(key);
  const value = Object.prototype.hasOwnProperty.call(envMap, key)
    ? envMap[key]
    : line.slice(idx + 1);
  output.push(`${key}=${value}`);
}

const extras = Object.keys(envMap).filter((k) => !seen.includes(k));
if (extras.length) {
  output.push('');
  output.push('# --- Extra ---');
  for (const key of extras) {
    output.push(`${key}=${envMap[key]}`);
  }
}

fs.writeFileSync(localPath, output.join('\n'));
console.log('.env.local normalized.');
