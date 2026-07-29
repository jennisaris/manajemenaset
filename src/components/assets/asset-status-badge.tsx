import type { VerificationStatus } from '@/lib/types';

export function statusClass(status: VerificationStatus) {
  if (status === 'terverifikasi') return 'bg-emerald-50 text-emerald-700';
  if (status === 'menunggu_verifikasi') return 'bg-slate-100 text-slate-600';
  if (status === 'revisi') return 'bg-amber-50 text-amber-700';
  if (status === 'tidak_aktif') return 'bg-rose-50 text-rose-600';
  return 'bg-sky-50 text-sky-700';
}

export function normalizeStatus(status: VerificationStatus) {
  return status.replaceAll('_', ' ');
}

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={`inline-flex min-w-36 justify-center rounded-full px-3 py-1 text-center text-xs font-black capitalize ${statusClass(status)}`}>
      {normalizeStatus(status)}
    </span>
  );
}
