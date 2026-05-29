import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const users = [
  { email: 'superadmin@aset.id', password: 'superadmin123', full_name: 'Superadmin Sistem', role_id: 1, university_name: null },
  { email: 'admin@aset.id', password: 'admin123', full_name: 'Admin Aset Kampus Utama', role_id: 2, university_name: 'Kampus Utama' },
  { email: 'operator@aset.id', password: 'operator123', full_name: 'Operator Kampus Utama', role_id: 3, university_name: 'Kampus Utama' },
  { email: 'pimpinan@aset.id', password: 'pimpinan123', full_name: 'Pimpinan Dashboard', role_id: 4, university_name: null },
];

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failed = false;

for (const user of users) {
  console.log(`Processing ${user.email}...`);

  let { data: signInData } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  let authUser = signInData?.user ?? null;

  if (!authUser) {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: { data: { full_name: user.full_name, role_id: user.role_id } },
    });

    if (signUpError) {
      failed = true;
      console.log(`  signup failed: ${signUpError.message}`);
      continue;
    }

    authUser = signUpData?.user ?? null;
    if (!authUser) {
      failed = true;
      console.log('  signup did not return a user.');
      continue;
    }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authUser.id,
      full_name: user.full_name,
      email: user.email,
      role_id: user.role_id,
      university_name: user.university_name,
      status: 'aktif',
    }, { onConflict: 'id' });

  if (profileError) {
    failed = true;
    console.log(`  profile upsert failed: ${profileError.message}`);
  } else {
    console.log('  auth user/profile OK');
  }

  await supabase.auth.signOut();
}

for (const user of users) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: user.email, password: user.password });
  if (data?.user) {
    console.log(`${user.email}: login OK`);
  } else {
    failed = true;
    console.log(`${user.email}: login failed (${error?.message ?? 'unknown'})`);
  }
  await supabase.auth.signOut();
}

if (failed) process.exit(1);
