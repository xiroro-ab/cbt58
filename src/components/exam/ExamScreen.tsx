'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Subject, Question, StudentAnswerItem, QuestionAnswer } from '@/types/cbt';
import { QuestionRenderer } from './QuestionRenderer';
import { evaluateFullExam } from '@/lib/scoringEngine';
import { useTheme } from '@/context/ThemeContext';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  ShieldAlert,
  Award,
  RotateCcw,
  Sun,
  Moon
} from 'lucide-react';

interface ExamScreenProps {
  subject: Subject;
  questions: Question[];
  studentName: string;
  onFinishExam: (resultData: any) => void;
  onExit: () => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  subject,
  questions,
  studentName,
  onFinishExam,
  onExit
}) => {
  const { theme, toggleTheme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswerItem[]>(() =>
    questions.map(q => ({ questionId: q.id, answer: null, isDoubtful: false }))
  );
  const [secondsRemaining, setSecondsRemaining] = useState(subject.durationMinutes * 60);
  const [violationCount, setViolationCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [completedResult, setCompletedResult] = useState<any>(null);

  const violationCountRef = useRef(violationCount);
  violationCountRef.current = violationCount;

  // 1. TIMER
  useEffect(() => {
    if (isExamCompleted) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit('Waktu Ujian Telah Habis');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isExamCompleted]);

  // 2. ANTI-CHEAT
  useEffect(() => {
    if (isExamCompleted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const nextCount = violationCountRef.current + 1;
        setViolationCount(nextCount);
        if (nextCount >= subject.violationLimit) {
          handleFinalSubmit('Ujian Dihentikan: Melebihi Batas Pelanggaran');
        } else {
          setShowWarningModal(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isExamCompleted, subject.violationLimit]);

  const currentQuestion = questions[currentIndex];
  const currentAnswerData = answers[currentIndex];

  const handleUpdateAnswer = (newAnswer: QuestionAnswer) => {
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        answer: newAnswer
      };
      return updated;
    });
  };

  const handleToggleDoubt = () => {
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        isDoubtful: !updated[currentIndex].isDoubtful
      };
      return updated;
    });
  };

  const handleFinalSubmit = (reason: string = 'Selesai Mengerjakan') => {
    setShowConfirmSubmit(false);
    setShowWarningModal(false);

    const evaluation = evaluateFullExam(questions, answers, subject.scoringRules);

    const resultPayload = {
      subjectId: subject.id,
      subjectTitle: subject.title,
      studentName,
      className: subject.className,
      score: evaluation.finalScore,
      totalEarned: evaluation.totalEarned,
      totalMax: evaluation.totalMax,
      answers,
      submittedAt: new Date().toLocaleString('id-ID'),
      violationCount,
      reason,
      details: evaluation.details
    };

    setCompletedResult(resultPayload);
    setIsExamCompleted(true);
    onFinishExam(resultPayload);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const answeredCount = answers.filter(a => a.answer !== null).length;

  // LAYAR SELESAI
  if (isExamCompleted && completedResult) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-xl">
          <div className="inline-flex p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
            <Award className="w-12 h-12" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ujian Telah Selesai</h2>
            <p className="text-slate-500 text-sm mt-1">{completedResult.subjectTitle}</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 inline-block min-w-[220px]">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1 font-semibold">Skor Akhir Anda</p>
            <div className="text-5xl font-black text-violet-600 dark:text-violet-400 tracking-tight">
              {completedResult.score}%
            </div>
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Poin: {completedResult.totalEarned} / {completedResult.totalMax}
            </p>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={onExit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-semibold transition"
            >
              <RotateCcw className="w-4 h-4" />
              Kembali ke Menu Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans select-none transition-colors">
      {/* 1. TOP BAR */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
            {subject.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Siswa: <strong className="text-violet-600 dark:text-violet-400">{studentName}</strong> • Kelas {subject.className}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Theme Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-sm font-bold ${
              secondsRemaining < 300
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          {/* Selesai Button */}
          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition shadow-md shadow-violet-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Selesai Ujian</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* AREA SOAL AKTIF */}
        <main className="lg:col-span-3 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Soal No. {currentIndex + 1} dari {questions.length}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  {currentQuestion.type}
                </span>
              </div>

              {/* Ragu-ragu */}
              <button
                type="button"
                onClick={handleToggleDoubt}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition ${
                  currentAnswerData.isDoubtful
                    ? 'bg-amber-100 dark:bg-amber-950/50 border-amber-400 text-amber-800 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{currentAnswerData.isDoubtful ? 'Ragu-ragu (Aktif)' : 'Ragu-ragu'}</span>
              </button>
            </div>

            <div className="mt-5 text-base sm:text-lg leading-relaxed text-slate-800 dark:text-slate-100 font-normal whitespace-pre-wrap">
              {currentQuestion.questionText}
            </div>

            {/* Media URL */}
            {currentQuestion.mediaUrl && (
              <div className="mt-4">
                <img
                  src={currentQuestion.mediaUrl}
                  alt="Media Soal"
                  className="max-h-64 rounded-2xl border border-slate-200 dark:border-slate-800 object-contain mx-auto"
                />
              </div>
            )}

            {/* Opsi Soal */}
            <QuestionRenderer
              question={currentQuestion}
              currentAnswer={currentAnswerData.answer}
              onAnswerChange={handleUpdateAnswer}
            />
          </div>

          {/* Tombol Navigasi Bawah */}
          <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <span className="text-xs text-slate-500 font-medium">
              Terjawab: {answeredCount} / {questions.length}
            </span>

            <button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-semibold transition"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* SIDEBAR NOMOR SOAL */}
        <aside className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 h-fit shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Daftar Nomor Soal
          </h3>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const ansItem = answers[idx];
              const isCurrent = idx === currentIndex;
              const hasAnswer = ansItem.answer !== null && ansItem.answer !== undefined && (Array.isArray(ansItem.answer) ? ansItem.answer.length > 0 : true);
              const isDoubt = ansItem.isDoubtful;

              let btnClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
              if (hasAnswer) {
                btnClass = 'bg-emerald-500 text-white border-emerald-600';
              }
              if (isDoubt) {
                btnClass = 'bg-amber-400 text-slate-900 font-bold border-amber-500';
              }
              if (isCurrent) {
                btnClass += ' ring-2 ring-violet-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-900';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span>Sudah dijawab</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-400"></span>
              <span>Ragu-ragu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></span>
              <span>Belum dijawab</span>
            </div>
          </div>
        </aside>
      </div>

      {/* MODAL ANTI-CHEAT */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-full inline-block">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-rose-600">Peringatan Pelanggaran!</h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              Anda terdeteksi meninggalkan halaman ujian. Pelanggaran:{' '}
              <strong className="text-rose-600 font-bold">
                {violationCount} / {subject.violationLimit} kali
              </strong>
              .
            </p>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition"
            >
              Saya Mengerti & Lanjutkan Ujian
            </button>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-violet-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Kirim Jawaban Ujian?</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              Anda telah menjawab <strong>{answeredCount}</strong> dari{' '}
              <strong>{questions.length}</strong> soal.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Kembali Periksa
              </button>
              <button
                onClick={() => handleFinalSubmit('Selesai Mandiri')}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
              >
                Ya, Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
