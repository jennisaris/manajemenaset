'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { deleteIssue, getIssueProgress, persistIssue, persistIssueProgress } from '@/lib/issue-crud';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createAssetDocumentPreviewUrl, uploadIssueProgressDocument } from '@/lib/storage';
import type { Asset, AssetIssue, IssueProgress } from '@/lib/types';

type IssueManagerProps = {
  assets: Asset[];
  issues: AssetIssue[];
  canManage: boolean;
  onIssuesChange: (issues: AssetIssue[]) => void;
};

const issueTypes = ['sengketa_tanah', 'klaim_pihak_ketiga', 'dokumen_bermasalah', 'batas_lahan_tidak_jelas', 'pemanfaatan_tidak_sesuai', 'bangunan_rusak', 'aset_dikuasai_pihak_lain', 'konflik_kontrak', 'lainnya'];
const priorityOptions = ['rendah', 'sedang', 'tinggi', 'mendesak'];
const statusOptions = ['belum_ditindaklanjuti', 'sedang_ditindaklanjuti', 'selesai'];
const issuesPerPage = 5;

function StatusPill({ status }: { status: string }) {
  const tone = status === 'selesai' ? 'bg-emerald-50 text-emerald-700' : status === 'sedang_ditindaklanjuti' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600';
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>{status.replaceAll('_', ' ')}</span>;
}

function emptyIssue(nextId: number, assetId: number): AssetIssue {
  return {
    id: nextId,
    asset_id: assetId,
    issue_title: '',
    issue_type: 'lainnya',
    priority: 'sedang',
    status: 'belum_ditindaklanjuti',
    found_date: new Date().toISOString().slice(0, 10),
  };
}

export function IssueManager({ assets, issues, canManage, onIssuesChange }: IssueManagerProps) {
  const [items, setItems] = useState(issues);
  const [draft, setDraft] = useState<AssetIssue | null>(null);
  const [progressDraft, setProgressDraft] = useState<IssueProgress | null>(null);
  const [progressItems, setProgressItems] = useState<IssueProgress[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [message, setMessage] = useState(isSupabaseConfigured ? 'Mode database aktif: permasalahan akan disimpan ke PostgreSQL lokal.' : 'Mode demo: permasalahan tersimpan lokal sampai env PostgreSQL lokal diisi.');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [progressDocument, setProgressDocument] = useState<File | null>(null);
  const [progressDocumentPreviewUrl, setProgressDocumentPreviewUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProgressIds, setExpandedProgressIds] = useState<Set<number>>(new Set());

  const assetOptions = useMemo(() => assets.map((asset) => ({ id: asset.id, label: `${asset.asset_code} — ${asset.asset_name}` })), [assets]);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const totalPages = Math.max(1, Math.ceil(items.length / issuesPerPage));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const visibleIssues = useMemo(() => items.slice((effectiveCurrentPage - 1) * issuesPerPage, effectiveCurrentPage * issuesPerPage), [effectiveCurrentPage, items]);

  useEffect(() => {
    getIssueProgress().then(setProgressItems).catch(() => setProgressItems([]));
  }, []);

  function toggleProgress(issueId: number) {
    setExpandedProgressIds((current) => {
      const next = new Set(current);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  }

  function openCreate() {
    if (!canManage || assetOptions.length === 0) return;
    setDraft(emptyIssue(Math.max(0, ...items.map((item) => item.id)) + 1, assetOptions[0].id));
    setFormOpen(true);
    setMessage(isSupabaseConfigured ? 'Permasalahan baru akan ditulis ke asset_issues.' : 'Mode demo: permasalahan baru tersimpan lokal.');
  }

  function openEdit(item: AssetIssue) {
    if (!canManage) return;
    setDraft({ ...item });
    setFormOpen(true);
    setMessage(isSupabaseConfigured ? 'Perubahan permasalahan akan ditulis ke asset_issues.' : 'Mode demo: perubahan tersimpan lokal.');
  }

  function updateDraft(patch: Partial<AssetIssue>) {
    setDraft((current) => current ? { ...current, ...patch } : current);
  }

  function closeForm() {
    setDraft(null);
    setFormOpen(false);
    setIsSaving(false);
  }

  function openProgress(issue: AssetIssue) {
    if (!canManage) return;
    setProgressDraft({
      id: Math.max(0, ...progressItems.map((item) => item.id)) + 1,
      issue_id: issue.id,
      progress_date: new Date().toISOString().slice(0, 10),
      progress_description: '',
      responsible_person: '',
      result_note: '',
      status: issue.status === 'selesai' ? 'selesai' : 'dalam_proses',
    });
    setProgressDocument(null);
    setProgressDocumentPreviewUrl(null);
    setProgressOpen(true);
    setFormOpen(false);
    setMessage('Tambahkan progress terbaru, temuan lapangan, dan dokumen pendukung bila ada.');
  }

  function closeProgressForm() {
    setProgressDraft(null);
    setProgressOpen(false);
    setIsSaving(false);
    setProgressDocument(null);
    setProgressDocumentPreviewUrl(null);
  }

  function updateProgressDraft(patch: Partial<IssueProgress>) {
    setProgressDraft((current) => current ? { ...current, ...patch } : current);
  }

  function handleProgressDocument(file: File | undefined) {
    if (!file) {
      setProgressDocument(null);
      setProgressDocumentPreviewUrl(null);
      return;
    }
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setMessage(`${file.name} melebihi batas 10MB.`);
      return;
    }
    setProgressDocument(file);
    setProgressDocumentPreviewUrl(URL.createObjectURL(file));
    setMessage(isSupabaseConfigured ? 'Dokumen progress siap diupload saat disimpan.' : 'Mode demo: dokumen progress hanya dipreview lokal.');
  }

  async function openProgressDocument(progress: IssueProgress) {
    try {
      const url = progress.document_url || (progress.document_path ? await createAssetDocumentPreviewUrl(progress.document_path) : null);
      if (!url) {
        setMessage('Dokumen progress belum tersedia.');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal membuka dokumen progress.');
    }
  }

  async function saveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!progressDraft) return;
    if (!progressDraft.progress_description.trim()) {
      setMessage('Informasi progress/temuan terbaru wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      let nextProgress = { ...progressDraft, progress_description: progressDraft.progress_description.trim() };
      if (progressDocument && isSupabaseConfigured) {
        setMessage('Mengupload dokumen progress...');
        const uploaded = await uploadIssueProgressDocument({ issueId: progressDraft.issue_id, file: progressDocument });
        nextProgress = { ...nextProgress, document_name: progressDocument.name, document_path: uploaded.path };
      } else if (progressDocument) {
        nextProgress = { ...nextProgress, document_name: progressDocument.name, document_url: progressDocumentPreviewUrl };
      }

      const result = await persistIssueProgress(nextProgress);
      const saved = result.progress;
      setProgressItems((current) => [saved, ...current]);

      const relatedIssue = items.find((item) => item.id === saved.issue_id);
      if (relatedIssue && relatedIssue.status === 'belum_ditindaklanjuti') {
        const issueResult = await persistIssue({ ...relatedIssue, status: 'sedang_ditindaklanjuti' });
        const nextIssues = items.map((item) => item.id === relatedIssue.id ? issueResult.issue : item);
        setItems(nextIssues);
        onIssuesChange(nextIssues);
      }

      setMessage(result.mode === 'postgres' ? 'Progress masalah berhasil disimpan ke PostgreSQL lokal.' : 'Progress masalah berhasil disimpan di mode demo.');
      closeProgressForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan progress masalah.');
      setIsSaving(false);
    }
  }

  async function saveIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    if (!draft.issue_title.trim()) {
      setMessage('Judul permasalahan wajib diisi.');
      return;
    }

    setIsSaving(true);
    setMessage(isSupabaseConfigured ? 'Menyimpan permasalahan ke PostgreSQL lokal...' : 'Menyimpan permasalahan ke state lokal demo...');

    try {
      const isNew = !items.some((item) => item.id === draft.id);
      const result = await persistIssue({ ...draft, issue_title: draft.issue_title.trim() }, { isNew });
      const saved = result.issue;
      const nextItems = items.some((item) => item.id === saved.id) ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items];
      setItems(nextItems);
      onIssuesChange(nextItems);
      setMessage(result.mode === 'postgres' ? 'Permasalahan berhasil disimpan ke PostgreSQL lokal.' : 'Permasalahan berhasil disimpan di mode demo.');
      closeForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan permasalahan.');
      setIsSaving(false);
    }
  }

  async function deleteSelectedIssue(item: AssetIssue) {
    if (!canManage || deletingId !== null) return;
    const confirmed = window.confirm(`Hapus permasalahan ${item.issue_title}?`);
    if (!confirmed) return;

    setDeletingId(item.id);
    setMessage(isSupabaseConfigured ? 'Menghapus permasalahan dari PostgreSQL lokal...' : 'Menghapus permasalahan dari state lokal demo...');

    try {
      const result = await deleteIssue(item.id);
      const nextItems = items.filter((current) => current.id !== item.id);
      setItems(nextItems);
      onIssuesChange(nextItems);
      if (draft?.id === item.id) closeForm();
      setMessage(result.mode === 'postgres' ? 'Permasalahan berhasil dihapus dari PostgreSQL lokal.' : 'Permasalahan berhasil dihapus di mode demo.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menghapus permasalahan.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-sky-100 bg-white/80 p-5 shadow-[0_24px_70px_rgba(22,118,194,.14)] backdrop-blur-xl" id="issues">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black">Permasalahan & Progress</h3>
          <p className={`mt-1 text-xs font-black ${message.includes('Gagal') || message.includes('wajib') ? 'text-rose-600' : 'text-slate-500'}`}>{message}</p>
        </div>
        <button onClick={openCreate} disabled={!canManage || assetOptions.length === 0} className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-300 bg-gradient-to-br from-sky-300 to-sky-600 px-4 py-2 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:border-slate-200 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500"><Plus className="h-4 w-4" />Tambah Masalah</button>
      </div>

      {formOpen && draft && (
        <form onSubmit={saveIssue} className="mb-4 rounded-3xl border border-sky-100 bg-sky-50/60 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h4 className="font-black">{items.some((item) => item.id === draft.id) ? 'Edit Permasalahan' : 'Tambah Permasalahan'}</h4><p className="mt-1 text-sm text-slate-500">Simpan ke tabel asset_issues saat PostgreSQL lokal aktif.</p></div>
            <button type="button" onClick={closeForm} className="grid h-9 w-9 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Aset<select value={draft.asset_id} onChange={(event) => updateDraft({ asset_id: Number(event.target.value) })} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">{assetOptions.map((asset) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Judul<input value={draft.issue_title} onChange={(event) => updateDraft({ issue_title: event.target.value })} required className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Jenis<select value={draft.issue_type} onChange={(event) => updateDraft({ issue_type: event.target.value })} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">{issueTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Tanggal Temuan<input type="date" value={draft.found_date ?? ''} onChange={(event) => updateDraft({ found_date: event.target.value || null })} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Prioritas<select value={draft.priority} onChange={(event) => updateDraft({ priority: event.target.value })} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">{priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Status<select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
          </div>
          <div className="mt-4 flex justify-end gap-3"><button type="button" onClick={closeForm} className="rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-black text-slate-600">Batal</button><button disabled={isSaving} className="rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-300/40 disabled:opacity-60">{isSaving ? 'Menyimpan...' : 'Simpan Masalah'}</button></div>
        </form>
      )}

      {progressOpen && progressDraft && (
        <form onSubmit={saveProgress} className="mb-4 rounded-3xl border border-sky-100 bg-sky-50/60 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><h4 className="font-black">Tambah Progress Masalah</h4><p className="mt-1 text-sm text-slate-500">Catat informasi terbaru temuan/tindak lanjut dan upload dokumen pendukung.</p></div>
            <button type="button" onClick={closeProgressForm} className="grid h-9 w-9 place-items-center rounded-2xl border border-sky-100 bg-white text-slate-500"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Tanggal Progress<input type="date" value={progressDraft.progress_date} onChange={(event) => updateProgressDraft({ progress_date: event.target.value })} required className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Penanggung Jawab<input value={progressDraft.responsible_person ?? ''} onChange={(event) => updateProgressDraft({ responsible_person: event.target.value })} placeholder="Tim Aset / Bagian Hukum / Unit terkait" className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">Informasi Terbaru / Temuan<textarea value={progressDraft.progress_description} onChange={(event) => updateProgressDraft({ progress_description: event.target.value })} required rows={4} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Catatan Hasil<input value={progressDraft.result_note ?? ''} onChange={(event) => updateProgressDraft({ result_note: event.target.value })} placeholder="Opsional" className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Status Progress<select value={progressDraft.status} onChange={(event) => updateProgressDraft({ status: event.target.value })} className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"><option value="dicatat">dicatat</option><option value="dalam_proses">dalam proses</option><option value="selesai">selesai</option></select></label>
          </div>
          <div className="mt-4 rounded-3xl border border-sky-100 bg-white/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-700"><FileText className="h-5 w-5" /></div><div><h5 className="font-black text-slate-900">Dokumen Pendukung Progress</h5><p className="mt-1 text-xs font-semibold text-slate-500">Upload surat, foto dokumen, berita acara, atau bukti tindak lanjut. Maksimal 10MB.</p>{progressDocument && <p className="mt-2 text-xs font-black text-sky-700">{progressDocument.name}</p>}</div></div>
              <div className="flex flex-wrap gap-2">{progressDocumentPreviewUrl && <button type="button" onClick={() => window.open(progressDocumentPreviewUrl, '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-sky-700 shadow-sm"><Eye className="h-4 w-4" />Lihat</button>}<label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-xs font-black text-sky-700 shadow-sm"><UploadCloud className="h-4 w-4" />Pilih Dokumen<input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => handleProgressDocument(event.target.files?.[0])} className="sr-only" /></label></div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3"><button type="button" onClick={closeProgressForm} className="rounded-2xl border border-sky-100 bg-white px-5 py-3 text-sm font-black text-slate-600">Batal</button><button disabled={isSaving} className="rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-300/40 disabled:opacity-60">{isSaving ? 'Menyimpan...' : 'Simpan Progress'}</button></div>
        </form>
      )}

      <div className="grid gap-3">
        {visibleIssues.map((issue) => {
          const issueProgress = progressItems.filter((progress) => progress.issue_id === issue.id);
          const isProgressExpanded = expandedProgressIds.has(issue.id);
          const asset = assetById.get(issue.asset_id);
          return (
            <div key={issue.id} className="rounded-2xl border border-sky-100 bg-white/70 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-black">{issue.issue_title}</h4>
                  <p className="mt-1 text-sm text-slate-500">{asset?.asset_name ?? `Aset #${issue.asset_id}`} • {asset?.campus_name ?? 'Universitas belum diisi'} • {issue.issue_type.replaceAll('_', ' ')} • Prioritas {issue.priority}</p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button onClick={() => openProgress(issue)} disabled={!canManage} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Plus className="h-3.5 w-3.5" />Progress Masalah</button>
                  <button onClick={() => openEdit(issue)} disabled={!canManage} className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Pencil className="h-3.5 w-3.5" />Edit</button>
                  <button onClick={() => deleteSelectedIssue(issue)} disabled={!canManage || deletingId === issue.id} className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Trash2 className="h-3.5 w-3.5" />{deletingId === issue.id ? 'Hapus...' : 'Hapus'}</button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2"><StatusPill status={issue.status} /><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{issueProgress.length} tindak lanjut</span><button type="button" onClick={() => toggleProgress(issue.id)} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{isProgressExpanded ? 'Sembunyikan tindak lanjut' : 'Tampilkan tindak lanjut'}</button></div>

              {isProgressExpanded && <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h5 className="text-sm font-black text-slate-900">Tindak Lanjut / Progress</h5>
                  {issueProgress.length > 0 && <span className="text-xs font-bold text-slate-500">Terbaru di atas</span>}
                </div>
                {issueProgress.length > 0 ? (
                  <div className="grid gap-2">
                    {issueProgress.map((progress) => (
                      <div key={progress.id} className="rounded-2xl border border-white bg-white/80 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-sky-700">{progress.progress_date} • {progress.status.replaceAll('_', ' ')}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{progress.progress_description}</p>
                            {progress.responsible_person && <p className="mt-1 text-xs font-bold text-slate-500">PJ: {progress.responsible_person}</p>}
                            {progress.result_note && <p className="mt-1 text-xs font-bold text-slate-500">Catatan: {progress.result_note}</p>}
                          </div>
                          {progress.document_path || progress.document_url ? <button type="button" onClick={() => openProgressDocument(progress)} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700"><Eye className="h-3.5 w-3.5" />Dokumen</button> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-sky-100 bg-white/70 p-4 text-sm font-bold text-slate-500">Belum ada tindak lanjut untuk temuan ini.</div>
                )}
              </div>}
            </div>
          );
        })}
        {items.length === 0 && <div className="grid place-items-center rounded-2xl border border-dashed border-sky-100 p-6 text-sm font-bold text-slate-500">Belum ada permasalahan aset.</div>}
      </div>
      {items.length > issuesPerPage && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-black text-slate-500">Menampilkan {((effectiveCurrentPage - 1) * issuesPerPage) + 1}-{Math.min(effectiveCurrentPage * issuesPerPage, items.length)} dari {items.length} temuan</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={effectiveCurrentPage === 1} className="rounded-full bg-white px-4 py-2 text-xs font-black text-sky-700 shadow-sm disabled:cursor-not-allowed disabled:text-slate-400">Sebelumnya</button>
            <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm">Halaman {effectiveCurrentPage} / {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={effectiveCurrentPage === totalPages} className="rounded-full bg-white px-4 py-2 text-xs font-black text-sky-700 shadow-sm disabled:cursor-not-allowed disabled:text-slate-400">Selanjutnya</button>
          </div>
        </div>
      )}
    </div>
  );
}
