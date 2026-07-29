'use client';

import { FormEvent, useState } from 'react';
import { KeyRound, LockKeyhole } from 'lucide-react';
import { apiJson } from '@/lib/api-client';

type PasswordState = {
  current: string;
  next: string;
  confirm: string;
};

export function ChangePasswordPanel({ visible }: { visible: boolean }) {
  const [form, setForm] = useState<PasswordState>({ current: '', next: '', confirm: '' });
  const [message, setMessage] = useState('Gunakan form ini untuk mengganti password akun sendiri.');
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
    try {
      await apiJson<{ ok: true }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: form.current, nextPassword: form.next, confirmPassword: form.confirm }),
      });
      setMessage('Password berhasil diubah. Gunakan password baru untuk login berikutnya.');
      setForm({ current: '', next: '', confirm: '' });
    } catch (error) {
      setMessage(`Gagal mengubah password: ${error instanceof Error ? error.message : 'Coba lagi.'}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-card border border-border bg-white p-6 shadow-sm" id="change-password">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Ubah Password</h3>
          <p className="mt-0.5 text-xs text-secondary">Menu ini tampil untuk role non-Superadmin. User & Role hanya dikelola oleh Superadmin.</p>
          <p className={`mt-2 text-xs font-medium ${message.includes('Gagal') || message.includes('tidak') || message.includes('minimal') ? 'text-error' : 'text-secondary'}`}>{message}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-medium text-foreground">
          Password Saat Ini
          <input value={form.current} onChange={(event) => setForm({ ...form, current: event.target.value })} type="password" placeholder="Masukkan password saat ini" required className="rounded-2xl border border-border bg-gray-50 px-4 py-3 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-foreground">
          Password Baru
          <input value={form.next} onChange={(event) => setForm({ ...form, next: event.target.value })} type="password" minLength={8} placeholder="Minimal 8 karakter" required className="rounded-2xl border border-border bg-gray-50 px-4 py-3 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-foreground">
          Konfirmasi Password
          <input value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} type="password" minLength={8} placeholder="Ulangi password baru" required className="rounded-2xl border border-border bg-gray-50 px-4 py-3 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
        </label>
        <div className="md:col-span-3 flex justify-end">
          <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-button bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition duration-200 disabled:opacity-60">
            <KeyRound className="h-4 w-4" />
            {isSaving ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </div>
      </form>
    </section>
  );
}
