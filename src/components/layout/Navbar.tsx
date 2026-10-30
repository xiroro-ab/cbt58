'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { ExamNotification, ExamMessage, Teacher } from '@/types/cbt';
import { initialTeachers } from '@/lib/rosterTeachers';
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
  ShieldCheck
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
  onLogoutTeacher?: () => void;
  onSwitchTeacher?: (teacher: Teacher) => void;
}

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
  onLogoutTeacher,
  onSwitchTeacher
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

  // 30 Guru Roster Data SMPN 58 Palembang
  const teachersList = [
    { name: 'Ahmad Fauzi, S.Pd', subject: 'Ilmu Pengetahuan Alam (IPA)', status: 'Aktif Mengawas' },
    { name: 'Siti Rahmawati, M.Pd', subject: 'Matematika', status: 'Aktif Mengawas' },
    { name: 'Budi Santoso, S.Kom', subject: 'Informatika & TIK', status: 'Standby' },
    { name: 'Dra. Endang Susanti', subject: 'Bahasa Indonesia', status: 'Aktif Mengawas' },
    { name: 'Muhammad Rizki, S.Pd', subject: 'Bahasa Inggris', status: 'Standby' },
    { name: 'Hj. Nuraini, M.Pd', subject: 'Pendidikan Agama Islam', status: 'Standby' },
    { name: 'Hendra Wijaya, S.Pd', subject: 'Ilmu Pengetahuan Sosial (IPS)', status: 'Aktif Mengawas' },
    { name: 'Dewi Lestari, S.Pd', subject: 'Pendidikan Pancasila (PPKn)', status: 'Standby' }
  ];

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-4 flex items-center justify-between transition-colors">
      {/* 1. GREETING & DATE */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
          {t.greeting}
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">
          {t.examDateInfo}
        </p>
      </div>

      {/* 2. ACTIONS & USER BAR */}
      <div className="flex items-center gap-2.5">
        {/* Toggle Language ID / EN */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-violet-600 transition shadow-xs"
          title={t.switchLanguage}
        >
          <Languages className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          <span>{language === 'id' ? 'ID 🇮🇩' : 'EN 🇬🇧'}</span>
        </button>

        {/* Toggle Dark / Light Mode Button */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition shadow-xs"
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
                            <span className="text-[10px] text-slate-400">({rep.studentClass || 'Siswa'})</span>
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
            className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
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
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Notifikasi Aktivitas Realtime</span>
                      {unreadNotifCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-violet-600 text-white text-[10px] font-bold">
                          {unreadNotifCount} baru
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-400">Pembaruan otomatis dari database Supabase</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={onMarkAllNotificationsRead}
                      className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                    >
                      Tandai Dibaca
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={onClearAllNotifications}
                      className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                      title="Hapus seluruh riwayat notifikasi di layar & database"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Notifikasi */}
              <div className="flex gap-1.5 text-[11px] font-semibold">
                <button
                  onClick={() => setNotifFilter('all')}
                  className={`px-3 py-1 rounded-lg transition ${
                    notifFilter === 'all'
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Semua ({notifications.length})
                </button>
                <button
                  onClick={() => setNotifFilter('violation')}
                  className={`px-3 py-1 rounded-lg transition ${
                    notifFilter === 'violation'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Anti-Cheat ({notifications.filter(n => n.type === 'violation' || n.type === 'autolock').length})
                </button>
                <button
                  onClick={() => setNotifFilter('submission')}
                  className={`px-3 py-1 rounded-lg transition ${
                    notifFilter === 'submission'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
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
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Hapus notifikasi ini dari layar & database"
                          >
                            <Trash2 className="w-3 h-3" />
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

        {/* Profile Guru Aktif atau Avatar Stack 30 Guru */}
        {currentTeacher ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <div
                className={`w-7 h-7 rounded-lg ${
                  currentTeacher.avatarColor || 'bg-violet-600'
                } text-white font-bold text-xs flex items-center justify-center shadow-xs`}
              >
                {currentTeacher.name.charAt(0)}
              </div>
              <div className="text-left text-xs leading-tight">
                <p className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                  {currentTeacher.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                  {currentTeacher.subject}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 space-y-2 z-50 animate-in fade-in zoom-in-95 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{currentTeacher.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                      {currentTeacher.role === 'admin'
                        ? 'Admin'
                        : currentTeacher.role === 'pengawas'
                        ? 'Pengawas'
                        : 'Guru'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">NIP: {currentTeacher.nip}</p>
                  <p className="text-[10px] text-slate-400">{currentTeacher.email}</p>
                </div>

                <button
                  onClick={() => {
                    setShowTeachersModal(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer"
                >
                  <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span>Daftar 30 Guru & Status</span>
                </button>

                {onLogoutTeacher && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogoutTeacher();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition cursor-pointer border-t border-slate-100 dark:border-slate-800 pt-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Ganti Akun / Logout</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowTeachersModal(true)}
            className="hidden md:flex items-center -space-x-2 pl-2 hover:opacity-90 transition cursor-pointer"
            title="Klik untuk melihat daftar 30 Guru & Pengawas Aktif"
          >
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">
              A
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">
              B
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center">
              30+
            </div>
          </button>
        )}

        {/* Modal 30 Guru & Pengawas */}
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
                      Daftar 30 Guru & Pengawas CBT
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

              <div className="space-y-2 text-xs">
                {teachers.map((tea) => (
                  <div
                    key={tea.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full ${
                          tea.avatarColor || 'bg-violet-600'
                        } text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0`}
                      >
                        {tea.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{tea.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {tea.subject} • NIP: {tea.nip}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tea.status?.includes('Mengawas')
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {tea.status || 'Standby'}
                      </span>

                      {onSwitchTeacher && currentTeacher?.id !== tea.id && (
                        <button
                          onClick={() => {
                            onSwitchTeacher(tea);
                            setShowTeachersModal(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-600 hover:text-white text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-[10px] font-semibold transition cursor-pointer"
                        >
                          Pilih
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl border border-violet-200/60 dark:border-violet-800/40 text-[11px] text-violet-700 dark:text-violet-300">
                Arsitektur Multi-Guru: Seluruh 30 guru dapat mengawasi dan mengelola ujian masing-masing kelas secara simultan tanpa konflik.
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

        {/* Tombol Aksi Cepat */}
        <div className="flex items-center gap-2 pl-2">
          <button
            onClick={onOpenAddQuestion}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t.addQuestionBtn}</span>
          </button>

          <button
            onClick={onStartStudentExam}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition shadow-md shadow-violet-600/20"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t.studentViewBtn}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
