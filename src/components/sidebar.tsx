import Image from 'next/image';
import { BadgeCheck, CircleAlert, FileText, Handshake, Landmark, LayoutDashboard, KeyRound, Map, Users } from 'lucide-react';
import { canManageUsers } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

const baseMenu = [
  { href: '#dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { href: '#map-section', label: 'Peta Aset', icon: Map },
  { href: '#asset-list', label: 'Data Aset', icon: Landmark },
  { href: '#utilization', label: 'Pemanfaatan', icon: Handshake },
  { href: '#issues', label: 'Permasalahan', icon: CircleAlert },
  { href: '#verification', label: 'Verifikasi', icon: BadgeCheck },
  { href: '#reports', label: 'Laporan', icon: FileText },
];

export function Sidebar({ currentRole }: { currentRole: UserRole }) {
  const menu = canManageUsers(currentRole)
    ? [...baseMenu, { href: '#users', label: 'User & Role', icon: Users }]
    : [...baseMenu, { href: '#change-password', label: 'Ubah Password', icon: KeyRound }];

  return (
    <aside className="sticky top-0 hidden h-screen border-r border-sky-100 bg-gradient-to-b from-white/95 to-sky-50/90 p-6 shadow-[18px_0_60px_rgba(22,118,194,.08)] backdrop-blur-xl lg:block">
      <div className="mb-8 rounded-[1.4rem] border border-sky-100 bg-white/90 p-4 shadow-sm">
        <Image src="/kemdiktisaintek-logo.jpg" alt="Logo Kemdiktisaintek" width={640} height={160} priority className="h-auto w-full object-contain" />
        <div className="mt-4">
          <h1 className="text-base font-black leading-tight tracking-tight">Manajemen Aset<br />Universitas</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">Tanah • Bangunan • Maps</p>
        </div>
      </div>
      <nav className="space-y-2 text-sm font-extrabold">{menu.map((item) => { const Icon = item.icon; return <a key={item.href} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${item.active ? 'border-sky-100 bg-gradient-to-br from-white to-sky-50 text-sky-700 shadow-sm' : 'border-transparent text-slate-500 hover:border-sky-100 hover:bg-white/80 hover:text-sky-700 hover:shadow-sm'}`} href={item.href}><Icon className="h-5 w-5" />{item.label}</a>; })}</nav>
    </aside>
  );
}
