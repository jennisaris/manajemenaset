import { NextResponse } from 'next/server';
import { getSatkerListFromDb } from '@/lib/server/local-repository';

export async function GET() {
  try {
    const data = await getSatkerListFromDb();
    return NextResponse.json({ data });
  } catch (err) {
    console.error('API /api/satker error:', err);
    return NextResponse.json({ error: 'Gagal mengambil data Satker' }, { status: 500 });
  }
}
