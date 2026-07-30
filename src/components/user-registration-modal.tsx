'use client';

import { useState } from 'react';
import { CheckCircle2, FileText, Lock, Mail, Phone, ShieldCheck, Building2, User, X, Upload } from 'lucide-react';
import { SatkerAutocompleteInput } from '@/components/satker-autocomplete-input';


type UserRegistrationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  campusOptions?: string[];
};

export function UserRegistrationModal({ isOpen, onClose, campusOptions = [] }: UserRegistrationModalProps) {
  const [nip, setNip] = useState('');
  const [fullName, setFullName] = useState('');
  const [satuanKerja, setSatuanKerja] = useState(campusOptions[0] ?? 'Kampus Utama');
  const [kodeSatker, setKodeSatker] = useState('');
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
      setErrorMsg('File Surat Penunjukan Operator (PDF) wajib diunggah.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('File Surat Penunjukan Operator harus berformat PDF (.pdf).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file Surat Penunjukan Operator melebihi batas maksimal 5MB.');
      return;
    }


    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('nip', nip.trim());
      formData.append('full_name', fullName.trim());
      formData.append('satuan_kerja', satuanKerja.trim());
      const extractedKode = kodeSatker || satuanKerja.match(/^(\d{6})/)?.[1] || '';
      if (extractedKode) formData.append('kode_satker', extractedKode);
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
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] overflow-y-auto flex flex-col animate-in fade-in duration-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 border-b border-[#E5E7EB] bg-white/95 px-6 py-4 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/images/logo-dikti.png" alt="Logo Kemdiktisaintek" className="h-12 w-auto object-contain shrink-0" />
            <div>
              <h1 className="text-xl font-extrabold text-[#080C1A]">Registrasi Akun Operator Baru</h1>
              <p className="text-xs sm:text-sm text-[#6A7686]">Formulir pendaftaran resmi pengajuan akses Sistem Kemdiktisaintek</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            type="button"
            className="flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 text-xs font-bold text-[#6A7686] hover:bg-[#EFF2F7] hover:text-[#080C1A] transition cursor-pointer"
          >
            <span>Tutup</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 px-4 sm:px-8">
        <div className="mx-auto max-w-6xl rounded-[28px] border border-[#E5E7EB] bg-white p-6 sm:p-10 shadow-xl">

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
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {errorMsg && (
              <div className="rounded-2xl bg-[#FEE2E2] p-4 text-sm font-medium text-[#991B1B]">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#080C1A] mb-1.5">
                  NIP <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="text"
                    required
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 198501152010121002"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 py-3 text-sm font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#080C1A] mb-1.5">
                  Nama Lengkap & Gelar <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nama Lengkap sesuai SK"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 py-3 text-sm font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>
            </div>

            {/* Satuan Kerja Field - FULL WIDTH for complete name visibility */}
            <div className="w-full">
              <SatkerAutocompleteInput
                label="Satuan Kerja / Perguruan Tinggi (Satker)"
                placeholder="Ketik Kode atau Nama Satker untuk mencari (contoh: 693204 - LLDIKTI)..."
                value={satuanKerja}
                onChange={(val, selected) => {
                  setSatuanKerja(val);
                  if (selected?.kode_satker) {
                    setKodeSatker(selected.kode_satker);
                  } else {
                    const match = val.match(/^(\d{6})/);
                    if (match) setKodeSatker(match[1]);
                  }
                }}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#080C1A] mb-1.5">
                  No. Handphone / WhatsApp <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 py-3 text-sm font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#080C1A] mb-1.5">
                  Email Institusi / Pribadi <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@ac.id atau nama@gmail.com"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 py-3 text-sm font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#080C1A] mb-1.5">
                  Password Login <span className="text-[#ED6B60]">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[#6A7686]" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-4 py-3 text-sm font-medium text-[#080C1A] placeholder:text-[#6A7686]/60 focus:border-[#165DFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#165DFF]/20 transition"
                  />
                </div>
              </div>
            </div>



            <div>
              <label className="block text-sm font-bold text-[#080C1A] mb-1.5">
                Surat Penunjukan Operator (PDF) <span className="text-[#ED6B60]">*</span>
              </label>
              <div className="mt-1 flex justify-center rounded-2xl border-2 border-dashed border-[#E5E7EB] px-6 py-5 transition hover:border-[#165DFF] bg-[#F9FAFB]">
                <div className="space-y-1.5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#165DFF]/10 text-[#165DFF]">
                    {file ? <FileText className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                  </div>
                  <div className="flex text-sm text-[#6A7686] justify-center">
                    <label className="relative cursor-pointer rounded-md font-bold text-[#165DFF] hover:underline focus-within:outline-none">
                      <span>{file ? file.name : 'Pilih Berkas Surat Penunjukan (.pdf)'}</span>
                      <input
                        type="file"
                        required
                        accept=".pdf,application/pdf"
                        onChange={(e) => {
                          const selected = e.target.files?.[0] ?? null;
                          if (selected) {
                            if (!selected.name.toLowerCase().endsWith('.pdf') && selected.type !== 'application/pdf') {
                              setErrorMsg('File Surat Penunjukan Operator harus berformat PDF (.pdf).');
                              setFile(null);
                              return;
                            }
                            if (selected.size > 5 * 1024 * 1024) {
                              setErrorMsg('Ukuran file Surat Penunjukan Operator melebihi batas maksimal 5MB.');
                              setFile(null);
                              return;
                            }
                            setErrorMsg('');
                          }
                          setFile(selected);
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-[#6A7686]">Format PDF hingga 5MB</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="button"
                onClick={handleReset}
                className="w-1/3 cursor-pointer rounded-[50px] border border-[#E5E7EB] py-3.5 text-sm font-bold text-[#6A7686] hover:bg-[#EFF2F7] active:scale-[0.98] transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 cursor-pointer rounded-[50px] bg-[#165DFF] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#165DFF]/20 hover:bg-[#0E4BD9] active:scale-[0.98] transition disabled:opacity-50"
              >
                {loading ? 'Mengirim Pendaftaran...' : 'Kirim Pendaftaran Akun'}
              </button>
            </div>
          </form>
        )}
        </div>
      </main>
    </div>
  );
}

