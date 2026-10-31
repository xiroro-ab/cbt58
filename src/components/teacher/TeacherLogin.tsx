'use client';

import React, { useState } from 'react';
import { Teacher, TeacherAssignment } from '@/types/cbt';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { fetchTeachers, mergeTeachers } from '@/lib/supabaseService';
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
  UserPlus,
  Mail,
  School,
  IdCard,
  AlertCircle,
  CheckCircle2,
  LogIn,
  Plus,
  Trash2,
  Layers
} from 'lucide-react';

interface TeacherLoginProps {
  teachers: Teacher[];
  onLoginSuccess: (teacher: Teacher) => void;
  onRegisterTeacher: (newTeacher: Teacher) => Promise<boolean>;
  onSwitchToStudentLogin: () => void;
}

const AVAILABLE_SUBJECTS = [
  'Ilmu Pengetahuan Alam (IPA)',
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Pendidikan Agama Islam (PAI)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Pendidikan Pancasila (PPKn)',
  'Informatika & TIK',
  'PJOK (Penjasorkes)',
  'Seni Budaya',
  'Prakarya',
  'Bimbingan Konseling (BK)',
  'Muatan Lokal / Bahasa Daerah'
];

const AVAILABLE_CLASSES = [
  'VII.1', 'VII.2', 'VII.3',
  'VIII.1', 'VIII.2', 'VIII.3',
  'IX.1', 'IX.2', 'IX.3', 'IX.4'
];

interface AssignmentItem {
  id: string;
  subject: string;
  customSubject: string;
  classes: string[];
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({
  teachers,
  onLoginSuccess,
  onRegisterTeacher,
  onSwitchToStudentLogin
}) => {
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Mode: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Form State: Login
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Form State: Register
  const [regName, setRegName] = useState('');
  const [regNip, setRegNip] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<'guru_mapel' | 'pengawas' | 'admin'>('guru_mapel');
  const [regSchoolPasscode, setRegSchoolPasscode] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [showRegPin, setShowRegPin] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-Mapel & Multi-Rombel State
  const [assignments, setAssignments] = useState<AssignmentItem[]>([
    {
      id: 'asg-1',
      subject: 'Ilmu Pengetahuan Alam (IPA)',
      customSubject: '',
      classes: ['VII.1', 'VII.2', 'VII.3']
    }
  ]);

  const handleAddAssignment = () => {
    setAssignments(prev => [
      ...prev,
      {
        id: `asg-${Date.now()}`,
        subject: 'Informatika & TIK',
        customSubject: '',
        classes: ['IX.1', 'IX.2', 'IX.3', 'IX.4']
      }
    ]);
  };

  const handleRemoveAssignment = (id: string) => {
    if (assignments.length <= 1) return;
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const handleUpdateAssignmentSubject = (id: string, subject: string) => {
    setAssignments(prev =>
      prev.map(a => (a.id === id ? { ...a, subject } : a))
    );
  };

  const handleUpdateAssignmentCustomSubject = (id: string, customSubject: string) => {
    setAssignments(prev =>
      prev.map(a => (a.id === id ? { ...a, customSubject } : a))
    );
  };

  const handleToggleAssignmentClass = (id: string, cls: string) => {
    setAssignments(prev =>
      prev.map(a => {
        if (a.id !== id) return a;
        const exists = a.classes.includes(cls);
        return {
          ...a,
          classes: exists ? a.classes.filter(c => c !== cls) : [...a.classes, cls]
        };
      })
    );
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const cleanId = loginIdentifier.trim().toLowerCase();
    const cleanPin = loginPin.trim();

    if (!cleanId) {
      setLoginError(
        language === 'id'
          ? 'Harap masukkan NIP atau Email guru.'
          : 'Please enter teacher NIP or Email.'
      );
      return;
    }

    if (!cleanPin) {
      setLoginError(
        language === 'id'
          ? 'Harap masukkan Password / PIN keamanan.'
          : 'Please enter your password or PIN.'
      );
      return;
    }

    setIsLoggingIn(true);

    try {
      // 1. Kumpulkan daftar guru saat ini (prop teachers + local storage cache)
      let currentList: Teacher[] = [...teachers];
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('cbt_cached_teachers');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              currentList = mergeTeachers(parsed, currentList);
            }
          }
        } catch (e) {}
      }

      // Cari guru di daftar lokal
      let teacher = currentList.find(
        t =>
          (t.nip && t.nip.trim().toLowerCase() === cleanId) ||
          (t.email && t.email.trim().toLowerCase() === cleanId) ||
          (t.name && t.name.trim().toLowerCase() === cleanId)
      );

      // JIKA guru belum ditemukan ATAU pin tidak cocok di memori lokal:
      // Tarik data terbaru langsung dari Supabase untuk verifikasi real-time
      // (Ini mencegah bug 'salah password' pada klik pertama akibat jeda sinkronisasi awal)
      if (!teacher || (teacher.pin && String(teacher.pin).trim() !== cleanPin)) {
        try {
          const freshList = await fetchTeachers();
          if (freshList && freshList.length > 0) {
            currentList = freshList;
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('cbt_cached_teachers', JSON.stringify(freshList));
              } catch (e) {}
            }
            teacher = freshList.find(
              t =>
                (t.nip && t.nip.trim().toLowerCase() === cleanId) ||
                (t.email && t.email.trim().toLowerCase() === cleanId) ||
                (t.name && t.name.trim().toLowerCase() === cleanId)
            );
          }
        } catch (err) {
          console.warn('Gagal sinkronisasi data guru real-time dari Supabase:', err);
        }
      }

      if (!teacher) {
        setLoginError(
          language === 'id'
            ? 'Akun guru tidak terdaftar. Silakan gunakan tab "Daftar Akun Baru" di atas untuk mendaftarkan akun Anda.'
            : 'Teacher account not found. Please register a new account.'
        );
        return;
      }

      // Verifikasi PIN
      if (teacher.pin && String(teacher.pin).trim() !== cleanPin) {
        setLoginError(
          language === 'id'
            ? 'Password / PIN keamanan salah! Periksa kembali input Anda.'
            : 'Incorrect password or PIN.'
        );
        return;
      }

      onLoginSuccess(teacher);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Submit Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    const cleanName = regName.trim();
    const cleanNip = regNip.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPin = regPin.trim();
    const cleanConfirm = regConfirmPin.trim();
    const cleanSchoolPasscode = regSchoolPasscode.trim().toUpperCase();

    if (!cleanSchoolPasscode) {
      setRegError('Kode Otorisasi Dewan Guru wajib diisi untuk verifikasi keamanan sekolah.');
      return;
    }

    if (cleanSchoolPasscode !== 'GURU58') {
      setRegError('Kode Otorisasi Dewan Guru salah! Akses pendaftaran ini dilindungi khusus bagi dewan guru resmi SMPN 58 Palembang.');
      return;
    }

    if (!cleanName || !cleanNip || !cleanEmail) {
      setRegError('Nama, NIP, dan Email wajib diisi.');
      return;
    }

    // Validasi assignments
    for (let i = 0; i < assignments.length; i++) {
      const asg = assignments[i];
      const subj = asg.subject === 'Lainnya' ? asg.customSubject.trim() : asg.subject;
      if (!subj) {
        setRegError(`Mata Pelajaran #${i + 1} belum diisi.`);
        return;
      }
      if (asg.classes.length === 0) {
        setRegError(`Pilih minimal satu kelas / rombel untuk Mapel #${i + 1} (${subj}).`);
        return;
      }
    }

    if (cleanPin.length < 4) {
      setRegError('Password / PIN minimal 4 karakter.');
      return;
    }

    if (cleanPin !== cleanConfirm) {
      setRegError('Konfirmasi Password / PIN tidak cocok!');
      return;
    }

    // Cek NIP atau Email ganda
    if (teachers.some(t => t.nip === cleanNip)) {
      setRegError(`NIP ${cleanNip} sudah terdaftar di sistem. Silakan masuk via Login.`);
      return;
    }

    if (teachers.some(t => t.email.toLowerCase() === cleanEmail)) {
      setRegError(`Email ${cleanEmail} sudah terdaftar di sistem.`);
      return;
    }

    setIsSubmitting(true);

    const finalAssignments: TeacherAssignment[] = assignments.map(a => ({
      id: a.id,
      subject: a.subject === 'Lainnya' ? a.customSubject.trim() : a.subject,
      classes: a.classes
    }));

    const newTeacher: Teacher = {
      id: `tea-${Date.now()}`,
      nip: cleanNip,
      name: cleanName,
      email: cleanEmail,
      subject: finalAssignments[0].subject,
      classes: finalAssignments[0].classes,
      assignments: finalAssignments,
      role: regRole,
      pin: cleanPin,
      avatarColor: 'bg-violet-600',
      status: 'Aktif Mengawas',
      lastLogin: new Date().toISOString()
    };

    try {
      await onRegisterTeacher(newTeacher);
      setRegSuccess('Pendaftaran akun guru berhasil! Mengalihkan ke dashboard...');
      setTimeout(() => {
        onLoginSuccess(newTeacher);
      }, 700);
    } catch (err) {
      setRegError('Terjadi kesalahan saat menyimpan akun. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 transition-colors relative">
      {/* Top Bar Controls */}
      <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-8 sm:right-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shadow-xs">
            <img
              src="https://raw.githubusercontent.com/xiroro-ab/smp58dataguru/refs/heads/main/ico.png"
              alt="Logo SMPN 58"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-white block">
              CBT SMPN 58
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Portal Guru & Pengawas Resmi
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

      {/* Main Authentication Card */}
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in fade-in zoom-in-95 duration-200 my-10">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs mb-1">
            <img
              src="https://raw.githubusercontent.com/xiroro-ab/smp58dataguru/refs/heads/main/ico.png"
              alt="Logo SMPN 58"
              className="w-10 h-10 object-contain"
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {activeTab === 'login'
              ? language === 'id' ? 'Login Pengawas & Guru' : 'Teacher Login'
              : language === 'id' ? 'Pendaftaran Akun Guru' : 'Teacher Registration'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeTab === 'login'
              ? language === 'id'
                ? 'Masuk ke dashboard untuk mengelola soal, token ujian, dan dossier nilai'
                : 'Sign in to manage questions, exam tokens, and scores'
              : language === 'id'
                ? 'Mendukung guru multi-mapel & multi-rombel (misal IPA kelas 7 dan Informatika kelas 9)'
                : 'Supports teachers with multiple subjects and distinct class assignments'}
          </p>
        </div>

        {/* Tab Switcher: Masuk vs Daftar Akun */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setLoginError('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{language === 'id' ? 'Masuk (Login)' : 'Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setRegError('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{language === 'id' ? 'Daftar Akun Baru' : 'Register Account'}</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* FORM 1: MASUK (LOGIN)                                          */}
        {/* ============================================================== */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5 text-violet-600" />
                  <span>{language === 'id' ? 'NIP atau Email Guru' : 'Teacher NIP or Email'}</span>
                </span>
                <span className="text-[10px] text-slate-400">Terdaftar di sistem</span>
              </label>
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={e => setLoginIdentifier(e.target.value)}
                placeholder="Contoh: 19850315... atau nama@smpn58.sch.id"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                  <span>{language === 'id' ? 'Password / PIN Keamanan' : 'Password / PIN'}</span>
                </span>
                <span className="text-[10px] text-slate-400">PIN guru Anda</span>
              </label>
              <div className="relative">
                <input
                  type={showLoginPin ? 'text' : 'password'}
                  required
                  value={loginPin}
                  onChange={e => setLoginPin(e.target.value)}
                  placeholder="Masukkan Password / PIN"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPin(!showLoginPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showLoginPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>
                      {language === 'id'
                        ? 'Memverifikasi Kredensial...'
                        : 'Verifying Credentials...'}
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {language === 'id'
                        ? 'Masuk ke Dashboard Guru'
                        : 'Sign In to Dashboard'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* FORM 2: DAFTAR AKUN GURU BARU (MULTI-MAPEL & MULTI-ROMBEL)     */}
        {/* ============================================================== */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                <span>Nama Lengkap Guru & Gelar</span>
              </label>
              <input
                type="text"
                required
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="Contoh: Ahmad Fauzi, S.Pd"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <IdCard className="w-3.5 h-3.5 text-violet-600" />
                  <span>NIP / NUPTK</span>
                </label>
                <input
                  type="text"
                  required
                  value={regNip}
                  onChange={e => setRegNip(e.target.value)}
                  placeholder="18 Digit NIP..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-violet-600" />
                  <span>Email Guru</span>
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="nama@smpn58.sch.id"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                />
              </div>
            </div>

            {/* SEKSI PENUGASAN MULTI-MAPEL & ROMBEL */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <label className="block text-slate-900 dark:text-white font-bold flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-violet-600" />
                    <span>Penugasan Mata Pelajaran & Rombel Kelas</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Bisa menambahkan lebih dari 1 mata pelajaran dengan rombel kelas berbeda
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddAssignment}
                  className="px-2.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-600 hover:text-white text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Mapel</span>
                </button>
              </div>

              {/* Daftar Penugasan */}
              <div className="space-y-3">
                {assignments.map((asg, idx) => (
                  <div
                    key={asg.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3" />
                        <span>Mata Pelajaran #{idx + 1}</span>
                      </span>

                      {assignments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignment(asg.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Hapus penugasan mapel ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Pilih Mapel */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Pilih Mapel:
                      </label>
                      <select
                        value={asg.subject}
                        onChange={e => handleUpdateAssignmentSubject(asg.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                      >
                        {AVAILABLE_SUBJECTS.map(subj => (
                          <option key={subj} value={subj}>
                            {subj}
                          </option>
                        ))}
                        <option value="Lainnya">Lainnya (Ketik Manual)...</option>
                      </select>

                      {asg.subject === 'Lainnya' && (
                        <input
                          type="text"
                          required
                          value={asg.customSubject}
                          onChange={e => handleUpdateAssignmentCustomSubject(asg.id, e.target.value)}
                          placeholder="Ketik nama mata pelajaran..."
                          className="w-full mt-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      )}
                    </div>

                    {/* Pilih Rombel Khusus Mapel Ini */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Rombel Kelas yang Diajar:
                        </span>
                        <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold">
                          {asg.classes.length} Rombel Terpilih
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {AVAILABLE_CLASSES.map(cls => {
                          const isSelected = asg.classes.includes(cls);
                          return (
                            <button
                              type="button"
                              key={cls}
                              onClick={() => handleToggleAssignmentClass(asg.id, cls)}
                              className={`py-1.5 px-1.5 rounded-lg text-[10px] font-bold transition text-center border cursor-pointer ${
                                isSelected
                                  ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-violet-400'
                              }`}
                            >
                              {cls}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kode Otorisasi Dewan Guru (Proteksi agar Siswa Tidak Bisa Daftar) */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 space-y-1.5">
              <label className="block text-slate-800 dark:text-slate-200 font-bold flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Kode Otorisasi Dewan Guru</span>
                </span>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                  Wajib dari Sekolah
                </span>
              </label>
              <input
                type="text"
                required
                value={regSchoolPasscode}
                onChange={e => setRegSchoolPasscode(e.target.value)}
                placeholder="Masukkan Kode Otorisasi Sekolah..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white uppercase tracking-wider font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
              <p className="text-[10px] text-amber-800/80 dark:text-amber-400/80">
                Kode verifikasi rahasia yang hanya dibagikan oleh Kepala Sekolah / Waka Kurikulum kepada dewan guru resmi.
              </p>
            </div>

            {/* Password & Konfirmasi Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                  <span>Password / PIN</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegPin ? 'text' : 'password'}
                    required
                    value={regPin}
                    onChange={e => setRegPin(e.target.value)}
                    placeholder="Min. 4 Karakter"
                    className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPin(!showRegPin)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showRegPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                  <span>Konfirmasi PIN</span>
                </label>
                <input
                  type={showRegPin ? 'text' : 'password'}
                  required
                  value={regConfirmPin}
                  onChange={e => setRegConfirmPin(e.target.value)}
                  placeholder="Ulangi PIN"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                />
              </div>
            </div>

            {regError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {regSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{regSuccess}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
              >
                <span>{isSubmitting ? 'Mendaftarkan Akun...' : 'Daftar Akun Guru & Langsung Masuk'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

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
            Guru dapat berpindah antar mapel yang diajarnya kapan saja langsung dari header navbar atau menu profil.
          </span>
        </div>
      </div>
    </div>
  );
};
