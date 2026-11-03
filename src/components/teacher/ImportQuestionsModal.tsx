'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  FileUp,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  Edit2,
  Check,
  Eye,
  Sliders,
  RefreshCw,
  BookOpen,
  ArrowRight,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { Question, QuestionType, Subject, OptionItem } from '@/types/cbt';
import { validateAndConvertRawQuestions } from '@/lib/aiQuestionGenerator';
import { parseQuestionsFromRawText } from '@/lib/documentQuestionParser';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubject: Subject;
  existingQuestionsCount?: number;
  onSaveQuestions: (newQuestions: Question[]) => void;
}

export const ImportQuestionsModal: React.FC<ImportQuestionsModalProps> = ({
  isOpen,
  onClose,
  currentSubject,
  existingQuestionsCount = 0,
  onSaveQuestions
}) => {
  // Modal Navigation
  const [currentStep, setCurrentStep] = useState<'input' | 'preview'>('input');
  const [inputTab, setInputTab] = useState<'upload' | 'paste'>('upload');

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);

  // Paste Text State
  const [rawText, setRawText] = useState<string>('');

  // Processing State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Sedang menganalisis dokumen...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted Questions for Preview
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [previewTypeFilter, setPreviewTypeFilter] = useState<string>('ALL');

  // AI Configuration State
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);
  const [modelName, setModelName] = useState<string>('gemini-1.5-flash');

  // Load Saved API Key
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('cbt_gemini_api_key') || '';
      if (savedKey) {
        setApiKey(savedKey);
        setIsApiKeySaved(true);
      }
      const savedModel = localStorage.getItem('cbt_gemini_model') || '';
      if (savedModel) {
        setModelName(savedModel);
      }
    }

    // Cek apakah server Vercel memiliki key default
    fetch('/api/ai/generate-questions')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d.hasServerKey === 'boolean') {
          setHasServerKey(d.hasServerKey);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveApiKey = () => {
    if (typeof window !== 'undefined') {
      if (apiKey.trim()) {
        localStorage.setItem('cbt_gemini_api_key', apiKey.trim());
        setIsApiKeySaved(true);
      } else {
        localStorage.removeItem('cbt_gemini_api_key');
        setIsApiKeySaved(false);
      }
      localStorage.setItem('cbt_gemini_model', modelName);
      setShowApiKeyInput(false);
    }
  };

  // Reset modal state upon opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('input');
      setSelectedFile(null);
      setFileBase64('');
      setRawText('');
      setFileError(null);
      setErrorMessage(null);
      setExtractedQuestions([]);
      setSelectedQuestionIds(new Set());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Maksimal 15 MB
    if (file.size > 15 * 1024 * 1024) {
      setFileError('Ukuran file terlalu besar (maksimal 15 MB).');
      return;
    }

    setSelectedFile(file);

    // Baca ke Base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFileBase64(base64);
    };
    reader.onerror = () => {
      setFileError('Gagal membaca berkas dokumen.');
    };
    reader.readAsDataURL(file);
  };

  // AI Extraction Handler (PDF / Word / Teks via Gemini)
  const handleExtractWithAi = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setLoadingStatus('Mengunggah naskah & membaca dokumen...');

      const timer1 = setTimeout(() => {
        setLoadingStatus('AI Gemini sedang membaca teks & struktur butir soal...');
      }, 3000);

      const timer2 = setTimeout(() => {
        setLoadingStatus('Menganalisis tipe soal, opsi pilihan ganda & kunci jawaban...');
      }, 7000);

      const timer3 = setTimeout(() => {
        setLoadingStatus('Menyusun format CBT 58 dan memverifikasi kelengkapan...');
      }, 12000);

      const payload: Record<string, any> = {
        subjectTitle: currentSubject.title,
        className: currentSubject.className,
        fileName: selectedFile?.name || 'naskah_soal.pdf',
        mimeType: selectedFile?.type || 'application/pdf',
        apiKey: apiKey.trim(),
        model: modelName
      };

      if (inputTab === 'upload') {
        if (!fileBase64) {
          throw new Error('Silakan pilih file PDF atau dokumen terlebih dahulu.');
        }
        payload.fileBase64 = fileBase64;
      } else {
        if (!rawText.trim()) {
          throw new Error('Silakan tempelkan teks naskah soal terlebih dahulu.');
        }
        payload.rawText = rawText.trim();
      }

      const res = await fetch('/api/ai/import-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === 'API_KEY_REQUIRED') {
          setShowApiKeyInput(true);
        }
        throw new Error(data?.message || 'Gagal mengekstrak soal dari dokumen dengan AI.');
      }

      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Tidak ada butir soal yang berhasil diekstrak dari dokumen. Pastikan naskah memuat teks pertanyaan.');
      }

      // Validasi dan konversi ke struktur Question CBT
      const converted = validateAndConvertRawQuestions(
        data.questions,
        currentSubject.id,
        existingQuestionsCount + 1
      );

      if (converted.length === 0) {
        throw new Error('Gagal mengonversi struktur butir soal. Silakan coba lagi.');
      }

      setExtractedQuestions(converted);
      setSelectedQuestionIds(new Set(converted.map(q => q.id)));
      setCurrentStep('preview');
    } catch (err: any) {
      console.error('Extraction Error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses dokumen.');
    } finally {
      setIsLoading(false);
    }
  };

  // Instant Local Heuristic Parser (Fast & Offline)
  const handleExtractWithLocalParser = () => {
    try {
      setErrorMessage(null);
      if (!rawText.trim()) {
        setErrorMessage('Silakan tempelkan teks naskah soal terlebih dahulu.');
        return;
      }

      const parsed = parseQuestionsFromRawText(
        rawText,
        currentSubject.id,
        existingQuestionsCount + 1
      );

      if (parsed.length === 0) {
        setErrorMessage('Tidak ada butir soal yang terdeteksi dengan pola nomor (contoh: "1.", "A.", "B."). Coba gunakan "Deteksi Cerdas AI".');
        return;
      }

      setExtractedQuestions(parsed);
      setSelectedQuestionIds(new Set(parsed.map(q => q.id)));
      setCurrentStep('preview');
    } catch (err: any) {
      setErrorMessage('Gagal memproses teks naskah soal secara lokal.');
    }
  };

  // Toggle selection for bulk save
  const toggleSelectQuestion = (qId: string) => {
    const next = new Set(selectedQuestionIds);
    if (next.has(qId)) {
      next.delete(qId);
    } else {
      next.add(qId);
    }
    setSelectedQuestionIds(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedQuestionIds.size === filteredExtractedQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredExtractedQuestions.map(q => q.id)));
    }
  };

  // Hapus butir soal yang tidak diinginkan dari preview
  const handleDeleteQuestion = (qId: string) => {
    setExtractedQuestions(prev => prev.filter(q => q.id !== qId));
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      next.delete(qId);
      return next;
    });
  };

  // Filter preview by type
  const filteredExtractedQuestions = extractedQuestions.filter(q => {
    if (previewTypeFilter === 'ALL') return true;
    return q.type === previewTypeFilter;
  });

  // Final Action: Save to Bank Soal
  const handleSaveToBankSoal = () => {
    const toSave = extractedQuestions.filter(q => selectedQuestionIds.has(q.id));
    if (toSave.length === 0) {
      alert('Pilih minimal 1 butir soal untuk disimpan ke Bank Soal.');
      return;
    }

    onSaveQuestions(toSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-zoom-in">
        
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Import Naskah Soal Otomatis
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  PDF & Dokumen
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target: <strong>{currentSubject.title}</strong> ({currentSubject.className})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY MODAL */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">

          {/* STEP 1: INPUT DOKUMEN / TEKS */}
          {currentStep === 'input' && (
            <div className="space-y-5">
              
              {/* Petunjuk Penggunaan */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950 dark:text-emerald-200">
                    Sistem Deteksi Otomatis Siap Pakai
                  </p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    Unggah naskah ujian dalam bentuk <strong>PDF, Word, atau teks copy-paste</strong>. Kecerdasan Buatan (AI) akan secara otomatis memisahkan nomor soal, mendeteksi opsi pilihan ganda A, B, C, D, mencari kunci jawaban, dan mengonversinya langsung ke format CBT sekolah Anda.
                  </p>
                </div>
              </div>

              {/* TAB SELECTOR: UPLOAD BERKAS vs COPY-PASTE TEKS */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  type="button"
                  onClick={() => setInputTab('upload')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    inputTab === 'upload'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah File (PDF / Dokumen)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInputTab('paste')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    inputTab === 'paste'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tempel Teks Naskah Soal (Copy-Paste)</span>
                </button>
              </div>

              {/* TAB 1: UPLOAD DOKUMEN (PDF, WORD, GAMBAR) */}
              {inputTab === 'upload' && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500 dark:hover:border-emerald-600 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 flex flex-col items-center justify-center gap-3 group"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition shadow-sm">
                      <FileUp className="w-8 h-8" />
                    </div>

                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {selectedFile ? selectedFile.name : 'Klik untuk Memilih File atau Drag & Drop'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Mendukung dokumen <strong>PDF (Sangat Direkomendasikan)</strong>, TXT, DOCX, dan Foto Naskah
                      </p>
                    </div>

                    {selectedFile && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-300 dark:border-emerald-800">
                        <Check className="w-3.5 h-3.5" />
                        <span>File Terpilih: {(selectedFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    )}
                  </div>

                  {fileError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={!selectedFile || isLoading}
                      onClick={handleExtractWithAi}
                      className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition cursor-pointer flex items-center justify-center gap-2.5"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{loadingStatus}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Mulai Deteksi & Ekstrak Soal Otomatis (Gemini AI)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: TEMPEL TEKS (COPY-PASTE DARI WORD / WHATSAPP) */}
              {inputTab === 'paste' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Tempelkan Teks Naskah Soal Anda di Bawah Ini:
                    </label>
                    <textarea
                      value={rawText}
                      onChange={e => setRawText(e.target.value)}
                      placeholder="Contoh format:&#10;1. Apa yang dimaksud dengan fotosintesis?&#10;A. Proses respirasi tumbuhan&#10;B. Proses pembuatan makanan dengan bantuan cahaya matahari&#10;C. Proses penyerapan air&#10;D. Proses pengguguran daun&#10;Kunci: B&#10;&#10;2. ..."
                      rows={10}
                      className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      disabled={!rawText.trim() || isLoading}
                      onClick={handleExtractWithAi}
                      className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Deteksi Cerdas dengan AI (Gemini)</span>
                    </button>

                    <button
                      type="button"
                      disabled={!rawText.trim() || isLoading}
                      onClick={handleExtractWithLocalParser}
                      className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ekstrak Cepat Lokal (Regex Tanpa AI)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ERROR NOTIFICATION */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Gagal Mengekstrak Soal</p>
                    <p className="text-[11px] leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* PENGATURAN API KEY GEMINI (COLLAPSIBLE) */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Status AI:
                    </span>
                    {hasServerKey && !apiKey && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Server Sekolah Siap
                      </span>
                    )}
                    {isApiKeySaved && apiKey && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Kunci Pribadi Guru
                      </span>
                    )}
                    {!hasServerKey && !apiKey && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Perlu API Key
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{showApiKeyInput ? 'Tutup Pengaturan API' : 'Atur Kunci Gemini AI'}</span>
                  </button>
                </div>

                {showApiKeyInput && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3 animate-fade-in text-xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          Google Gemini API Key (Gratis)
                        </label>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Dapatkan Kunci Gratis ↗
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                          placeholder="AIzaSy... (Masukkan kunci API Gemini Anda)"
                          className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={handleSaveApiKey}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW SOAL HASIL EKSTRAKSI */}
          {currentStep === 'preview' && (
            <div className="space-y-4">
              
              {/* Header Preview & Info Jumlah */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {extractedQuestions.length}
                  </span>
                  <div>
                    <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-xs sm:text-sm">
                      {extractedQuestions.length} Butir Soal Berhasil Dideteksi!
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      {selectedQuestionIds.size} butir soal dipilih untuk dimasukkan ke Bank Soal
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    {selectedQuestionIds.size === filteredExtractedQuestions.length
                      ? 'Batalkan Semua'
                      : 'Pilih Semua'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('input')}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Upload Ulang
                  </button>
                </div>
              </div>

              {/* Filter Tipe Soal Terdeteksi */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {['ALL', 'Pilihan Ganda', 'Benar/Salah', 'Esai'].map(t => {
                  const count = t === 'ALL'
                    ? extractedQuestions.length
                    : extractedQuestions.filter(q => q.type === t).length;
                  if (count === 0 && t !== 'ALL') return null;

                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPreviewTypeFilter(t)}
                      className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 text-xs ${
                        previewTypeFilter === t
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {t === 'ALL' ? 'Semua Tipe' : t} ({count})
                    </button>
                  );
                })}
              </div>

              {/* LIST KARTU BUTIR SOAL */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {filteredExtractedQuestions.map((q, idx) => {
                  const isSelected = selectedQuestionIds.has(q.id);

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border transition text-xs space-y-2.5 ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      {/* Baris Atas: Nomor, Tipe, & Checkbox */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectQuestion(q.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            Soal #{idx + 1}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {q.type}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Hapus butir soal ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Teks Pertanyaan */}
                      <div className="text-slate-800 dark:text-slate-100 font-medium leading-relaxed pl-6">
                        {q.questionText}
                      </div>

                      {/* Opsi Pilihan Ganda Jika Ada */}
                      {Array.isArray(q.options) && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6 pt-1">
                          {(q.options as OptionItem[]).map((opt, optIdx) => {
                            const optLetter = String.fromCharCode(65 + optIdx);
                            const isCorrect = q.answer === optLetter || q.answer === opt.text;

                            return (
                              <div
                                key={optIdx}
                                className={`p-2 rounded-xl border flex items-center gap-2 text-xs transition ${
                                  isCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold'
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {optLetter}
                                </span>
                                <span className="flex-1 truncate">{opt.text}</span>
                                {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Kunci Jawaban untuk Esai / Benar Salah */}
                      {q.type === 'Esai' && q.answer && (
                        <div className="pl-6 pt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                          <strong>Kunci / Pembahasan:</strong> {q.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            Batal
          </button>

          {currentStep === 'preview' && (
            <button
              type="button"
              disabled={selectedQuestionIds.size === 0}
              onClick={handleSaveToBankSoal}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan ({selectedQuestionIds.size} Soal) ke Bank Soal</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
