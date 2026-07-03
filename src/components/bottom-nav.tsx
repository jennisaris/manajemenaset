import { Building2, CircleAlert, Handshake, LayoutDashboard } from 'lucide-react';

const nav = [
  { href: '#dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { href: '#asset-list', label: 'Aset', icon: Building2 },
  { href: '#utilization', label: 'Pihak Ketiga', icon: Handshake },
  { href: '#issues', label: 'Masalah', icon: CircleAlert },
];

export function BottomNav() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-sky-100 bg-white/90 px-3 py-2 shadow-[0_-12px_35px_rgba(95,181,240,.12)] backdrop-blur-xl lg:hidden">
      <nav className="grid grid-cols-4 gap-2 text-[11px] font-extrabold text-slate-500">
        {nav.map((item) => {
          const Icon = item.icon;
          return <a key={item.href} href={item.href} className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 ${item.active ? 'bg-sky-50 text-sky-700' : ''}`}><Icon className="h-5 w-5" /><span>{item.label}</span></a>;
        })}
      </nav>
    </div>
  );
}
