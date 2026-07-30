import nodemailer from 'nodemailer';
import type { UserProfile } from '@/lib/types';

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

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

  const transporter = createTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || '"Manajemen Aset" <noreply@universitas.ac.id>';

  if (transporter && user.email) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to: user.email,
        subject,
        text: body,
      });
      console.log(`[EMAIL SERVICE] Email sent via SMTP to ${user.email}: ${info.messageId}`);
      return { ok: true, sent: true, messageId: info.messageId };
    } catch (err) {
      console.error('[EMAIL SERVICE] SMTP send failed, falling back to console simulation log:', err);
    }
  }

  // Log notification to server console for simulation & audit trail
  console.log('====================================================');
  console.log(`[EMAIL SERVICE] Sending Notification to: ${user.email}`);
  console.log(`[SUBJECT]: ${subject}`);
  console.log(`[BODY]:\n${body}`);
  console.log('====================================================');

  return { ok: true, sent: false, simulated: true, subject, body };
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

  const transporter = createTransporter();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || '"Manajemen Aset" <noreply@universitas.ac.id>';

  if (transporter && user.email) {
    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to: user.email,
        subject,
        text: body,
      });
      console.log(`[EMAIL SERVICE] Approval email sent via SMTP to ${user.email}: ${info.messageId}`);
      return { ok: true, sent: true, messageId: info.messageId };
    } catch (err) {
      console.error('[EMAIL SERVICE] SMTP send failed, falling back to console simulation log:', err);
    }
  }

  console.log('====================================================');
  console.log(`[EMAIL SERVICE] Sending Approval Update to: ${user.email}`);
  console.log(`[STATUS]: ${isApproved ? 'APPROVED' : 'REJECTED'}`);
  console.log(`[SUBJECT]: ${subject}`);
  console.log(`[BODY]:\n${body}`);
  console.log('====================================================');

  return { ok: true, sent: false, simulated: true, subject, body };
}
