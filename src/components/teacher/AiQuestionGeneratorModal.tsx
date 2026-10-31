'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Subject, Question, QuestionType } from '@/types/cbt';
import {
  PRESET_STANDARDS,
  StandardPresetType,
  QuestionCounts,
  getRecommendedTopics,
  buildAiQuestionPrompt,
  validateAndConvertRawQuestions
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
  Download,
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
  Eye
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

  // Form Fields
  const [standardPreset, setStandardPreset] = useState<StandardPresetType>('AKM');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Campuran' | 'Mudah' | 'Sedang' | 'Sukar (HOTS)'>('Campuran');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Question counts
  const [counts, setCounts] = useState<QuestionCounts>({
    pg: 2,
    pgk: 3,
    bs: 3,
    jodoh: 2,
    isian: 0,
    esai: 0
  });

  // API Key & manual mode
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [manualJsonInput, setManualJsonInput] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);

  // Status & Async State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('Menginisialisasi...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Generated questions for preview
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Load API key dari localStorage saat mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('cbt_gemini_api_key') || '';
      if (savedKey) {
        setApiKey(savedKey);
        setIsApiKeySaved(true);
      }
    }
  }, []);

  // Update targetSubjectId jika currentSubject berganti
  useEffect(() => {
    if (currentSubject?.id) {
      setTargetSubjectId(currentSubject.id);
    }
  }, [currentSubject?.id]);

  // Total count
  const totalQuestions =
    counts.pg + counts.pgk + counts.bs + counts.jodoh + counts.isian + counts.esai;

  // Handle preset change
  const handleSelectPreset = (presetId: StandardPresetType) => {
    setStandardPreset(presetId);
    const config = PRESET_STANDARDS.find(p => p.id === presetId);
    if (config) {
      setCounts({ ...config.defaultCounts });
      setDifficulty(config.defaultDifficulty);
    }
  };

  // Counter helper
  const updateCount = (key: keyof QuestionCounts, delta: number) => {
    setCounts(prev => {
      const nextVal = Math.max(0, Math.min(30, (prev[key] || 0) + delta));
      return { ...prev, [key]: nextVal };
    });
    setStandardPreset('CUSTOM');
  };

  const setCountDirect = (key: keyof QuestionCounts, val: number) => {
    setCounts(prev => ({ ...prev, [key]: Math.max(0, Math.min(30, val)) }));
    setStandardPreset('CUSTOM');
  };

  // Simpan API key ke localStorage
  const handleSaveApiKey = () => {
    if (typeof window !== 'undefined') {
      if (apiKey.trim()) {
        localStorage.setItem('cbt_gemini_api_key', apiKey.trim());
        setIsApiKeySaved(true);
      } else {
        localStorage.removeItem('cbt_gemini_api_key');
        setIsApiKeySaved(false);
      }
    }
  };

  // Salin prompt untuk dipakai di gemini.google.com jika guru tidak punya API key
  const handleCopyPrompt = () => {
    const promptText = buildAiQuestionPrompt({
      subjectTitle: activeSubject?.title || 'Mata Pelajaran',
      className: activeSubject?.className || 'Kelas VIII',
      topic: topic.trim() || 'Materi Pembelajaran Pokok',
      difficulty,
      standardPreset,
      counts,
      customInstructions
    });

    navigator.clipboard.writeText(promptText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Generate via Next.js API Route (Gemini API)
  const handleGenerate = async () => {
    if (totalQuestions <= 0) {
      setErrorMessage('Jumlah butir soal yang diminta minimal 1 butir.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStepText('Menghubungkan ke Google Gemini AI...');

    const timer1 = setTimeout(() => {
      setLoadingStepText('Menganalisis materi & merancang stimulus kontekstual...');
    }, 1800);

    const timer2 = setTimeout(() => {
      setLoadingStepText('Menyusun butir soal, opsi jawaban, dan kunci...');
    }, 4500);

    const timer3 = setTimeout(() => {
      setLoadingStepText('Memvalidasi format data CBT...');
    }, 8000);

    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectTitle: activeSubject?.title || 'Mata Pelajaran',
          className: activeSubject?.className || 'Kelas VIII',
          topic: topic.trim() || 'Materi Pembelajaran Pokok',
          difficulty,
          standardPreset,
          counts,
          customInstructions,
          apiKey: apiKey.trim()
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'API_KEY_REQUIRED') {
          setShowApiKeyInput(true);
        }
        throw new Error(data.message || 'Gagal membuat soal dengan AI.');
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
      // Default pilih semua soal
      setSelectedQuestionIds(new Set(converted.map(q => q.id)));
      setCurrentStep('preview');
    } catch (err: any) {
      console.error('Error generating questions:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses soal.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsLoading(false);
    }
  };

  // Parse manual JSON hasil paste
  const handleImportPastedJson = () => {
    try {
      let cleaned = manualJsonInput.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      let parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).questions)) {
          parsed = (parsed as any).questions;
        } else {
          parsed = [parsed];
        }
      }

      const converted = validateAndConvertRawQuestions(
        parsed,
        activeSubject?.id || '',
        existingQuestionsCount + 1
      );

      if (converted.length === 0) {
        alert('Tidak ada butir soal yang berhasil dibaca dari teks JSON.');
        return;
      }

      setGeneratedQuestions(converted);
      setSelectedQuestionIds(new Set(converted.map(q => q.id)));
      setShowPasteModal(false);
      setManualJsonInput('');
      setCurrentStep('preview');
    } catch (err: any) {
      alert('Format JSON tidak valid. Pastikan teks yang ditempel adalah JSON array murni.');
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

  // Hapus satu butir soal dari daftar review
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
      alert('Pilih minimal 1 butir soal untuk disimpan ke bank soal.');
      return;
    }

    // Re-index orderIndex agar berurutan rapi
    const finalQuestions = toSave.map((q, idx) => ({
      ...q,
      subjectId: activeSubject?.id || q.subjectId,
      orderIndex: existingQuestionsCount + idx + 1
    }));

    onSaveQuestions(finalQuestions);
    onClose();
  };

  if (!isOpen) return null;

  const recommendedTopics = getRecommendedTopics(activeSubject?.title || '');
  const activePresetConfig = PRESET_STANDARDS.find(p => p.id === standardPreset) || PRESET_STANDARDS[0];

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
                  Powered by Gemini
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate butir soal berstandar AKM, PISA, & TKA langsung ke Bank Soal
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
              {/* TARGET MATA PELAJARAN & KELAS */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Target Mata Pelajaran
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {activeSubject?.title || 'Mata Pelajaran'} • {activeSubject?.className || 'Semua Kelas'}
                    </span>
                  </div>
                </div>

                {allSubjects.length > 1 && (
                  <div className="sm:w-56">
                    <select
                      value={targetSubjectId}
                      onChange={e => setTargetSubjectId(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
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

              {/* 1. PRESET STANDAR SOAL (AKM, PISA, TKA) */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>1. Pilih Standar Asesmen</span>
                    <span className="text-violet-600 dark:text-violet-400 font-normal">
                      (Klik preset untuk komposisi otomatis)
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {activePresetConfig.title}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {PRESET_STANDARDS.map(preset => {
                    const isSelected = standardPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-violet-50/80 dark:bg-violet-950/40 border-violet-500 ring-2 ring-violet-500/20 shadow-md'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {preset.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {preset.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {preset.description}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="mt-2.5 pt-2 border-t border-violet-200 dark:border-violet-800/60 flex items-center justify-between text-[10px] text-violet-700 dark:text-violet-300 font-bold">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />
                              <span>Preset Aktif</span>
                            </span>
                            <span>{Object.values(preset.defaultCounts).reduce((a, b) => a + b, 0)} Soal</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. TOPIK / MATERI & KESULITAN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>2. Topik / KD / Materi Pembelajaran *</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Contoh materi pokok
                    </span>
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="Contoh: Teorema Pythagoras, Teks Eksplanasi, dsb..."
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />

                  {/* Rekomendasi Topik Cepat */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Pilihan Cepat:</span>
                    {recommendedTopics.slice(0, 4).map((recTopic, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTopic(recTopic)}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 dark:hover:bg-violet-950 hover:text-violet-700 dark:hover:text-violet-300 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                      >
                        + {recTopic}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tingkat Kesulitan
                  </label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as any)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                  >
                    <option value="Campuran">Campuran Proporsional</option>
                    <option value="Mudah">Mudah (Dasar/Pemahaman)</option>
                    <option value="Sedang">Sedang (Aplikasi)</option>
                    <option value="Sukar (HOTS)">Sukar (Penalaran HOTS)</option>
                  </select>
                  <p className="text-[10px] text-slate-400">
                    AI menyesuaikan tingkat kognitif Bloom / Webb.
                  </p>
                </div>
              </div>

              {/* 3. KOMPOSISI TIPE SOAL (CLICK COUNTER) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>3. Komposisi Tipe Soal</span>
                    <span className="text-slate-400 font-normal">
                      (Klik [-] dan [+] untuk menyesuaikan)
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-600 text-white shadow-xs">
                      Total: {totalQuestions} Butir Soal
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {[
                    {
                      key: 'pg' as const,
                      label: 'Pilihan Ganda',
                      short: 'PG',
                      sub: '1 jawaban benar'
                    },
                    {
                      key: 'pgk' as const,
                      label: 'PG Kompleks',
                      short: 'PGK',
                      sub: 'Multi-jawaban'
                    },
                    {
                      key: 'bs' as const,
                      label: 'Benar / Salah',
                      short: 'B/S',
                      sub: 'Pernyataan tabel'
                    },
                    {
                      key: 'jodoh' as const,
                      label: 'Menjodohkan',
                      short: 'Jodoh',
                      sub: 'Pasang kiri-kanan'
                    },
                    {
                      key: 'isian' as const,
                      label: 'Isian Singkat',
                      short: 'Isian',
                      sub: 'Kata/istilah kunci'
                    },
                    {
                      key: 'esai' as const,
                      label: 'Esai / Uraian',
                      short: 'Esai',
                      sub: 'Telaah analitis'
                    }
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
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                              {item.short}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {val}
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
                            max="30"
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

              {/* PENGATURAN LANJUTAN & CATATAN KHUSUS */}
              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Pengaturan Lanjutan & Catatan Khusus AI</span>
                  {showAdvanced ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Catatan / Instruksi Khusus untuk AI (Opsional):
                      </label>
                      <textarea
                        value={customInstructions}
                        onChange={e => setCustomInstructions(e.target.value)}
                        placeholder="Misal: Sertakan cerita singkat tentang kearifan lokal Jawa, buat kalimat tidak lebih dari 3 baris per butir..."
                        rows={2}
                        className="w-full text-xs p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ATUR KUNCI API GEMINI (OPSIONAL JIKA SUDAH ADA DI SERVER) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-bold text-amber-900 dark:text-amber-300">
                      Kunci Google Gemini API
                    </span>
                    {isApiKeySaved && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Tersimpan di Browser
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    {showApiKeyInput ? 'Tutup Pengaturan Kunci' : 'Atur API Key Pribadi'}
                  </button>
                </div>

                {showApiKeyInput && (
                  <div className="mt-2.5 pt-2 border-t border-amber-200 dark:border-amber-900/40 space-y-2">
                    <p className="text-[11px] text-amber-800 dark:text-amber-400/90 leading-relaxed">
                      Masukkan Google Gemini API Key Anda (gratis di{' '}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold underline text-violet-600 dark:text-violet-400"
                      >
                        aistudio.google.com
                      </a>
                      ). Kunci disimpan secara aman di browser lokal Anda tanpa dikirim ke pihak lain.
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="flex-1 text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-slate-900 dark:text-white font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleSaveApiKey}
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Simpan Kunci
                      </button>
                    </div>
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
                      {generatedQuestions.length} Butir Soal Berhasil Dibuat oleh AI!
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Periksa dan centang soal yang ingin Anda masukkan ke Bank Soal.
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
              {/* Opsi Salin Prompt & Impor JSON (Fail-safe Gratis) */}
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
                  onClick={() => setShowPasteModal(true)}
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
                    <span>Generate {totalQuestions} Soal dengan Gemini</span>
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
      {/* MODAL TEMPEL JSON MANUAL                                      */}
      {/* ============================================================ */}
      {showPasteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-violet-600" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tempel JSON Hasil Gemini AI
                </h4>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Salin prompt dengan tombol &apos;Salin Prompt AI&apos;, tempelkan ke gemini.google.com, lalu tempelkan teks balasan JSON yang Anda dapatkan di bawah ini:
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
                onClick={() => setShowPasteModal(false)}
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
