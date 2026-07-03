import { FullPageMapShell } from '@/components/full-page-map-shell';
import { getMvpDataFromDb } from '@/lib/server/local-repository';
import { getSessionUser } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function numberParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export default async function MapPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getSessionUser();
  if (!user) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white"><div className="rounded-3xl bg-white/10 p-8 text-center"><h1 className="text-2xl font-black">Session tidak aktif</h1><p className="mt-2 text-sm text-slate-300">Silakan login ulang dari dashboard untuk membuka peta.</p><a className="mt-4 inline-flex rounded-full bg-sky-500 px-5 py-3 text-sm font-black text-white" href="/">Login</a></div></main>;
  }
  const params = await searchParams;
  const data = await getMvpDataFromDb();
  return <FullPageMapShell assets={data.assets} utilizations={data.utilizations} issues={data.issues} focusAssetId={numberParam(params.assetId)} focusUtilizationId={numberParam(params.utilizationId)} focusIssueId={numberParam(params.issueId)} />;
}
