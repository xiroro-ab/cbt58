'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  Layers,
  EyeOff,
  KeyRound,
  FileDown,
  Info
} from 'lucide-react';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTeacherView?: boolean;
  activeExitPassword?: string;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({
  isOpen,
  onClose,
  isTeacherView = false,
  activeExitPassword = 'palembang58'
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const apkDownloadUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/cbt-smpn58.apk`
    : 'https://cbt58.vercel.app/cbt-smpn58.apk';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(apkDownloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div 
        className="max-w-2xl w-full max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-50/80 via-white to-emerald-50/50 dark:from-violet-950/30 dark:via-slate-900 dark:to-emerald-950/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-600/30 flex-shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Aplikasi CBT SMPN 58 Android
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
                  v3.0 Resmi
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                  Anti-Curang OS-Level
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ExamBrowser Resmi SMP Negeri 58 Palembang (Kunci Layar & Proteksi Maksimal)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-shrink-0 ml-2"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Card Download Utama (Highlight) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-xl shadow-violet-600/25 relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left space-y-1">
                <p className="text-[11px] font-bold tracking-wide uppercase text-violet-200">
                  Paket Pemasangan Resmi (APK)
                </p>
                <h4 className="text-lg font-extrabold tracking-tight">
                  ExamBrowser SMPN 58 (v3.0)
                </h4>
                <p className="text-xs text-violet-100/90 max-w-sm">
                  Kompatibel dengan semua HP Android (Android 7.0 s/d Android 14+). Cukup 1 klik kunci layar langsung ujian.
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-3 pt-1 text-[11px] text-violet-200 font-mono">
                  <span>Ukuran: ~6.3 MB</span>
                  <span>•</span>
                  <span>Update: November 2026</span>
                </div>
              </div>

              <div className="flex flex-col w-full sm:w-auto gap-2 flex-shrink-0">
                <a
                  href="/cbt-smpn58.apk"
                  download="cbt-smpn58-v3.apk"
                  className="px-5 py-3 rounded-xl bg-white text-violet-700 hover:bg-violet-50 font-extrabold text-xs shadow-lg flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Unduh File APK (~6.3 MB)</span>
                </a>
                
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-1.5 rounded-lg bg-violet-800/60 hover:bg-violet-800 text-violet-100 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-violet-500/30"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Link Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Link Download</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Fitur Keamanan Anti-Curang Brutal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Fitur Keamanan Anti-Curang Tingkat Sistem (OS-Level)</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">Kunci Layar Mutlak (Pinning)</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tombol Home, Recent Apps, dan Back terkunci total. Siswa tidak bisa beralih ke aplikasi lain.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">Blokir Floating Windows</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Native <code className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1 rounded">HIDE_OVERLAY_WINDOWS</code> otomatis menutup popup WA, kalkulator floating, atau Google overlay.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">Anti Split Screen / Layar Belah</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Mematikan multi-window. Jika siswa mencoba membelah layar, tampilan otomatis blank merah terkunci.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-slate-200">Proteksi Password Guru</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Siswa dilarang menutup ujian tanpa izin. Hanya Guru Pengawas yang berhak membuka kunci aplikasi.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Panduan Instalasi Cepat (Hanya 1 Langkah Kunci Layar) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Panduan Pasang & Pakai Siswa (Sangat Praktis)</span>
            </h4>

            <ol className="space-y-2 text-slate-600 dark:text-slate-300 text-[11px]">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                  1
                </span>
                <span>
                  <strong>Unduh APK:</strong> Klik tombol biru <em>"Unduh File APK"</em> di atas. Jika muncul peringatan <em>"File mungkin berbahaya"</em>, pilih <strong>"Tetap Unduh / Download Anyway"</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                  2
                </span>
                <span>
                  <strong>Pasang Aplikasi:</strong> Buka file unduhan lalu klik <strong>Install</strong>. Jika diminta izin pasang dari sumber tidak dikenal, aktifkan izinnya.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                  3
                </span>
                <span>
                  <strong>Mulai Ujian:</strong> Buka aplikasi <strong>CBT SMPN 58</strong>, lalu cukup klik tombol hijau <strong>"KUNCI LAYAR & MULAI UJIAN"</strong> ➔ pilih <strong>"OKE / MENGERTI"</strong>. Ujian langsung dimulai secara aman!
                </span>
              </li>
            </ol>
          </div>

          {/* Catatan Khusus untuk Guru Pengawas Ruangan (Hanya Tampil Jika Dibuka oleh Guru yang Sudah Login) */}
          {isTeacherView && (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-[11px] animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-100">
                  <span>Catatan Khusus Pengawas Ruangan:</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-200 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100 font-bold uppercase tracking-wider">
                    Privat Dewan Guru
                  </span>
                </p>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  Password aktif untuk menutup aplikasi siswa saat ini adalah:{' '}
                  <strong className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 text-xs">
                    {activeExitPassword || 'palembang58'}
                  </strong>{' '}
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">(Default: palembang58)</span>
                </p>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                  *Catatan: Informasi rahasia ini hanya tampil di akun guru/pengawas dan tidak akan pernah terlihat di HP siswa.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer Modal */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            SMP Negeri 58 Palembang • Tahun Ajaran 2026/2027
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
