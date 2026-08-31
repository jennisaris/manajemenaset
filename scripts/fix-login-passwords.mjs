import { pbkdf2Sync, randomBytes } from 'node:crypto';
import pg from 'pg';

const iterations = 210_000;
const keyLength = 32;
const digest = 'sha256';

function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString('base64url');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

const connectionString = process.env.DATABASE_URL || 'postgresql://aset_user:change-me@127.0.0.1:5432/aset_universitas';
const pool = new pg.Pool({ connectionString });

async function run() {
  console.log('Running schema column migration...');
  await pool.query('alter table profiles add column if not exists nip text');
  await pool.query('alter table profiles add column if not exists satuan_kerja text');
  await pool.query('alter table profiles add column if not exists kode_satker text');
  await pool.query('alter table profiles add column if not exists phone_number text');
  await pool.query('alter table profiles add column if not exists assignment_letter_name text');
  await pool.query('alter table profiles add column if not exists assignment_letter_path text');
  await pool.query('alter table profiles add column if not exists assignment_letter_url text');
  await pool.query('alter table profiles add column if not exists rejection_reason text');

  console.log('Updating passwords and roles...');
  await pool.query('update profiles set password_hash = $1, role_id = 1, status = \'aktif\' where lower(email) = $2', [hashPassword('superadmin123'), 'superadmin@aset.id']);
  await pool.query('update profiles set password_hash = $1, role_id = 2, status = \'aktif\' where lower(email) = $2', [hashPassword('admin123'), 'admin@aset.id']);
  await pool.query('update profiles set password_hash = $1, role_id = 1, status = \'aktif\' where lower(email) = $2', [hashPassword('admin123'), 'jennisaris@gmail.com']);
  await pool.query('update profiles set password_hash = $1, role_id = 3, status = \'aktif\' where lower(email) = $2', [hashPassword('operator123'), 'operator@aset.id']);
  await pool.query('update profiles set password_hash = $1, role_id = 1, status = \'aktif\' where lower(email) = $2', [hashPassword('ChangeMe123!'), 'admin.kampusutama@kampusaset.id']);
  await pool.query('update profiles set password_hash = $1, role_id = 3, status = \'aktif\' where lower(email) = $2', [hashPassword('ChangeMe123!'), 'operator.kampusutama@kampusaset.id']);

  const res = await pool.query('select full_name, email, status, university_name, kode_satker from profiles');
  console.log('User Accounts in DB:');
  console.table(res.rows);

  await pool.end();
}

run().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
