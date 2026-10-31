'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  UserCheck, 
  Calendar, 
  Hash, 
  Award, 
  Printer, 
  ArrowLeft,
  ExternalLink,
  QrCode
} from 'lucide-react';
import Link from 'next/link';
import { fetchSchoolSettingsFromSupabase, fetchTeachers, defaultSchoolSettings } from '@/lib/supabaseService';
import { SchoolSettings, Teacher } from '@/types/cbt';

function VerifyDetails() {
  const searchParams = useSearchParams();
  const doc = searchParams.get('doc') || 'CBT58-DOC-VERIFIED';
  const signer = searchParams.get('signer') || '';
  const nip = searchParams.get('nip') || '';
  const title = searchParams.get('title') || 'Kepala Sekolah';
  const school = searchParams.get('school') || '';
  const date = searchParams.get('date') || new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const [verifyTime, setVerifyTime] = useState<string>('');
  const [settings, setSettings] = useState<SchoolSettings>(defaultSchoolSettings);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    setVerifyTime(new Date().toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium'
    }));

    // Coba baca dari localStorage lokal
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cbt_school_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings(prev => ({
            ...defaultSchoolSettings,
            ...prev,
            ...parsed
          }));
        }
      } catch {}
    }

    // Muat data resmi terbaru dari Database Supabase (Cloud) agar verifikasi dari HP pihak luar selalu menampilkan kop & logo valid
    fetchSchoolSettingsFromSupabase().then(dbSettings => {
      if (dbSettings) {
        setSettings(dbSettings);
      }
    }).catch(err => {
      console.warn('Gagal memuat pengaturan sekolah untuk verifikasi:', err);
    });

    fetchTeachers().then(ts => {
      if (ts) setTeachers(ts);
    }).catch(() => {});
  }, []);

  const effectiveSettings: SchoolSettings = {
    ...defaultSchoolSettings,
    ...settings,
    schoolName: settings?.schoolName || school || defaultSchoolSettings.schoolName,
    logoLeft: settings?.logoLeft || defaultSchoolSettings.logoLeft,
    logoRight: settings?.logoRight || defaultSchoolSettings.logoRight
  };

  const displaySigner = (signer && signer !== 'Drs. H. Syarifuddin, M.Si')
    ? signer
    : (title.toLowerCase().includes('kepala') ? effectiveSettings.principalName : (signer || effectiveSettings.principalName));

  const displayNip = (nip && nip !== '197001011995031002' && nip !== '-')
    ? nip
    : (title.toLowerCase().includes('kepala') ? effectiveSettings.principalNip : nip);

  const isPrincipal = title.toLowerCase().includes('kepala');

  const matchedTeacher = !isPrincipal ? teachers.find(t => 
    (displayNip && t.nip === displayNip) || 
    (displaySigner && t.name.toLowerCase().trim() === displaySigner.toLowerCase().trim())
  ) : null;

  const signerPhoto = isPrincipal 
    ? effectiveSettings.principalPhoto 
    : (matchedTeacher?.photoUrl || matchedTeacher?.avatar || (typeof window !== 'undefined' && matchedTeacher?.id ? localStorage.getItem(`cbt_teacher_${matchedTeacher.id}_photo`) : null) || effectiveSettings.principalPhoto);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 print:bg-white print:text-black print:p-0">
      <div className="w-full max-w-xl bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:bg-white print:p-4">
        
        {/* KOP SURAT RESMI INSTANSI DENGAN DUAL LOGO (SESUAI PENGATURAN SISTEM) */}
        <div className="pb-4 border-b-4 border-double border-slate-700/80 print:border-slate-800">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            {/* Logo Kiri (Dinas Pendidikan / Pemda) */}
            <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
              <img
                src={effectiveSettings.logoLeft || '/logo-dinas.png'}
                alt="Logo Dinas"
                className="max-h-14 sm:max-h-20 max-w-full object-contain drop-shadow-sm"
              />
            </div>

            {/* Teks Kop Surat Resmi */}
            <div className="flex-1 text-center font-serif leading-tight">
              <h3 className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-300 print:text-slate-800 uppercase">
                {effectiveSettings.institution1 || 'PEMERINTAH KOTA PALEMBANG'}
              </h3>
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-slate-200 print:text-slate-900 uppercase">
                {effectiveSettings.institution2 || 'DINAS PENDIDIKAN'}
              </h2>
              <h1 className="text-sm sm:text-lg font-extrabold tracking-tight text-white print:text-slate-950 uppercase mt-0.5">
                {effectiveSettings.schoolName || 'SMP NEGERI 58 PALEMBANG'}
              </h1>
              {effectiveSettings.schoolAddress && (
                <p className="text-[9px] sm:text-[11px] text-slate-300 print:text-slate-600 mt-1 leading-snug font-sans">
                  {effectiveSettings.schoolAddress}
                </p>
              )}
              {effectiveSettings.schoolContact && (
                <p className="text-[9px] sm:text-[10px] text-slate-400 print:text-slate-600 leading-snug font-sans">
                  {effectiveSettings.schoolContact}
                </p>
              )}
            </div>

            {/* Logo Kanan (Sekolah / Madrasah) */}
            <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
              <img
                src={effectiveSettings.logoRight || '/logo-sekolah.png'}
                alt="Logo Sekolah"
                className="max-h-14 sm:max-h-20 max-w-full object-contain drop-shadow-sm"
              />
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-700/60 print:border-slate-200 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 print:text-emerald-800 print:bg-emerald-50 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Layanan Verifikasi Dokumen & Tanda Tangan Elektronik (TTE)
            </span>
          </div>
        </div>

        {/* STATUS BANNER VERIFIKASI */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-emerald-900/30 to-slate-900 border border-emerald-500/30 print:bg-emerald-50 print:border-emerald-300 flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 print:text-emerald-800 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                100% Sah & Otentik
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white print:text-black">
              Dokumen Terverifikasi Digital
            </h2>
            <p className="text-xs text-slate-300 print:text-slate-700 leading-relaxed">
              Tanda Tangan Elektronik (TTE) dan Dokumen ini telah divalidasi sah oleh Server CBT {effectiveSettings.schoolName}.
            </p>
          </div>
        </div>

        {/* TABEL ATRIBUT DOKUMEN */}
        <div className="space-y-3 bg-slate-900/60 print:bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-700/60 print:border-slate-200">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Informasi Metadata Pengesahan:
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1 p-2.5 rounded-xl bg-slate-800/40 print:bg-white border border-slate-700/40 print:border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nomor Registrasi / ID:</span>
              </div>
              <p className="font-mono font-bold text-emerald-300 print:text-emerald-700 truncate">
                {doc}
              </p>
            </div>

            <div className="space-y-1 p-2.5 rounded-xl bg-slate-800/40 print:bg-white border border-slate-700/40 print:border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tanggal Terbit / TTE:</span>
              </div>
              <p className="font-semibold text-slate-200 print:text-slate-800">
                {date}
              </p>
            </div>

            <div className="space-y-1 p-2.5 rounded-xl bg-slate-800/40 print:bg-white border border-slate-700/40 print:border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-400">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pejabat Penandatangan:</span>
              </div>
              <div className="flex items-center gap-2.5 pt-0.5">
                {signerPhoto ? (
                  <img
                    src={signerPhoto}
                    alt={`Foto Resmi ${displaySigner}`}
                    className="w-11 h-13 rounded-xl object-cover border border-emerald-500/40 shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="w-10 h-12 rounded-lg bg-slate-700/60 border border-slate-600 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                <div>
                  <p className="font-bold text-white print:text-black leading-snug">
                    {displaySigner}
                  </p>
                  <span className="text-[10px] text-emerald-400 print:text-emerald-700 font-semibold block">
                    ✓ Identitas Terotentikasi
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1 p-2.5 rounded-xl bg-slate-800/40 print:bg-white border border-slate-700/40 print:border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Jabatan / Otoritas:</span>
              </div>
              <p className="font-medium text-slate-200 print:text-slate-800">
                {title}
              </p>
            </div>

            {displayNip && displayNip !== '-' && (
              <div className="space-y-1 p-2.5 rounded-xl bg-slate-800/40 print:bg-white border border-slate-700/40 print:border-slate-200 sm:col-span-2">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nomor Induk Pegawai (NIP):</span>
                </div>
                <p className="font-mono font-medium text-slate-200 print:text-slate-800">
                  {displayNip}
                </p>
              </div>
            )}
          </div>

          {verifyTime && (
            <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-700/40 print:border-slate-200 flex items-center justify-between">
              <span>Waktu Pemindaian:</span>
              <span className="font-mono text-slate-300 print:text-slate-600">{verifyTime}</span>
            </div>
          )}
        </div>

        {/* PAYUNG HUKUM & KEABSAHAN */}
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-700/40 text-[11px] text-slate-400 print:text-slate-600 leading-relaxed">
          <p className="font-medium text-slate-300 print:text-slate-700 mb-1">
            ⚖️ Dasar Hukum Keabsahan Dokumen Elektronik:
          </p>
          Berdasarkan UU ITE No. 11 Tahun 2008 Pasal 5 Ayat 1 & PP No. 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik, dokumen dan Tanda Tangan Elektronik ini sah dan mengikat secara hukum tanpa memerlukan tanda tangan basah konvensional.
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 print:hidden">
          <Link
            href="/"
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda CBT</span>
          </Link>
          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-900/30"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Bukti Verifikasi</span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300 p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium">Memverifikasi keaslian dokumen digital...</p>
        </div>
      </div>
    }>
      <VerifyDetails />
    </Suspense>
  );
}
