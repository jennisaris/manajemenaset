export type AssetType = 'land' | 'building';
export type VerificationStatus = 'draft' | 'menunggu_verifikasi' | 'revisi' | 'terverifikasi' | 'tidak_aktif';
export type UserRole = 'Superadmin' | 'Operator Kampus' | 'Pimpinan Dashboard';

export type UserStatus = 'aktif' | 'nonaktif' | 'menunggu_persetujuan' | 'ditolak';

export type Satker = {
  id?: number;
  kode_satker: string;
  nama_satker: string;
};

export type BmnCategoryType = 'alat_angkutan' | 'khusus_tik' | 'non_tik';

export type BmnAssetItem = {
  id: number;
  jenis_bmn?: string | null;
  kode_satker?: string | null;
  nama_satker?: string | null;
  kode_barang?: string | null;
  nup?: string | null;
  nama_barang: string;
  status_bmn?: string | null;
  merk?: string | null;
  tipe?: string | null;
  kondisi?: string | null;
  umur_aset?: number | null;
  intra_extra?: string | null;
  henti_guna?: string | null;
  status_sbsn?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  alamat_lokasi?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};




export type UserProfile = {
  id: string;
  full_name: string;
  email: string | null;
  role_name: UserRole;
  campus_name: string | null;
  status: UserStatus;
  university_name: string | null;
  nip?: string | null;
  satuan_kerja?: string | null;
  kode_satker?: string | null;
  phone_number?: string | null;
  assignment_letter_name?: string | null;
  assignment_letter_path?: string | null;
  assignment_letter_url?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
};

export type UserRegistrationInput = {
  nip: string;
  full_name: string;
  satuan_kerja: string;
  kode_satker?: string;
  email: string;
  phone_number: string;
  password: string;
  assignment_letter_name?: string;
  assignment_letter_path?: string;
  assignment_letter_url?: string;
};

export type UserApprovalInput = {
  userId: string;
  action: 'approve' | 'reject';
  role_name?: UserRole;
  campus_name?: string;
  rejection_reason?: string;
};

export type Asset = {
  id: number;
  asset_code: string;
  asset_name: string;
  asset_type: AssetType;
  campus_name: string | null;
  faculty_or_unit: string | null;
  address: string | null;
  ownership_status: string | null;
  condition_status: string | null;
  verification_status: VerificationStatus;
  latitude: number | null;
  longitude: number | null;
  geometry_type: 'point' | 'polygon' | null;
  geometry_geojson: GeoJSON.Geometry | null;
  primary_photo_url?: string | null;
  primary_photo_path?: string | null;
  photo_paths?: string[];
  photo_urls?: string[];
  photo_names?: string[];
  document_paths?: string[];
  document_names?: string[];
  document_urls?: string[];
  has_active_issue?: boolean;
  has_active_utilization?: boolean;
  is_deleted?: number;
  jenis_bmn?: string | null;
  kode_satker?: string | null;
  nama_satker?: string | null;
  kode_barang?: string | null;
  nup?: string | null;
  nama_barang?: string | null;
  status_bmn?: string | null;
  merk?: string | null;
  tipe?: string | null;
  kondisi?: string | null;
  umur_aset?: number | null;
  intra_extra?: string | null;
  henti_guna?: string | null;
  status_sbsn?: string | null;
  status_bmn_idle?: string | null;
  status_kemitraan?: string | null;
  bpybds?: string | null;
  usulan_barang_hilang?: string | null;
  usulan_barang_rb?: string | null;
  usul_hapus?: string | null;
  hibah_dktp?: string | null;
  konsensi_jasa?: string | null;
  properti_investasi?: string | null;
  jenis_dokumen?: string | null;
  no_dokumen?: string | null;
  no_bpkp?: string | null;
  no_polisi?: string | null;
  status_sertifikasi?: string | null;
  jenis_sertipikat?: string | null;
  no_sertifikat?: string | null;
  nama_sertifikat?: string | null;
  tgl_buku_pertama?: string | null;
  tgl_perolehan?: string | null;
  tgl_penghapusan?: string | null;
  nilai_perolehan_pertama?: number | null;
  nilai_mutasi?: number | null;
  nilai_perolehan?: number | null;
  nilai_penyusutan?: number | null;
  nilai_buku?: number | null;
  luas_tanah_seluruhnya?: number | null;
  luas_tanah_untuk_bangunan?: number | null;
  luas_tanah_untuk_sarana_lingkungan?: number | null;
  luas_lahan_kosong?: number | null;
  luas_bangunan?: number | null;
  luas_tapak_bangunan?: number | null;
  luas_pemanfaatan?: number | null;
  jumlah_lantai?: number | null;
  jumlah_foto?: number | null;
  status_penggunaan?: string | null;
  no_psp?: string | null;
  tgl_psp?: string | null;
  alamat?: string | null;
  rt_rw?: string | null;
  kelurahan_desa?: string | null;
  kecamatan?: string | null;
  kab_kota?: string | null;
  kode_kab_kota?: string | null;
  provinsi?: string | null;
  kode_provinsi?: string | null;
  kode_pos?: string | null;
  sbsk?: number | null;
  optimalisasi?: number | null;
  penghuni?: string | null;
  pengguna?: string | null;
  kode_kpknl?: string | null;
  uraian_kpknl?: string | null;
  uraian_kanwil_djkn?: string | null;
  nama_kl?: string | null;
  nama_e1?: string | null;
  nama_korwil?: string | null;
  kode_register?: string | null;
  lokasi_ruang?: string | null;
  jenis_identitas?: string | null;
  no_identitas?: string | null;
  no_stnk?: string | null;
  nama_pengguna?: string | null;
  status_pmk?: string | null;
  bmn_raw?: Record<string, unknown> | null;
};

export type DashboardSummary = {
  total_land: number;
  total_building: number;
  total_land_area_m2: number;
  total_building_area_m2: number;
  verified_assets: number;
  pending_verification: number;
  active_utilizations: number;
  active_issues: number;
};

export type Utilization = {
  id: number;
  asset_id: number;
  third_party_name: string;
  utilization_type: string;
  start_date: string;
  end_date: string;
  status: string;
  utilized_area_m2?: number | null;
  geometry_geojson?: GeoJSON.Geometry | null;
  use_full_asset_area?: boolean;
  pks_document_name?: string | null;
  pks_document_path?: string | null;
  pks_document_url?: string | null;
  photo_names?: string[];
  photo_paths?: string[];
  photo_urls?: string[];
};

export type AssetIssue = {
  id: number;
  asset_id: number;
  issue_title: string;
  issue_type: string;
  priority: string;
  status: string;
  found_date: string | null;
};

export type IssueProgress = {
  id: number;
  issue_id: number;
  progress_date: string;
  progress_description: string;
  responsible_person: string | null;
  result_note: string | null;
  status: string;
  document_name?: string | null;
  document_path?: string | null;
  document_url?: string | null;
};

export type BmnDisposalProposal = {
  id: number;
  kode_satker: string;
  nama_satker: string;
  no_surat_permohonan: string;
  tgl_surat_permohonan?: string | null;
  surat_permohonan_name?: string | null;
  surat_permohonan_path?: string | null;
  surat_permohonan_url?: string | null;
  sptjm_name?: string | null;
  sptjm_path?: string | null;
  sptjm_url?: string | null;
  lampiran_name?: string | null;
  lampiran_path?: string | null;
  lampiran_url?: string | null;
  sk_tim_name?: string | null;
  sk_tim_path?: string | null;
  sk_tim_url?: string | null;
  ba_penelitian_name?: string | null;
  ba_penelitian_path?: string | null;
  ba_penelitian_url?: string | null;
  jumlah_barang: number;
  jenis_barang: string | null;
  nilai_perolehan: number;
  status: 'menunggu_verifikasi' | 'disetujui' | 'ditolak';
  catatan?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};
