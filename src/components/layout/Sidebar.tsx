'use client';

import React from 'react';
import {
  LayoutDashboard,
  FileCheck2,
  BookOpen,
  HelpCircle,
  Users,
  Database,
  BarChart3,
  Award,
  FileText,
  Settings,
  Search,
  SlidersHorizontal,
  ChevronRight
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentNav,
  onSelectNav,
  questionsCount,
  resultsCount
}) => {
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
              Tabor Study
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">CBT Assessment v2.0</p>
          </div>
        </div>
      </div>

      {/* 2. SEARCH BAR */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search menu..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* 3. NAVIGATION GROUPS */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 text-xs">
        {/* GROUP: MAIN */}
        <div>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
            Main
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
                <span>Dashboard</span>
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
                <span>Jadwal Ujian</span>
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
                <span>Bank Soal</span>
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
                <span>Daftar Siswa</span>
              </div>
            </button>
          </div>
        </div>

        {/* GROUP: MANAGEMENT */}
        <div>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
            Management
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
                <span>Database Nilai</span>
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
                <span>Statistik & Analisis</span>
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
                <span>Pengaturan Bobot</span>
              </div>
            </button>
          </div>
        </div>

        {/* GROUP: SYSTEM */}
        <div>
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
            System
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
                <span>Settings</span>
              </div>
            </button>

            <a
              href="#help"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100 transition"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4" />
                <span>Help & Panduan</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* 4. FOOTER INFO */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center text-xs">
            PG
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">Pak Guru</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">SMPN 58 Palembang</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
