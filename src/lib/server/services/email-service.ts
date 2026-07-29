import 'server-only';
import type { UserProfile } from '@/lib/types';

export async function sendRegistrationReceivedEmail(user: UserProfile) {
  const subject = `Pendaftaran Akun Operator Aset Universitas Diterima - [${user.full_name}]`;
  const body = `
Yth. ${user.full_name},

Pendaftaran akun Anda untuk Sistem Informasi Manajemen Aset Universitas telah kami terima dengan rincian:
- NIP: ${user.nip ?? '-'}
- Nama: ${user.full_name}
- Satuan Kerja / Unit: ${user.satuan_kerja ?? user.university_name ?? '-'}
- Email: ${user.email}
- No. Handphone: ${user.phone_number ?? '-'}

Status Akun: MENUNGGU PERSETUJUAN ADMINISTRATOR (PENDING APPROVAL)

Tim Administrator Aset Universitas sedang memverifikasi data dan Surat Penunjukan Operator Anda.
Anda akan menerima pemberitahuan email selanjutnya setelah pendaftaran Anda disetujui atau ditinjau.

Terima kasih,
Tim Layanan Sistem Manajemen Aset Universitas
  `.trim();

  // Log notification to server console for simulation & audit trail
  console.log('====================================================');
  console.log(`[EMAIL SERVICE] Sending Notification to: ${user.email}`);
  console.log(`[SUBJECT]: ${subject}`);
  console.log(`[BODY]:\n${body}`);
  console.log('====================================================');

  return { ok: true, subject, body };
}

export async function sendApprovalStatusEmail(user: UserProfile, isApproved: boolean, reason?: string) {
  const subject = isApproved
    ? `Akun Operator Aset Anda Telah Disetujui - [${user.full_name}]`
    : `Pemberitahuan Pendaftaran Akun Aset - [${user.full_name}]`;

  const body = isApproved
    ? `
Yth. ${user.full_name},

Selamat! Pendaftaran akun Anda pada Sistem Informasi Manajemen Aset Universitas telah DISETUJUI oleh Administrator.

Rincian Akun Aktif Anda:
- Nama: ${user.full_name}
- Email Login: ${user.email}
- Role Akses: ${user.role_name}
- Kampus / Unit Scope: ${user.campus_name ?? 'Semua Kampus'}

Anda sekarang dapat melakukan login ke dalam sistem menggunakan email dan password yang telah Anda daftarkan saat pendaftaran.

Salam hangat,
Tim Layanan Sistem Manajemen Aset Universitas
    `.trim()
    : `
Yth. ${user.full_name},

Mohon maaf, pendaftaran akun Anda pada Sistem Informasi Manajemen Aset Universitas BELUM DAPAT DISETUJUI saat ini.

Catatan/Alasan Penolakan:
"${reason || user.rejection_reason || 'Dokumen Surat Penunjukan Operator atau data diri belum memenuhi persyaratan.'}"

Silakan hubungi Administrator Aset Universitas di kampus Anda untuk informasi dan bantuan lebih lanjut.

Salam hangat,
Tim Layanan Sistem Manajemen Aset Universitas
    `.trim();

  console.log('====================================================');
  console.log(`[EMAIL SERVICE] Sending Approval Update to: ${user.email}`);
  console.log(`[STATUS]: ${isApproved ? 'APPROVED' : 'REJECTED'}`);
  console.log(`[SUBJECT]: ${subject}`);
  console.log(`[BODY]:\n${body}`);
  console.log('====================================================');

  return { ok: true, subject, body };
}
