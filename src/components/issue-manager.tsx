'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Eye, FileText, MapPinned, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { deleteIssue, getIssueProgress, persistIssue, persistIssueProgress } from '@/lib/issue-crud';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createAssetDocumentPreviewUrl, uploadIssueProgressDocument } from '@/lib/storage';
import type { Asset, AssetIssue, IssueProgress } from '@/lib/types';
import { formatDateForInput, formatDateIndo } from '@/lib/date-utils';

import { AssetAutocompleteInput } from './asset-autocomplete-input';

type IssueManagerProps = {
  assets: Asset[];
  issues: AssetIssue[];
  canManage: boolean;
  onIssuesChange: (issues: AssetIssue[]) => void;
};

const issueTypes = ['sengketa_tanah', 'klaim_pihak_ketiga', 'dokumen_bermasalah', 'batas_lahan_tidak_jelas', 'pemanfaatan_tidak_sesuai', 'bangunan_rusak', 'aset_dikuasai_pihak_lain', 'konflik_kontrak', 'lainnya'];
const priorityOptions = ['rendah', 'sedang', 'tinggi', 'mendesak'];
const statusOptions = ['permasalahan', 'identifikasi_masalah', 'sedang_ditindaklanjuti', 'selesai'];
const issuesPerPage = 5;

function getIssueProgressPercentage(status: string): number {
  switch (status) {
    case 'identifikasi_masalah':
      return 25;
    case 'sedang_ditindaklanjuti':
      return 75;
    case 'selesai':
      return 100;
    case 'permasalahan':
    case 'belum_ditindaklanjuti':
    default:
      return 0;
  }
}

function getIssueProgressLabel(status: string): string {
  switch (status) {
    case 'identifikasi_masalah':
      return 'Identifikasi Masalah (25%)';
    case 'sedang_ditindaklanjuti':
      return 'Sedang Ditindaklanjuti (75%)';
    case 'selesai':
      return 'Selesai (100%)';
    case 'permasalahan':
    case 'belum_ditindaklanjuti':
    default:
      return 'Permasalahan (0%)';
  }
}

function IssueProgressBar({ status }: { status: string }) {
  const percentage = getIssueProgressPercentage(status);
  const label = getIssueProgressLabel(status);

  const barColor =
    percentage === 100
      ? 'bg-emerald-500'
      : percentage === 75
      ? 'bg-[#165DFF]'
      : percentage === 25
      ? 'bg-amber-500'
      : 'bg-rose-500';

  const badgeTone =
    percentage === 100
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : percentage === 75
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : percentage === 25
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <div className="w-full space-y-1.5 my-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
      <div className="flex items-center justify-between text-xs">
        <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-black ${badgeTone}`}>
          {label}
        </span>
        <span className="font-extrabold text-slate-900 text-xs">{percentage}% Selesai</span>
      </div>

      {/* Progress Bar Track */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200/80 p-0.5 shadow-inner">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out shadow-sm`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* 4-Stage Step Indicators */}
      <div className="grid grid-cols-4 text-[10px] font-bold text-slate-400 text-center pt-1 gap-1">
        <div className={`flex flex-col items-center ${percentage >= 0 ? 'text-rose-600 font-extrabold' : ''}`}>
          <div className={`h-2 w-2 rounded-full mb-1 ${percentage >= 0 ? 'bg-rose-500 ring-2 ring-rose-200' : 'bg-slate-300'}`} />
          <span>Permasalahan (0%)</span>
        </div>
        <div className={`flex flex-col items-center ${percentage >= 25 ? 'text-amber-600 font-extrabold' : ''}`}>
          <div className={`h-2 w-2 rounded-full mb-1 ${percentage >= 25 ? 'bg-amber-500 ring-2 ring-amber-200' : 'bg-slate-300'}`} />
          <span>Identifikasi (25%)</span>
        </div>
        <div className={`flex flex-col items-center ${percentage >= 75 ? 'text-blue-600 font-extrabold' : ''}`}>
          <div className={`h-2 w-2 rounded-full mb-1 ${percentage >= 75 ? 'bg-[#165DFF] ring-2 ring-blue-200' : 'bg-slate-300'}`} />
          <span>Ditindaklanjuti (75%)</span>
        </div>
        <div className={`flex flex-col items-center ${percentage === 100 ? 'text-emerald-600 font-extrabold' : ''}`}>
          <div className={`h-2 w-2 rounded-full mb-1 ${percentage === 100 ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300'}`} />
          <span>Selesai (100%)</span>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const percentage = getIssueProgressPercentage(status);
  const tone =
    percentage === 100
      ? 'bg-success-light text-success-dark font-semibold'
      : percentage === 75
      ? 'bg-info-light text-primary font-semibold'
      : percentage === 25
      ? 'bg-warning-light text-warning-dark font-semibold'
      : 'bg-error-light text-error-dark font-semibold';
  return <span className={`rounded-full px-3 py-1 text-xs ${tone}`}>{getIssueProgressLabel(status)}</span>;
}

function emptyIssue(nextId: number, assetId: number): AssetIssue {
  return {
    id: nextId,
    asset_id: assetId,
    issue_title: '',
    issue_type: 'lainnya',
    priority: 'sedang',
    status: 'permasalahan',
    found_date: new Date().toISOString().slice(0, 10),
  };
}

export function IssueManager({ assets, issues, canManage, onIssuesChange }: IssueManagerProps) {
  const [items, setItems] = useState(issues);

  useEffect(() => {
    setItems(issues);
  }, [issues]);
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedProgressIds, setExpandedProgressIds] = useState<Set<number>>(new Set());

  const assetOptions = useMemo(() => assets.map((asset) => ({ id: asset.id, label: `${asset.asset_code} — ${asset.asset_name}` })), [assets]);
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const effectiveCurrentPage = Math.min(currentPage, totalPages);
  const visibleIssues = useMemo(
    () => items.slice((effectiveCurrentPage - 1) * itemsPerPage, effectiveCurrentPage * itemsPerPage),
    [effectiveCurrentPage, items, itemsPerPage]
  );

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
    setProgressOpen(false);
    setMessage(isSupabaseConfigured ? 'Permasalahan baru akan ditulis ke asset_issues.' : 'Mode demo: permasalahan baru tersimpan lokal.');
  }

  function openIssueMap(issue: AssetIssue) {
    window.open(`/map?assetId=${issue.asset_id}&issueId=${issue.id}`, '_blank', 'noopener,noreferrer');
  }

  function openEdit(item: AssetIssue) {
    if (!canManage) return;
    setDraft({
      ...item,
      found_date: formatDateForInput(item.found_date),
    });
    setFormOpen(true);
    setProgressOpen(false);
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
      status: 'dalam_proses',
    });
    setProgressDocument(null);
    setProgressDocumentPreviewUrl(null);
    setProgressOpen(true);
    setFormOpen(false);
    setMessage(isSupabaseConfigured ? 'Tindak lanjut baru akan disimpan ke issue_progress.' : 'Mode demo: tindak lanjut tersimpan lokal.');
  }

  function updateProgressDraft(patch: Partial<IssueProgress>) {
    setProgressDraft((current) => current ? { ...current, ...patch } : current);
  }

  function closeProgressForm() {
    setProgressDraft(null);
    setProgressOpen(false);
    setIsSaving(false);
    setProgressDocument(null);
    setProgressDocumentPreviewUrl(null);
  }

  function handleProgressDocument(file?: File) {
    if (!file) return;

    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setProgressDocument(null);
      setProgressDocumentPreviewUrl(null);
      setMessage(`${file.name} melebihi batas 10MB.`);
      return;
    }

    setProgressDocument(file);
    setProgressDocumentPreviewUrl(URL.createObjectURL(file));
    setMessage(isSupabaseConfigured ? `Dokumen progress ${file.name} dipilih.` : `Dokumen progress ${file.name} dipilih (preview lokal).`);
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

  async function deleteSelectedIssue(item: AssetIssue) {
    if (!canManage || deletingId !== null) return;
    const confirmed = window.confirm(`Hapus data permasalahan "${item.issue_title}"?`);
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
      const isNew = !items.some((item) => Number(item.id) === Number(draft.id));
      const result = await persistIssue(
        {
          ...draft,
          issue_title: draft.issue_title.trim(),
          found_date: formatDateForInput(draft.found_date) || null,
        },
        { isNew }
      );
      const saved = result.issue;
      const nextItems = items.some((item) => Number(item.id) === Number(saved.id))
        ? items.map((item) => (Number(item.id) === Number(saved.id) ? saved : item))
        : [saved, ...items];
      setItems(nextItems);
      onIssuesChange(nextItems);
      setMessage(result.mode === 'postgres' ? 'Permasalahan berhasil disimpan ke PostgreSQL lokal.' : 'Permasalahan berhasil disimpan di mode demo.');
      closeForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan permasalahan.');
      setIsSaving(false);
    }
  }

  async function saveProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!progressDraft) return;

    if (!progressDraft.progress_description.trim()) {
      setMessage('Informasi terbaru / temuan wajib diisi.');
      return;
    }

    setIsSaving(true);
    setMessage(isSupabaseConfigured ? 'Menyimpan progress ke PostgreSQL lokal...' : 'Menyimpan progress ke state lokal demo...');

    try {
      let saved = progressDraft;
      if (progressDocument) {
        if (isSupabaseConfigured) {
          const uploaded = await uploadIssueProgressDocument({ issueId: progressDraft.issue_id, file: progressDocument });
          saved = {
            ...saved,
            document_name: progressDocument.name,
            document_path: uploaded.path,
          };
        } else {
          saved = {
            ...saved,
            document_name: progressDocument.name,
            document_url: progressDocumentPreviewUrl,
          };
        }
      }

      const result = await persistIssueProgress({
        ...saved,
        progress_description: saved.progress_description.trim(),
        responsible_person: saved.responsible_person?.trim() || null,
        result_note: saved.result_note?.trim() || null,
      });

      const nextProgressItems = [result.progress, ...progressItems.filter((item) => item.id !== result.progress.id)];
      setProgressItems(nextProgressItems);

      const targetIssue = items.find((item) => item.id === progressDraft.issue_id);
      if (targetIssue && progressDraft.status === 'selesai' && targetIssue.status !== 'selesai') {
        const updatedIssue = { ...targetIssue, status: 'selesai' };
        const updatedResult = await persistIssue(updatedIssue, { isNew: false });
        const nextItems = items.map((item) => item.id === updatedIssue.id ? updatedResult.issue : item);
        setItems(nextItems);
        onIssuesChange(nextItems);
      }

      setExpandedProgressIds((current) => new Set(current).add(progressDraft.issue_id));
      setMessage(result.mode === 'postgres' ? 'Tindak lanjut permasalahan berhasil disimpan ke PostgreSQL lokal.' : 'Tindak lanjut berhasil disimpan di mode demo.');
      closeProgressForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan progress permasalahan.');
      setIsSaving(false);
    }
  }

  if (formOpen && draft) {
    const isEditMode = items.some((item) => item.id === draft.id);
    return (
      <div className="overflow-hidden rounded-card border border-border bg-white p-6 shadow-sm" id="issue-form">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div>
            <button
              type="button"
              onClick={closeForm}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              ← Kembali ke Daftar Permasalahan
            </button>
            <h3 className="text-xl font-bold text-foreground">{isEditMode ? 'Edit Permasalahan Aset' : 'Tambah Permasalahan Aset Baru'}</h3>
            <p className="mt-0.5 text-xs text-secondary">Isi formulir rincian permasalahan, prioritas, jenis, dan tanggal temuan.</p>
          </div>
          <button type="button" onClick={closeForm} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-gray-50 text-secondary hover:bg-muted transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={saveIssue} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="grid gap-1.5 text-xs font-medium text-foreground">
              <span>Pilih Aset (Ketik Kode / Nama untuk mencari)</span>
              <AssetAutocompleteInput
                assets={assets}
                selectedAssetId={draft.asset_id}
                onSelectAsset={(id) => updateDraft({ asset_id: id })}
              />
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Judul
              <input value={draft.issue_title} onChange={(event) => updateDraft({ issue_title: event.target.value })} required className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Jenis
              <select value={draft.issue_type} onChange={(event) => updateDraft({ issue_type: event.target.value })} className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all">
                {issueTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Tanggal Temuan
              <input type="date" value={formatDateForInput(draft.found_date)} onChange={(event) => updateDraft({ found_date: event.target.value || null })} className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Prioritas
              <select value={draft.priority} onChange={(event) => updateDraft({ priority: event.target.value })} className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all">
                {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Status
              <select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })} className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all">
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getIssueProgressLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={closeForm} className="rounded-button border border-border bg-white px-5 py-2.5 text-xs font-semibold text-secondary hover:bg-muted transition">
              Batal
            </button>
            <button disabled={isSaving} className="rounded-button bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition disabled:opacity-60">
              {isSaving ? 'Menyimpan...' : 'Simpan Masalah'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (progressOpen && progressDraft) {
    return (
      <div className="overflow-hidden rounded-card border border-border bg-white p-6 shadow-sm" id="progress-form">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div>
            <button
              type="button"
              onClick={closeProgressForm}
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              ← Kembali ke Daftar Permasalahan
            </button>
            <h3 className="text-xl font-bold text-foreground">Catat Progress & Tindak Lanjut Masalah</h3>
            <p className="mt-0.5 text-xs text-secondary">Catat informasi terbaru temuan/tindak lanjut dan upload dokumen pendukung.</p>
          </div>
          <button type="button" onClick={closeProgressForm} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-gray-50 text-secondary hover:bg-muted transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={saveProgress} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Tanggal Progress
              <input type="date" value={progressDraft.progress_date} onChange={(event) => updateProgressDraft({ progress_date: event.target.value })} required className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Penanggung Jawab
              <input value={progressDraft.responsible_person ?? ''} onChange={(event) => updateProgressDraft({ responsible_person: event.target.value })} placeholder="Tim Aset / Bagian Hukum / Unit terkait" className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground md:col-span-2">
              Informasi Terbaru / Temuan
              <textarea value={progressDraft.progress_description} onChange={(event) => updateProgressDraft({ progress_description: event.target.value })} required rows={4} className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Catatan Hasil
              <input value={progressDraft.result_note ?? ''} onChange={(event) => updateProgressDraft({ result_note: event.target.value })} placeholder="Opsional" className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-foreground">
              Status Progress
              <select value={progressDraft.status} onChange={(event) => updateProgressDraft({ status: event.target.value })} className="rounded-2xl border border-border bg-white px-4 py-2.5 text-xs font-medium text-foreground outline-none focus:border-primary transition-all">
                <option value="dicatat">dicatat</option>
                <option value="dalam_proses">dalam proses</option>
                <option value="selesai">selesai</option>
              </select>
            </label>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="font-bold text-foreground text-sm">Dokumen Pendukung Progress</h5>
                  <p className="mt-0.5 text-xs text-secondary">Upload surat, foto dokumen, berita acara, atau bukti tindak lanjut. Maksimal 10MB.</p>
                  {progressDocument && <p className="mt-1 text-xs font-semibold text-primary">{progressDocument.name}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {progressDocumentPreviewUrl && (
                  <button type="button" onClick={() => window.open(progressDocumentPreviewUrl, '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-2 rounded-button bg-gray-50 border border-border px-4 py-2 text-xs font-semibold text-primary hover:bg-muted transition">
                    <Eye className="h-4 w-4" />
                    Lihat
                  </button>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-button bg-info-light px-4 py-2 text-xs font-semibold text-primary hover:bg-info-light/80 transition">
                  <UploadCloud className="h-4 w-4" />
                  Pilih Dokumen
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => handleProgressDocument(event.target.files?.[0])} className="sr-only" />
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button type="button" onClick={closeProgressForm} className="rounded-button border border-border bg-white px-5 py-2.5 text-xs font-semibold text-secondary hover:bg-muted transition">
              Batal
            </button>
            <button disabled={isSaving} className="rounded-button bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition disabled:opacity-60">
              {isSaving ? 'Menyimpan...' : 'Simpan Progress'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-white p-6 shadow-sm" id="issues">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">Daftar Permasalahan Aset</h3>
          <p className={`mt-1 text-xs font-medium ${message.includes('Gagal') || message.includes('wajib') ? 'text-error' : 'text-secondary'}`}>{message}</p>
        </div>
        <button
          onClick={openCreate}
          disabled={!canManage || assetOptions.length === 0}
          className="inline-flex w-fit items-center gap-2 rounded-button bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          <Plus className="h-4 w-4" />
          Tambah Permasalahan
        </button>
      </div>

      <div className="grid gap-4">
        {visibleIssues.map((issue) => {
          const issueProgress = progressItems.filter((progress) => progress.issue_id === issue.id);
          const isProgressExpanded = expandedProgressIds.has(issue.id);
          const asset = assetById.get(issue.asset_id);
          return (
            <div key={issue.id} className="rounded-2xl border border-border bg-white p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-foreground text-base">{issue.issue_title}</h4>
                  <p className="mt-1 text-xs text-secondary">
                    {asset?.asset_name ?? `Aset #${issue.asset_id}`} • {asset?.campus_name ?? 'Universitas belum diisi'} • {issue.issue_type.replaceAll('_', ' ')} • Prioritas <strong className="text-foreground uppercase">{issue.priority}</strong> • Temuan: {formatDateIndo(issue.found_date)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <button
                    onClick={() => openIssueMap(issue)}
                    title="Lihat Lokasi Masalah di Peta"
                    className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF]"
                  >
                    <MapPinned className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openProgress(issue)}
                    disabled={!canManage}
                    title="Catat Progress Masalah"
                    className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEdit(issue)}
                    disabled={!canManage}
                    title="Edit Masalah"
                    className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-[#165DFF] hover:text-white hover:border-[#165DFF] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteSelectedIssue(issue)}
                    disabled={!canManage || deletingId === issue.id}
                    title={deletingId === issue.id ? 'Sedang Menghapus...' : 'Hapus Masalah'}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/60 transition hover:bg-rose-600 hover:text-white hover:border-rose-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Progress Bar Status (0%, 25%, 75%, 100%) */}
              <IssueProgressBar status={issue.status} />

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-secondary">{issueProgress.length} tindak lanjut recorded</span>
                <button type="button" onClick={() => toggleProgress(issue.id)} className="rounded-full bg-info-light px-3 py-1 text-xs font-semibold text-primary hover:bg-info-light/80 transition">
                  {isProgressExpanded ? 'Sembunyikan tindak lanjut' : 'Tampilkan tindak lanjut'}
                </button>
              </div>

              {isProgressExpanded && (
                <div className="mt-4 rounded-2xl border border-border bg-gray-50/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wide">Tindak Lanjut / Progress</h5>
                    {issueProgress.length > 0 && <span className="text-xs text-secondary font-medium">Terbaru di atas</span>}
                  </div>
                  {issueProgress.length > 0 ? (
                    <div className="grid gap-2">
                      {issueProgress.map((progress) => (
                        <div key={progress.id} className="rounded-2xl border border-border bg-white p-3.5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-primary">{formatDateIndo(progress.progress_date)} • {progress.status.replaceAll('_', ' ')}</p>
                              <p className="mt-1 text-xs font-medium leading-relaxed text-foreground">{progress.progress_description}</p>
                              {progress.responsible_person && <p className="mt-1 text-xs text-secondary">PJ: {progress.responsible_person}</p>}
                              {progress.result_note && <p className="mt-1 text-xs text-secondary">Catatan: {progress.result_note}</p>}
                            </div>
                            {progress.document_path || progress.document_url ? (
                              <button
                                type="button"
                                onClick={() => openProgressDocument(progress)}
                                title="Lihat Dokumen Progress"
                                className="grid h-9 w-9 place-items-center rounded-xl bg-info-light text-primary transition hover:bg-info-light/80 shrink-0"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-white p-4 text-xs text-center font-medium text-secondary">
                      Belum ada tindak lanjut untuk temuan ini.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <div className="grid place-items-center rounded-2xl border border-dashed border-border p-8 text-sm font-medium text-secondary bg-white">Belum ada permasalahan aset.</div>}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-secondary">
            Tampilkan
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-2xl border border-border bg-gray-50 px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            data / hal
          </label>
          <span className="text-xs text-secondary font-medium">
            (Menampilkan {items.length > 0 ? ((effectiveCurrentPage - 1) * itemsPerPage) + 1 : 0}-
            {Math.min(effectiveCurrentPage * itemsPerPage, items.length)} dari {items.length} temuan)
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={effectiveCurrentPage === 1}
            className="rounded-button bg-white border border-border px-4 py-2 text-xs font-semibold text-primary shadow-sm hover:border-primary disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Sebelumnya
          </button>
          <span className="rounded-button bg-white border border-border px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
            Halaman {effectiveCurrentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={effectiveCurrentPage === totalPages}
            className="rounded-button bg-white border border-border px-4 py-2 text-xs font-semibold text-primary shadow-sm hover:border-primary disabled:cursor-not-allowed disabled:text-gray-400"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
}
