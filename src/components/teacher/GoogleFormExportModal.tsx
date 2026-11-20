'use client';

import React, { useState, useMemo } from 'react';
import { Subject, Question } from '@/types/cbt';
import { generateGoogleFormsAppsScript, downloadGoogleAppsScriptFile } from '@/lib/googleFormService';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Download,
  Code2,
  HelpCircle,
  FileText
} from 'lucide-react';

interface GoogleFormExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  questions: Question[];
}

export const GoogleFormExportModal: React.FC<GoogleFormExportModalProps> = ({
  isOpen,
  onClose,
  subject,
  questions,
}) => {
  const [copied, setCopied] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);

  // Generate Google Apps Script code memoized
  const scriptContent = useMemo(() => {
    if (!subject || questions.length === 0) return '';
    return generateGoogleFormsAppsScript(subject, questions);
  }, [subject, questions]);

  if (!isOpen || !subject) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scriptContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback manual selection
      const textArea = document.createElement('textarea');
      textArea.value = scriptContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenScriptNew = () => {
    window.open('https://script.new', '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    downloadGoogleAppsScriptFile(scriptContent, subject.title);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Export ke Google Form
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {subject.title} ({subject.className}) • {questions.length} Butir Soal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Petunjuk Langkah 1-2-3 yang Praktis */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Langkah Pembuatan (Hanya 10 Detik)</span>
            </h4>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Salin Skrip Otomatis
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Skrip ini memuat seluruh butir soal, opsi jawaban, kunci jawaban kuis, dan poin skor.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Buka Editor Google Apps Script
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Klik tombol <strong>Buka script.new</strong> di bawah. Hapus kode bawaan di layar, lalu tempel (Paste / Ctrl+V) skrip yang sudah Anda salin.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Klik Tombol "Jalankan" (Run)
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Google Form langsung otomatis terbuat di Google Drive Anda sebagai kuis aktif lengkap dengan kunci jawaban.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Utama Tindakan Cepat */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-md cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Skrip Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" />
                  <span>1. Salin Skrip Google Form</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleOpenScriptNew}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>2. Buka script.new</span>
            </button>
          </div>

          {/* Opsi Tambahan: Download file .gs & Lihat Kode */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setShowCodePreview(!showCodePreview)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 font-medium cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{showCodePreview ? 'Sembunyikan Kode' : 'Pratinjau Kode Skrip'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer"
              title="Unduh file skrip berekstensi .gs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh File .gs</span>
            </button>
          </div>

          {/* Kotak Pratinjau Kode (Opsional) */}
          {showCodePreview && (
            <div className="mt-2 p-3 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{scriptContent}</pre>
            </div>
          )}

          {/* Catatan Bantuan Otorisasi Google Pertama Kali */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-2.5 text-[11px] text-amber-800 dark:text-amber-300">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p>
              <strong>Tips Izin Google Pertama Kali:</strong> Saat pertama kali menjalankan skrip di Google Apps Script, Google akan meminta izin akses Forms. Cukup klik <em>Tinjau Izin</em> &rarr; <em>Lanjutan</em> &rarr; <em>Buka (Tidak Aman)</em> &rarr; <em>Izinkan</em>. Form akan langsung tersimpan di akun Google Anda.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
