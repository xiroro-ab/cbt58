'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
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
  Clock
} from 'lucide-react';

interface NavbarProps {
  onStartStudentExam: () => void;
  onOpenAddQuestion: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onStartStudentExam, onOpenAddQuestion }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  // Dropdown States
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showTeachersModal, setShowTeachersModal] = useState(false);

  // Live Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'Ujian IPA Selesai',
      desc: 'Siswa Ahmad Fauzan telah mengirimkan jawaban ujian dengan skor 87%.',
      time: 'Baru saja',
      type: 'success',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Database Supabase Terhubung',
      desc: 'Koneksi cloud PostgreSQL lxglsphqrpnrzfnvpwoa aktif & sinkron.',
      time: '5 menit lalu',
      type: 'info',
      read: false
    },
    {
      id: 'notif-3',
      title: 'Peringatan Anti-Cheat',
      desc: 'Terdeteksi siswa berpindah tab browser sebanyak 1x saat ujian.',
      time: '12 menit lalu',
      type: 'warning',
      read: false
    }
  ]);

  // Live Messages State
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'Wakil Kurikulum',
      title: 'Jadwal Asesmen Akhir Semester',
      body: 'Harap pastikan semua guru telah mengunggah bank soal dan memverifikasi token sebelum ujian dimulai.',
      date: 'Hari ini, 07:30'
    },
    {
      id: 'msg-2',
      sender: 'Admin CBT',
      title: 'Server Supabase Stabil',
      body: 'Kapasitas database telah diuji untuk 30 guru dan 1000 siswa aktif.',
      date: 'Kemarin, 14:00'
    }
  ]);

  const [newMessageText, setNewMessageText] = useState('');

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;
    setMessages(prev => [
      {
        id: `msg-${Date.now()}`,
        sender: 'Pak Guru (Anda)',
        title: 'Pesan / Catatan Baru',
        body: newMessageText.trim(),
        date: 'Baru saja'
      },
      ...prev
    ]);
    setNewMessageText('');
  };

  // 30 Guru Roster Data
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

        {/* Mail Notification (Messages Drawer) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowMessages(!showMessages);
              setShowNotifications(false);
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition hidden sm:flex relative"
            title={t.messagesTitle}
          >
            <Mail className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2"></span>
          </button>

          {/* Messages Popover */}
          {showMessages && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-violet-600" />
                  <span>{t.messagesTitle}</span>
                </h4>
                <button
                  onClick={() => setShowMessages(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2.5 text-xs">
                {messages.map(m => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-violet-600 dark:text-violet-400">{m.sender}</span>
                      <span className="text-[10px] text-slate-400">{m.date}</span>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{m.title}</p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">{m.body}</p>
                  </div>
                ))}
              </div>

              {/* Kirim Pesan Cepat */}
              <form onSubmit={handleSendMessage} className="pt-2 flex gap-1.5 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={e => setNewMessageText(e.target.value)}
                  placeholder="Kirim catatan guru / pengawas..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Bell Notification (Interactive Notifications Popover) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowMessages(false);
            }}
            className="relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
            title={t.notificationsTitle}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-violet-600 absolute top-2 right-2 animate-ping"></span>
            )}
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-violet-600 absolute top-2 right-2"></span>
            )}
          </button>

          {/* Notifications Popover */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-violet-600" />
                  <span>{t.notificationsTitle}</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 text-[10px] font-bold">
                      {unreadCount} baru
                    </span>
                  )}
                </h4>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-violet-600 hover:underline"
                  >
                    {t.markAllRead}
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                {notifications.length === 0 ? (
                  <p className="text-center text-slate-400 py-4">{t.noNotifications}</p>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border transition ${
                        n.read
                          ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 text-slate-500'
                          : 'bg-violet-50/40 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="flex items-center gap-1.5">
                          {n.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                          {n.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          {n.type === 'info' && <Clock className="w-3.5 h-3.5 text-violet-500" />}
                          <span>{n.title}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">{n.time}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">{n.desc}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Stack (Clickable to view active 30 teachers) */}
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
                      {t.teachersRosterTitle}
                    </h3>
                    <p className="text-xs text-slate-400">Total 30 Akun Guru Terkoneksi ke Supabase</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTeachersModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {teachersList.map((tea, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-violet-600 text-white font-bold text-[11px] flex items-center justify-center">
                        {tea.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{tea.name}</p>
                        <p className="text-[11px] text-slate-400">{tea.subject}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      tea.status.includes('Mengawas')
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {tea.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl border border-violet-200/60 dark:border-violet-800/40 text-[11px] text-violet-700 dark:text-violet-300">
                Semua guru dapat mengelola ujian masing-masing kelas secara simultan menggunakan Supabase Cloud.
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowTeachersModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
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
