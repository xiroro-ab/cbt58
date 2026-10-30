'use client';

import React, { useState } from 'react';
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
  ChevronRight
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'bs' | 'scoring' | 'anticheat' | 'supabase' | 'tokens'>('bs');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {language === 'id' ? 'Panduan Penggunaan & Bantuan CBT' : 'CBT User Guide & Documentation'}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {language === 'id'
                  ? 'Panduan lengkap fitur soal, penilaian bobot, anti-cheat, dan Supabase'
                  : 'Complete guide for question formats, weighted grading, anti-cheat, and Supabase'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-2 overflow-x-auto text-xs font-semibold py-2 bg-slate-50/50 dark:bg-slate-950/30">
          <button
            onClick={() => setActiveTab('bs')}
            className={`px-3 py-2 rounded-xl transition ${
              activeTab === 'bs'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {language === 'id' ? 'Soal Benar/Salah' : 'True/False Format'}
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`px-3 py-2 rounded-xl transition ${
              activeTab === 'scoring'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {language === 'id' ? 'Perhitungan Bobot' : 'Weighted Scoring'}
          </button>
          <button
            onClick={() => setActiveTab('anticheat')}
            className={`px-3 py-2 rounded-xl transition ${
              activeTab === 'anticheat'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {language === 'id' ? 'Fitur Anti-Cheat' : 'Anti-Cheat Protection'}
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-3 py-2 rounded-xl transition ${
              activeTab === 'tokens'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {language === 'id' ? 'Token & Durasi' : 'Tokens & Timer'}
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`px-3 py-2 rounded-xl transition ${
              activeTab === 'supabase'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {language === 'id' ? 'Koneksi Supabase' : 'Supabase Cloud'}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 text-slate-700 dark:text-slate-300 leading-relaxed">
          {/* TAB 1: BENAR / SALAH */}
          {activeTab === 'bs' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 text-violet-900 dark:text-violet-200">
                <h4 className="font-bold text-sm mb-1">
                  {language === 'id' ? 'Mendukung Multi-Pernyataan (> 1 Jawaban)' : 'Supports Multi-Statements (> 1 Answer)'}
                </h4>
                <p>
                  {language === 'id'
                    ? 'Soal tipe Benar/Salah kini dapat memuat banyak pernyataan (misal 3, 4, atau 5 pernyataan) dalam satu nomor soal stimulus. Setiap pernyataan memiliki opsi radio Benar / Salah masing-masing.'
                    : 'True/False questions now support multiple statements under one stimulus. Each statement features its own independent True/False radio selection.'}
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-900 dark:text-white">
                  {language === 'id' ? 'Rumus Penilaian Proporsional:' : 'Proportional Scoring Formula:'}
                </h5>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px] text-violet-600 dark:text-violet-400">
                  Poin Diperoleh = (Jumlah Pernyataan Benar Dijawab / Total Pernyataan) × Bobot Poin Soal
                </div>
                <p className="text-slate-500">
                  {language === 'id'
                    ? 'Contoh: Sebuah soal Benar/Salah memiliki 4 pernyataan dan berbobot 2 poin. Jika siswa menjawab 3 pernyataan dengan tepat, maka siswa memperoleh (3 / 4) × 2 = 1.5 poin.'
                    : 'Example: A question has 4 statements with a weight of 2 points. If a student answers 3 correctly, they earn (3 / 4) × 2 = 1.5 points.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SCORING RULES */}
          {activeTab === 'scoring' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {language === 'id' ? 'Sistem Penilaian Bobot Fleksibel' : 'Flexible Weighted Grading'}
              </h4>
              <p>
                {language === 'id'
                  ? 'Setiap tipe soal (Pilihan Ganda, Pilihan Ganda Kompleks, Benar/Salah, Isian Singkat, dan Esai) memiliki bobot poin tersendiri yang dapat dikustomisasi di menu Pengaturan Bobot.'
                  : 'Each question type possesses its own weight multiplier, adjustable via the Scoring Rules menu.'}
              </p>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px] text-violet-600 dark:text-violet-400">
                Skor Akhir (0 - 100) = (Total Poin yang Diperoleh Siswa / Total Maksimal Poin Seluruh Soal) × 100
              </div>
              <p className="text-slate-500">
                {language === 'id'
                  ? 'Dengan rumus ini, nilai siswa otomatis terstandardisasi ke skala 0 - 100, memudahkan guru dalam memasukkan nilai rapor dan menentukan kelulusan KKM.'
                  : 'This normalizes all final exam results to a standard 0 - 100 scale, making reporting and KKM verification effortless.'}
              </p>
            </div>
          )}

          {/* TAB 3: ANTI CHEAT */}
          {activeTab === 'anticheat' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {language === 'id' ? 'Mekanisme Keamanan Anti-Cheat' : 'Anti-Cheat Protection Mechanics'}
              </h4>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      {language === 'id' ? 'Deteksi Pindah Tab (Window Blur)' : 'Tab Switch Detection (Window Blur)'}
                    </strong>
                    <p className="text-slate-500 mt-0.5">
                      {language === 'id'
                        ? 'Sistem mencatat setiap kali siswa membuka tab lain, browser lain, atau aplikasi lain. Pelanggaran dihitung secara realtime.'
                        : 'Tracks when students navigate away from the test tab. Violations are logged immediately.'}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      {language === 'id' ? 'Batas Toleransi Maksimal 3x' : '3-Strike Maximum Tolerance'}
                    </strong>
                    <p className="text-slate-500 mt-0.5">
                      {language === 'id'
                        ? 'Jika siswa melakukan pelanggaran lebih dari batas toleransi (3 kali), lembar jawaban siswa akan dikunci otomatis dan langsung dikirim ke sistem.'
                        : 'Exceeding the strike limit automatically locks and submits the student answer sheet.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TOKENS */}
          {activeTab === 'tokens' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {language === 'id' ? 'Pengaturan Token & Jadwal Ujian' : 'Exam Token & Timer Setup'}
              </h4>
              <p>
                {language === 'id'
                  ? 'Guru dapat merilis token ujian unik (contoh: IPA2026). Siswa tidak dapat memulai ujian sebelum memasukkan token yang valid dari guru pengawas. Token dapat diubah kapan saja di menu Jadwal Ujian.'
                  : 'Teachers can release custom exam tokens. Students cannot access the questions without entering the valid token provided by proctors.'}
              </p>
            </div>
          )}

          {/* TAB 5: SUPABASE */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                {language === 'id' ? 'Integrasi Database Supabase Cloud' : 'Supabase Cloud Database Integration'}
              </h4>
              <p>
                {language === 'id'
                  ? 'Aplikasi terhubung langsung ke project Supabase Anda: https://lxglsphqrpnrzfnvpwoa.supabase.co. Seluruh penambahan soal, nilai ujian siswa, dan pengaturan disimpan permanen di database PostgreSQL cloud yang cepat dan berkapasitas besar.'
                  : 'Connected directly to your Supabase PostgreSQL cloud database for fast, secure, and permanent storage.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-950/30">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
