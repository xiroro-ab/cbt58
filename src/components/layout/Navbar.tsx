'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { ExamNotification, ExamMessage, Teacher, Subject } from '@/types/cbt';
import { initialTeachers } from '@/lib/rosterTeachers';
import { resolveStudentSingleClass } from '@/lib/rosterStudents';
import {
  Sun,
  Moon,
  Bell,
  Mail,
  PlusCircle,
  Eye,
  Languages,
  CheckCircle2,
  AlertTriangle,
  Send,
  Users,
  X,
  Clock,
  ShieldAlert,
  LifeBuoy,
  Megaphone,
  Check,
  Trash2,
  LogOut,
  ChevronDown,
  UserCheck,
  ShieldCheck,
  Layers,
  Menu
} from 'lucide-react';

interface NavbarProps {
  onStartStudentExam: () => void;
  onOpenAddQuestion: () => void;
  notifications: ExamNotification[];
  messages: ExamMessage[];
  onMarkAllNotificationsRead: () => void;
  onMarkNotificationRead?: (notifId: string) => void;
  onDeleteNotification: (notifId: string) => void;
  onClearAllNotifications: () => void;
  onResolveMessage: (msgId: string) => void;
  onDeleteMessage: (msgId: string) => void;
  onClearAllMessages: () => void;
  onSendBroadcast: (broadcastText: string) => void;
  currentTeacher?: Teacher | null;
  teachers?: Teacher[];
  allSubjects?: Subject[];
  activeAssignmentSubject?: string;
  onSelectAssignment?: (subjectName: string) => void;
  onLogoutTeacher?: () => void;
  onSwitchTeacher?: (teacher: Teacher) => void;
  onToggleMobileSidebar?: () => void;
}

// Icon Bendera Vektor SVG Murni (100% Tajam di Seluruh Perangkat: PC, Laptop Windows, Mac, Android & iOS)
const IndonesiaFlagIcon = ({ className = 'w-4 h-3' }: { className?: string }) => (
  <svg className={`${className} rounded-2xs shadow-2xs inline-block shrink-0 border border-slate-300 dark:border-slate-600 overflow-hidden`} viewBox="0 0 3 2">
    <rect width="3" height="1" fill="#e11d48" />
    <rect y="1" width="3" height="1" fill="#ffffff" />
  </svg>
);

const UKFlagIcon = ({ className = 'w-4 h-3' }: { className?: string }) => (
  <svg className={`${className} rounded-2xs shadow-2xs inline-block shrink-0 border border-slate-300 dark:border-slate-600 overflow-hidden`} viewBox="0 0 60 30">
    <clipPath id="uk-flag-clip">
      <path d="M0,0 v30 h60 v-30 z"/>
    </clipPath>
    <g clipPath="url(#uk-flag-clip)">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6"/>
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10"/>
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  onStartStudentExam,
  onOpenAddQuestion,
  notifications,
  messages,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onDeleteNotification,
  onClearAllNotifications,
  onResolveMessage,
  onDeleteMessage,
  onClearAllMessages,
  onSendBroadcast,
  currentTeacher,
  teachers = initialTeachers,
  allSubjects,
  activeAssignmentSubject,
  onSelectAssignment,
  onLogoutTeacher,
  onSwitchTeacher,
  onToggleMobileSidebar
}) => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  // Dropdown States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showTeachersModal, setShowTeachersModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Filter Tab Notifikasi
  const [notifFilter, setNotifFilter] = useState<'all' | 'violation' | 'submission'>('all');

  // Tab Pesan (Opsi A: Laporan Kendala Siswa vs Kirim Broadcast)
  const [messageTab, setMessageTab] = useState<'reports' | 'broadcast'>('reports');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [broadcastSentStatus, setBroadcastSentStatus] = useState(false);

  // Unread Count
  const unreadNotifCount = notifications.filter(n => !n.isRead).length;
  const pendingKendalaCount = messages.filter(
    m => m.status === 'pending' && m.targetType === 'proctor'
  ).length;

  // Filtered Notifikasi
  const filteredNotifications = notifications.filter(n => {
    if (notifFilter === 'violation') return n.type === 'violation' || n.type === 'autolock';
    if (notifFilter === 'submission') return n.type === 'submission';
    return true;
  });

  const studentReports = messages.filter(m => m.targetType === 'proctor');

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;
    onSendBroadcast(broadcastInput.trim());
    setBroadcastInput('');
    setBroadcastSentStatus(true);
    setTimeout(() => setBroadcastSentStatus(false), 2500);
  };

  const realTeachers = (teachers || []).filter(
    tea => tea.id !== '__cbt_school_settings__' && !tea.id?.match(/^tea-\d{2}$/)
  );

  const getTeacherPhoto = (tea: Teacher) => {
    return tea.photoUrl || tea.avatar || (typeof window !== 'undefined' ? localStorage.getItem(`cbt_teacher_${tea.id}_photo`) : null);
  };

  const displayStackTeachers = React.useMemo(() => {
    const list: Teacher[] = [];
    if (currentTeacher) {
      list.push(currentTeacher);
    }
    realTeachers.forEach(t => {
      if (!list.some(existing => existing.id === t.id || existing.nip === t.nip)) {
        list.push(t);
      }
    });
    return list;
  }, [currentTeacher, realTeachers]);

  const maxVisibleAvatars = 3;
  const visibleTeachers = displayStackTeachers.slice(0, maxVisibleAvatars);
  const overflowTeacherCount = displayStackTeachers.length - maxVisibleAvatars;

  const [displayDate, setDisplayDate] = useState<string>('');

  React.useEffect(() => {
    try {
      setDisplayDate(new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }));
    } catch {
      setDisplayDate('');
    }
  }, [language]);

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between transition-colors gap-2 print:hidden">
      {/* 1. HAMBURGER (MOBILE) + GREETING & DATE (DESKTOP) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-violet-600 transition shrink-0 cursor-pointer"
            title="Buka Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Badge Brand Elegan di Layar HP agar Tidak Kosong tapi Tetap Luas */}
        <span className="sm:hidden font-extrabold text-[11px] text-violet-700 dark:text-violet-300 bg-violet-100/70 dark:bg-violet-950/60 px-2 py-1 rounded-lg border border-violet-200/60 dark:border-violet-800/60 font-sans shrink-0">
          CBT 58
        </span>

        {/* Sapaan & Tanggal Dinamis Realtime (Hanya Tampil di Layar SM ke Atas agar di HP Tidak Padat) */}
        <div className="min-w-0 hidden sm:block">
          <h2
            className="text-sm md:text-xl font-bold text-slate-900 dark:text-white leading-tight truncate max-w-xs md:max-w-md"
            title={currentTeacher ? `Selamat Datang, ${currentTeacher.name}` : t.greeting}
          >
            {currentTeacher ? `Selamat Datang, ${currentTeacher.name}` : t.greeting}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate max-w-xs md:max-w-md">
            {displayDate} • SMP Negeri 58 Palembang
          </p>
        </div>
      </div>

      {/* 2. ACTIONS & USER BAR */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Toggle Language ID / EN */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-violet-600 hover:border-violet-500 transition shadow-xs cursor-pointer shrink-0"
          title={t.switchLanguage}
        >
          <Languages className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
          {/* Khusus di HP / Tablet: Tampilkan emoji bendera bawaan OS */}
          <span className="inline md:hidden text-xs">{language === 'id' ? 'ID 🇮🇩' : 'EN 🇬🇧'}</span>
          {/* Khusus di PC / Laptop: Tampilkan icon bendera SVG murni karena Windows tidak support emoji bendera */}
          <span className="hidden md:inline-flex items-center gap-1.5">
            {language === 'id' ? <IndonesiaFlagIcon /> : <UKFlagIcon />}
            <span>{language === 'id' ? 'ID' : 'EN'}</span>
          </span>
        </button>

        {/* Toggle Dark / Light Mode Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition shadow-xs shrink-0"
          title={theme === 'dark' ? t.switchThemeLight : t.switchThemeDark}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* ============================================================== */}
        {/* IKON PESAN (AMPLOP ✉️) — OPSI A: KENDALA SISWA & BROADCAST      */}
        {/* ============================================================== */}
        <div className="relative">
          <button
            onClick={() => {
              setShowMessages(!showMessages);
              setShowNotifications(false);
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition hidden sm:flex relative cursor-pointer"
            title="Pusat Kendala Siswa & Broadcast Pengawas"
          >
            <Mail className="w-4 h-4" />
            {pendingKendalaCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-slate-900"></span>
            )}
          </button>

          {/* Popover Pesan Kendala & Broadcast */}
          {showMessages && (
            <div className="absolute right-0 mt-2 w-80 sm:w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 space-y-4 z-50 animate-in fade-in zoom-in-95">
              {/* Header Popover */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <LifeBuoy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      Pusat Kendala & Siaran Pengawas
                    </h4>
                    <p className="text-[10px] text-slate-400">Komunikasi real-time pengawas dan peserta ujian</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {studentReports.length > 0 && (
                    <button
                      onClick={onClearAllMessages}
                      className="text-[10px] text-rose-500 hover:underline font-semibold"
                      title="Hapus semua pesan kendala di layar & database"
                    >
                      Hapus Semua
                    </button>
                  )}
                  <button
                    onClick={() => setShowMessages(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs Switcher: Laporan Siswa vs Kirim Broadcast */}
              <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setMessageTab('reports')}
                  className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    messageTab === 'reports'
                      ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>Kendala Siswa</span>
                  {pendingKendalaCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                      {pendingKendalaCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setMessageTab('broadcast')}
                  className={`flex-1 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    messageTab === 'broadcast'
                      ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Kirim Broadcast</span>
                </button>
              </div>

              {/* CONTENT TAB 1: KENDALA SISWA */}
              {messageTab === 'reports' && (
                <div className="max-h-72 overflow-y-auto space-y-2.5 text-xs">
                  {studentReports.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                      <p className="font-semibold text-xs">Tidak Ada Kendala Siswa</p>
                      <p className="text-[11px]">Seluruh siswa mengerjakan ujian tanpa laporan gangguan.</p>
                    </div>
                  ) : (
                    studentReports.map(rep => (
                      <div
                        key={rep.id}
                        className={`p-3.5 rounded-2xl border transition space-y-1.5 ${
                          rep.status === 'resolved'
                            ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 opacity-70'
                            : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                            <span className="text-violet-600 dark:text-violet-400">{rep.senderName}</span>
                            <span className="text-[10px] text-slate-400">({resolveStudentSingleClass(rep.senderName, rep.studentClass)})</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{rep.createdAt}</span>
                        </div>

                        <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                          {rep.questionNumber ? `Soal No. ${rep.questionNumber} • ` : ''}{rep.title}
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {rep.body}
                        </p>

                        <div className="pt-1.5 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rep.status === 'resolved'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}>
                            {rep.status === 'resolved' ? '✓ Terselesaikan' : '⏳ Menunggu Tindakan'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {rep.status !== 'resolved' && (
                              <button
                                onClick={() => onResolveMessage(rep.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Tandai Selesai</span>
                              </button>
                            )}

                            {/* Tombol Hapus Pesan Tunggal */}
                            <button
                              onClick={() => onDeleteMessage(rep.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Hapus pesan kendala ini dari layar & database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* CONTENT TAB 2: KIRIM BROADCAST PENGUMUMAN KE SELURUH SISWA */}
              {messageTab === 'broadcast' && (
                <form onSubmit={handleBroadcastSubmit} className="space-y-3 text-xs">
                  <div className="p-3 bg-violet-50 dark:bg-violet-950/40 rounded-2xl border border-violet-200 dark:border-violet-800/60 text-[11px] text-violet-800 dark:text-violet-300 leading-relaxed">
                    Pesan siaran yang Anda kirimkan akan <strong>langsung muncul di seluruh layar siswa</strong> yang sedang mengerjakan ujian secara real-time.
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Isi Pesan Siaran / Pengumuman
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={broadcastInput}
                      onChange={e => setBroadcastInput(e.target.value)}
                      placeholder="Contoh: Perhatian, waktu ujian tersisa 10 menit lagi. Harap periksa kembali nomor yang ragu-ragu..."
                      className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {broadcastSentStatus && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-center font-bold text-[11px]">
                      ✓ Pengumuman berhasil disiarkan ke seluruh layar siswa!
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition flex items-center gap-1.5"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Kirim Siaran ke Siswa</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* IKON NOTIFIKASI (LONCENG 🔔) — EVENT OTOMATIS SUPABASE          */}
        {/* ============================================================== */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowMessages(false);
            }}
            className="relative p-1.5 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shrink-0"
            title="Notifikasi Real-time Sistem CBT"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600 absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
            )}
          </button>

          {/* Notifikasi Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-[420px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 space-y-3.5 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold flex-shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                      Notifikasi Aktivitas
                    </h4>
                    {unreadNotifCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-extrabold whitespace-nowrap shadow-xs">
                        {unreadNotifCount} Baru
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={onMarkAllNotificationsRead}
                      className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                    >
                      Tandai Dibaca
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={onClearAllNotifications}
                      className="text-[11px] font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
                      title="Hapus seluruh riwayat notifikasi"
                    >
                      Hapus Semua
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Tutup Notifikasi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Notifikasi */}
              <div className="flex gap-1.5 text-[11px] font-bold">
                <button
                  onClick={() => setNotifFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    notifFilter === 'all'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Semua ({notifications.length})
                </button>
                <button
                  onClick={() => setNotifFilter('violation')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    notifFilter === 'violation'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Anti-Cheat ({notifications.filter(n => n.type === 'violation' || n.type === 'autolock').length})
                </button>
                <button
                  onClick={() => setNotifFilter('submission')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    notifFilter === 'submission'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Nilai Masuk ({notifications.filter(n => n.type === 'submission').length})
                </button>
              </div>

              {/* Daftar Notifikasi Riil */}
              <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
                {filteredNotifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                    <p className="font-semibold text-xs">Tidak Ada Notifikasi Baru</p>
                    <p className="text-[11px]">Aktivitas siswa akan muncul di sini secara real-time.</p>
                  </div>
                ) : (
                  filteredNotifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.isRead && onMarkNotificationRead) {
                          onMarkNotificationRead(n.id);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition space-y-1 cursor-pointer ${
                        n.isRead
                          ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 text-slate-500'
                          : 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/40 shadow-xs hover:border-violet-400'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                        <span className="flex items-center gap-1.5 text-xs">
                          {n.type === 'submission' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          {n.type === 'violation' && <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />}
                          {n.type === 'autolock' && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                          {n.type === 'system' && <Clock className="w-3.5 h-3.5 text-violet-500" />}
                          <span>{n.title}</span>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 inline-block"></span>
                          )}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-normal">{n.createdAt}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNotification(n.id);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Hapus notifikasi ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profil Akun Guru / Pengawas yang Sedang Login & Avatar Stack Guru Terdaftar */}
        <button
          onClick={() => setShowTeachersModal(true)}
          className="flex items-center gap-1 sm:gap-1.5 p-0.5 sm:p-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          title="Profil Pengguna & Direktori Akun Guru Terdaftar"
        >
          {/* Avatar Stack: Maksimal 3 Lingkaran Saling Timpa Ujungnya + Indikator Sisanya */}
          <div className="flex items-center -space-x-2 sm:-space-x-2.5 overflow-hidden p-0.5">
            {visibleTeachers.map((tea) => {
              const isCurrent = tea.id === currentTeacher?.id;
              const photo = getTeacherPhoto(tea);

              return (
                <div
                  key={tea.id}
                  className={`relative inline-block w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ${
                    isCurrent
                      ? 'ring-emerald-500 z-10'
                      : 'ring-white dark:ring-slate-900 z-0'
                  } shadow-xs shrink-0 overflow-hidden ${tea.avatarColor || 'bg-violet-600'}`}
                  title={`${tea.name} (${tea.role === 'admin' ? 'Superadmin' : tea.subject || 'Guru'}) ${isCurrent ? '• Sedang Aktif' : ''}`}
                >
                  {photo ? (
                    <img src={photo} alt={tea.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-white font-bold text-xs uppercase">
                      {tea.name.charAt(0)}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
                  )}
                </div>
              );
            })}

            {overflowTeacherCount > 0 && (
              <div
                className="relative z-10 inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900 text-[9px] sm:text-[10px] font-black text-slate-700 dark:text-slate-200 shadow-xs shrink-0"
                title={`${overflowTeacherCount} guru lainnya terdaftar`}
              >
                +{overflowTeacherCount}
              </div>
            )}
          </div>

          <div className="hidden lg:flex flex-col text-left pl-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
              {currentTeacher?.name || 'Dewan Guru'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold truncate">
              {currentTeacher?.role === 'admin'
                ? 'Superadmin'
                : currentTeacher?.role === 'pengawas'
                ? 'Pengawas'
                : currentTeacher ? 'Guru Mapel' : `${realTeachers.length} Guru`}
            </span>
          </div>
        </button>

        {/* Modal Profil Pengguna & Direktori Guru */}
        {showTeachersModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Profil Pengguna & Sesi CBT
                    </h3>
                    <p className="text-xs text-slate-400">SMPN 58 Palembang • Terhubung ke Supabase Cloud</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTeachersModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Akun Aktif & Tombol Logout / Ganti Akun */}
              {currentTeacher && (
                <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800/60 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl ${
                        currentTeacher.avatarColor || 'bg-violet-600'
                      } text-white font-bold text-sm flex items-center justify-center shadow-xs flex-shrink-0 overflow-hidden`}
                    >
                      {getTeacherPhoto(currentTeacher) ? (
                        <img src={getTeacherPhoto(currentTeacher)!} alt={currentTeacher.name} className="w-full h-full object-cover" />
                      ) : (
                        currentTeacher.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{currentTeacher.name}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-200 dark:bg-violet-900 text-violet-800 dark:text-violet-200">
                          {currentTeacher.role === 'admin'
                            ? 'Superadmin'
                            : currentTeacher.role === 'pengawas'
                            ? 'Pengawas'
                            : 'Guru Mapel'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        NIP: {currentTeacher.nip} • {currentTeacher.subject}
                      </p>
                    </div>
                  </div>

                  {onLogoutTeacher && (
                    <button
                      onClick={() => {
                        setShowTeachersModal(false);
                        onLogoutTeacher();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer flex-shrink-0 shadow-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Ganti Akun</span>
                    </button>
                  )}
                </div>
              )}

              {/* Petunjuk Autentikasi Resmi */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300">
                🔒 <strong>Keamanan Akun:</strong> Untuk berganti peran sebagai <strong>Pengawas</strong> atau guru lainnya, silakan klik tombol <strong>"Ganti Akun"</strong> di atas, lalu masuk menggunakan NIP dan PIN resmi akun tersebut.
              </div>

              {/* Direktori Informasi Guru & Pengawas */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Direktori Dewan Guru & Pengawas ({realTeachers.length})
                </span>
                <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                  {realTeachers.map((tea) => {
                    const teaPhoto = getTeacherPhoto(tea);
                    return (
                      <div
                        key={tea.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full ${
                              tea.avatarColor || 'bg-violet-600'
                            } text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700`}
                          >
                            {teaPhoto ? (
                              <img src={teaPhoto} alt={tea.name} className="w-full h-full object-cover" />
                            ) : (
                              tea.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 dark:text-white">{tea.name}</p>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {tea.role === 'admin'
                                  ? 'Superadmin'
                                  : tea.role === 'pengawas'
                                  ? 'Pengawas'
                                  : 'Guru'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {tea.subject} • NIP: {tea.nip}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            tea.id === currentTeacher?.id
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold'
                              : tea.status?.includes('Mengawas')
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {tea.id === currentTeacher?.id ? '● Sedang Aktif' : (tea.status || 'Offline')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowTeachersModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tombol Aksi Cepat: Masuk Mode Ujian Siswa */}
        <div className="flex items-center gap-1.5 pl-1 sm:pl-2 shrink-0">
          <button
            onClick={onStartStudentExam}
            className="flex items-center gap-1.5 p-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition shadow-md shadow-violet-600/20 cursor-pointer shrink-0"
            title={t.studentViewBtn}
          >
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t.studentViewBtn}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
