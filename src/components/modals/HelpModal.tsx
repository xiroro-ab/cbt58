'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  HelpCircle,
  X,
  BookOpen,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Database,
  KeyRound,
  FileText,
  ChevronRight,
  ChevronDown,
  Search,
  School,
  UserCheck,
  AlertTriangle,
  Award,
  Printer,
  Sparkles,
  Copy,
  Check,
  Clock,
  Layers,
  Laptop,
  Flame,
  LifeBuoy,
  Cpu,
  RotateCcw,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpCategory =
  | 'student'
  | 'proctor'
  | 'questions'
  | 'scoring'
  | 'documents'
  | 'anticheat'
  | 'faq'
  | 'cloud';

interface CategoryMeta {
  id: HelpCategory;
  title: string;
  titleEn: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  color: string;
  description: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<HelpCategory>('student');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const categories: CategoryMeta[] = useMemo(
    () => [
      {
        id: 'student',
        title: 'Alur Ujian Siswa',
        titleEn: 'Student Exam Flow',
        icon: UserCheck,
        badge: '6 Langkah',
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        description: 'Panduan lengkap siswa mulai dari memilih kelas, memasukkan token, hingga kirim jawaban.'
      },
      {
        id: 'proctor',
        title: 'Pengawas & Proktor',
        titleEn: 'Proctor & Supervisor',
        icon: Laptop,
        badge: 'Operasional',
        color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
        description: 'Pengelolaan token, live monitoring siswa, broadcast pesan darurat, dan reset login.'
      },
      {
        id: 'questions',
        title: 'Bank Soal & Tipe Soal',
        titleEn: 'Question Bank & Formats',
        icon: BookOpen,
        badge: '5 Format + AI',
        color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        description: 'Penjelasan PG, PG Kompleks, Benar/Salah stimulus, Isian, Esai, serta Generator AI Gemini.'
      },
      {
        id: 'scoring',
        title: 'Sistem Bobot & Nilai',
        titleEn: 'Scoring & Weights',
        icon: Sliders,
        badge: 'Skala 0-100',
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        description: 'Rumus penilaian proporsional, pembobotan poin otomatis, dan pemenuhan KKM 75.'
      },
      {
        id: 'documents',
        title: 'Dokumen & TTE Resmi',
        titleEn: 'Official Docs & E-Sign',
        icon: FileText,
        badge: 'BAP & Leger',
        color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
        description: 'Cetak Berita Acara (BAP), Daftar Hadir, Kartu Peserta, Leger, dan opsi TTE vs Manual.'
      },
      {
        id: 'anticheat',
        title: 'Keamanan Anti-Cheat',
        titleEn: 'Anti-Cheat Security',
        icon: ShieldCheck,
        badge: '3-Strike Guard',
        color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
        description: 'Deteksi pindah tab, perangkap tombol back HP 20x, kunci otomatis, dan anti-copy.'
      },
      {
        id: 'faq',
        title: 'Kendala & Solusi (FAQ)',
        titleEn: 'Troubleshooting & FAQ',
        icon: LifeBuoy,
        badge: 'Tanya Jawab',
        color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
        description: 'Solusi jika baterai habis, siswa terkunci, WiFi terputus, atau salah password.'
      },
      {
        id: 'cloud',
        title: 'Database & Supabase',
        titleEn: 'Cloud & Database',
        icon: Database,
        badge: 'Realtime Cloud',
        color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
        description: 'Integrasi cloud PostgreSQL Supabase, sinkronisasi realtime, dan fail-safe offline.'
      }
    ],
    []
  );

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const faqs = useMemo(
    () => [
      {
        q: 'Siswa tidak sengaja menekan tombol Home atau HP mati kehabisan baterai, apakah jawaban hilang?',
        a: 'TIDAK HILANG. Seluruh jawaban tersimpan otomatis di penyimpanan lokal perangkat dan disinkronkan ke Supabase Cloud setiap kali siswa mengklik jawaban. Siswa cukup menyalakan kembali HP atau meminjam HP lain, memilih kelas & nama yang sama, lalu memasukkan token ujian. Ujian akan langsung melanjutkan sisa waktu dan nomor soal terakhir.',
        category: 'siswa'
      },
      {
        q: 'Muncul notifikasi "Layar Terkunci / Melebihi Batas 3x Pelanggaran", apa yang harus dilakukan?',
        a: 'Siswa harus melapor kepada Pengawas Ruang. Pengawas membuka menu "Live Monitoring" di laptop pengawas, mencari nama siswa pada tabel, lalu mengklik tombol "Buka Kunci". Setelah itu, layar merah terkunci pada HP siswa seketika terbuka dan siswa dapat melanjutkan ujian dengan tertib.',
        category: 'pengawas'
      },
      {
        q: 'Kapan Pengawas Ruang mencetak Berita Acara (BAP) dan Daftar Hadir Peserta?',
        a: 'Pengawas dapat mencetak Daftar Hadir sebelum ujian dimulai untuk diedarkan saat siswa tanda tangan presensi di ruang ujian. Pada tab Dokumen Ujian, Pengawas dapat memilih mode "Tanda Tangan Manual" sehingga nama guru dikosongkan dan kolom tanda tangan siap ditandatangani pena basah di atas kertas fisik.',
        category: 'dokumen'
      },
      {
        q: 'Apakah token ujian harus diganti setiap hari atau setiap sesi?',
        a: 'Ya, disarankan untuk mengganti token saat berganti mata pelajaran atau sesi ujian baru guna mencegah kebocoran soal. Pengawas dapat mengubah token kapan saja di tab Jadwal Ujian. Siswa yang sudah berada di dalam ruang ujian tidak akan terganggu oleh pergantian token.',
        category: 'pengawas'
      },
      {
        q: 'Koneksi internet / WiFi ruangan sempat mati tiba-tiba, apakah siswa harus mengulang?',
        a: 'Tidak perlu mengulang. Sistem CBT dilengkapi fail-safe offline buffer. Selama tab ujian tidak ditutup, siswa tetap dapat mengerjakan soal. Begitu koneksi internet tersambung kembali, akumulasi jawaban akan otomatis terkirim serentak ke server pusat.',
        category: 'sistem'
      },
      {
        q: 'Bagaimana cara mengoreksi dan memasukkan nilai untuk soal tipe Esai / Uraian?',
        a: 'Buka menu "Dossier Nilai" atau "Hasil Ujian", pilih mata pelajaran terkait, lalu klik tombol "Koreksi Jawaban Esai" pada baris siswa. Guru dapat membaca jawaban siswa, melihat rubrik panduan, dan memberikan poin dari 0 hingga poin maksimal yang ditentukan.',
        category: 'guru'
      }
    ],
    []
  );

  // Filter categories or content based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();

    return categories.filter(
      cat =>
        cat.title.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q) ||
        cat.titleEn.toLowerCase().includes(q)
    );
  }, [searchQuery, categories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl max-w-5xl w-full h-[92vh] max-h-[820px] flex flex-col shadow-2xl overflow-hidden font-sans transition-colors">
        
        {/* ================================================================= */}
        {/* HEADER MODAL: BRANDING, TITLE, SEARCH & CLOSE BUTTON              */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/25 shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
                  {language === 'id' ? 'Pusat Panduan & Bantuan Resmi CBT' : 'Official CBT Help & Documentation'}
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  SMPN 58
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'id'
                  ? 'Panduan operasional lengkap untuk Siswa, Pengawas Ruang, Proktor CBT, dan Guru Pengampu'
                  : 'Complete operational documentation for Students, Proctors, and Teachers'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'id' ? 'Cari panduan, token, BAP...' : 'Search documentation...'}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Tombol Tutup Silang */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BODY WRAPPER: 2 COLUMNS (SIDEBAR NAV + CONTENT VIEWER)             */}
        {/* ================================================================= */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* SISI KIRI: DAFTAR KATEGORI PANDUAN */}
          <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-2 sm:p-3 overflow-x-auto md:overflow-y-auto shrink-0 flex md:flex-col gap-1.5">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveTab(cat.id);
                    setSearchQuery('');
                  }}
                  className={`w-full text-left p-2.5 sm:p-3 rounded-2xl transition flex items-center justify-between gap-2.5 group cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm truncate">
                        {language === 'id' ? cat.title : cat.titleEn}
                      </p>
                      <p
                        className={`text-[10px] truncate hidden sm:block ${
                          isActive ? 'text-violet-100 font-normal' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {cat.badge}
                      </p>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition hidden md:block ${
                      isActive ? 'text-white opacity-100 translate-x-0.5' : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* SISI KANAN: KONTEN DETAIL PANDUAN                                */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            
            {/* JIKA USER MELAKUKAN SEARCH QUERY */}
            {searchResults && searchResults.length > 0 && (
              <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 space-y-2">
                <p className="text-xs font-bold text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                  <span>Ditemukan {searchResults.length} topik panduan terkait &quot;{searchQuery}&quot;:</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {searchResults.map(sr => (
                    <button
                      key={sr.id}
                      onClick={() => {
                        setActiveTab(sr.id);
                        setSearchQuery('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-700 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-800/40 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <sr.icon className="w-3.5 h-3.5" />
                      <span>{sr.title}</span>
                      <ArrowRight className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 1: ALUR UJIAN SISWA                                       */}
            {/* ============================================================= */}
            {activeTab === 'student' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Panduan Siswa
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    Tata Cara Mengikuti Ujian CBT Dari Awal Hingga Selesai
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Ikuti 6 langkah mudah berikut agar proses pengerjaan lembar ujian berlangsung lancar tanpa kendala.
                  </p>
                </div>

                {/* 6 Step Interactive Flow */}
                <div className="grid grid-cols-1 gap-3.5">
                  {/* Step 1 */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                      01
                    </div>
                    <div className="space-y-1">
                      <strong className="block text-slate-900 dark:text-white text-xs sm:text-sm">
                        Langkah 1: Buka Portal Siswa & Pilih Rombel Kelas
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Klik tombol <strong>&quot;Masuk sebagai Siswa (Mulai Ujian)&quot;</strong> di halaman depan. Pilih rombel kelas Anda (contoh: Kelas VII.1, VIII.2, atau IX.3) pada menu dropdown yang tersedia.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                      02
                    </div>
                    <div className="space-y-1">
                      <strong className="block text-slate-900 dark:text-white text-xs sm:text-sm">
                        Langkah 2: Pilih Nama Lengkap Sesuai Roster Resmi
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Setelah kelas dipilih, dropdown nama siswa akan terbuka otomatis. Cari dan pilih nama lengkap Anda. Siswa tidak perlu mengetik nama secara manual untuk menghindari salah eja.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                      03
                    </div>
                    <div className="space-y-1">
                      <strong className="block text-slate-900 dark:text-white text-xs sm:text-sm">
                        Langkah 3: Masukkan Token Ujian Dari Pengawas
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Ketik 5-6 digit kode Token Ujian (contoh: <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-violet-600">IPA58</code>) yang diumumkan oleh Pengawas Ruang Ujian. Token otomatis dikonversi ke huruf kapital.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                      04
                    </div>
                    <div className="space-y-1">
                      <strong className="block text-slate-900 dark:text-white text-xs sm:text-sm">
                        Langkah 4: Konfirmasi Lembar Pakta Integritas & Masuk Fullscreen
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Periksa rincian ujian pada layar konfirmasi. Klik tombol hijau <strong>&quot;Saya Mengerti & Mulai Mengerjakan Ujian&quot;</strong>. Layar HP atau komputer Anda akan otomatis beralih ke mode Layar Penuh (Fullscreen Guard).
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                      05
                    </div>
                    <div className="space-y-1">
                      <strong className="block text-slate-900 dark:text-white text-xs sm:text-sm">
                        Langkah 5: Navigasi Soal, Palet Nomor & Tombol Ragu-ragu
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Gunakan tombol <strong>Sebelumnya</strong> dan <strong>Selanjutnya</strong> atau buka <strong>Daftar Soal</strong>:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-bold">
                          <Check className="w-3 h-3" /> Hijau: Terjawab
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold">
                          <HelpCircle className="w-3 h-3" /> Kuning: Ragu-ragu
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                          Abu-abu: Belum Terjawab
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                      06
                    </div>
                    <div className="space-y-1">
                      <strong className="block text-slate-900 dark:text-white text-xs sm:text-sm">
                        Langkah 6: Selesai Ujian & Submit Lembar Jawaban
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Pada butir soal terakhir, klik tombol merah <strong>&quot;Selesai Ujian&quot;</strong>. Konfirmasikan bahwa Anda telah memeriksa semua nomor. Jawaban Anda seketika dinilai oleh server dan nilai ujian langsung muncul di layar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Card Penting */}
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs">
                    <strong className="font-bold">Peringatan Kepatuhan Siswa:</strong>
                    <p>
                      Jangan menekan tombol Home, berpindah ke aplikasi lain (seperti WhatsApp / kalkulator), atau membuka tab baru. Sistem anti-cheat akan mencatat setiap detik pelanggaran dan mengunci lembar ujian Anda jika melampaui 3 kali peringatan!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 2: PENGAWAS & PROKTOR                                     */}
            {/* ============================================================= */}
            {activeTab === 'proctor' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    Panduan Pengawas & Proktor
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    Operasional Ruang Ujian & Live Monitoring Siswa
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Fitur kontrol penuh bagi Pengawas dan Teknisi CBT dalam mengelola jalannya sesi ujian di kelas.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card 1: Token Management */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      <KeyRound className="w-4 h-4 text-violet-600" />
                      <span>Rilis & Ganti Token Ujian</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Token ujian dapat dilihat dan diubah di tab <strong>Jadwal Ujian</strong> atau langsung pada pill token di header navbar. Guru dapat mengganti token kapan saja tanpa mengganggu siswa yang sudah masuk.
                    </p>
                  </div>

                  {/* Card 2: Live Proctoring */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      <Laptop className="w-4 h-4 text-violet-600" />
                      <span>Live Monitoring Realtime</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Pantau siswa yang sedang aktif, progres butir soal yang sudah terisi, sisa waktu hitung mundur, serta riwayat pelanggaran setiap detik secara langsung tanpa refresh halaman.
                    </p>
                  </div>

                  {/* Card 3: Broadcast Popup */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      <Flame className="w-4 h-4 text-violet-600" />
                      <span>Kirim Pesan Broadcast Darurat</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Kirimkan ralat soal atau instruksi penting (contoh: <em>&quot;Waktu tersisa 10 menit&quot;</em>) ke semua layar HP siswa secara serentak dalam bentuk popup interaktif.
                    </p>
                  </div>

                  {/* Card 4: Unlock & Reset */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      <RotateCcw className="w-4 h-4 text-violet-600" />
                      <span>Buka Kunci Pelanggaran Siswa</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Jika layar siswa terkunci merah akibat batas 3x strike, Pengawas cukup menekan tombol <strong>&quot;Buka Kunci&quot;</strong> pada baris nama siswa di tabel Live Monitoring untuk mengizinkan siswa lanjut ujian.
                    </p>
                  </div>
                </div>

                {/* Pro-Tip Box */}
                <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-violet-900 dark:text-violet-200">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <span>Tips Proktor: Solusi Siswa Ganti Perangkat / HP Restart</span>
                  </div>
                  <p className="text-xs text-violet-800/80 dark:text-violet-300/80 leading-relaxed">
                    Jika baterai HP siswa habis total, proktor tidak perlu menghapus nilai siswa. Cukup minta siswa login kembali di HP cadangan atau laptop sekolah dengan memilih rombel dan nama yang sama. Seluruh progres jawaban sebelumnya langsung tersinkronisasi otomatis dari database cloud.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 3: BANK SOAL & 5 TIPE SOAL                                */}
            {/* ============================================================= */}
            {activeTab === 'questions' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Bank Soal & Kurikulum Merdeka
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    Dukungan 5 Tipe Soal Standar Asesmen Nasional (ANBK) & AI
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    CBT SMPN 58 mendukung penuh seluruh ragam stimulus AKM dan instrumen penilaian modern.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Tipe 1 */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <span className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0">
                      PG
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-xs sm:text-sm text-slate-900 dark:text-white block">
                        1. Pilihan Ganda Tunggal
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Memiliki opsi A, B, C, D dengan 1 kunci jawaban benar mutlak. Penilaian dinilai 100% atau 0 otomatis oleh sistem.
                      </p>
                    </div>
                  </div>

                  {/* Tipe 2 */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <span className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs shrink-0">
                      PGK
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-xs sm:text-sm text-slate-900 dark:text-white block">
                        2. Pilihan Ganda Kompleks (Multi-Select Checkbox)
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Siswa dapat mencentang lebih dari satu jawaban benar. Penilaian dihitung proporsional sesuai jumlah kunci jawaban yang tepat dipilih.
                      </p>
                    </div>
                  </div>

                  {/* Tipe 3 */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs shrink-0">
                      B / S
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-xs sm:text-sm text-slate-900 dark:text-white block">
                        3. Benar / Salah (Multi-Pernyataan Stimulus)
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Memuat tabel stimulus dengan 3 hingga 5 pernyataan independen. Siswa menentukan Benar atau Salah pada setiap baris. Dinilai proporsional per butir pernyataan yang benar.
                      </p>
                    </div>
                  </div>

                  {/* Tipe 4 */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs shrink-0">
                      ISIAN
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-xs sm:text-sm text-slate-900 dark:text-white block">
                        4. Isian Singkat (Short Answer)
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Siswa mengetik kata kunci atau angka pasti. Sistem melakukan verifikasi cerdas secara <em>case-insensitive</em> dan toleran terhadap spasi berlebih.
                      </p>
                    </div>
                  </div>

                  {/* Tipe 5 */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <span className="px-2 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs shrink-0">
                      ESAI
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-xs sm:text-sm text-slate-900 dark:text-white block">
                        5. Esai / Uraian Bebas
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Siswa mengetik uraian analitis bebas. Guru dapat menetapkan rubrik panduan koreksi dan menginput skor manual di tab Dossier Nilai.
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Question Generator Section */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white space-y-2 shadow-lg shadow-violet-600/20">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Fitur Unggulan: AI Question Generator (Google Gemini)</span>
                  </div>
                  <p className="text-xs text-violet-100 leading-relaxed">
                    Guru dapat membuat paket soal komprehensif secara otomatis hanya dengan memasukkan topik materi (misal: <em>&quot;Sistem Peredaran Darah Kelas 8&quot;</em>). Generator AI akan menyusun stimulus, pertanyaan, opsi, dan kunci jawaban dalam hitungan detik!
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 4: SISTEM BOBOT & NILAI                                   */}
            {/* ============================================================= */}
            {activeTab === 'scoring' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Sistem Penilaian
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    Rumus Pembobotan Fleksibel & Standardisasi Nilai 0 - 100
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Memastikan nilai siswa adil, transparan, dan terkalibrasi otomatis untuk keperluan rapor sekolah.
                  </p>
                </div>

                {/* Formula Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-mono font-bold text-amber-400">
                      Rumus Nilai Akhir (Skala 0 - 100)
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          'Nilai Akhir = (Total Poin yang Diperoleh Siswa / Total Maksimal Poin Seluruh Soal) × 100',
                          'formula-score'
                        )
                      }
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition cursor-pointer"
                    >
                      {copiedKey === 'formula-score' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Rumus</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs sm:text-sm text-emerald-400 font-bold overflow-x-auto">
                    Skor Akhir = (Total Poin Diperoleh / Total Maksimal Poin Seluruh Soal) × 100
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Contoh: Jika paket ujian terdiri dari 40 soal dengan total bobot maksimal <strong>120 poin</strong>, dan seorang siswa berhasil mengumpulkan <strong>96 poin</strong>, maka nilai akhir siswa dihitung otomatis: <span className="text-amber-300 font-bold">(96 / 120) × 100 = 80.00</span>.
                  </p>
                </div>

                {/* Formula Proporsional Benar/Salah */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                    Penilaian Proporsional Soal Benar / Salah:
                  </strong>
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs text-violet-600 dark:text-violet-400 font-semibold">
                    Poin Soal = (Jumlah Pernyataan Benar Dijawab / Total Pernyataan) × Bobot Soal
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Jika sebuah stimulus memuat 4 pernyataan dengan bobot 2 poin, dan siswa menjawab 3 pernyataan tepat, maka perolehan poin soal tersebut adalah (3 / 4) × 2 = <strong>1.5 poin</strong>. Siswa tidak kehilangan seluruh nilai jika hanya salah satu pernyataan.
                  </p>
                </div>

                {/* KKM Badge Info */}
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 block">
                      Standar Kriteria Ketercapaian (KKM): 75
                    </strong>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                      Siswa dengan skor &ge; 75 ditandai <strong>Tuntas</strong> (Badge Hijau), sedangkan skor &lt; 75 ditandai <strong>Perlu Remedial</strong> (Badge Amber).
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-emerald-600 shrink-0" />
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 5: DOKUMEN & TTE RESMI                                    */}
            {/* ============================================================= */}
            {activeTab === 'documents' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Administrasi & Pencetakan
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    Dokumen Ujian Resmi, TTE Elektronik & Blanko Manual
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Seluruh dokumen diformat standar baku sekolah dan siap dicetak langsung (Print A4) dengan 0 setting margin rumit.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Berita Acara Pelaksanaan (BAP)</span>
                    </strong>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Memuat tanggal ujian, rombel, catatan khusus, serta pengesahan sejajar 3 kolom (Pengawas, Proktor, Kepala Sekolah).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <span>Daftar Hadir Siswa (Presensi)</span>
                    </strong>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Daftar nama lengkap per rombel dengan nomor peserta dan tanda tangan kehadiran fisik untuk arsip ruangan.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-indigo-600" />
                      <span>Kartu Peserta Ujian Resmi</span>
                    </strong>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Format kartu 2 kolom siap cetak per rombel kelas lengkap dengan kotak foto 2x3, NISN, dan token sesi ujian.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Leger Nilai Asesmen Sumatif</span>
                    </strong>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Rekapitulasi lengkap nilai seluruh siswa satu rombel, peringkat nilai tertinggi, dan statistik rata-rata kelas.
                    </p>
                  </div>
                </div>

                {/* Switcher TTE vs Manual Info */}
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Fitur Pemilihan Mode Pengesahan: TTE vs Tanda Tangan Manual</span>
                  </div>
                  <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
                    Di bagian atas tab Dokumen Ujian, guru dapat mengklik tombol switcher:
                  </p>
                  <ul className="text-xs space-y-1 list-disc list-inside text-indigo-900/90 dark:text-indigo-200/90">
                    <li><strong>Mode TTE Digital:</strong> Memunculkan stempel barcode QR resmi server CBT yang dapat diverifikasi publik.</li>
                    <li><strong>Mode Manual (Blanko Fisik):</strong> Mengosongkan nama guru dan menampilkan baris titik-titik presisi rapi untuk ditandatangani pena basah secara manual di kertas.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 6: KEAMANAN ANTI-CHEAT                                    */}
            {/* ============================================================= */}
            {activeTab === 'anticheat' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Proteksi Integritas Ujian
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    Mekanisme Keamanan Berlapis & Pencegahan Kecurangan
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    CBT SMPN 58 mengadopsi standar keamanan ketat untuk menjamin orisinalitas pengerjaan soal siswa.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                        Deteksi Pindah Tab & Layar (Window Blur Detection)
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Setiap kali siswa berpindah tab browser, membuka aplikasi lain (WhatsApp, kalkulator, catatan), atau membagi layar (split screen), sistem seketika memicu alarm peringatan dan mencatat stempel waktu pelanggaran.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                        Perangkap Navigasi Tombol Back HP (History Trap Buffer 20x)
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Siswa yang mencoba menekan tombol Kembali (Back) pada Android atau browser tidak dapat keluar dari ujian. Sistem secara otomatis menahan riwayat browser dengan buffer 20 lapis.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                        Batas Toleransi Maksimal 3 Strike & Kunci Layar Merah
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Pada pelanggaran ke-3, lembar ujian siswa akan otomatis terkunci dengan layar merah mati. Siswa tidak dapat melanjutkan sampai Pengawas Ruang memverifikasi dan membuka kuncinya secara resmi.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                      <Copy className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                        Anti Salin-Tempel (Copy/Paste Guard) & Inspect Element
                      </strong>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Kombinasi tombol shortcut keyboard seperti <code>Ctrl+C</code>, <code>Ctrl+V</code>, <code>Ctrl+U</code>, <code>F12</code>, serta klik kanan (konteks menu) dinonaktifkan sepenuhnya pada lembar soal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 7: FAQ & TROUBLESHOOTING                                  */}
            {/* ============================================================= */}
            {activeTab === 'faq' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Pusat Tanya Jawab & Kendala
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    Solusi Cepat untuk Masalah Teknis di Ruang Ujian
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Temukan jawaban praktis atas pertanyaan yang paling sering dihadapi proktor dan pengawas di lapangan.
                  </p>
                </div>

                {/* FAQ Accordion List */}
                <div className="space-y-3">
                  {faqs.map((faq, idx) => {
                    const isExpanded = expandedFaq === idx;

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition shadow-2xs"
                      >
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                          className="w-full p-4 text-left flex items-center justify-between gap-3 font-semibold text-xs sm:text-sm text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                              Q
                            </span>
                            <span>{faq.q}</span>
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-teal-600' : ''
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
                            <p className="pt-3">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB 8: DATABASE & SUPABASE                                    */}
            {/* ============================================================= */}
            {activeTab === 'cloud' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Infrastruktur Cloud
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    Koneksi Realtime Database Supabase PostgreSQL
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Arsitektur cloud computing berkinerja tinggi untuk sinkronisasi data seluruh ruang kelas tanpa latency.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-cyan-400">
                    <Database className="w-4 h-4" />
                    <span>Project Supabase Cloud Terhubung:</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 break-all border border-slate-800">
                    https://lxglsphqrpnrzfnvpwoa.supabase.co
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Setiap penambahan butir soal baru, rilis token ujian, penguncian siswa, dan lembar jawaban yang dikirimkan siswa tersimpan secara terdesentralisasi dan di-backup otomatis di cluster database PostgreSQL berkecepatan tinggi.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                      Realtime WebSocket Channels
                    </strong>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Memungkinkan pengawas memantau status login, jawaban terisi, dan peringatan pelanggaran siswa seketika tanpa perlu memuat ulang (refresh) halaman.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                    <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block">
                      Fail-Safe Offline Caching
                    </strong>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Jika koneksi router sekolah sempat terputus, seluruh data ujian tersimpan di LocalStorage browser perangkat siswa dan secara otomatis diunggah begitu koneksi pulih kembali.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* FOOTER MODAL: DUKUNGAN TEKNIS & TOMBOL SELESAI                   */}
        {/* ================================================================= */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <School className="w-4 h-4 text-violet-600 shrink-0" />
            <span>
              Sistem CBT Resmi <strong>SMP Negeri 58 Palembang</strong> • Pengembang: <strong>Aris Bermansyah, S.Kom</strong>
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer"
          >
            {language === 'id' ? 'Tutup Panduan' : 'Close Guide'}
          </button>
        </div>
      </div>
    </div>
  );
};
