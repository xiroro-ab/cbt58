'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Subject, Question, StudentAnswerItem, QuestionAnswer } from '@/types/cbt';
import { QuestionRenderer } from './QuestionRenderer';
import { evaluateFullExam } from '@/lib/scoringEngine';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  ShieldAlert,
  Award,
  RotateCcw
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

  // 1. TIMER COUNTDOWN
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

  // 2. ANTI-CHEAT SYSTEM (Window blur & Tab switch)
  useEffect(() => {
    if (isExamCompleted) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const nextCount = violationCountRef.current + 1;
        setViolationCount(nextCount);
        if (nextCount >= subject.violationLimit) {
          handleFinalSubmit('Ujian Dihentikan Otomatis: Melebihi Batas Pelanggaran');
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

  // Current question data
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

    // Hitung skor otomatis menggunakan scoringEngine
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

  // Format detik ke format MM:SS
  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const answeredCount = answers.filter(a => a.answer !== null).length;

  // LAYAR SKOR / SELESAI UJIAN
  if (isExamCompleted && completedResult) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl">
          <div className="inline-flex p-4 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30">
            <Award className="w-12 h-12" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Ujian Telah Diselesaikan</h2>
            <p className="text-zinc-400 text-sm">{completedResult.subjectTitle}</p>
          </div>

          <div className="p-6 rounded-2xl bg-black/40 border border-zinc-800 inline-block min-w-[200px]">
            <p className="text-xs uppercase tracking-wider text-zinc-400 mb-1">Nilai Akhir Anda</p>
            <div className="text-5xl font-black text-fuchsia-400 tracking-tight">
              {completedResult.score}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Poin: {completedResult.totalEarned} / {completedResult.totalMax}
            </p>
          </div>

          {completedResult.reason && (
            <p className="text-xs text-zinc-400 italic">Keterangan: {completedResult.reason}</p>
          )}

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={onExit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold transition"
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none">
      {/* 1. TOP BAR */}
      <header className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm sm:text-base font-bold text-zinc-100 truncate max-w-[200px] sm:max-w-md">
            {subject.title}
          </h1>
          <p className="text-xs text-zinc-400">
            Siswa: <strong className="text-fuchsia-400">{studentName}</strong> ({subject.className})
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-bold ${
              secondsRemaining < 300
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-zinc-800/80 border-zinc-700 text-fuchsia-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          {/* Selesai Button */}
          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-fuchsia-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Jawaban</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* AREA SOAL AKTIF (3 Kolom) */}
        <main className="lg:col-span-3 flex flex-col justify-between bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 sm:p-7 shadow-xl">
          <div>
            {/* Header Nomor Soal */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-200">
                  Soal No. {currentIndex + 1} dari {questions.length}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  {currentQuestion.type}
                </span>
              </div>

              {/* Tombol Ragu-Ragu */}
              <button
                type="button"
                onClick={handleToggleDoubt}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                  currentAnswerData.isDoubtful
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{currentAnswerData.isDoubtful ? 'Ragu-ragu (Aktif)' : 'Ragu-ragu'}</span>
              </button>
            </div>

            {/* Teks Soal */}
            <div className="mt-4 text-base sm:text-lg leading-relaxed text-zinc-100 font-normal whitespace-pre-wrap">
              {currentQuestion.questionText}
            </div>

            {/* Media Gambar jika ada */}
            {currentQuestion.mediaUrl && (
              <div className="mt-4">
                <img
                  src={currentQuestion.mediaUrl}
                  alt="Media Soal"
                  className="max-h-64 rounded-xl border border-zinc-800 object-contain mx-auto"
                />
              </div>
            )}

            {/* Opsi & Input Jawaban */}
            <QuestionRenderer
              question={currentQuestion}
              currentAnswer={currentAnswerData.answer}
              onAnswerChange={handleUpdateAnswer}
            />
          </div>

          {/* Tombol Navigasi Bawah */}
          <div className="flex items-center justify-between pt-6 mt-8 border-t border-zinc-800/80">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-200 text-sm font-semibold transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <span className="text-xs text-zinc-400">
              Terjawab: {answeredCount} / {questions.length}
            </span>

            <button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 disabled:hover:bg-fuchsia-600 text-white text-sm font-semibold transition"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* SIDEBAR NOMOR SOAL (1 Kolom) */}
        <aside className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 h-fit shadow-xl">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
            Daftar Nomor Soal
          </h3>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const ansItem = answers[idx];
              const isCurrent = idx === currentIndex;
              const hasAnswer = ansItem.answer !== null && ansItem.answer !== undefined && (Array.isArray(ansItem.answer) ? ansItem.answer.length > 0 : true);
              const isDoubt = ansItem.isDoubtful;

              let btnClass = 'bg-zinc-800 text-zinc-400 border-zinc-700/80 hover:border-zinc-500';
              if (hasAnswer) {
                btnClass = 'bg-emerald-600/80 text-white border-emerald-500';
              }
              if (isDoubt) {
                btnClass = 'bg-amber-500/80 text-zinc-950 font-bold border-amber-400';
              }
              if (isCurrent) {
                btnClass += ' ring-2 ring-fuchsia-400 ring-offset-2 ring-offset-zinc-950';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center border transition-all ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800/80 space-y-2 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-600"></span>
              <span>Sudah dijawab</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500"></span>
              <span>Ragu-ragu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-zinc-800 border border-zinc-700"></span>
              <span>Belum dijawab</span>
            </div>
          </div>
        </aside>
      </div>

      {/* 3. MODAL PERINGATAN KECURANGAN (Anti-Cheat) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full inline-block">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-rose-400">Peringatan Pelanggaran!</h3>
            <p className="text-zinc-300 text-sm leading-relaxed">
              Anda terdeteksi meninggalkan halaman ujian. Pelanggaran tercatat:{' '}
              <strong className="text-rose-400 font-bold">
                {violationCount} / {subject.violationLimit} kali
              </strong>
              .
            </p>
            <p className="text-xs text-zinc-400 italic">
              Jika mencapai batas pelanggaran ({subject.violationLimit} kali), ujian Anda akan otomatis dihentikan dan dinilai apa adanya.
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

      {/* 4. MODAL KONFIRMASI SELESAI UJIAN */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-fuchsia-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-zinc-100">Kirim Jawaban Ujian?</h3>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">
              Anda telah menjawab <strong>{answeredCount}</strong> dari{' '}
              <strong>{questions.length}</strong> soal.
            </p>
            {answeredCount < questions.length && (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                Perhatian: Masih ada {questions.length - answeredCount} soal yang belum Anda jawab!
              </p>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
              >
                Kembali Periksa
              </button>
              <button
                onClick={() => handleFinalSubmit('Selesai Mandiri')}
                className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-semibold transition"
              >
                Ya, Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
