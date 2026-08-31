# SMART-DIKTI

**SMART-DIKTI** (*Sistem Management & Asset Real-Time Kemdiktisaintek*) - Next.js app untuk dashboard manajemen aset universitas dengan backend PostgreSQL lokal.

## Production aktif

Aplikasi berjalan di VPS sendiri.

- Public URL: `https://aset.dataarief.online`
- Local service: `http://127.0.0.1:8081`
- Systemd service: `sistem-aset-universitas.service`
- Tunnel: `cloudflared-aset`
- Database: PostgreSQL lokal `aset_universitas`

## Setup lokal

```bash
npm install
cp .env.example .env.local
# edit .env.local sesuai database lokal dan secret aplikasi
npm run db:schema
npm run build
npm run start
```

## Environment

Environment lokal ada di `.env.local` dan tidak boleh di-commit.

```env
DATABASE_URL=postgresql://aset_user:***@127.0.0.1:5432/aset_universitas
AUTH_SECRET=change-this-to-a-long-random-secret-minimum-24-chars
```

Untuk tooling migrasi Supabase, isi hanya di mesin lokal/server:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` asli, dan `AUTH_SECRET` asli jangan di-commit.

## Import data ke PostgreSQL lokal

Jika data profile hasil export belum memiliki `password_hash`, isi `IMPORT_DEFAULT_PASSWORD_HASH` saat import awal.

```bash
IMPORT_DEFAULT_PASSWORD_HASH='plain:ganti-dengan-password-sementara' npm run postgres:import
```

Setelah import, segera ganti password user production.

## Verifikasi

```bash
npm test
npx tsc --noEmit --pretty false
npm run build
```

## Deploy VPS

```bash
npm run build
sudo systemctl restart sistem-aset-universitas.service
systemctl status sistem-aset-universitas.service --no-pager -l
curl -sSI https://aset.dataarief.online | head
```
