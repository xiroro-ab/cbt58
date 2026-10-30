'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Subject, Question, StudentAnswerItem, QuestionAnswer } from '@/types/cbt';
import { QuestionRenderer } from './QuestionRenderer';
import { evaluateFullExam } from '@/lib/scoringEngine';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  insertNotification,
  insertMessage,
  subscribeToMessages
} from '@/lib/supabaseService';
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
  Moon,
  LifeBuoy,
  Megaphone,
  CheckCircle2,
  X
} from 'lucide-react';

interface ExamScreenProps {
  subject: Subject;
  questions: Question[];
  studentName: string;
  studentClass?: string;
  onFinishExam: (resultData: any) => void;
  onExit: () => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  subject,
  questions,
  studentName,
  studentClass,
  onFinishExam,
  onExit
}) => {
  const { theme, toggleTheme } = useTheme();
  const { language, t } = useLanguage();
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

  // State Lapor Kendala Siswa (Opsi A)
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('Gambar / Media Soal Tidak Muncul');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSuccessNotice, setReportSuccessNotice] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // State Pengumuman Broadcast dari Pengawas
  const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null);

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

  // 2. ANTI-CHEAT REALTIME MONITORING & SUPABASE EVENT LOGGING
  useEffect(() => {
    if (isExamCompleted) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        const nextCount = violationCountRef.current + 1;
        setViolationCount(nextCount);

        // Catat otomatis ke tabel exam_notifications di Supabase
        try {
          await insertNotification({
            subjectId: subject.id,
            studentName,
            type: nextCount >= subject.violationLimit ? 'autolock' : 'violation',
            title: nextCount >= subject.violationLimit ? 'Ujian Siswa Terkunci' : 'Peringatan Anti-Cheat',
            message: `Siswa ${studentName} (${subject.className}) terdeteksi berpindah tab/aplikasi (Pelanggaran ke-${nextCount}).`
          });
        } catch (err) {
          console.warn('Gagal log notifikasi pelanggaran:', err);
        }

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
  }, [isExamCompleted, subject.violationLimit, subject.id, studentName]);

  // 3. LISTEN FOR PROCTOR BROADCAST MESSAGES
  useEffect(() => {
    if (isExamCompleted || !subject.id) return;
    const unsub = subscribeToMessages(msg => {
      if (msg.targetType === 'broadcast') {
        setBroadcastNotice(msg.body);
      }
    });
    return () => unsub();
  }, [isExamCompleted, subject.id]);

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

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);
    try {
      await insertMessage({
        subjectId: subject.id,
        senderName: studentName,
        senderRole: 'student',
        targetType: 'proctor',
        studentClass: subject.className,
        questionNumber: currentIndex + 1,
        title: reportCategory,
        body: reportDescription || `Kendala pada soal no. ${currentIndex + 1}: ${reportCategory}`,
        status: 'pending'
      });
      setReportSuccessNotice(true);
      setTimeout(() => {
        setReportSuccessNotice(false);
        setShowReportModal(false);
        setReportDescription('');
      }, 2000);
    } catch (err) {
      console.error('Gagal mengirim laporan kendala:', err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleFinalSubmit = async (reason: string = 'Selesai Mengerjakan') => {
    setShowConfirmSubmit(false);
    setShowWarningModal(false);

    const evaluation = evaluateFullExam(questions, answers, subject.scoringRules);

    const currentClass = studentClass || subject.className;
    const payload = {
      studentName,
      className: currentClass,
      score: evaluation.finalScore,
      totalEarned: evaluation.totalEarned,
      totalMax: evaluation.totalMax,
      answers,
      submittedAt: new Date().toLocaleString('id-ID'),
      violationCount,
      details: evaluation.details
    };

    setCompletedResult(payload);
    setIsExamCompleted(true);
    onFinishExam(payload);

    // Kirim notifikasi sistem otomatis ke database Supabase
    try {
      await insertNotification({
        subjectId: subject.id,
        studentName,
        type: 'submission',
        title: 'Siswa Menyelesaikan Ujian',
        message: `Siswa ${studentName} (${currentClass}) telah menyelesaikan ujian dengan skor ${evaluation.finalScore}%.`
      });
    } catch (err) {
      console.warn('Gagal log notifikasi submission:', err);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = answers.filter(a => a.answer !== null && a.answer !== '').length;

  // JIKA SUDAH SELESAI UJIAN
  if (isExamCompleted && completedResult) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ujian Berhasil Dikirim</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Terima kasih, <strong>{studentName}</strong>. Lembar jawaban Anda telah tersimpan di server.
            </p>
          </div>

          {/* Kotak Nilai */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Skor Akhir Ujian</span>
            <div className="text-5xl font-black text-violet-600 dark:text-violet-400">
              {completedResult.score}%
            </div>
            <p className="text-xs text-slate-500 pt-1">
              Poin: {completedResult.totalEarned} / {completedResult.totalMax}
            </p>
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <p>Mata Pelajaran: <strong>{subject.title}</strong></p>
            <p>Kelas: <strong>{subject.className}</strong></p>
            <p>Jumlah Pelanggaran: <strong>{violationCount} kali</strong></p>
          </div>

          <div className="pt-2">
            <button
              onClick={onExit}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition"
            >
              Kembali ke Halaman Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* 1. TOP EXAM HEADER */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
            CBT
          </div>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
              {subject.title}
            </h1>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {studentName} • {subject.className}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Tombol Lapor Kendala ke Pengawas (Opsi A) */}
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold transition"
            title="Laporkan masalah teknis atau pertanyaan soal ke pengawas"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden sm:inline">Lapor Kendala</span>
          </button>

          {/* Toggle Theme Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs sm:text-sm font-bold ${
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

      {/* PENGUMUMAN BROADCAST DARI PENGAWAS (JIKA ADA) */}
      {broadcastNotice && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
            <Megaphone className="w-4 h-4 flex-shrink-0 animate-bounce" />
            <span>PENGUMUMAN DARI PENGAWAS: {broadcastNotice}</span>
          </div>
          <button
            onClick={() => setBroadcastNotice(null)}
            className="p-1 hover:bg-amber-600 rounded-lg text-slate-950"
            title="Tutup Pengumuman"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* SIDEBAR NOMOR SOAL */}
        <aside className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 h-fit">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            Navigasi Butir Soal
          </h3>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const ansItem = answers[idx];
              const isAnswered = ansItem.answer !== null && ansItem.answer !== '';
              const isCurrent = idx === currentIndex;
              const isDoubt = ansItem.isDoubtful;

              let btnClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

              if (isDoubt) {
                btnClass = 'bg-amber-400 text-slate-950 font-bold border-amber-500';
              } else if (isAnswered) {
                btnClass = 'bg-emerald-500 text-white font-bold border-emerald-600';
              }

              if (isCurrent) {
                btnClass += ' ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-900';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-xl text-xs font-bold border transition ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-2 text-[11px] space-y-1.5 text-slate-500 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
              <span>Sudah dijawab</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-amber-400"></span>
              <span>Ragu-ragu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-slate-200 dark:bg-slate-700"></span>
              <span>Belum dijawab</span>
            </div>
          </div>
        </aside>
      </div>

      {/* MODAL LAPOR KENDALA SISWA KE PENGAWAS (OPSI A) */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Lapor Kendala ke Pengawas
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccessNotice ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-bold text-xs text-emerald-800 dark:text-emerald-200">
                  Laporan Terkirim ke Pengawas!
                </p>
                <p className="text-[11px] text-emerald-600">
                  Pengawas telah menerima laporan Anda. Tetap tenang dan lanjutkan soal lainnya.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendReport} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nomor Soal yang Terkendala
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`Soal No. ${currentIndex + 1} (${currentQuestion.type})`}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Jenis Kendala
                  </label>
                  <select
                    value={reportCategory}
                    onChange={e => setReportCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Gambar / Media Soal Tidak Muncul">Gambar / Media Soal Tidak Muncul</option>
                    <option value="Teks Soal / Opsi Jawaban Terpotong">Teks Soal / Opsi Jawaban Terpotong</option>
                    <option value="Kendala Teknis (Mouse/Keyboard/Layar)">Kendala Teknis (Mouse/Keyboard/Layar)</option>
                    <option value="Koneksi Lemah / Loading Lambat">Koneksi Lemah / Loading Lambat</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={reportDescription}
                    onChange={e => setReportDescription(e.target.value)}
                    placeholder="Contoh: Pak, gambar diagram sel pada soal ini kosong tidak ada tampilannya..."
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingReport ? 'Mengirim...' : 'Kirim Laporan'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL PERINGATAN ANTI-CHEAT */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-rose-600">Peringatan Pelanggaran Anti-Cheat!</h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              Anda terdeteksi meninggalkan halaman ujian. Pelanggaran:{' '}
              <strong className="text-rose-600 font-bold">
                {violationCount} / {subject.violationLimit} kali
              </strong>
              .
            </p>
            <p className="text-xs text-slate-400">
              Pelanggaran telah tercatat otomatis di server pengawas. Jika mencapai batas maksimal, ujian akan dikunci.
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

      {/* MODAL KONFIRMASI SELESAI */}
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
