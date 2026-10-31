'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Teacher } from '@/types/cbt';
import {
  LayoutDashboard,
  FileCheck2,
  BookOpen,
  HelpCircle,
  Users,
  Database,
  BarChart3,
  SlidersHorizontal,
  Settings,
  Search,
  ChevronRight,
  Sparkles,
  LogOut,
  Printer,
  Radio,
  X
} from 'lucide-react';

export type NavItem =
  | 'dashboard'
  | 'exams'
  | 'questions'
  | 'students'
  | 'monitoring'
  | 'results'
  | 'statistics'
  | 'documents'
  | 'settings';

interface SidebarProps {
  currentNav: NavItem;
  onSelectNav: (nav: NavItem) => void;
  examsCount?: number;
  questionsCount: number;
  studentsCount?: number;
  resultsCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenHelp: () => void;
  currentTeacher?: Teacher | null;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onSelectNav,
  examsCount = 0,
  questionsCount,
  studentsCount = 0,
  resultsCount,
  searchQuery,
  onSearchChange,
  onOpenHelp,
  currentTeacher,
  onLogout,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const { t } = useLanguage();

  const handleNavSelect = (nav: NavItem) => {
    onSelectNav(nav);
    if (onCloseMobile) onCloseMobile();
  };

  const renderContent = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full">
      {/* 1. BRAND LOGO */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center p-1 shadow-xs flex-shrink-0">
            <img
              src="https://raw.githubusercontent.com/xiroro-ab/smp58dataguru/refs/heads/main/ico.png"
              alt="Logo SMPN 58"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight tracking-tight">
              SMPN58
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{t.appSubtitle}</p>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. LIVE SEARCH BAR */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. NAVIGATION GROUPS */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 text-xs">
        {/* GROUP: MAIN / UTAMA */}
        <div>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
            {t.mainGroup}
          </span>
          <div className="space-y-0.5">
            <button
              onClick={() => handleNavSelect('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
                currentNav === 'dashboard'
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>{t.navDashboard}</span>
              </div>
            </button>

            <button
              onClick={() => handleNavSelect('exams')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
                currentNav === 'exams'
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-4 h-4" />
                <span>{t.navExams}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {examsCount}
              </span>
            </button>

            <button
              onClick={() => handleNavSelect('questions')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
                currentNav === 'questions'
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>{t.navQuestions}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {questionsCount}
              </span>
            </button>

            <button
              onClick={() => handleNavSelect('students')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
                currentNav === 'students'
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>{t.navStudents}</span>
              </div>
              {studentsCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  {studentsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* GROUP: MANAGEMENT / MANAJEMEN */}
        <div>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
            {t.managementGroup}
          </span>
          <div className="space-y-0.5">
            <button
              onClick={() => handleNavSelect('monitoring')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition cursor-pointer ${
                currentNav === 'monitoring'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Live Monitoring</span>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-black tracking-wider animate-pulse">
                LIVE
              </span>
            </button>

            <button
              onClick={() => handleNavSelect('results')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
                currentNav === 'results'
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4" />
                <span>{t.navResults}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {resultsCount}
              </span>
            </button>

            <button
              onClick={() => handleNavSelect('statistics')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
                currentNav === 'statistics'
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4" />
                <span>{t.navStatistics}</span>
              </div>
            </button>

            <button
              onClick={() => handleNavSelect('documents')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
                currentNav === 'documents'
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4" />
                <span>{t.navDocuments}</span>
              </div>
            </button>
          </div>
        </div>

        {/* GROUP: SYSTEM / SISTEM */}
        <div>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
            {t.systemGroup}
          </span>
          <div className="space-y-0.5">
            <button
              onClick={() => handleNavSelect('settings')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
                currentNav === 'settings'
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>{t.navSettings}</span>
              </div>
            </button>

            {/* Tombol Help Interaktif (Bukan lagi link # dummy) */}
            <button
              onClick={onOpenHelp}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>{t.navHelp}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 4. FOOTER INFO AKUN YANG SEDANG LOGIN */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-full ${
                currentTeacher?.avatarColor || 'bg-violet-600'
              } text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs`}
            >
              {currentTeacher
                ? currentTeacher.name
                    .split(' ')
                    .filter(Boolean)
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'PG'}
            </div>
            <div className="truncate">
              <p
                className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate"
                title={currentTeacher?.name || 'Pak Guru'}
              >
                {currentTeacher?.name || 'Pak Guru'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {currentTeacher?.role === 'admin'
                  ? 'Superadmin CBT'
                  : currentTeacher?.role === 'pengawas'
                  ? 'Pengawas CBT'
                  : currentTeacher?.subject
                  ? `Guru ${currentTeacher.subject}`
                  : 'Guru Pengampu'}
                {' • SMPN 58'}
              </p>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex-shrink-0"
              title="Keluar / Ganti Akun"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 flex-col h-screen sticky top-0 transition-colors">
        {renderContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
