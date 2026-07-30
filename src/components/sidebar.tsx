'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Archive,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  Car,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  FileText,
  GraduationCap,
  Handshake,
  KeyRound,
  Landmark,
  Laptop,
  LayoutDashboard,
  MessageCircleQuestion,
  Search,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { canManageUsers, canViewExecutiveAnalytics } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

type SidebarProps = {
  currentRole: UserRole;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
};

export function Sidebar({ currentRole, isOpenMobile, onCloseMobile }: SidebarProps) {
  const [activeHash, setActiveHash] = useState('#dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      setActiveHash(window.location.hash || '#dashboard');
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavClick = (href: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.hash = href;
    setActiveHash(href);
    window.dispatchEvent(new Event('hashchange'));
    onCloseMobile?.();
  };

  const [isAssetMenuOpen, setIsAssetMenuOpen] = useState(true);

  useEffect(() => {
    if (
      activeHash === '#asset-list' ||
      activeHash === '#asset-bangunan-tanah' ||
      activeHash === '#asset-alat-angkutan' ||
      activeHash === '#asset-khusus-tik' ||
      activeHash === '#asset-non-tik'
    ) {
      setIsAssetMenuOpen(true);
    }
  }, [activeHash]);

  const assetSubMenus = [
    { href: '#asset-list', label: 'Bangunan / Tanah', icon: Landmark },
    { href: '#asset-alat-angkutan', label: 'Alat Angkut Bermotor', icon: Car },
    { href: '#asset-khusus-tik', label: 'Mesin Khusus TIK', icon: Laptop },
    { href: '#asset-non-tik', label: 'Mesin Peralatan Non TIK', icon: Wrench },
  ];

  const hasAnalytics = canViewExecutiveAnalytics(currentRole);
  const hasUserMgmt = canManageUsers(currentRole);

  const managementMenu = [
    { href: '#utilization', label: 'Pemanfaatan', icon: Handshake },
    { href: '#disposal', label: 'Penghapusan', icon: Archive },
    { href: '#issues', label: 'Permasalahan', icon: CircleAlert },
    { href: '#reports', label: 'Laporan', icon: FileText },
    ...(hasUserMgmt ? [{ href: '#users', label: 'User & Role', icon: Users }] : []),
    { href: '#change-password', label: 'Ubah Password', icon: KeyRound },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[280px] shrink-0 flex-col overflow-hidden border-r border-border bg-white transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header */}
        <div className="flex h-[90px] items-center justify-between gap-3 border-b border-border px-5">
          <div className="flex items-center gap-3">
            <img src="/images/logo-dikti.png" alt="Logo Kemdiktisaintek" className="h-10 w-auto object-contain shrink-0" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground leading-tight">Kemdiktisaintek</h1>
              <p className="text-xs font-medium text-secondary">Manajemen Aset</p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl ring-1 ring-border text-secondary transition-all hover:ring-primary hover:text-primary"
            aria-label="Search"
          >
            <Search className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 pb-28">
          {/* Main Menu Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-secondary">
              Main Menu
            </h3>
            <div className="flex flex-col gap-1">
              {/* Dashboard */}
              <a
                href="#dashboard"
                onClick={(e) => handleNavClick('#dashboard', e)}
                className={`group flex items-center gap-3 rounded-xl p-3.5 transition-all duration-300 cursor-pointer ${
                  activeHash === '#dashboard'
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-secondary hover:bg-muted hover:text-foreground'
                }`}
              >
                <LayoutDashboard className={`h-5 w-5 ${activeHash === '#dashboard' ? 'text-foreground' : 'text-secondary'}`} />
                <span className="font-medium">Dashboard</span>
              </a>

              {/* Data Aset Expandable Menu */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setIsAssetMenuOpen(!isAssetMenuOpen)}
                  className={`group flex items-center justify-between rounded-xl p-3.5 transition-all duration-300 cursor-pointer text-left ${
                    assetSubMenus.some((sub) => sub.href === activeHash)
                      ? 'bg-muted/70 font-semibold text-foreground'
                      : 'text-secondary hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Landmark className="h-5 w-5 text-secondary group-hover:text-foreground" />
                    <span className="font-medium">Data Aset</span>
                  </div>
                  {isAssetMenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {/* Sub Menu Items */}
                {isAssetMenuOpen && (
                  <div className="ml-4 flex flex-col gap-1 border-l-2 border-slate-100 pl-3 pt-1">
                    {assetSubMenus.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeHash === sub.href;
                      return (
                        <a
                          key={sub.href}
                          href={sub.href}
                          onClick={(e) => handleNavClick(sub.href, e)}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                            isSubActive
                              ? 'bg-sky-50 text-sky-700 font-bold border border-sky-100'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <SubIcon className={`h-4 w-4 shrink-0 ${isSubActive ? 'text-sky-600' : 'text-slate-400'}`} />
                          <span>{sub.label}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Verifikasi */}
              <a
                href="#verification"
                onClick={(e) => handleNavClick('#verification', e)}
                className={`group flex items-center gap-3 rounded-xl p-3.5 transition-all duration-300 cursor-pointer ${
                  activeHash === '#verification'
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-secondary hover:bg-muted hover:text-foreground'
                }`}
              >
                <BadgeCheck className={`h-5 w-5 ${activeHash === '#verification' ? 'text-foreground' : 'text-secondary'}`} />
                <span className="font-medium">Verifikasi</span>
              </a>

              {/* Analitik */}
              {hasAnalytics && (
                <a
                  href="#analytics"
                  onClick={(e) => handleNavClick('#analytics', e)}
                  className={`group flex items-center gap-3 rounded-xl p-3.5 transition-all duration-300 cursor-pointer ${
                    activeHash === '#analytics'
                      ? 'bg-muted font-semibold text-foreground'
                      : 'text-secondary hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <BarChart3 className={`h-5 w-5 ${activeHash === '#analytics' ? 'text-foreground' : 'text-secondary'}`} />
                  <span className="font-medium">Analitik</span>
                </a>
              )}
            </div>
          </div>


          {/* Management Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-medium text-secondary">
              Management
            </h3>
            <div className="flex flex-col gap-1">
              {managementMenu.map((item) => {
                const Icon = item.icon;
                const isActive = activeHash === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleNavClick(item.href, e)}
                    className={`group flex items-center gap-3 rounded-xl p-4 transition-all duration-300 cursor-pointer ${
                      isActive
                        ? 'bg-muted font-semibold text-foreground'
                        : 'text-secondary hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 transition-all duration-300 ${
                        isActive ? 'text-foreground font-semibold' : 'text-secondary group-hover:text-foreground'
                      }`}
                    />
                    <span className="font-medium text-secondary group-[.active]:font-semibold group-[.active]:text-foreground group-hover:text-foreground">
                      {item.label}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Help Card */}
        <div className="absolute bottom-0 left-0 w-[280px] border-t border-border bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">Butuh Bantuan?</p>
              <a
                href="#help"
                className="text-sm text-secondary transition-all duration-300 hover:text-primary hover:underline"
              >
                Hubungi Support
              </a>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageCircleQuestion className="h-6 w-6" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

