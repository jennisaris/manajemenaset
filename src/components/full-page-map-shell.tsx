'use client';

import dynamic from 'next/dynamic';
import type { Asset, AssetIssue, Utilization } from '@/lib/types';

const FullPageMapNoSsr = dynamic(() => import('./full-page-map').then((module) => module.FullPageMap), {
  ssr: false,
  loading: () => <main className="grid min-h-screen place-items-center bg-slate-950 text-white"><div className="rounded-3xl bg-white/10 px-6 py-4 text-sm font-black">Memuat peta...</div></main>,
});

export function FullPageMapShell(props: { assets: Asset[]; utilizations: Utilization[]; issues: AssetIssue[]; focusAssetId?: number; focusUtilizationId?: number; focusIssueId?: number }) {
  return <FullPageMapNoSsr {...props} />;
}
