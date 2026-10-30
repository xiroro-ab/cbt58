'use client';

import React, { useState, useEffect } from 'react';
import { initialSubject, sampleQuestions } from '@/lib/mockData';
import { Subject, Question, ExamResult } from '@/types/cbt';
import { Sidebar, NavItem } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { ExamScreen } from '@/components/exam/ExamScreen';
import { HelpModal } from '@/components/modals/HelpModal';
import { CertificateModal } from '@/components/modals/CertificateModal';
import {
  fetchActiveSubject,
  fetchQuestionsBySubject,
  insertQuestion,
  removeQuestion,
  saveExamResult,
  fetchExamResults,
  updateSubjectInSupabase,
  subscribeToExamResults
} from '@/lib/supabaseService';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  GraduationCap,
  Sparkles,
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  User,
  School,
  ArrowLeft,
  Languages
} from 'lucide-react';

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  const [viewMode, setViewMode] = useState<'teacher' | 'student_login' | 'student_exam'>('teacher');
  const [currentNav, setCurrentNav] = useState<NavItem>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);
  const [certificateTargetResult, setCertificateTargetResult] = useState<ExamResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [subject, setSubject] = useState<Subject>(initialSubject);
  const [questions, setQuestions] = useState<Question[]>(sampleQuestions);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [studentName, setStudentName] = useState('Ahmad Fauzan');
  const [inputToken, setInputToken] = useState('IPA2026');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 1. Load data awal dari Supabase
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const sub = await fetchActiveSubject();
        setSubject(sub);
        if (sub.token) setInputToken(sub.token);

        const qList = await fetchQuestionsBySubject(sub.id);
        if (qList && qList.length > 0) {
          setQuestions(qList);
        }

        const resList = await fetchExamResults(sub.id);
        if (resList && resList.length > 0) {
          setResults(resList);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Realtime listener: Dapatkan hasil ujian baru dari Supabase secara langsung
  useEffect(() => {
    if (!subject?.id) return;
    const unsubscribe = subscribeToExamResults(subject.id, newResult => {
      setResults(prev => {
        // Cek duplikasi ID
        if (prev.some(r => r.id === newResult.id)) return prev;
        return [newResult, ...prev];
      });
    });
    return () => {
      unsubscribe();
    };
  }, [subject?.id]);

  const handleUpdateSubject = async (updated: Subject) => {
    setSubject(updated);
    try {
      await updateSubjectInSupabase(updated);
    } catch (err) {
      console.warn('Update subject fallback to local:', err);
    }
  };

  const handleAddQuestion = async (newQ: Question) => {
    setQuestions(prev => [...prev, newQ]);
    try {
      await insertQuestion(newQ);
    } catch (err) {
      console.warn('Supabase insert fallback to local state:', err);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== qId));
    try {
      await removeQuestion(qId);
    } catch (err) {
      console.warn('Supabase delete fallback to local state:', err);
    }
  };

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setLoginError(language === 'id' ? 'Harap masukkan nama lengkap siswa.' : 'Please enter student name.');
      return;
    }
    if (inputToken.trim().toUpperCase() !== subject.token.toUpperCase()) {
      setLoginError(
        language === 'id'
          ? 'Token ujian salah! Silakan tanyakan token kepada guru pengawas.'
          : 'Invalid exam token! Please ask your proctor.'
      );
      return;
    }
    setLoginError('');
    setViewMode('student_exam');
  };

  const handleFinishExam = async (resultData: any) => {
    const newResult: ExamResult = {
      id: `res-${Date.now()}`,
      subjectId: subject.id,
      subjectTitle: subject.title,
      studentId: `std-${Date.now()}`,
      studentName: resultData.studentName,
      className: resultData.className,
      score: resultData.score,
      totalEarned: resultData.totalEarned,
      totalMax: resultData.totalMax,
      answers: resultData.answers,
      submittedAt: resultData.submittedAt,
      violationCount: resultData.violationCount,
      details: resultData.details
    };

    setResults(prev => [newResult, ...prev]);
    try {
      await saveExamResult(newResult);
    } catch (err) {
      console.warn('Supabase save result fallback:', err);
    }
  };

  const handleOpenCertificates = (target?: ExamResult) => {
    setCertificateTargetResult(target || results[0] || null);
    setIsCertificatesModalOpen(true);
  };

  // =========================================================================
  // VIEW 1: LAYAR PENGERJAAN UJIAN SISWA (FULLSCREEN / ANTI-CHEAT)
  // =========================================================================
  if (viewMode === 'student_exam') {
    return (
      <ExamScreen
        subject={subject}
        questions={questions}
        studentName={studentName}
        onFinishExam={handleFinishExam}
        onExit={() => setViewMode('teacher')}
      />
    );
  }

  // =========================================================================
  // VIEW 2: LAYAR LOGIN / VERIFIKASI SISWA SEBELUM MULAI UJIAN
  // =========================================================================
  if (viewMode === 'student_login') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 transition-colors relative">
        {/* Top Minimalist Controls */}
        <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-8 sm:right-8 flex items-center justify-between">
          <button
            onClick={() => setViewMode('teacher')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-violet-600 transition shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.backToTeacherBtn}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-violet-600 transition shadow-xs"
            >
              <Languages className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span>{language === 'id' ? 'ID 🇮🇩' : 'EN 🇬🇧'}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition shadow-xs"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </div>

        {/* Card Login Siswa Formal SaaS */}
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60 shadow-xs mb-1">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {t.studentLoginTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subject.title} • {subject.className}
            </p>
          </div>

          <form onSubmit={handleStartExam} className="space-y-4 text-xs font-medium">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-violet-600" />
                <span>{t.studentNameLabel}</span>
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="Contoh: Ahmad Fauzan"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-violet-600" />
                <span>{t.studentClassLabel}</span>
              </label>
              <input
                type="text"
                disabled
                value={subject.className}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                <span>{t.studentTokenLabel}</span>
              </label>
              <input
                type="text"
                required
                value={inputToken}
                onChange={e => setInputToken(e.target.value.toUpperCase())}
                placeholder="MASUKKAN TOKEN"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase tracking-widest font-mono text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-center text-xs">
                {loginError}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99]"
              >
                <span>{t.startExamBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{t.antiCheatWarning}</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: PANEL GURU / DASHBOARD UTAMA SAAS (TABOR STUDY FORMAL THEME)
  // =========================================================================
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors">
      {/* SIDEBAR FORMAL */}
      <Sidebar
        currentNav={currentNav}
        onSelectNav={setCurrentNav}
        questionsCount={questions.length}
        resultsCount={results.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* NAVBAR HEADER DENGAN NOTIFIKASI & PESAN AKTIF */}
        <Navbar
          onStartStudentExam={() => setViewMode('student_login')}
          onOpenAddQuestion={() => setIsAddModalOpen(true)}
        />

        {/* DASHBOARD CONTENT BODY */}
        <main className="flex-1">
          <TeacherDashboard
            currentNav={currentNav}
            subject={subject}
            questions={questions}
            results={results}
            onUpdateSubject={handleUpdateSubject}
            onAddQuestion={handleAddQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            isAddModalOpen={isAddModalOpen}
            onCloseAddModal={() => setIsAddModalOpen(false)}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onStartStudentExam={() => setViewMode('student_login')}
            searchQuery={searchQuery}
            onOpenCertificates={handleOpenCertificates}
          />
        </main>
      </div>

      {/* MODAL PANDUAN & BANTUAN AKTIF */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* MODAL CETAK SERTIFIKAT AKTIF */}
      <CertificateModal
        isOpen={isCertificatesModalOpen}
        onClose={() => setIsCertificatesModalOpen(false)}
        results={results}
        selectedStudentResult={certificateTargetResult}
      />
    </div>
  );
}
