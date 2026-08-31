# CONTEXT.md — Ubiquitous Domain Language & Project Context

Dokumen ini mendefinisikan istilah domain bisnis (*Ubiquitous Language*), entitas data, dan batasan arsitektur proyek **SMART-DIKTI**. File ini berfungsi sebagai referensi konteks utama bagi AI dan developer agar setiap istilah dipahami secara konsisten dan tidak ambigu.

---

## 1. Identitas & Tujuan Sistem

* **Nama Sistem**: **SMART-DIKTI** (*Sistem Management & Asset Real-Time Kemdiktisaintek*).
* **Fungsi Utama**: Platform web & GIS interaktif untuk pencatatan, pemetaan geospasial, pemantauan pemanfaatan, mitigasi sengketa/masalah, serta verifikasi aset barang milik negara (BMN) dan properti perguruan tinggi/satuan kerja.

---

## 2. Ubiquitous Language (Glosarium Domain)

### A. Hierarki Peran & Akses (*Roles & Profiles*)
* **Superadmin**: Akses global nasional (seluruh kampus/satker, manajemen user, role, approval registrasi, verifikasi aset, penetapan SK penghapusan BMN, dan master data).
* **Operator Kampus**: Pelaksana input single & massal, update aset, unggah dokumen/foto/geospasial kampus sendiri, serta mengajukan usulan penghapusan BMN.
* **Pimpinan Dashboard**: Akses *read-only* untuk pemantauan eksekutif, peta sebaran GIS, ringkasan analitik, dan laporan portofolio.

### B. Siklus Status Verifikasi Aset (*Verification State Machine*)
1. `draft`: Aset baru diinput oleh Operator Kampus dan masih dalam proses penyusunan/pengeditan lokal.
2. `menunggu_verifikasi`: Aset diajukan oleh Operator Kampus untuk ditinjau oleh Superadmin.
3. `revisi`: Aset dikembalikan oleh Superadmin dengan catatan perbaikan untuk disempurnakan oleh Operator.
4. `terverifikasi`: Aset disetujui secara resmi dan masuk ke statistik publik / laporan resmi.
5. `tidak_aktif`: Aset dinonaktifkan (alih status, dihapus bukukan, atau dihentikan penggunaannya).

### C. Klasifikasi & Entitas Aset
* **Tipe Aset Utama (`asset_type`)**:
  * `land`: Aset berupa tanah/lahan (`land_assets`, mencakup luas tanah $m^2$, status sertifikasi).
  * `building`: Aset berupa bangunan/gedung (`building_assets`, mencakup luas lantai $m^2$, IMB/PBG).
* **Data Geospasial (`geometry_type`, `geometry_geojson`)**:
  * `point`: Koordinat titik lintang-bujur (Latitude/Longitude) untuk penanda posisi.
  * `polygon`: Koordinat batas bidang tanah/bangunan dalam format GeoJSON standar untuk visualisasi peta layer.
* **Pemanfaatan Aset (`asset_utilizations`)**: Pencatatan kerja sama atau sewa dengan pihak ketiga (komersial, pendidikan, dsb).
* **Permasalahan & Sengketa Aset (`asset_issues` & `issue_progress`)**: Pencatatan masalah aset (sengketa hukum, okupasi liar, kerusakan berat) beserta log progres penyelesaiannya.
* **BMN Pendukung**: Modul inventaris spesifik (misal: `bmn_alat_angkutan` untuk kendaraan bermotor dinas).
* **Satker (`satker`)**: Satuan kerja / unit universitas (`kode_satker`, `nama_satker`).

---

## 3. Arsitektur Teknis Singkat

* **Frontend & Backend**: Next.js (App Router, TypeScript, React Server Components & Route Handlers).
* **Database Layer**: PostgreSQL lokal (`db/schema.sql`) dengan custom connection pool (`src/lib/db.ts`).
* **Peta / GIS**: Komponen peta berbasis Web GIS rendering GeoJSON.
* **Autentikasi**: Custom session auth via cookie & `AUTH_SECRET`.

---

## 4. Aturan Dokumentasi (Zero Redundancy)

* **Perilaku AI & Alur Komunikasi**: Diatur di [AGENTS.md](file:///c:/xampp/htdocs/manajemenaset/AGENTS.md).
* **Petunjuk Setup & Deploy Server**: Diatur di [README.md](file:///c:/xampp/htdocs/manajemenaset/README.md).
* **Istilah Bisnis & Konsep Arsitektur**: Diatur di dokumen ini ([CONTEXT.md](file:///c:/xampp/htdocs/manajemenaset/CONTEXT.md)).
