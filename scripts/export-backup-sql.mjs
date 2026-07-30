import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

const dbUrl = process.env.DATABASE_URL || 'postgresql://aset_user:change-me@127.0.0.1:5432/aset_universitas';
const outDir = resolve(process.cwd(), 'db');
mkdirSync(outDir, { recursive: true });
const backupPath = resolve(outDir, 'backup.sql');

console.log(`Connecting to database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

// Try finding pg_dump
let pgDumpCmd = 'pg_dump';
const possiblePgDumpPaths = [
  'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
  'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
];

for (const path of possiblePgDumpPaths) {
  if (existsSync(path)) {
    pgDumpCmd = `"${path}"`;
    break;
  }
}

try {
  const urlObj = new URL(dbUrl);
  const host = urlObj.hostname || '127.0.0.1';
  const port = urlObj.port || '5432';
  const user = urlObj.username || 'postgres';
  const password = urlObj.password || '';
  const database = urlObj.pathname.replace(/^\//, '') || 'aset_universitas';

  const env = { ...process.env, PGPASSWORD: password };
  const cmd = `${pgDumpCmd} -h ${host} -p ${port} -U ${user} -d ${database} -F p --clean --if-exists --no-owner --no-privileges -f "${backupPath}"`;
  
  execSync(cmd, { env, stdio: 'inherit' });

  // Post-process to remove PG18 specific \restrict lines for maximum compatibility across Postgres versions
  let content = readFileSync(backupPath, 'utf8');
  content = content.replace(/^\\restrict.*$/gm, '');
  writeFileSync(backupPath, content, 'utf8');

  console.log(`\nBackup berhasil dibuat: ${backupPath}`);
  console.log(`Ukuran file: ${(readFileSync(backupPath).length / (1024 * 1024)).toFixed(2)} MB`);
} catch (error) {
  console.error('Gagal membuat backup:', error.message);
  process.exit(1);
}
