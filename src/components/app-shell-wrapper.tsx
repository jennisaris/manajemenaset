'use client';

import dynamicImport from 'next/dynamic';

const AppShellClient = dynamicImport(
  () => import('@/components/app-shell').then((mod) => mod.AppShell),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-screen place-items-center bg-[#EFF2F7] px-4 py-10 font-sans">
        <div className="rounded-3xl border border-[#E5E7EB] bg-white px-8 py-6 text-sm font-bold text-[#165DFF] shadow-xl flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#165DFF] border-t-transparent" />
          <span>Memuat Aplikasi Manajemen Aset...</span>
        </div>
      </div>
    ),
  }
);

export function AppShellWrapper() {
  return <AppShellClient />;
}
