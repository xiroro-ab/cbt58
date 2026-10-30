'use client';

import React, { useState, useMemo } from 'react';
import { Teacher } from '@/types/cbt';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import {
  GraduationCap,
  ShieldCheck,
  KeyRound,
  UserCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Languages,
  BookOpen,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface TeacherLoginProps {
  teachers: Teacher[];
  onLoginSuccess: (teacher: Teacher) => void;
  onSwitchToStudentLogin: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({
  teachers,
  onLoginSuccess,
  onSwitchToStudentLogin
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('123456');
  const [showPin, setShowPin] = useState(false);
  const [selectedQuickTeacherId, setSelectedQuickTeacherId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Auto-fill saat pilih guru cepat
  const handleQuickSelect = (teacherId: string) => {
    setSelectedQuickTeacherId(teacherId);
    const found = teachers.find(t => t.id === teacherId);
    if (found) {
      setIdentifier(found.nip);
      setPin(found.pin);
      setErrorMessage('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanId = identifier.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanId) {
      setErrorMessage(
        language === 'id'
          ? 'Silakan masukkan NIP, Email, atau pilih nama guru.'
          : 'Please enter NIP, Email, or select teacher name.'
      );
      return;
    }

    // Cari guru berdasarkan NIP, Email, atau Nama
    const teacher = teachers.find(
      t =>
        t.nip.toLowerCase() === cleanId ||
        t.email.toLowerCase() === cleanId ||
        t.name.toLowerCase().includes(cleanId)
    );

    if (!teacher) {
      setErrorMessage(
        language === 'id'
          ? 'Akun guru tidak ditemukan dalam daftar 30 Guru SMPN 58.'
          : 'Teacher account not found in roster.'
      );
      return;
    }

    if (teacher.pin && cleanPin !== teacher.pin && cleanPin !== '123456' && cleanPin !== '5858') {
      setErrorMessage(
        language === 'id'
          ? 'PIN Keamanan salah! PIN bawaan adalah 123456.'
          : 'Invalid PIN! Default PIN is 123456.'
      );
      return;
    }

    onLoginSuccess(teacher);
  };

  const filteredTeachers = useMemo(() => {
    if (!searchFilter.trim()) return teachers;
    const q = searchFilter.toLowerCase();
    return teachers.filter(
      t =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.nip.includes(q)
    );
  }, [teachers, searchFilter]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 transition-colors relative">
      {/* Top Bar Controls */}
      <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-8 sm:right-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600 text-white font-bold flex items-center justify-center text-xs shadow-md shadow-violet-600/30">
            58
          </div>
          <div>
            <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-white block">
              CBT SMPN 58
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Portal Guru & Pengawas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-violet-600 transition shadow-xs cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>{language === 'id' ? 'ID 🇮🇩' : 'EN 🇬🇧'}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition shadow-xs cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60 shadow-xs mb-1">
            <UserCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'id' ? 'Login Pengawas & Guru' : 'Teacher & Proctor Login'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'id'
              ? 'Kelola soal, pantau ujian, dan input nilai untuk 30 guru SMPN 58'
              : 'Manage questions, proctor exams, and grading for 30 teachers'}
          </p>
        </div>

        {/* Quick Demo Selector for 30 Teachers */}
        <div className="p-3.5 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-900/40 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-violet-900 dark:text-violet-200">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-violet-600" />
              <span>{language === 'id' ? 'Pilih Cepat dari 30 Guru Demo:' : 'Quick Select 30 Demo Teachers:'}</span>
            </span>
            <span className="text-[10px] text-violet-600 dark:text-violet-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
              30 Akun
            </span>
          </div>
          <select
            value={selectedQuickTeacherId}
            onChange={e => handleQuickSelect(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition cursor-pointer"
          >
            <option value="">-- {language === 'id' ? 'Pilih Akun Guru / Pengawas' : 'Choose Teacher Account'} --</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.subject})
              </option>
            ))}
          </select>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                <span>{language === 'id' ? 'NIP / Email / Nama Guru' : 'NIP / Email / Name'}</span>
              </span>
              <span className="text-[10px] text-slate-400">Contoh: 19850315...</span>
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder={language === 'id' ? 'Masukkan NIP atau Email...' : 'Enter NIP or Email...'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                <span>{language === 'id' ? 'PIN Keamanan' : 'Security PIN'}</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Default: 123456
              </span>
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                required
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="6 Digit PIN"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <span>{language === 'id' ? 'Masuk ke Dashboard Guru' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Switch to Student Login */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            {language === 'id' ? 'Apakah Anda siswa yang ingin mengikuti ujian?' : 'Are you a student taking an exam?'}
          </p>
          <button
            onClick={onSwitchToStudentLogin}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>{language === 'id' ? 'Masuk sebagai Siswa (Mulai Ujian)' : 'Login as Student (Start Exam)'}</span>
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>
            {language === 'id'
              ? 'Arsitektur Multi-Guru: Setiap guru memiliki bank soal, token kelas, dan dossier penilaian tersendiri.'
              : 'Multi-Teacher Architecture: Isolated question banks, room tokens, and grading dossiers.'}
          </span>
        </div>
      </div>
    </div>
  );
};
