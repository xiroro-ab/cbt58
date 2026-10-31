'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Subject, Question } from '@/types/cbt';
import {
  STANDARDS_OPTIONS,
  StandardBadge,
  QuestionCounts,
  getRecommendedTopics,
  buildAiQuestionPrompt,
  validateAndConvertRawQuestions,
  sanitizeAndParseAiJson,
  extractSubjectAndGrade
} from '@/lib/aiQuestionGenerator';
import {
  Sparkles,
  X,
  Check,
  Plus,
  Minus,
  Copy,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
  FileText,
  BookOpen,
  Sliders,
  ChevronDown,
  ChevronUp,
  Brain,
  Layers,
  ArrowRight,
  RotateCcw,
  Trash2,
  ClipboardPaste,
  ShieldCheck,
  Cpu,
  Info,
  CheckSquare,
  Square
} from 'lucide-react';

interface AiQuestionGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSubject?: Subject;
  allSubjects?: Subject[];
  existingQuestionsCount?: number;
  onSaveQuestions: (questions: Question[]) => void;
}

export function AiQuestionGeneratorModal({
  isOpen,
  onClose,
  currentSubject,
  allSubjects = [],
  existingQuestionsCount = 0,
  onSaveQuestions
}: AiQuestionGeneratorModalProps) {
  // Step 1 = Form konfigurasi, Step 2 = Preview & Seleksi hasil
  const [currentStep, setCurrentStep] = useState<'config' | 'preview'>('config');

  // Selected subject
  const [targetSubjectId, setTargetSubjectId] = useState<string>(currentSubject?.id || '');
  const activeSubject = useMemo(() => {
    return allSubjects.find(s => s.id === targetSubjectId) || currentSubject || allSubjects[0];
  }, [allSubjects, targetSubjectId, currentSubject]);

  // Inputan Eksplisit Mata Pelajaran & Jenjang Kelas (Bisa diedit bebas oleh guru)
  const [subjectName, setSubjectName] = useState<string>(() => {
    return extractSubjectAndGrade(currentSubject?.title, currentSubject?.className).cleanSubject || 'Informatika';
  });
  const [gradeLevel, setGradeLevel] = useState<string>(() => {
    return extractSubjectAndGrade(currentSubject?.title, currentSubject?.className).grade || 'Kelas 9 (IX)';
  });

  // Sinkronisasi saat activeSubject berganti
  useEffect(() => {
    if (activeSubject) {
      const ext = extractSubjectAndGrade(activeSubject.title, activeSubject.className);
      setSubjectName(ext.cleanSubject);
      setGradeLevel(ext.grade);
    }
  }, [activeSubject?.id, activeSubject?.title, activeSubject?.className]);

  // Rekomendasi Topik Cepat Berdasarkan Mapel Terpilih
  const recommendedTopics = useMemo(() => {
    return getRecommendedTopics(subjectName || activeSubject?.title || 'Informatika');
  }, [subjectName, activeSubject?.title]);

  // 1. STANDAR & KEDALAMAN SOAL (MULTI-CENTANG CHECKBOX)
  const [selectedStandards, setSelectedStandards] = useState<StandardBadge[]>(['AKM', 'TKA']);

  // 2. MATERI & KESULITAN
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Campuran' | 'Mudah' | 'Sedang' | 'Sukar (HOTS)'>('Campuran');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 3. JUMLAH & TIPE SOAL (DITENTUKAN OLEH GURU)
  const [counts, setCounts] = useState<QuestionCounts>({
    pg: 5,
    pgk: 2,
    bs: 2,
    jodoh: 1,
    isian: 0,
    esai: 0
  });

  // 4. MODEL GEMINI & KUNCI API KESUKAAN GURU
  const [modelName, setModelName] = useState<string>('gemini-1.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);

  // Fallback Manual Paste JSON Modal & Status State
  const [manualJsonInput, setManualJsonInput] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);

  // Status Kunci Vercel Server & Model Resmi yang Aktif
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Periksa apakah Vercel sudah terpasang GEMINI_API_KEY setiap modal dibuka
  useEffect(() => {
    if (isOpen) {
      fetch('/api/ai/generate-questions')
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.hasServerKey === 'boolean') {
            setHasServerKey(data.hasServerKey);
          }
          if (data && Array.isArray(data.availableModels) && data.availableModels.length > 0) {
            setAvailableModels(data.availableModels);
          }
        })
        .catch(() => {
          setHasServerKey(false);
        });
    }
  }, [isOpen]);

  // Status & Loading State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('Menginisialisasi...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Generated questions for preview
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Load Saved API key & Model dari localStorage saat modal dibuka
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('cbt_gemini_api_key') || '';
      if (savedKey) {
        setApiKey(savedKey);
        setIsApiKeySaved(true);
      }
      const savedModel = localStorage.getItem('cbt_gemini_model') || '';
      if (savedModel) {
        // Reset jika sebelumnya tersimpan model usang 'gemini-2.0-flash'
        if (savedModel === 'gemini-2.0-flash') {
          setModelName('gemini-1.5-flash');
          localStorage.setItem('cbt_gemini_model', 'gemini-1.5-flash');
        } else {
          setModelName(savedModel);
        }
      }
    }
  }, []);

  // Update targetSubjectId jika currentSubject berganti
  useEffect(() => {
    if (currentSubject?.id) {
      setTargetSubjectId(currentSubject.id);
    }
  }, [currentSubject?.id]);

  // Total butir soal
  const totalQuestions =
    counts.pg + counts.pgk + counts.bs + counts.jodoh + counts.isian + counts.esai;

  // Toggle Checkbox Standar (Bisa pilih 1, 2, atau semuanya)
  const toggleStandard = (stdId: StandardBadge) => {
    setSelectedStandards(prev => {
      if (prev.includes(stdId)) {
        // Jangan biarkan kosong sama sekali, minimal 1 standar aktif
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== stdId);
      } else {
        return [...prev, stdId];
      }
    });
  };

  // Counter Helpers
  const updateCount = (key: keyof QuestionCounts, delta: number) => {
    setCounts(prev => {
      const nextVal = Math.max(0, Math.min(50, (prev[key] || 0) + delta));
      return { ...prev, [key]: nextVal };
    });
  };

  const setCountDirect = (key: keyof QuestionCounts, val: number) => {
    setCounts(prev => ({ ...prev, [key]: Math.max(0, Math.min(50, val)) }));
  };

  // Pintasan Komposisi Cepat
  const applyQuickTemplate = (tpl: 'ringkas' | 'campuran' | 'lengkap' | 'reset') => {
    if (tpl === 'ringkas') {
      setCounts({ pg: 3, pgk: 1, bs: 1, jodoh: 0, isian: 0, esai: 0 });
    } else if (tpl === 'campuran') {
      setCounts({ pg: 5, pgk: 2, bs: 2, jodoh: 1, isian: 0, esai: 0 });
    } else if (tpl === 'lengkap') {
      setCounts({ pg: 10, pgk: 4, bs: 3, jodoh: 2, isian: 1, esai: 0 });
    } else if (tpl === 'reset') {
      setCounts({ pg: 0, pgk: 0, bs: 0, jodoh: 0, isian: 0, esai: 0 });
    }
  };

  // Simpan Pengaturan Gemini (Model & API Key) ke localStorage
  const handleSaveGeminiSettings = () => {
    if (typeof window !== 'undefined') {
      // Simpan API Key
      if (apiKey.trim()) {
        localStorage.setItem('cbt_gemini_api_key', apiKey.trim());
        setIsApiKeySaved(true);
      } else {
        localStorage.removeItem('cbt_gemini_api_key');
        setIsApiKeySaved(false);
      }

      // Simpan Model
      if (modelName.trim()) {
        localStorage.setItem('cbt_gemini_model', modelName.trim());
      }
    }
  };

  const activeModelId = modelName.trim() || 'gemini-1.5-flash';

  // Salin prompt untuk dipakai di gemini.google.com
  const handleCopyPrompt = () => {
    const finalSubject = subjectName.trim() || activeSubject?.title || 'Informatika';
    const finalGrade = gradeLevel.trim() || activeSubject?.className || 'Kelas 9 (IX)';
    const defaultTopic = recommendedTopics[0] || 'Berpikir Komputasional dan Jaringan Komputer';
    const finalTopic = topic.trim() || defaultTopic;

    const promptText = buildAiQuestionPrompt({
      subjectTitle: finalSubject,
      className: finalGrade,
      topic: finalTopic,
      difficulty,
      selectedStandards,
      counts,
      customInstructions,
      model: activeModelId
    });

    navigator.clipboard.writeText(promptText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Generate via Next.js API Route (Gemini API)
  const handleGenerate = async () => {
    if (totalQuestions <= 0) {
      setErrorMessage('Tentukan minimal 1 butir soal pada kolom tipe soal.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStepText(`Menghubungkan ke Gemini (${activeModelId})...`);

    const timer1 = setTimeout(() => {
      setLoadingStepText('Menganalisis standar kedalaman soal yang dicentang...');
    }, 1800);

    const timer2 = setTimeout(() => {
      setLoadingStepText('Menyusun stimulus konteks, opsi butir soal, dan kunci...');
    }, 4500);

    const timer3 = setTimeout(() => {
      setLoadingStepText('Memvalidasi format data CBT...');
    }, 8000);

    const finalSubject = subjectName.trim() || activeSubject?.title || 'Informatika';
    const finalGrade = gradeLevel.trim() || activeSubject?.className || 'Kelas 9 (IX)';
    const defaultTopic = recommendedTopics[0] || 'Berpikir Komputasional dan Jaringan Komputer';
    const finalTopic = topic.trim() || defaultTopic;

    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectTitle: finalSubject,
          className: finalGrade,
          topic: finalTopic,
          difficulty,
          selectedStandards,
          counts,
          customInstructions,
          apiKey: apiKey.trim(),
          model: activeModelId
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      let data: any = null;
      const rawText = await response.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        if (response.status === 504) {
          throw new Error('Proses pembuatan soal melebihi batas waktu (Timeout 504). Coba gunakan model cepat "gemini-1.5-flash" atau kurangi jumlah butir soal.');
        }
        throw new Error(`Server tidak mengembalikan respon JSON valid (Status ${response.status}).`);
      }

      if (!response.ok) {
        if (data?.error === 'API_KEY_REQUIRED') {
          setShowApiKeyInput(true);
        }
        throw new Error(data?.message || 'Gagal membuat butir soal dengan AI.');
      }

      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('AI tidak mengembalikan butir soal yang valid.');
      }

      // Format dan validasi hasil soal
      const converted = validateAndConvertRawQuestions(
        data.questions,
        activeSubject?.id || '',
        existingQuestionsCount + 1
      );

      setGeneratedQuestions(converted);
      setSelectedQuestionIds(new Set(converted.map(q => q.id)));
      setCurrentStep('preview');
    } catch (err: any) {
      console.error('Error generating questions:', err);
      setErrorMessage(err.message || 'Terjadi kendala saat memproses butir soal.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsLoading(false);
    }
  };

  // Parse manual JSON hasil paste dengan auto-repair (bebas error tanda kutip)
  const handleImportPastedJson = () => {
    try {
      setPasteError(null);
      if (!manualJsonInput.trim()) {
        setPasteError('Silakan tempelkan teks balasan JSON dari Gemini terlebih dahulu.');
        return;
      }

      // Bersihkan dan perbaiki JSON menggunakan multi-pass sanitizer & jsonrepair
      const parsed = sanitizeAndParseAiJson(manualJsonInput);

      const converted = validateAndConvertRawQuestions(
        parsed,
        activeSubject?.id || '',
        existingQuestionsCount + 1
      );

      if (converted.length === 0) {
        setPasteError('Tidak ada butir soal yang berhasil dibaca dari teks JSON. Pastikan format memuat pertanyaan dan opsi.');
        return;
      }

      setGeneratedQuestions(converted);
      setSelectedQuestionIds(new Set(converted.map(q => q.id)));
      setShowPasteModal(false);
      setManualJsonInput('');
      setPasteError(null);
      setCurrentStep('preview');
    } catch (err: any) {
      console.error('Error importing pasted JSON:', err);
      setPasteError(err.message || 'Format JSON tidak valid. Pastikan teks yang ditempel memuat array butir soal mulai dari tanda [ hingga ].');
    }
  };

  // Toggle seleksi soal per item
  const toggleQuestionSelection = (qId: string) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  // Toggle semua soal
  const toggleSelectAll = () => {
    if (selectedQuestionIds.size === generatedQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(generatedQuestions.map(q => q.id)));
    }
  };

  // Hapus butir soal dari daftar review
  const handleRemoveQuestion = (qId: string) => {
    setGeneratedQuestions(prev => prev.filter(q => q.id !== qId));
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      next.delete(qId);
      return next;
    });
  };

  // Konfirmasi simpan soal terpilih ke Bank Soal
  const handleConfirmSave = () => {
    const toSave = generatedQuestions.filter(q => selectedQuestionIds.has(q.id));
    if (toSave.length === 0) {
      setPreviewNotice('Pilih minimal 1 butir soal dengan mencentang kotak untuk disimpan ke Bank Soal.');
      setTimeout(() => setPreviewNotice(null), 4000);
      return;
    }

    const finalQuestions = toSave.map((q, idx) => ({
      ...q,
      subjectId: activeSubject?.id || q.subjectId,
      orderIndex: existingQuestionsCount + idx + 1
    }));

    onSaveQuestions(finalQuestions);
    onClose();
  };

  if (!isOpen) return null;

  // Deskripsi ringkas sintesis standar yang dicentang
  const activeStandardsObjects = STANDARDS_OPTIONS.filter(s => selectedStandards.includes(s.id));
  const standardsSummaryText =
    activeStandardsObjects.map(s => s.badge).join(' + ') || 'Standar Umum';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* ============================================================ */}
        {/* HEADER MODAL                                                 */}
        {/* ============================================================ */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-600/10 via-fuchsia-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  AI Question Generator
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800">
                  {activeModelId}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih kedalaman standar (AKM, PISA, TKA, Harian) dan tentukan jumlah soal dengan mudah
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

        {/* ============================================================ */}
        {/* BODY CONTENT                                                 */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {currentStep === 'config' ? (
            <>
              {/* TARGET MATA PELAJARAN & JENJANG KELAS (INPUT EKSPLISIT GURU) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50/70 via-slate-50 to-slate-50 dark:from-violet-950/30 dark:via-slate-800/60 dark:to-slate-800/60 border border-violet-200/60 dark:border-violet-900/40 space-y-3.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-600 text-white shadow-2xs">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Target Mata Pelajaran & Jenjang Kelas
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pastikan mapel dan jenjang kelas sesuai agar AI Gemini fokus pada materi kurikulum yang tepat
                      </p>
                    </div>
                  </div>

                  {allSubjects.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">Paket Ujian:</span>
                      <select
                        value={targetSubjectId}
                        onChange={e => setTargetSubjectId(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
                      >
                        {allSubjects.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            {sub.title} ({sub.className})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Kolom 1: Nama Mata Pelajaran (Disiplin Ilmu) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>Nama Mata Pelajaran *</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(Disiplin Ilmu)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Bisa diedit</span>
                    </label>
                    <input
                      type="text"
                      value={subjectName}
                      onChange={e => setSubjectName(e.target.value)}
                      placeholder="Contoh: Informatika, Matematika, IPA..."
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-violet-700 dark:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-2xs"
                    />
                    {/* Tombol Pilihan Cepat Mapel */}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {['Informatika', 'Matematika', 'IPA', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPS', 'PPKn', 'PAI', 'PJOK'].map(sub => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSubjectName(sub)}
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md transition cursor-pointer ${
                            subjectName.toLowerCase() === sub.toLowerCase()
                              ? 'bg-violet-600 text-white shadow-2xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kolom 2: Jenjang / Tingkat Kelas */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>Jenjang / Tingkat Kelas *</span>
                      <span className="text-[10px] text-slate-400">Sasaran Soal</span>
                    </label>
                    <select
                      value={gradeLevel}
                      onChange={e => setGradeLevel(e.target.value)}
                      className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer shadow-2xs [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
                    >
                      <option value="Kelas 9 (IX)">Kelas 9 (IX SMP)</option>
                      <option value="Kelas 8 (VIII)">Kelas 8 (VIII SMP)</option>
                      <option value="Kelas 7 (VII)">Kelas 7 (VII SMP)</option>
                      <option value="Semua Tingkat (SMP)">Semua Tingkat (SMP)</option>
                    </select>

                    <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 pt-0.5">
                      <span>Rombel paket ujian: <b>{activeSubject?.className || 'Semua Rombel'}</b></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. TOMBOL CENTANG STANDAR KEDALAMAN SOAL (BISA PILIH LEBIH DARI 1) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span>1. Standar & Kedalaman Karakteristik Soal</span>
                    <span className="text-[11px] font-normal text-violet-600 dark:text-violet-400">
                      (Centang standar yang ingin diterapkan — bisa gabung beberapa standar)
                    </span>
                  </label>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                    {selectedStandards.length} Standar Terpilih
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STANDARDS_OPTIONS.map(opt => {
                    const isChecked = selectedStandards.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleStandard(opt.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 relative ${
                          isChecked
                            ? `${opt.colorScheme.activeBg} ${opt.colorScheme.activeBorder} ring-2 ring-violet-500/20 shadow-xs`
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isChecked ? (
                            <div className="w-5 h-5 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                          )}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {opt.label}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                isChecked
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Info Sintesis Standar yang Dicentang */}
                <div className="p-2.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/80 dark:border-violet-900/40 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Info className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                  <span>
                    <strong>Karakteristik Kedalaman Soal:</strong> AI akan merumuskan butir soal berbobot{' '}
                    <strong className="text-violet-700 dark:text-violet-300">{standardsSummaryText}</strong>.
                    {selectedStandards.includes('AKM') || selectedStandards.includes('PISA')
                      ? ' Soal akan dilengkapi stimulus bacaan teks/data nyata dan penalaran analitis (HOTS).'
                      : ' Soal menguji konsep inti pembelajaran secara presisi.'}
                  </span>
                </div>
              </div>

              {/* 2. TOPIK / MATERI & TINGKAT KESULITAN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>2. Topik / KD / Materi Pembelajaran *</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Ketik materi atau pilih topik cepat
                    </span>
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder={`Contoh: ${recommendedTopics.slice(0, 2).join(', ')}...`}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-2xs"
                  />

                  {/* Rekomendasi Topik Cepat */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Pilihan Cepat Topik {subjectName}:</span>
                    {recommendedTopics.map((recTopic, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTopic(recTopic)}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          topic === recTopic
                            ? 'bg-violet-600 text-white border-violet-600 shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-950 hover:text-violet-700 dark:hover:text-violet-300 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        + {recTopic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tingkat Kesulitan Kognitif
                  </label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as any)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer shadow-2xs [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
                  >
                    <option value="Campuran">Campuran Proporsional</option>
                    <option value="Mudah">Mudah (Dasar / Pemahaman)</option>
                    <option value="Sedang">Sedang (Aplikasi / Terapan)</option>
                    <option value="Sukar (HOTS)">Sukar (Penalaran HOTS C4-C6)</option>
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Menyesuaikan taksonomi kognitif Bloom / Webb.
                  </p>
                </div>
              </div>

              {/* 3. JUMLAH & TIPE SOAL (DITENTUKAN OLEH GURU) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>3. Tentukan Jumlah & Komposisi Tipe Soal</span>
                      <span className="text-slate-400 font-normal">
                        (Klik [-] dan [+] sesuai kebutuhan)
                      </span>
                    </label>
                  </div>

                  {/* Tombol Cepat Komposisi */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-semibold">Pintasan:</span>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('ringkas')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-950 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      5 Ringkas
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('campuran')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-950 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      10 Campuran
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('lengkap')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-950 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                    >
                      20 Ujian
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickTemplate('reset')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      Reset 0
                    </button>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-600 text-white shadow-xs ml-1">
                      Total: {totalQuestions} Soal
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {[
                    { key: 'pg' as const, label: 'Pilihan Ganda', short: 'PG', sub: '1 Kunci' },
                    { key: 'pgk' as const, label: 'PG Kompleks', short: 'PGK', sub: 'Multi Kunci' },
                    { key: 'bs' as const, label: 'Benar / Salah', short: 'B/S', sub: 'Tabel B/S' },
                    { key: 'jodoh' as const, label: 'Menjodohkan', short: 'Jodoh', sub: 'Pasangan' },
                    { key: 'isian' as const, label: 'Isian Singkat', short: 'Isian', sub: 'Kata Kunci' },
                    { key: 'esai' as const, label: 'Esai / Uraian', short: 'Esai', sub: 'Rubrik' }
                  ].map(item => {
                    const val = counts[item.key];
                    return (
                      <div
                        key={item.key}
                        className={`p-3 rounded-2xl border transition-all text-center flex flex-col justify-between ${
                          val > 0
                            ? 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-300 dark:border-violet-800/80 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                              {item.short}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {val} Soal
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            {item.label}
                          </p>
                        </div>

                        {/* Counter Controls */}
                        <div className="flex items-center justify-center gap-1.5 mt-2.5">
                          <button
                            type="button"
                            onClick={() => updateCount(item.key, -1)}
                            disabled={val <= 0}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={val}
                            onChange={e => setCountDirect(item.key, parseInt(e.target.value) || 0)}
                            className="w-10 text-center text-xs font-bold py-1 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateCount(item.key, 1)}
                            className="w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold flex items-center justify-center transition cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. STATUS KONEKSI GEMINI & PENGATURAN MANUAL */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Cpu className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Koneksi AI Gemini
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                      Model: {activeModelId}
                    </span>
                    {hasServerKey && !apiKey && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Vercel Server Aktif (Siap Pakai)
                      </span>
                    )}
                    {isApiKeySaved && apiKey && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Kunci Pribadi Guru
                      </span>
                    )}
                    {hasServerKey === false && !apiKey && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Belum Ada Kunci di Vercel
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{showApiKeyInput ? 'Tutup Pengaturan Manual' : 'Atur Model & API Key Manual'}</span>
                  </button>
                </div>

                {/* Banner Status Kunci Vercel (Terlihat saat server terhubung) */}
                {hasServerKey && !apiKey && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Vercel Terhubung:</strong> Server Vercel sudah terpasang API Key Gemini. Semua guru dapat langsung membuat soal tanpa perlu menginputkan kunci maupun model secara manual!
                    </span>
                  </div>
                )}

                {/* Bagian Penginputan Model & API Key Manual (Hanya muncul saat diklik) */}
                {showApiKeyInput && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-3.5 animate-fade-in">
                    {/* 1. Penginputan Versi Model Gemini Manual */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Nama Model Gemini AI (Input Manual):
                        </label>
                        <input
                          type="text"
                          value={modelName}
                          onChange={e => {
                            const val = e.target.value;
                            setModelName(val);
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('cbt_gemini_model', val.trim());
                            }
                          }}
                          placeholder="Masukkan nama model (contoh: gemini-1.5-flash, gemini-2.5-flash, gemini-3.0-flash)"
                          className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Ketik kode model yang aktif dari Google AI Studio (misal: <code className="text-violet-600 dark:text-violet-400 font-bold">gemini-1.5-flash</code> atau model terbaru).
                        </p>

                        {/* Pilihan Cepat Model Resmi Aktif */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">Pilihan cepat:</span>
                          {(availableModels.length > 0 ? availableModels.slice(0, 5) : ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-3.8-flash']).map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setModelName(m);
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('cbt_gemini_model', m);
                                }
                              }}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                                modelName === m
                                  ? 'bg-violet-600 text-white border-violet-600 font-bold shadow-2xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-col justify-center">
                        <p>
                          <strong>Model Aktif Digunakan:</strong>{' '}
                          <span className="font-mono text-violet-600 dark:text-violet-400 font-bold">
                            {activeModelId}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Model AI ini yang akan otomatis dipanggil saat proses pembuatan butir soal CBT.
                        </p>
                      </div>
                    </div>

                    {/* 2. Penginputan Kunci API Pribadi */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>Kunci Google Gemini API Pribadi (Opsional):</span>
                        </label>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline"
                        >
                          Dapatkan API Key Gratis di Google AI Studio →
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                          placeholder="AIzaSy... (Kosongkan jika menggunakan API Key Vercel sekolah)"
                          className="flex-1 text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleSaveGeminiSettings}
                          className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition cursor-pointer shrink-0"
                        >
                          Simpan Pengaturan
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        💡 <strong>Catatan:</strong> Jika Anda mengosongkan kolom kunci di atas, sistem otomatis menggunakan kunci server Vercel sekolah.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* CATATAN KHUSUS (OPSIONAL) */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Catatan Khusus untuk AI (Opsional)</span>
                  {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvanced && (
                  <div className="pt-2">
                    <textarea
                      value={customInstructions}
                      onChange={e => setCustomInstructions(e.target.value)}
                      placeholder="Misal: Sertakan cerita pendek kearifan lokal Indonesia, hindari kalimat yang terlalu panjang, prioritaskan stimulus grafik data..."
                      rows={2}
                      className="w-full text-xs p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                )}
              </div>

              {/* ERROR ALERT */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="font-bold">Gagal Membuat Soal:</strong>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ======================================================== */
            /* STEP 2: REVIEW & PREVIEW HASIL SOAL                      */
            /* ======================================================== */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      {generatedQuestions.length} Butir Soal Berhasil Dibuat ({activeModelId})!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Standar: {standardsSummaryText} • Centang soal yang ingin disimpan ke Bank Soal.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer"
                  >
                    {selectedQuestionIds.size === generatedQuestions.length
                      ? 'Batal Pilih Semua'
                      : 'Pilih Semua Soal'}
                  </button>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 text-white">
                    {selectedQuestionIds.size} Terpilih
                  </span>
                </div>
              </div>

              {/* Notifikasi Seleksi Soal (Tanpa Alert Browser) */}
              {previewNotice && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2 shadow-xs animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{previewNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewNotice(null)}
                    className="p-1 rounded-md text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* LIST SOAL GENERATED */}
              <div className="space-y-3.5">
                {generatedQuestions.map((q, idx) => {
                  const isSelected = selectedQuestionIds.has(q.id);
                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 border-violet-400 dark:border-violet-600/80 shadow-md ring-1 ring-violet-500/20'
                          : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleQuestionSelection(q.id)}
                            className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Soal #{idx + 1}
                          </span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                            {q.type}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                          title="Hapus dari daftar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Teks Soal / Stimulus */}
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed mb-3">
                        {q.questionText}
                      </p>

                      {/* Tampilan Opsi Berdasarkan Tipe */}
                      {q.type === 'Pilihan Ganda' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 text-xs">
                          {Array.isArray(q.options) &&
                            q.options.map((opt: any, optIdx: number) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isCorrect = q.answer === letter;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded-xl border flex items-center gap-2 ${
                                    isCorrect
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                                    {letter}
                                  </span>
                                  <span className="text-[11px]">{opt.text}</span>
                                  {isCorrect && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {q.type === 'Pilihan Ganda Kompleks' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 text-xs">
                          {Array.isArray(q.options) &&
                            q.options.map((opt: any, optIdx: number) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isCorrect = Array.isArray(q.answer) && q.answer.includes(letter);
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2 rounded-xl border flex items-center gap-2 ${
                                    isCorrect
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">
                                    {letter}
                                  </span>
                                  <span className="text-[11px]">{opt.text}</span>
                                  {isCorrect && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {q.type === 'Benar/Salah' && (
                        <div className="space-y-1.5 mb-2 text-xs">
                          {Array.isArray(q.options) &&
                            q.options.map((opt: any, optIdx: number) => {
                              const ans = Array.isArray(q.answer) ? q.answer[optIdx] : 'Benar';
                              return (
                                <div
                                  key={optIdx}
                                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]"
                                >
                                  <span>{opt.text}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                      ans === 'Benar'
                                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                    }`}
                                  >
                                    Kunci: {ans}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {q.type === 'Menjodohkan' && (
                        <div className="space-y-1.5 mb-2 text-xs">
                          {Array.isArray(q.options) &&
                            q.options.map((pair: any, pairIdx: number) => (
                              <div
                                key={pairIdx}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]"
                              >
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {pair?.q?.text}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-bold text-violet-600 dark:text-violet-400 text-right">
                                  {pair?.a?.text}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      {q.type === 'Isian Singkat' && (
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px]">
                          <span className="font-semibold text-slate-500">Kunci Jawaban Valid: </span>
                          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {Array.isArray(q.answer) ? q.answer.join(' / ') : String(q.answer)}
                          </strong>
                        </div>
                      )}

                      {q.type === 'Esai' && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                          <span className="font-semibold text-slate-500 block">
                            Rubrik / Panduan Penilaian:
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 italic">
                            {String(q.answer)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* FOOTER ACTIONS                                               */}
        {/* ============================================================ */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {currentStep === 'config' ? (
            <>
              {/* Opsi Salin Prompt & Impor JSON (100% Gratis Tanpa API Key) */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="Salin prompt untuk ditempel ke gemini.google.com"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Prompt Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Salin Prompt AI</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPasteError(null);
                    setShowPasteModal(true);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="Tempel JSON hasil dari gemini.google.com"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tempel JSON Hasil</span>
                </button>
              </div>

              {/* Tombol Utama: Generate Otomatis */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || totalQuestions <= 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-violet-600/25 transition cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{loadingStepText}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate {totalQuestions} Soal ({activeModelId})</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Back button */}
              <button
                type="button"
                onClick={() => setCurrentStep('config')}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ubah Pengaturan / Generate Ulang</span>
              </button>

              {/* Confirm Save */}
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={selectedQuestionIds.size === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan {selectedQuestionIds.size} Soal ke Bank Soal</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL TEMPEL JSON MANUAL (100% BEBAS TANPA KUNCI API)        */}
      {/* ============================================================ */}
      {showPasteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-violet-600" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tempel JSON Hasil dari Gemini Web
                </h4>
              </div>
              <button
                onClick={() => {
                  setPasteError(null);
                  setShowPasteModal(false);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pasteError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <strong className="font-bold">Gagal Memproses JSON:</strong>
                  <p className="text-[11px] leading-relaxed">{pasteError}</p>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              1. Klik tombol <strong>&apos;Salin Prompt AI&apos;</strong>.<br />
              2. Buka <a href="https://gemini.google.com" target="_blank" rel="noreferrer" className="text-violet-600 dark:text-violet-400 underline font-bold">gemini.google.com</a> (gratis tanpa API key), lalu tempel prompt tersebut.<br />
              3. Salin balasan JSON dari Gemini dan tempelkan di kotak bawah ini:
            </p>

            <textarea
              value={manualJsonInput}
              onChange={e => setManualJsonInput(e.target.value)}
              placeholder='[ { "type": "Pilihan Ganda", "questionText": "...", "options": [...], "answer": "A" } ]'
              rows={8}
              className="w-full text-xs font-mono p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPasteError(null);
                  setShowPasteModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleImportPastedJson}
                disabled={!manualJsonInput.trim()}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer"
              >
                Validasi & Pratinjau Soal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
