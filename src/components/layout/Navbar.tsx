'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Bell, Mail, UserCheck, PlusCircle, Eye } from 'lucide-react';

interface NavbarProps {
  onStartStudentExam: () => void;
  onOpenAddQuestion: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onStartStudentExam, onOpenAddQuestion }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between transition-colors">
      {/* 1. GREETING & DATE (Persis seperti gambar referensi) */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
          Selamat Datang, Bapak/Ibu Guru
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
          Exam Date: 30 Okt 2026 • SMP Negeri 58 Palembang
        </p>
      </div>

      {/* 2. ACTIONS & USER BAR */}
      <div className="flex items-center gap-3">
        {/* Toggle Dark / Light Mode Button */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition shadow-xs"
          title={theme === 'dark' ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* Mail Notification */}
        <button className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition hidden sm:flex">
          <Mail className="w-4 h-4" />
        </button>

        {/* Bell Notification */}
        <button className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-violet-600 absolute top-2 right-2"></span>
        </button>

        {/* User Avatar Stack */}
        <div className="hidden md:flex items-center -space-x-2 pl-2">
          <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">
            A
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">
            B
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center">
            30+
          </div>
        </div>

        {/* Tombol Aksi Cepat */}
        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={onOpenAddQuestion}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Tambah Soal</span>
          </button>

          <button
            onClick={onStartStudentExam}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition shadow-md shadow-violet-600/20"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Layar Siswa</span>
          </button>
        </div>
      </div>
    </header>
  );
};
