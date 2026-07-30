import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/server/services/user-service';

function safePart(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._/-]+/g, '-').replace(/-+/g, '-').replace(/^[-/]+|[-/]+$/g, '') || 'file';
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    let nip = '';
    let full_name = '';
    let satuan_kerja = '';
    let kode_satker = '';
    let email = '';
    let phone_number = '';
    let password = '';
    let assignment_letter_name: string | undefined;
    let assignment_letter_path: string | undefined;
    let assignment_letter_url: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      nip = String(formData.get('nip') ?? '').trim();
      full_name = String(formData.get('full_name') ?? '').trim();
      satuan_kerja = String(formData.get('satuan_kerja') ?? '').trim();
      kode_satker = String(formData.get('kode_satker') ?? '').trim();
      email = String(formData.get('email') ?? '').trim();
      phone_number = String(formData.get('phone_number') ?? '').trim();
      password = String(formData.get('password') ?? '').trim();

      const file = formData.get('assignment_letter');
      if (file instanceof File && file.size > 0) {
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
          return NextResponse.json({ error: 'File Surat Penunjukan Operator harus berformat PDF (.pdf).' }, { status: 400 });
        }
        if (file.size > 5 * 1024 * 1024) {
          return NextResponse.json({ error: 'Ukuran file Surat Penunjukan Operator melebihi batas maksimal 5MB.' }, { status: 400 });
        }

        assignment_letter_name = file.name;

        const extension = file.name.includes('.') ? `.${file.name.split('.').pop()?.toLowerCase()}` : '';
        const filename = `${Date.now()}-${safePart(nip || 'user')}-${safePart(file.name.replace(/\.[^.]+$/, ''))}${extension}`;
        const relativePath = safePart(path.posix.join('assignment_letters', filename));
        const uploadRoot = path.join(process.cwd(), 'public', 'uploads');
        const fullPath = path.join(uploadRoot, relativePath);

        await mkdir(path.dirname(fullPath), { recursive: true });
        await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));

        assignment_letter_path = relativePath;
        assignment_letter_url = `/uploads/${relativePath}`;
      }
    } else {
      const json = await request.json();
      nip = String(json.nip ?? '').trim();
      full_name = String(json.full_name ?? '').trim();
      satuan_kerja = String(json.satuan_kerja ?? '').trim();
      kode_satker = String(json.kode_satker ?? '').trim();
      email = String(json.email ?? '').trim();
      phone_number = String(json.phone_number ?? '').trim();
      password = String(json.password ?? '').trim();
      assignment_letter_name = json.assignment_letter_name;
      assignment_letter_path = json.assignment_letter_path;
      assignment_letter_url = json.assignment_letter_url;
    }

    if (!kode_satker && satuan_kerja) {
      const match = satuan_kerja.match(/^(\d{6})/);
      if (match) kode_satker = match[1];
    }

    if (!nip || !full_name || !satuan_kerja || !email || !phone_number || !password) {
      return NextResponse.json({ error: 'NIP, Nama Lengkap, Satuan Kerja, Email, No. Handphone, dan Password wajib diisi.' }, { status: 400 });
    }

    const user = await registerUser({
      nip,
      full_name,
      satuan_kerja,
      kode_satker: kode_satker || undefined,
      email,
      phone_number,
      password,
      assignment_letter_name,
      assignment_letter_path,
      assignment_letter_url,
    });

    return NextResponse.json({
      message: 'Pendaftaran berhasil. Akun Anda sedang menunggu persetujuan Administrator.',
      user,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Pendaftaran gagal.' }, { status: 500 });
  }
}
