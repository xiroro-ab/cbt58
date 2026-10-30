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
  LogOut
} from 'lucide-react';

export type NavItem =
  | 'dashboard'
  | 'exams'
  | 'questions'
  | 'students'
  | 'results'
  | 'statistics'
  | 'scoring'
  | 'settings';

interface SidebarProps {
  currentNav: NavItem;
  onSelectNav: (nav: NavItem) => void;
  questionsCount: number;
  resultsCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenHelp: () => void;
  currentTeacher?: Teacher | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onSelectNav,
  questionsCount,
  resultsCount,
  searchQuery,
  onSearchChange,
  onOpenHelp,
  currentTeacher,
  onLogout
}) => {
  const { t } = useLanguage();

  return (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col h-screen sticky top-0 transition-colors">
      {/* 1. BRAND LOGO */}
      <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20 font-black text-lg">
            ✦
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
              {t.appName}
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{t.appSubtitle}</p>
          </div>
        </div>
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
              onClick={() => onSelectNav('dashboard')}
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
              {currentNav === 'dashboard' && <ChevronRight className="w-3.5 h-3.5 text-violet-500" />}
            </button>

            <button
              onClick={() => onSelectNav('exams')}
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
            </button>

            <button
              onClick={() => onSelectNav('questions')}
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
              onClick={() => onSelectNav('students')}
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
              onClick={() => onSelectNav('results')}
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
              onClick={() => onSelectNav('statistics')}
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
              onClick={() => onSelectNav('scoring')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition ${
                currentNav === 'scoring'
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-4 h-4" />
                <span>{t.navScoring}</span>
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
              onClick={() => onSelectNav('settings')}
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
              <span className="w-2 h-2 rounded-full bg-violet-600"></span>
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
    </aside>
  );
};
