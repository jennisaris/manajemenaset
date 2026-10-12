'use client';

import {
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react';
import type { Asset, UserRole } from '@/lib/types';
import { AssetList } from './asset-list';

export function VerificationCenter({
  assets,
  currentRole,
  currentUniversity,
  onAssetsChange,
}: {
  assets: Asset[];
  currentRole: UserRole;
  currentUniversity: string | null;
  onAssetsChange?: (assets: Asset[]) => void;
  onStatusChanged?: () => void;
}) {
  // Filter pending assets (menunggu_verifikasi)
  const pendingAssetsCount = assets.filter((a) => a.verification_status === 'menunggu_verifikasi').length;

  return (
    <div className="space-y-6" id="verification-center">
      {/* Header Banner */}
      <div className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3.5 py-1 text-xs font-black text-[#165DFF] mb-2">
            <ShieldCheck className="h-4 w-4" /> Pusat Persetujuan & Verifikasi
          </div>
          <h2 className="text-2xl font-black text-[#080C1A]">Verifikasi Data Aset Baru</h2>
          <p className="mt-1 text-xs text-[#6A7686]">
            Kelola persetujuan usulan penginputan data aset baru dari Operator Kampus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2.5 text-xs font-black text-[#165DFF] border border-sky-100">
            <BadgeCheck className="h-4 w-4" />
            <span>Usulan Pending: {pendingAssetsCount} Aset</span>
          </span>
        </div>
      </div>

      {/* Verifikasi Data Aset Baru */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 flex items-center justify-between text-xs font-semibold text-sky-900">
          <span className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-[#165DFF]" />
            Menampilkan daftar aset baru dari Operator Kampus yang berstatus <strong>Menunggu Verifikasi</strong> ({pendingAssetsCount} aset).
          </span>
        </div>

        <AssetList
          assets={assets}
          currentRole={currentRole}
          currentUniversity={currentUniversity}
          onAssetsChange={onAssetsChange}
          defaultFilterStatus="menunggu_verifikasi"
        />
      </div>
    </div>
  );
}
