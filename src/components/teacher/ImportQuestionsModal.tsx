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
  Check,
  Sliders,
  RefreshCw,
  Cpu,
  KeyRound,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { Question, Subject, OptionItem } from '@/types/cbt';
import { validateAndConvertRawQuestions } from '@/lib/aiQuestionGenerator';
import { parseQuestionsFromRawText } from '@/lib/documentQuestionParser';

interface ImportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubject: Subject;
  existingQuestionsCount?: number;
  onSaveQuestions: (newQuestions: Question[]) => void;
}

const DEFAULT_MODEL = 'gemini-1.5-flash';

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

  // File Upload State & Drag Drop
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // AI Configuration State (Model & API Key)
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);
  const [isPromptCopied, setIsPromptCopied] = useState(false);

  // Template Prompt AI untuk Gemini Web (gemini.google.com) atau ChatGPT
  const aiExtractionPromptTemplate = `Tolong baca dan analisis seluruh butir soal pada naskah ujian yang saya lampirkan ini untuk mata pelajaran "${currentSubject.title}".
Ekstrak seluruh butir soal tanpa terlewat, lalu berikan hasilnya HANYA berupa kode JSON murni (mulai dari [ sampai ]) agar bisa langsung diimpor ke sistem CBT kami, dengan format persis seperti ini:

[
  {
    "type": "Pilihan Ganda",
    "questionText": "Tuliskan isi pertanyaan tanpa nomor urut di sini",
    "options": [
      { "text": "Isi pilihan A tanpa awalan A." },
      { "text": "Isi pilihan B tanpa awalan B." },
      { "text": "Isi pilihan C tanpa awalan C." },
      { "text": "Isi pilihan D tanpa awalan D." }
    ],
    "answer": "A"
  },
  {
    "type": "Benar/Salah",
    "questionText": "Tuliskan pernyataan yang perlu ditentukan apakah Benar atau Salah",
    "options": [],
    "answer": "Benar"
  },
  {
    "type": "Esai",
    "questionText": "Tuliskan pertanyaan esai / uraian di sini",
    "options": [],
    "answer": "Kunci jawaban atau pedoman penskoran"
  }
]

Aturan:
1. Hasilkan HANYA kode JSON murni [ ... ] tanpa teks obrolan pembuka atau penutup.
2. Bersihkan nomor soal ("1.", "2.") dari questionText.
3. Untuk Pilihan Ganda, hilangkan awalan 'A.', 'B.', 'C.', 'D.' dari teks options.
4. Untuk Benar/Salah tunggal, kosongkan options [] dan isi answer dengan string "Benar" atau "Salah".`;

  const handleCopyPrompt = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(aiExtractionPromptTemplate).then(() => {
        setIsPromptCopied(true);
        setTimeout(() => setIsPromptCopied(false), 3000);
      });
    }
  };

  // Load Saved API Key & Model dari localStorage saat modal dibuka
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('cbt_gemini_api_key') || '';
      if (savedKey) {
        setApiKey(savedKey);
        setIsApiKeySaved(true);
      } else {
        setApiKey('');
        setIsApiKeySaved(false);
      }

      const savedModel = localStorage.getItem('cbt_gemini_model') || '';
      if (savedModel) {
        setModelName(savedModel);
      } else {
        setModelName('');
      }
    }

    // Periksa apakah server Vercel sudah terpasang API Key default
    fetch('/api/ai/import-questions')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d.hasServerKey === 'boolean') {
          setHasServerKey(d.hasServerKey);
        }
      })
      .catch(() => {
        // Fallback cek endpoint generator
        fetch('/api/ai/generate-questions')
          .then(r => r.json())
          .then(d => {
            if (d && typeof d.hasServerKey === 'boolean') {
              setHasServerKey(d.hasServerKey);
            }
          })
          .catch(() => {});
      });
  }, [isOpen]);

  // Model yang aktif digunakan (jika kosong, gunakan DEFAULT_MODEL)
  const activeModelId = modelName.trim() || DEFAULT_MODEL;
  const isUsingCustomModel = Boolean(modelName.trim());
  const isUsingCustomKey = Boolean(apiKey.trim());

  // Simpan Pengaturan Gemini (Model & API Key)
  const handleSaveSettings = () => {
    if (typeof window !== 'undefined') {
      if (apiKey.trim()) {
        localStorage.setItem('cbt_gemini_api_key', apiKey.trim());
        setIsApiKeySaved(true);
      } else {
        localStorage.removeItem('cbt_gemini_api_key');
        setIsApiKeySaved(false);
      }

      if (modelName.trim()) {
        localStorage.setItem('cbt_gemini_model', modelName.trim());
      } else {
        localStorage.removeItem('cbt_gemini_model');
      }

      setSaveSuccessMessage(true);
      setTimeout(() => setSaveSuccessMessage(false), 2500);
    }
  };

  // Reset Pengaturan ke Bawaan Default Website
  const handleResetToDefault = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cbt_gemini_api_key');
      localStorage.removeItem('cbt_gemini_model');
      setApiKey('');
      setModelName('');
      setIsApiKeySaved(false);
      setSaveSuccessMessage(true);
      setTimeout(() => setSaveSuccessMessage(false), 2500);
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
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handler Pemrosesan File Berkas Terpilih (dari file input atau drop event)
  const processFile = (file: File) => {
    setFileError(null);
    if (!file) return;

    // Maksimal 20 MB
    if (file.size > 20 * 1024 * 1024) {
      setFileError('Ukuran berkas terlalu besar (maksimal 20 MB).');
      return;
    }

    // Validasi ekstensi yang diizinkan
    const validExtensions = ['.pdf', '.txt', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    const fileNameLower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => fileNameLower.endsWith(ext));

    if (!hasValidExt && file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      setFileError('Format berkas tidak didukung. Harap unggah naskah soal berformat PDF, Dokumen Teks/Word, atau Gambar.');
      return;
    }

    setSelectedFile(file);

    // Baca ke Base64 untuk dikirim ke AI
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFileBase64(base64);
    };
    reader.onerror = () => {
      setFileError('Gagal membaca berkas dokumen yang dipilih.');
    };
    reader.readAsDataURL(file);
  };

  // Handle Drag & Drop Events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  // Handle Manual File Input Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // AI Extraction Handler (PDF / Word / Teks via Gemini)
  const handleExtractWithAi = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const activeKeyDesc = isUsingCustomKey ? 'Kunci Pribadi Guru' : 'Bawaan Website';
      setLoadingStatus(`Menghubungkan ke Gemini (${activeModelId} • ${activeKeyDesc})...`);

      const timer1 = setTimeout(() => {
        setLoadingStatus('Membaca naskah soal & memindai struktur teks...');
      }, 2500);

      const timer2 = setTimeout(() => {
        setLoadingStatus('Menganalisis butir soal, opsi jawaban (A, B, C, D) & kunci jawaban...');
      }, 6500);

      const timer3 = setTimeout(() => {
        setLoadingStatus('Menyusun butir soal dan memverifikasi kelengkapan format CBT...');
      }, 12000);

      const payload: Record<string, any> = {
        subjectTitle: currentSubject.title,
        className: currentSubject.className,
        fileName: selectedFile?.name || 'naskah_soal.pdf',
        mimeType: selectedFile?.type || 'application/pdf',
        apiKey: apiKey.trim(),
        model: modelName.trim()
      };

      if (inputTab === 'upload') {
        if (!fileBase64) {
          throw new Error('Silakan pilih atau seret file PDF naskah soal terlebih dahulu.');
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
        throw new Error('Tidak ada butir soal yang berhasil diekstrak dari dokumen. Pastikan dokumen memuat butir pertanyaan.');
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
    } catch {
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
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Import Naskah Soal Otomatis
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  PDF & Dokumen
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  {activeModelId}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target Mata Pelajaran: <strong>{currentSubject.title}</strong> ({currentSubject.className})
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
              
              {/* Petunjuk Singkat Penggunaan */}
              {/* KARTU PANDUAN ALTERNATIF BEBAS HIGH DEMAND (PROMPT GEMINI WEB / CHATGPT) */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-violet-50 via-indigo-50 to-teal-50 dark:from-violet-950/40 dark:via-indigo-950/40 dark:to-teal-950/30 border border-violet-200/80 dark:border-violet-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">
                        Solusi Bebas Kendala &quot;High Demand&quot; (100% Gratis &amp; Tanpa Limit)
                      </p>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold">
                        Rekomendasi
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Jika server API sibuk, upload PDF Anda langsung ke <strong>Gemini Chat</strong> atau <strong>ChatGPT</strong> menggunakan prompt siap pakai, lalu salin hasilnya ke tab <em>Tempel Teks</em> di bawah.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                      isPromptCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20'
                    }`}
                  >
                    {isPromptCopied ? <Check className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                    <span>{isPromptCopied ? 'Prompt Berhasil Disalin!' : 'Salin Prompt AI'}</span>
                  </button>

                  <a
                    href="https://gemini.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/50 text-xs font-bold transition shadow-xs"
                    title="Buka Gemini Web di Tab Baru"
                  >
                    <span>Gemini Web</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
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

              {/* TAB 1: UPLOAD DOKUMEN DENGAN DRAG AND DROP AKTIF */}
              {inputTab === 'upload' && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx,application/pdf"
                    className="hidden"
                  />

                  {/* AREA DRAG AND DROP DENGAN EVENT LISTENER LENGKAP */}
                  <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group relative select-none ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-100/70 dark:bg-emerald-950/60 ring-4 ring-emerald-500/20 scale-[1.01]'
                        : 'border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500 dark:hover:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition shadow-sm ${
                      isDragging
                        ? 'bg-emerald-600 text-white scale-110 animate-bounce'
                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105'
                    }`}>
                      <FileUp className="w-8 h-8" />
                    </div>

                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {isDragging
                          ? 'Lepaskan File Dokumen di Sini...'
                          : selectedFile
                          ? selectedFile.name
                          : 'Tarik & Letakkan File di Sini, atau Klik untuk Memilih'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Format yang didukung: <strong>PDF (Sangat Direkomendasikan)</strong>, TXT, DOCX, dan Foto Naskah (Maks. 20 MB)
                      </p>
                    </div>

                    {selectedFile && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-300 dark:border-emerald-800">
                          <Check className="w-3.5 h-3.5" />
                          <span>File Terpilih: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setFileBase64('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="p-1 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-600 text-slate-600 transition cursor-pointer"
                          title="Hapus / ganti berkas"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
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
                          <Sparkles className="w-4.5 h-4.5" />
                          <span>Deteksi & Ekstrak Soal dengan AI ({activeModelId})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: COPY-PASTE TEKS NASKAH SOAL */}
              {inputTab === 'paste' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Tempelkan Teks Naskah Ujian atau JSON Hasil AI di Sini:
                      </label>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Mendukung teks naskah biasa, Word, maupun JSON AI</span>
                      </span>
                    </div>
                    <textarea
                      value={rawText}
                      onChange={e => setRawText(e.target.value)}
                      placeholder="Contoh format teks naskah:&#10;1. Matahari merupakan pusat tata surya kita.&#10;A. Benar&#10;B. Salah&#10;Kunci: A&#10;&#10;2. Apa fungsi klorofil pada daun?&#10;A. Menyerap cahaya matahari&#10;B. Menyerap air tanah&#10;C. Mengeluarkan karbon dioksida&#10;D. Menghasilkan getah&#10;Kunci: A&#10;&#10;3. [Benar/Salah] Suhu nol mutlak adalah -273.15 derajat Celsius.&#10;Kunci: Benar&#10;&#10;4. [Esai] Jelaskan proses terjadinya daur air!&#10;Kunci: Evaporasi, kondensasi, presipitasi.&#10;&#10;ATAU tempelkan langsung kode JSON dari Gemini Web / ChatGPT!"
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
                      <span>Deteksi Cerdas AI ({activeModelId})</span>
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

              {/* STATUS AI & PENGATURAN MODEL + API KEY */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  
                  {/* BARIS KETERANGAN STATUS AI LENGKAP */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Status AI:
                        </span>
                      </div>

                      {/* Keterangan Model Aktif */}
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <span>Model: {activeModelId}</span>
                        <span className="text-[9px] font-normal opacity-80">
                          ({isUsingCustomModel ? 'Kustom Guru' : 'Bawaan Website'})
                        </span>
                      </span>

                      {/* Keterangan Kunci API yang Digunakan */}
                      {isUsingCustomKey ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>API Key: Pribadi Guru</span>
                        </span>
                      ) : hasServerKey ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>API Key: Bawaan Website (Server Sekolah)</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>API Key: Perlu Diisi</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                      className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 shrink-0 self-start sm:self-auto"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{showApiKeyInput ? 'Tutup Pengaturan' : 'Atur Model & API Key'}</span>
                    </button>
                  </div>

                  {/* PESAN NOTIFIKASI TERSIMPAN */}
                  {saveSuccessMessage && (
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5 animate-fade-in">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pengaturan AI berhasil diperbarui!</span>
                    </div>
                  )}

                  {/* FORM PENGATURAN MANUAL MODEL & API KEY (MURNI INPUT MANUAL GURU) */}
                  {showApiKeyInput && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in text-xs">
                      
                      {/* 1. Pengaturan Nama Model Gemini AI (Input Manual Bebas Tanpa Chips/Dropdown) */}
                      <div>
                        <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                          <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Nama Model Gemini AI (Ketik Manual):</span>
                        </label>
                        <input
                          type="text"
                          value={modelName}
                          onChange={e => setModelName(e.target.value)}
                          placeholder="gemini-2.5-flash (Kosongkan jika menggunakan bawaan website)"
                          className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          {modelName.trim() ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              ✨ Menggunakan model inputan Anda: <code>{modelName.trim()}</code>
                            </span>
                          ) : (
                            <span>
                              ℹ️ Kosong = Menggunakan model default website (<code>{DEFAULT_MODEL}</code>).
                            </span>
                          )}
                        </p>
                      </div>

                      {/* 2. Pengaturan API Key Gemini AI */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Kunci Google Gemini API (Opsional):</span>
                          </label>
                          <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <span>Dapatkan API Key Gratis</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                          placeholder="AIzaSy... (Kosongkan jika menggunakan API Key bawaan website)"
                          className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          {apiKey.trim() ? (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                              🔑 Menggunakan API Key pribadi yang tersimpan di browser ini.
                            </span>
                          ) : (
                            <span>
                              ℹ️ Kosong = Menggunakan API Key bawaan dari server website sekolah.
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Tombol Aksi Pengaturan */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleResetToDefault}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset ke Default Website</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveSettings}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan Pengaturan</span>
                        </button>
                      </div>

                    </div>
                  )}

                </div>
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
                      {selectedQuestionIds.size} butir soal dipilih • Model: <strong>{activeModelId}</strong> ({isUsingCustomKey ? 'Kunci Pribadi' : 'Bawaan Website'})
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
                {['ALL', 'Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah', 'Menjodohkan', 'Isian Singkat', 'Esai'].map(t => {
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
