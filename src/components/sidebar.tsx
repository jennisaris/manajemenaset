'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  CircleAlert,
  FileText,
  GraduationCap,
  Handshake,
  KeyRound,
  Landmark,
  LayoutDashboard,
  MessageCircleQuestion,
  Search,
  UserCheck,
  Users,
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

  const hasAnalytics = canViewExecutiveAnalytics(currentRole);
  const hasUserMgmt = canManageUsers(currentRole);

  const mainMenu = [
    { href: '#dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '#asset-list', label: 'Data Aset', icon: Landmark },
    { href: '#verification', label: 'Verifikasi', icon: BadgeCheck },
    ...(hasAnalytics ? [{ href: '#analytics', label: 'Analitik', icon: BarChart3 }] : []),
  ];

  const managementMenu = [
    { href: '#utilization', label: 'Pemanfaatan', icon: Handshake },
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
              {mainMenu.map((item) => {
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

