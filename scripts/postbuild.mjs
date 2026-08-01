import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const standaloneDir = path.join(process.cwd(), '.next', 'standalone');
  if (!existsSync(standaloneDir)) {
    console.log('No .next/standalone directory found, skipping postbuild copy.');
    return;
  }

  const targetNextDir = path.join(standaloneDir, '.next');
  const targetStaticDir = path.join(targetNextDir, 'static');
  const targetPublicDir = path.join(standaloneDir, 'public');

  const sourceStaticDir = path.join(process.cwd(), '.next', 'static');
  const sourcePublicDir = path.join(process.cwd(), 'public');

  await mkdir(targetNextDir, { recursive: true });

  if (existsSync(sourceStaticDir)) {
    await rm(targetStaticDir, { recursive: true, force: true });
    await cp(sourceStaticDir, targetStaticDir, { recursive: true });
  }

  if (existsSync(sourcePublicDir)) {
    await rm(targetPublicDir, { recursive: true, force: true });
    await cp(sourcePublicDir, targetPublicDir, { recursive: true });
  }

  console.log('Successfully completed postbuild standalone assets copy.');
}

main().catch((err) => {
  console.error('Postbuild script error:', err);
});
