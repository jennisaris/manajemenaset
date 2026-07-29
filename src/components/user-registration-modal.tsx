'use client';

import { useState } from 'react';
import { CheckCircle2, FileText, Lock, Mail, Phone, ShieldCheck, Building2, User, X, Upload } from 'lucide-react';

type UserRegistrationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  campusOptions?: string[];
};

export function UserRegistrationModal({ isOpen, onClose, campusOptions = [] }: UserRegistrationModalProps) {
  const [nip, setNip] = useState('');
  const [fullName, setFullName] = useState('');
  const [satuanKerja, setSatuanKerja] = useState(campusOptions[0] ?? 'Kampus Utama');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!nip.trim() || !fullName.trim() || !satuanKerja.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setErrorMsg('Semua kolom bertanda bintang (*) wajib diisi.');
      return;
    }

    if (!file) {
      setErrorMsg('File Surat Penunjukan Operator (PDF/Doc/Foto) wajib diunggah.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nip', nip.trim());
      formData.append('full_name', fullName.trim());
      formData.append('satuan_kerja', satuanKerja.trim());
      formData.append('email', email.trim());
      formData.append('phone_number', phone.trim());
      formData.append('password', password.trim());
      formData.append('assignment_letter', file);

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Pendaftaran gagal.');
      }

      setSuccessMsg(data.message || 'Pendaftaran berhasil! Akun Anda sedang menunggu persetujuan Administrator.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Pendaftaran gagal.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setNip('');
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setFile(null);
    setErrorMsg('');
    setSuccessMsg('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080C1A]/70 p-4 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-[24px] border border-[#F3F4F3] bg-white p-6 shadow-2xl transition-all my-8">
        <div className="flex items-center justify-between border-b border-[#F3F4F3] pb-4">
          <div className="flex items-center gap-3">
            <img src="/images/logo-dikti.png" alt="Logo Kemdiktisaintek" className="h-10 w-auto object-contain shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-[#080C1A]">Registrasi Akun Operator Baru</h2>
              <p className="text-xs text-[#6A7686]">Isi formulir pendaftaran untuk mengajukan akses ke Sistem Kemdiktisaintek</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            type="button"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#6A7686] hover:bg-[#EFF2F7] hover:text-[#080C1A] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {successMsg ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DCFCE7] text-[#166534]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-[#080C1A]">Pendaftaran Berhasil Dikirim!</h3>
            <p className="text-xs text-[#6A7686] max-w-md mx-auto leading-relaxed">
              {successMsg}
            </p>
            <div className="rounded-2xl bg-[#EFF2F7] p-4 text-xs text-[#080C1A] border border-[#F3F4F3] text-left space-y-1">
              <div className="font-semibold text-[#165DFF]">Langkah Selanjutnya:</div>
              <div>1. Email pemberitahuan telah dikirimkan ke <strong>{email}</strong>.</div>
              <div>2. Tim Administrator Aset akan memverifikasi NIP dan Surat Penunjukan Operator Anda.</div>
              <div>3. Anda dapat melakukan login setelah akun disetujui.</div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full cursor-pointer rounded-[50px] bg-[#165DFF] py-3 text-xs font-semibold text-white shadow-lg shadow-[#165DFF]/20 hover:bg-[#0E4BD9] active:scale-[0.98] transition"
              >
                Tutup & Kembali ke Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorMsg && (
              <div className="rounded-2xl bg-[#FEE2E2] p-3.5 text-xs font-medium text-[#991B1B]">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#080C1A] mb-1">
                  NIP / Nomor Induk Pegawai <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="text"
                    required
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 198501152010121002"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 py-2.5 text-xs font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#080C1A] mb-1">
                  Nama Lengkap & Gelar <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama Lengkap sesuai SK"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 py-2.5 text-xs font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#080C1A] mb-1">
                  Satuan Kerja / Kampus / Unit <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="text"
                    required
                    value={satuanKerja}
                    onChange={(e) => setSatuanKerja(e.target.value)}
                    placeholder="Fakultas / Kampus / Unit Kerja"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 py-2.5 text-xs font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#080C1A] mb-1">
                  No. Handphone / WhatsApp <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 py-2.5 text-xs font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#080C1A] mb-1">
                  Email Institusi / Pribadi <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@ac.id atau nama@gmail.com"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 py-2.5 text-xs font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#080C1A] mb-1">
                  Password Login <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-9 pr-3 py-2.5 text-xs font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#080C1A] mb-1">
                Surat Penunjukan Operator (PDF/Doc/Scan Foto) <span className="text-[#ED6B60]">*</span>
              </label>
              <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-[#E5E7EB] px-6 py-4 transition hover:border-[#165DFF] bg-[#F9FAFB]">
                <div className="space-y-1 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#165DFF]/10 text-[#165DFF]">
                    {file ? <FileText className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                  </div>
                  <div className="flex text-xs text-[#6A7686] justify-center">
                    <label className="relative cursor-pointer rounded-md font-semibold text-[#165DFF] hover:underline focus-within:outline-none">
                      <span>{file ? file.name : 'Pilih Berkas Surat Penunjukan'}</span>
                      <input
                        type="file"
                        required
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-[#6A7686]">PDF, DOCX, JPG atau PNG hingga 10MB</p>
                </div>
              </div>
            </div>

            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-1/3 cursor-pointer rounded-[50px] border border-[#E5E7EB] py-3 text-xs font-semibold text-[#6A7686] hover:bg-[#EFF2F7] active:scale-[0.98] transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 cursor-pointer rounded-[50px] bg-[#165DFF] py-3 text-xs font-semibold text-white shadow-lg shadow-[#165DFF]/20 hover:bg-[#0E4BD9] active:scale-[0.98] transition disabled:opacity-50"
              >
                {loading ? 'Mengirim Pendaftaran...' : 'Kirim Pendaftaran Akun'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
