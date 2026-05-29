'use client';

import { FormEvent, useState } from 'react';
import { KeyRound, LockKeyhole } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type PasswordState = {
  current: string;
  next: string;
  confirm: string;
};

export function ChangePasswordPanel({ visible }: { visible: boolean }) {
  const [form, setForm] = useState<PasswordState>({ current: '', next: '', confirm: '' });
  const [message, setMessage] = useState(isSupabaseConfigured ? 'Gunakan form ini untuk mengganti password akun sendiri.' : 'Mode demo: PostgreSQL lokal belum aktif, perubahan password hanya simulasi.');
  const [isSaving, setIsSaving] = useState(false);

  if (!visible) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.next.length < 8) {
      setMessage('Password baru minimal 8 karakter.');
      return;
    }
    if (form.next !== form.confirm) {
      setMessage('Konfirmasi password tidak sama.');
      return;
    }

    setIsSaving(true);
    if (!isSupabaseConfigured) {
      setMessage('Simulasi berhasil. Saat PostgreSQL lokal aktif, password akan diperbarui di PostgreSQL lokal Auth.');
      setForm({ current: '', next: '', confirm: '' });
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: form.next });
    if (error) {
      setMessage(`Gagal mengubah password: ${error.message}`);
    } else {
      setMessage('Password berhasil diubah. Gunakan password baru untuk login berikutnya.');
      setForm({ current: '', next: '', confirm: '' });
    }
    setIsSaving(false);
  }

  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl" id="change-password">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700"><LockKeyhole className="h-5 w-5" /></div>
        <div>
          <h3 className="text-lg font-black">Ubah Password</h3>
          <p className="mt-1 text-sm text-slate-500">Menu ini tampil untuk role non-Superadmin. User & Role hanya dikelola oleh Superadmin.</p>
          <p className={`mt-2 text-xs font-black ${message.includes('Gagal') || message.includes('tidak') || message.includes('minimal') ? 'text-rose-600' : 'text-slate-500'}`}>{message}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold text-slate-700">Password Saat Ini<input value={form.current} onChange={(event) => setForm({ ...form, current: event.target.value })} type="password" placeholder="Opsional untuk PostgreSQL lokal session aktif" className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Password Baru<input value={form.next} onChange={(event) => setForm({ ...form, next: event.target.value })} type="password" minLength={8} required className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Konfirmasi Password<input value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} type="password" minLength={8} required className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
        <div className="md:col-span-3 flex justify-end"><button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"><KeyRound className="h-4 w-4" />{isSaving ? 'Menyimpan...' : 'Simpan Password'}</button></div>
      </form>
    </section>
  );
}
