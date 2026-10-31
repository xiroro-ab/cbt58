'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Subject, Question, StudentAnswerItem, QuestionAnswer } from '@/types/cbt';
import { QuestionRenderer } from './QuestionRenderer';
import { evaluateFullExam } from '@/lib/scoringEngine';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  insertNotification,
  insertMessage,
  subscribeToMessages,
  checkStudentLockStatus
} from '@/lib/supabaseService';
import {
  reportStudentSession,
  removeStudentSession,
  subscribeToStudentCommands
} from '@/lib/liveMonitoringService';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  ShieldAlert,
  Award,
  Sun,
  Moon,
  LifeBuoy,
  Megaphone,
  CheckCircle2,
  X,
  Maximize2,
  Ban,
  Lock,
  Unlock,
  Check,
  Layers,
  RotateCcw
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
  const { language } = useLanguage();

  const stateKey = `cbt_exam_state_${subject.id}_${studentName.toLowerCase().trim()}`;
  const blockedKey = `cbt_blocked_${subject.id}_${studentName.toLowerCase().trim()}`;

  // Baca status simpanan lokal jika siswa me-refresh browser saat ujian berlangsung
  const [savedLocalState] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(stateKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  const [isInitiallyBlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem(blockedKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.isBlocked) return true;
      }
    } catch {}
    return false;
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (
      savedLocalState &&
      typeof savedLocalState.currentIndex === 'number' &&
      savedLocalState.currentIndex >= 0 &&
      savedLocalState.currentIndex < questions.length
    ) {
      return savedLocalState.currentIndex;
    }
    return 0;
  });
  const [answers, setAnswers] = useState<StudentAnswerItem[]>(() => {
    if (savedLocalState && Array.isArray(savedLocalState.answers) && savedLocalState.answers.length > 0) {
      const map = new Map<string, StudentAnswerItem>(
        savedLocalState.answers.map((a: StudentAnswerItem) => [a.questionId, a])
      );
      return questions.map((q): StudentAnswerItem => map.get(q.id) || { questionId: q.id, answer: null, isDoubtful: false });
    }
    return questions.map((q): StudentAnswerItem => ({ questionId: q.id, answer: null, isDoubtful: false }));
  });

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (savedLocalState && typeof savedLocalState.secondsRemaining === 'number' && savedLocalState.secondsRemaining > 0) {
      if (savedLocalState.lastSavedTime && typeof savedLocalState.lastSavedTime === 'number') {
        const elapsedSinceLastSave = Math.floor((Date.now() - savedLocalState.lastSavedTime) / 1000);
        if (elapsedSinceLastSave > 0) {
          return Math.max(0, savedLocalState.secondsRemaining - elapsedSinceLastSave);
        }
      }
      return savedLocalState.secondsRemaining;
    }
    return subject.durationMinutes * 60;
  });

  const [violationCount, setViolationCount] = useState<number>(() => {
    if (savedLocalState && typeof savedLocalState.violationCount === 'number') {
      return savedLocalState.violationCount;
    }
    return isInitiallyBlocked ? (subject.violationLimit || 3) : 0;
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    if (isInitiallyBlocked) return true;
    if (savedLocalState && (savedLocalState.isLocked || (savedLocalState.violationCount && savedLocalState.violationCount >= (subject.violationLimit || 3)))) {
      return true;
    }
    return false;
  });

  const [lastViolationReason, setLastViolationReason] = useState(() => {
    return savedLocalState?.lastViolationReason || '';
  });
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(5);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [completedResult, setCompletedResult] = useState<any>(null);
  const [isFocus, setIsFocus] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [unlockedNotice, setUnlockedNotice] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);

  // State Lapor Kendala Siswa (Opsi A)
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCategory, setReportCategory] = useState('Gambar / Media Soal Tidak Muncul');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSuccessNotice, setReportSuccessNotice] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // State Pengumuman Broadcast dari Pengawas
  const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null);

  // State Verifikasi Buka Kunci Mandiri saat Terkunci
  const [isCheckingUnlock, setIsCheckingUnlock] = useState(false);
  const [unlockCheckMessage, setUnlockCheckMessage] = useState<string | null>(null);

  const startTimeRef = useRef(Date.now());
  const violationCountRef = useRef(violationCount);
  violationCountRef.current = violationCount;

  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;

  const isCompletedRef = useRef(isExamCompleted);
  isCompletedRef.current = isExamCompleted;

  const showWarningModalRef = useRef(showWarningModal);
  showWarningModalRef.current = showWarningModal;

  const lastViolationTimeRef = useRef<number>(0);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const secondsRemainingRef = useRef(secondsRemaining);
  secondsRemainingRef.current = secondsRemaining;

  const isFocusRef = useRef(isFocus);
  isFocusRef.current = isFocus;

  // REQUEST FULLSCREEN HELPER
  const requestFullscreenMode = useCallback(() => {
    try {
      const el = document.documentElement as any;
      if (el.requestFullscreen) {
        el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => setShowFullscreenPrompt(true));
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      setShowFullscreenPrompt(true);
    }
  }, []);

  // AUTO FULLSCREEN ON START
  useEffect(() => {
    requestFullscreenMode();
    const timer = setTimeout(() => {
      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (!isFs) setShowFullscreenPrompt(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [requestFullscreenMode]);

  // 1. TIMER COUNTDOWN
  useEffect(() => {
    if (isExamCompleted || isLocked) return;
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
  }, [isExamCompleted, isLocked]);

  const sendDirectHeartbeat = useCallback((focusState?: boolean) => {
    if (isCompletedRef.current) return;
    const answered = answersRef.current.filter(a => a.answer !== null && a.answer !== '').length;
    const currentFocus = typeof focusState === 'boolean' ? focusState : isFocusRef.current;
    reportStudentSession({
      id: `session_${studentName}_${subject.id}`,
      subjectId: subject.id,
      studentId: studentName,
      studentName,
      className: studentClass || subject.className,
      startTime: startTimeRef.current,
      lastHeartbeat: Date.now(),
      progressCount: answered,
      totalQuestions: questions.length,
      violationCount: violationCountRef.current,
      answers: answersRef.current,
      status: isLockedRef.current ? 'blocked' : 'ongoing',
      isFocus: currentFocus,
      remainingSeconds: secondsRemainingRef.current
    });
  }, [studentName, subject.id, studentClass, subject.className, questions.length]);

  // 2. LIVE MONITORING HEARTBEAT & BROADCAST TO PROCTOR (EVERY 1.5 SECONDS)
  useEffect(() => {
    if (isExamCompleted) return;

    sendDirectHeartbeat();
    const interval = setInterval(() => {
      sendDirectHeartbeat();
    }, 1500);

    return () => {
      clearInterval(interval);
    };
  }, [isExamCompleted, sendDirectHeartbeat]);

  // Auto-save State Ujian Siswa ke LocalStorage (Fail-safe agar refresh tidak mereset jawaban/pelanggaran)
  useEffect(() => {
    if (isExamCompleted) return;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(stateKey, JSON.stringify({
          answers,
          secondsRemaining,
          violationCount,
          isLocked,
          lastViolationReason,
          startTime: startTimeRef.current,
          currentIndex,
          lastSavedTime: Date.now()
        }));
      } catch {}
    }
  }, [answers, secondsRemaining, violationCount, isLocked, lastViolationReason, currentIndex, isExamCompleted, stateKey]);

  // 3. LISTEN TO PROCTOR COMMANDS (Buka Kunci, Paksa Selesai, Reset)
  useEffect(() => {
    const unsubscribe = subscribeToStudentCommands(studentName, subject.id, (cmd) => {
      if (cmd.action === 'RESET_VIOLATION') {
        // Pengawas membuka kunci & me-reset pelanggaran
        setViolationCount(0);
        setIsLocked(false);
        setShowWarningModal(false);
        setUnlockedNotice(true);
        setTimeout(() => setUnlockedNotice(false), 4000);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(blockedKey);
            localStorage.setItem(stateKey, JSON.stringify({
              answers: answersRef.current,
              secondsRemaining: secondsRemainingRef.current,
              violationCount: 0,
              isLocked: false,
              startTime: startTimeRef.current,
              currentIndex: currentIndexRef.current,
              lastSavedTime: Date.now()
            }));
          } catch {}
        }
        requestFullscreenMode();
      } else if (cmd.action === 'FORCE_FINISH') {
        // Pengawas menyelesaikan ujian secara paksa
        isCompletedRef.current = true;
        setIsExamCompleted(true);
        setIsLocked(false);
        const cleanName = studentName.toLowerCase().trim();
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`cbt_submitted_${subject.id}_${cleanName}`, JSON.stringify({
              submittedAt: new Date().toLocaleString('id-ID'),
              reason: 'Diselesaikan Paksa oleh Pengawas'
            }));
            localStorage.removeItem(stateKey);
            localStorage.removeItem(blockedKey);
            localStorage.removeItem(`cbt_exam_questions_${subject.id}_${cleanName}`);
          } catch {}
        }
        removeStudentSession(studentName, subject.id);

        // Tampilkan tampilan selesai ujian pada layar siswa tanpa memanggil onFinishExam lagi (karena guru sudah menyimpannya ke database)
        const evaluation = evaluateFullExam(questions, answersRef.current, subject.scoringRules);
        setCompletedResult({
          studentName,
          className: studentClass || subject.className,
          score: evaluation.finalScore,
          totalEarned: evaluation.totalEarned,
          totalMax: evaluation.totalMax,
          answers: answersRef.current,
          submittedAt: new Date().toLocaleString('id-ID'),
          violationCount: violationCountRef.current,
          details: evaluation.details
        });

        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {}
      } else if (cmd.action === 'RESET_EXAM') {
        // Pengawas mereset ujian siswa (bersihkan cache dan kembali ke login)
        removeStudentSession(studentName, subject.id);
        const cleanName = studentName.toLowerCase().trim();
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(stateKey);
            localStorage.removeItem(blockedKey);
            localStorage.removeItem(`cbt_exam_questions_${subject.id}_${cleanName}`);
            localStorage.removeItem(`cbt_submitted_${subject.id}_${cleanName}`);
            const stored = localStorage.getItem(`cbt_results_${subject.id}`);
            if (stored) {
              const list = JSON.parse(stored);
              const cleaned = list.filter((r: any) => r.studentName.toLowerCase().trim() !== cleanName);
              localStorage.setItem(`cbt_results_${subject.id}`, JSON.stringify(cleaned));
            }
            localStorage.removeItem(`cbt_answers_${studentName}_${subject.id}`);
          } catch {}
        }
        onExit();
      }
    });

    return () => unsubscribe();
  }, [studentName, subject.id, onExit, requestFullscreenMode, stateKey, blockedKey]);

  // 3b. FAIL-SAFE POLLING BUKA KUNCI DARI SUPABASE (SETIAP 2 DETIK SAAT TERKUNCI)
  // Menjamin layar merah siswa otomatis terbuka seketika guru menekan tombol "Buka Kunci" / "Reset",
  // walaupun websocket broadcast sempat tidak tersampaikan ke HP siswa.
  useEffect(() => {
    if (!isLocked || isExamCompleted) return;

    const pollInterval = setInterval(async () => {
      try {
        const lockStatus = await checkStudentLockStatus(subject.id, studentName, subject.violationLimit || 3);
        if (!lockStatus.isBlocked) {
          setIsLocked(false);
          setViolationCount(0);
          setShowWarningModal(false);
          setUnlockedNotice(true);
          setTimeout(() => setUnlockedNotice(false), 5000);

          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem(blockedKey);
              localStorage.setItem(stateKey, JSON.stringify({
                answers: answersRef.current,
                secondsRemaining: secondsRemainingRef.current,
                violationCount: 0,
                isLocked: false,
                startTime: startTimeRef.current,
                currentIndex: currentIndexRef.current,
                lastSavedTime: Date.now()
              }));
            } catch {}
          }
          sendDirectHeartbeat(true);
          requestFullscreenMode();
        }
      } catch (err) {
        console.warn('Gagal polling lock status di ExamScreen:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isLocked, isExamCompleted, subject.id, studentName, subject.violationLimit, blockedKey, stateKey, sendDirectHeartbeat, requestFullscreenMode]);

  // Handler Pengecekan Kunci Mandiri saat Siswa di Layar Terkunci
  const handleManualCheckUnlock = async () => {
    setIsCheckingUnlock(true);
    setUnlockCheckMessage(null);
    try {
      const lockStatus = await checkStudentLockStatus(subject.id, studentName, subject.violationLimit || 3);
      if (!lockStatus.isBlocked) {
        setIsLocked(false);
        setViolationCount(0);
        setShowWarningModal(false);
        setUnlockedNotice(true);
        setTimeout(() => setUnlockedNotice(false), 5000);

        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(blockedKey);
            localStorage.setItem(stateKey, JSON.stringify({
              answers: answersRef.current,
              secondsRemaining: secondsRemainingRef.current,
              violationCount: 0,
              isLocked: false,
              startTime: startTimeRef.current,
              currentIndex: currentIndexRef.current,
              lastSavedTime: Date.now()
            }));
          } catch {}
        }
        sendDirectHeartbeat(true);
        requestFullscreenMode();
      } else {
        setUnlockCheckMessage('Akun Anda masih berstatus terkunci di komputer pengawas. Silakan hubungi guru pengawas di ruangan.');
      }
    } catch {
      setUnlockCheckMessage('Gagal menghubungi server pengawas. Silakan coba sesaat lagi.');
    } finally {
      setIsCheckingUnlock(false);
    }
  };

  // 4. ANTI-CHEAT ENGINE & VIOLATION HANDLER
  const handleViolation = useCallback(async (reason: string) => {
    if (isCompletedRef.current || isLockedRef.current) return;

    // Cooldown debounce 2.5 detik untuk mencegah multi-trigger dari 1 kali pindah tab (blur + visibility + fullscreen)
    const now = Date.now();
    if (now - lastViolationTimeRef.current < 2500) {
      return;
    }
    lastViolationTimeRef.current = now;

    const nextCount = violationCountRef.current + 1;
    setViolationCount(nextCount);
    setLastViolationReason(reason);

    const limit = subject.violationLimit || 3;
    const actualClass = studentClass || subject.className;

    // Catat notifikasi otomatis ke Supabase
    try {
      await insertNotification({
        subjectId: subject.id,
        studentName,
        type: nextCount >= limit ? 'autolock' : 'violation',
        title: nextCount >= limit ? 'Ujian Siswa Terkunci' : 'Peringatan Anti-Cheat',
        message: `Siswa ${studentName} (${actualClass}): ${reason} (Pelanggaran ke-${nextCount} dari batas ${limit}).`
      });
    } catch {}

    // Segera laporkan sesi dengan status terbaru
    const answered = answersRef.current.filter(a => a.answer !== null && a.answer !== '').length;
    reportStudentSession({
      id: `session_${studentName}_${subject.id}`,
      subjectId: subject.id,
      studentId: studentName,
      studentName,
      className: studentClass || subject.className,
      startTime: startTimeRef.current,
      lastHeartbeat: Date.now(),
      progressCount: answered,
      totalQuestions: questions.length,
      violationCount: nextCount,
      answers: answersRef.current,
      status: nextCount >= limit ? 'blocked' : 'ongoing',
      isFocus: false,
      remainingSeconds: secondsRemainingRef.current
    });

    // Segera perbarui snapshot ujian ke localStorage secara sinkron agar tidak hilang jika siswa mematikan aplikasi/browser
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(stateKey, JSON.stringify({
          answers: answersRef.current,
          secondsRemaining: secondsRemainingRef.current,
          violationCount: nextCount,
          isLocked: nextCount >= limit,
          lastViolationReason: reason,
          startTime: startTimeRef.current,
          currentIndex: currentIndexRef.current,
          lastSavedTime: Date.now()
        }));
        if (nextCount >= limit) {
          localStorage.setItem(blockedKey, JSON.stringify({
            isBlocked: true,
            violationCount: nextCount,
            lockedAt: Date.now()
          }));
        }
      } catch {}
    }

    if (nextCount >= limit) {
      // BEKUKAN & KUNCI UJIAN (Layar Merah Mati)
      setIsLocked(true);
      setShowWarningModal(false);
    } else {
      // Tampilkan Modal Peringatan dengan Countdown 5 Detik
      setShowWarningModal(true);
      setWarningCountdown(5);
    }
  }, [subject.id, subject.className, subject.violationLimit, studentName, studentClass, questions.length]);

  // COUNTDOWN EFFECT UNTUK MODAL PERINGATAN (5 DETIK SEPERTI INDEX.HTML)
  useEffect(() => {
    if (!showWarningModal || isLocked) return;

    const timer = setInterval(() => {
      setWarningCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowWarningModal(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarningModal, isLocked]);

  // 5. EVENT LISTENERS ANTI-CHEAT (FULLSCREEN, VISIBILITY, BLUR, KEYBOARD, CONTEXTMENU, COPY/PASTE)
  useEffect(() => {
    if (isExamCompleted) return;

    // A. Fullscreen Change
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isFs);
      // Jika dokumen sedang hidden (sedang di tab lain), jangan dobel hitung pelanggaran fullscreen
      if (document.hidden) return;
      if (!isFs && !isCompletedRef.current && !isLockedRef.current) {
        handleViolation('Keluar dari mode layar penuh (Fullscreen).');
      }
    };

    // B. Visibility Change (Ganti tab / minimize browser)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isFocusRef.current = false;
        setIsFocus(false);
        sendDirectHeartbeat(false);
        handleViolation('Berpindah tab atau menyembunyikan browser.');
      } else {
        isFocusRef.current = true;
        setIsFocus(true);
        sendDirectHeartbeat(true);
      }
    };

    // C. Blur & Focus Window (Google Assistant overlay / Split Screen / Notifikasi)
    const handleBlur = () => {
      isFocusRef.current = false;
      setIsFocus(false);
      sendDirectHeartbeat(false);
      // Jika dokumen sudah hidden, event visibilitychange sudah mencatatnya
      if (document.hidden) return;
      if (!isCompletedRef.current && !isLockedRef.current) {
        handleViolation('Layar ujian kehilangan fokus (Split Screen / Google Assistant / Notifikasi).');
      }
    };

    const handleFocus = () => {
      isFocusRef.current = true;
      setIsFocus(true);
      sendDirectHeartbeat(true);
    };

    // D. Blokir Klik Kanan (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation('Mencoba klik kanan pada lembar ujian.');
    };

    // E. Blokir Copy, Cut, Paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation('Mencoba menyalin (copy) konten soal.');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation('Mencoba memotong (cut) teks lembar ujian.');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      handleViolation('Mencoba menempelkan (paste) teks ke lembar jawaban.');
    };

    // F. Blokir Tombol Pintas Keyboard (F12, DevTools, Ctrl+C/V/U/P/S, Alt+Tab)
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // F12 or Inspect Element
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key))) {
        e.preventDefault();
        handleViolation('Mencoba membuka Developer Tools (F12 / Inspect).');
        return;
      }

      // Ctrl + U (Source code), Ctrl + P (Print), Ctrl + S (Save)
      if (e.ctrlKey && ['u', 'p', 's'].includes(key)) {
        e.preventDefault();
        handleViolation(`Mencoba menggunakan tombol pintas Ctrl+${key.toUpperCase()}.`);
        return;
      }

      // Ctrl + C, Ctrl + V, Ctrl + X
      if (e.ctrlKey && ['c', 'v', 'x'].includes(key)) {
        e.preventDefault();
        handleViolation(`Mencoba menggunakan tombol pintas salin/tempel (Ctrl+${key.toUpperCase()}).`);
        return;
      }
    };

    // G. Perangkap Navigasi Tombol Back HP / Browser (History Trap Loop 20x Buffer + Continuous Re-Arm)
    // Siswa menekan tombol Back 1x, 2x cepat, 3x, dst TIDAK BISA KELUAR dan tetap memunculkan modal peringatan
    const guardUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search + '#cbt-guard' : '';
    try {
      for (let i = 0; i < 20; i++) {
        window.history.pushState({ cbtGuard: true, index: i, time: Date.now() }, '', guardUrl);
      }
    } catch {}

    const handlePopState = (e: PopStateEvent) => {
      // 1. Selalu dorong 10 state baru seketika agar riwayat browser tidak pernah bisa dimundurkan
      try {
        for (let i = 0; i < 10; i++) {
          window.history.pushState({ cbtGuard: true, index: i, time: Date.now() }, '', guardUrl);
        }
      } catch {}

      // 2. Cegah keluar dan catat pelanggaran jika ujian belum selesai
      if (!isCompletedRef.current) {
        isFocusRef.current = false;
        setIsFocus(false);
        sendDirectHeartbeat(false);

        handleViolation('Menekan tombol navigasi Kembali (Back) pada perangkat HP.');

        // Minta kembali mode fullscreen jika sempat lepas
        requestFullscreenMode();
      }
    };

    // Continuous re-arm interval setiap 800ms agar buffer riwayat browser selalu terisi penuh
    const historyTicker = setInterval(() => {
      if (!isCompletedRef.current) {
        try {
          window.history.pushState({ cbtGuard: true, time: Date.now() }, '', guardUrl);
        } catch {}
      }
    }, 800);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isCompletedRef.current) {
        isFocusRef.current = false;
        setIsFocus(false);
        sendDirectHeartbeat(false);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(stateKey, JSON.stringify({
              answers: answersRef.current,
              secondsRemaining: secondsRemainingRef.current,
              violationCount: violationCountRef.current,
              isLocked: isLockedRef.current,
              lastViolationReason,
              startTime: startTimeRef.current,
              currentIndex: currentIndexRef.current,
              lastSavedTime: Date.now()
            }));
          } catch {}
        }
        e.preventDefault();
        e.returnValue = 'Ujian sedang berlangsung! Anda tidak diperbolehkan meninggalkan halaman ujian.';
        return e.returnValue;
      }
    };

    const handlePageHide = () => {
      if (!isCompletedRef.current) {
        isFocusRef.current = false;
        setIsFocus(false);
        sendDirectHeartbeat(false);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(stateKey, JSON.stringify({
              answers: answersRef.current,
              secondsRemaining: secondsRemainingRef.current,
              violationCount: violationCountRef.current,
              isLocked: isLockedRef.current,
              lastViolationReason,
              startTime: startTimeRef.current,
              currentIndex: currentIndexRef.current,
              lastSavedTime: Date.now()
            }));
          } catch {}
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(historyTicker);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isExamCompleted, handleViolation, sendDirectHeartbeat, requestFullscreenMode]);

  // 6. LISTEN FOR PROCTOR BROADCAST MESSAGES
  useEffect(() => {
    if (isExamCompleted || !subject.id) return;
    const unsub = subscribeToMessages(msg => {
      if (msg.targetType === 'broadcast') {
        setBroadcastNotice(msg.body);
      }
    });
    return () => unsub();
  }, [isExamCompleted, subject.id]);

  const currentQuestion = questions && questions.length > 0 ? questions[currentIndex] : undefined;
  const currentAnswerData = answers && answers.length > 0
    ? (answers[currentIndex] || { questionId: currentQuestion?.id || '', answer: null, isDoubtful: false })
    : { questionId: '', answer: null, isDoubtful: false };

  const handleUpdateAnswer = (newAnswer: QuestionAnswer) => {
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentIndex] = {
        ...updated[currentIndex],
        answer: newAnswer
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(stateKey, JSON.stringify({
            answers: updated,
            secondsRemaining: secondsRemainingRef.current,
            violationCount: violationCountRef.current,
            isLocked: isLockedRef.current,
            lastViolationReason,
            startTime: startTimeRef.current,
            currentIndex,
            lastSavedTime: Date.now()
          }));
        } catch {}
      }
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
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(stateKey, JSON.stringify({
            answers: updated,
            secondsRemaining: secondsRemainingRef.current,
            violationCount: violationCountRef.current,
            isLocked: isLockedRef.current,
            lastViolationReason,
            startTime: startTimeRef.current,
            currentIndex,
            lastSavedTime: Date.now()
          }));
        } catch {}
      }
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
    isCompletedRef.current = true;
    setShowConfirmSubmit(false);
    setShowWarningModal(false);

    // Evaluasi lembar ujian lengkap
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
    setIsLocked(false);

    // Hapus sesi live monitoring & tandai sudah submit di storage lokal
    removeStudentSession(studentName, subject.id);
    if (typeof window !== 'undefined') {
      try {
        const cleanName = studentName.toLowerCase().trim();
        localStorage.setItem(`cbt_submitted_${subject.id}_${cleanName}`, JSON.stringify({
          score: evaluation.finalScore,
          submittedAt: new Date().toLocaleString('id-ID'),
          reason
        }));
        localStorage.removeItem(stateKey);
        localStorage.removeItem(blockedKey);
        localStorage.removeItem(`cbt_exam_questions_${subject.id}_${cleanName}`);
      } catch {}
    }

    onFinishExam(payload);

    // Catat notifikasi otomatis pengumpulan
    try {
      await insertNotification({
        subjectId: subject.id,
        studentName,
        type: 'submission',
        title: 'Siswa Menyelesaikan Ujian',
        message: `Siswa ${studentName} (${currentClass}) telah menyelesaikan ujian dengan skor ${evaluation.finalScore}% (${reason}).`
      });
    } catch {}

    // Keluar dari mode fullscreen secara aman
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = answers.filter(a => a.answer !== null && a.answer !== '').length;

  // =========================================================================
  // VIEW: JIKA SUDAH SELESAI UJIAN
  // =========================================================================
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
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer"
            >
              Kembali ke Halaman Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: JIKA SOAL KOSONG / BELUM TERSEDIA
  // =========================================================================
  if (!questions || questions.length === 0 || !currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl text-center animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Soal Ujian Belum Tersedia</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Paket ujian <strong>{subject.title}</strong> belum memiliki butir soal yang diunggah oleh guru pengawas.
            </p>
          </div>
          <button
            onClick={onExit}
            className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            Kembali ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: JIKA TERKUNCI / DISKUALIFIKASI (LAYAR MERAH MATI IDENTIK DENGAN INDEX.HTML)
  // =========================================================================
  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 select-none">
        <div className="max-w-lg w-full bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-500 mx-auto flex items-center justify-center border border-rose-500/50 animate-pulse">
            <Ban className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-rose-400 tracking-wide">AKSES DIBLOKIR</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Anda telah melampaui batas toleransi pelanggaran sistem ({subject.violationLimit} kali).<br />
              <strong className="text-white">Akses pengerjaan ujian Anda telah dikunci oleh sistem.</strong>
            </p>
          </div>

          <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-2xl text-left text-xs space-y-2 text-slate-300">
            <p className="font-bold text-rose-300 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-rose-400" />
              <span>Status Ujian Anda:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
              <li>Seluruh jawaban sementara Anda telah diamankan di server.</li>
              <li>Status nama Anda ditandai <span className="text-rose-400 font-bold">MERAH (DISKUALIFIKASI)</span> di layar pengawas.</li>
              <li>Silakan melapor langsung kepada guru pengawas di ruangan.</li>
              <li>Tunggu pengawas melakukan <strong>&quot;Buka Kunci&quot;</strong> atau <strong>&quot;Simpan Paksa&quot;</strong> dari komputer pengawas.</li>
            </ul>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-xl text-[11px] text-slate-400 border border-slate-700/80">
            Terakhir terdeteksi: <strong className="text-rose-300">{lastViolationReason || 'Aktivitas di luar halaman ujian'}</strong>
          </div>

          {unlockCheckMessage && (
            <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-xs text-amber-300">
              {unlockCheckMessage}
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button
              onClick={handleManualCheckUnlock}
              disabled={isCheckingUnlock}
              className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition active:scale-[0.99] cursor-pointer disabled:opacity-60"
            >
              <RotateCcw className={`w-4 h-4 ${isCheckingUnlock ? 'animate-spin' : ''}`} />
              <span>{isCheckingUnlock ? 'Memeriksa ke Server Pengawas...' : 'Periksa Status Buka Kunci Sekarang'}</span>
            </button>
            <p className="text-[11px] text-slate-400">
              Sistem memeriksa otomatis setiap 2 detik. Begitu pengawas menekan &quot;Buka Kunci&quot;, layar ini akan langsung terbuka kembali.
            </p>
          </div>

          <p className="text-[11px] text-slate-500">
            Jangan tutup atau segarkan halaman ini sebelum ada instruksi resmi dari Pengawas Ruang.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: WORKSPACE UJIAN AKTIF
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors select-none">
      {/* BANNER NOTIFIKASI SUKSES BUKA KUNCI PENGAWAS */}
      {unlockedNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-4">
          <Unlock className="w-4 h-4" />
          <span>Pengawas telah me-reset pelanggaran Anda. Silakan lanjutkan ujian dengan tertib!</span>
        </div>
      )}

      {/* 1. TOP EXAM HEADER (RESPONSIVE HP & TABLET) */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 transition-colors">
        {/* Sisi Kiri: Logo + Judul Ujian & Nama Siswa (Dengan Truncate Otomatis untuk Nama Panjang) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs flex-shrink-0">
            CBT
          </div>
          <div className="min-w-0 flex-1">
            <h1
              className="font-bold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white leading-tight truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm"
              title={subject.title}
            >
              {subject.title}
            </h1>
            <p
              className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[120px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm"
              title={`${studentName} • ${studentClass || subject.className}`}
            >
              {studentName} • {studentClass || subject.className}
            </p>
          </div>
        </div>

        {/* Sisi Kanan: Statusbar, Timer, dan Tombol Kontrol Ramah HP */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Tombol Fullscreen Manual jika belum */}
          {!isFullscreen && (
            <button
              onClick={requestFullscreenMode}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              title="Aktifkan Mode Layar Penuh"
            >
              <Maximize2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden md:inline">Layar Penuh</span>
            </button>
          )}

          {/* Tombol Lapor Kendala ke Pengawas */}
          <button
            onClick={() => setShowReportModal(true)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
            title="Laporkan masalah teknis atau pertanyaan soal ke pengawas"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="hidden md:inline">Lapor Kendala</span>
          </button>

          {/* Toggle Theme */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition cursor-pointer flex-shrink-0"
            title="Ganti Tema"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />}
          </button>

          {/* Sisa Waktu Ujian (Timer) */}
          <div
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border font-mono text-xs sm:text-sm font-bold flex-shrink-0 ${
              secondsRemaining < 300
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          {/* Selesai Button */}
          <button
            onClick={() => setShowConfirmSubmit(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs sm:text-sm transition shadow-md shadow-violet-600/20 cursor-pointer flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Selesai</span>
            <span className="xs:hidden">✓</span>
          </button>
        </div>
      </header>

      {/* PENGUMUMAN BROADCAST DARI PENGAWAS */}
      {broadcastNotice && (
        <div className="bg-amber-500 text-slate-950 px-3 sm:px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1 min-w-0">
            <Megaphone className="w-4 h-4 flex-shrink-0 animate-bounce" />
            <span className="truncate">PENGUMUMAN: {broadcastNotice}</span>
          </div>
          <button
            onClick={() => setBroadcastNotice(null)}
            className="p-1 hover:bg-amber-600 rounded-lg text-slate-950 cursor-pointer flex-shrink-0 ml-2"
            title="Tutup Pengumuman"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* AREA SOAL AKTIF */}
        <main className="lg:col-span-3 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Soal No. {currentIndex + 1} dari {questions.length}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  {currentQuestion.type}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Tombol Buka Daftar Soal Cepat (Khusus Layar HP & Tablet) */}
                <button
                  type="button"
                  onClick={() => setShowMobilePalette(true)}
                  className="lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 transition cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-violet-600" />
                  <span>Daftar Soal</span>
                </button>

                {/* Ragu-ragu */}
                <button
                  type="button"
                  onClick={handleToggleDoubt}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    currentAnswerData.isDoubtful
                      ? 'bg-amber-100 dark:bg-amber-950/50 border-amber-400 text-amber-800 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{currentAnswerData.isDoubtful ? 'Ragu-ragu' : 'Ragu-ragu'}</span>
                </button>
              </div>
            </div>

            <div className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg leading-relaxed text-slate-800 dark:text-slate-100 font-normal whitespace-pre-wrap break-words">
              {currentQuestion.questionText}
            </div>

            {/* Media Gambar Stimulus Soal */}
            {currentQuestion.mediaUrl && (
              <div className="mt-4">
                <img
                  src={currentQuestion.mediaUrl}
                  alt="Media Soal"
                  className="max-h-56 sm:max-h-64 max-w-full rounded-2xl border border-slate-200 dark:border-slate-800 object-contain mx-auto bg-slate-50 dark:bg-slate-950 p-1"
                />
              </div>
            )}

            {/* Opsi Soal */}
            <div className="mt-5 sm:mt-6">
              <QuestionRenderer
                question={currentQuestion}
                currentAnswer={currentAnswerData.answer}
                onAnswerChange={handleUpdateAnswer}
              />
            </div>
          </div>

          {/* Tombol Navigasi Bawah */}
          <div className="flex items-center justify-between pt-4 sm:pt-6 mt-6 sm:mt-8 border-t border-slate-100 dark:border-slate-800 gap-2">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Sebelumnya</span>
            </button>

            <span className="text-xs text-slate-500 font-medium">
              Terjawab: {answeredCount} / {questions.length}
            </span>

            <button
              onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <span className="hidden xs:inline">Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* SIDEBAR NOMOR SOAL (DESKTOP) */}
        <aside className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4 h-fit sticky top-20">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Daftar Soal
            </h3>
            {violationCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900">
                {violationCount} Pelanggaran
              </span>
            )}
          </div>

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
                  className={`h-9 rounded-xl text-xs font-bold border transition cursor-pointer ${btnClass}`}
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

        {/* DAFTAR SOAL INLINE DI BAWAH (KHUSUS MOBILE / TABLET AGAR MUDAH DIAKSES) */}
        <div className="lg:hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Daftar Soal ({answeredCount}/{questions.length} Terjawab)
            </h3>
            {violationCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900">
                {violationCount} Pelanggaran
              </span>
            )}
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
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
                  className={`h-9 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* POPUP PALETTE DAFTAR SOAL KHUSUS MOBILE (SAAT TOMBOL 'DAFTAR SOAL' DI ATAS DIKLIK) */}
      {showMobilePalette && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Pilih Nomor Soal ({answeredCount}/{questions.length})
                </h3>
              </div>
              <button
                onClick={() => setShowMobilePalette(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 grid grid-cols-5 gap-2.5">
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
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowMobilePalette(false);
                    }}
                    className={`h-11 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 text-[11px] flex items-center justify-around text-slate-500 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
                <span>Dijawab</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-400"></span>
                <span>Ragu-ragu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-200 dark:bg-slate-700"></span>
                <span>Kosong</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP PROMPT LAYAR PENUH JIKA DIBLOKIR BROWSER */}
      {showFullscreenPrompt && !isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center">
              <Maximize2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Wajib Mode Layar Penuh</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Untuk menjaga integritas dan ketertiban ujian, Anda diwajibkan mengaktifkan mode layar penuh (Fullscreen).
            </p>
            <button
              onClick={() => {
                requestFullscreenMode();
                setShowFullscreenPrompt(false);
              }}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Aktifkan Layar Penuh Sekarang
            </button>
          </div>
        </div>
      )}

      {/* MODAL PERINGATAN ANTI-CHEAT DENGAN COUNTDOWN 5 DETIK (SEPERTI INDEX.HTML) */}
      {showWarningModal && !isLocked && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center animate-pulse">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-black text-amber-600 tracking-wide">PERINGATAN ANTI-CHEAT!</h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
              {lastViolationReason || 'Aktivitas di luar halaman ujian terdeteksi.'}
            </p>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Jumlah Pelanggaran Anda:</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {violationCount} / {subject.violationLimit} Kali
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Pelanggaran berulang akan otomatis <strong>mengunci lembar ujian</strong> dan dilaporkan ke layar monitor Pengawas.
            </p>
            <div className="text-xs font-bold text-violet-600 dark:text-violet-400 pt-1">
              Peringatan ini akan ditutup dalam {warningCountdown} detik...
            </div>
            <button
              onClick={() => {
                setShowWarningModal(false);
                requestFullscreenMode();
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              Saya Mengerti & Kembali ke Soal
            </button>
          </div>
        </div>
      )}

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
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium cursor-pointer"
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
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition flex items-center gap-1.5 cursor-pointer"
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

      {/* MODAL KONFIRMASI SELESAI UJIAN */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-violet-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Kirim Lembar Jawaban?</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              Anda telah menjawab <strong>{answeredCount}</strong> dari{' '}
              <strong>{questions.length}</strong> butir soal.
              {answeredCount < questions.length && (
                <span className="block mt-1 text-rose-500 font-semibold">
                  Masih ada {questions.length - answeredCount} butir soal yang belum Anda jawab!
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Periksa Kembali
              </button>
              <button
                onClick={() => handleFinalSubmit('Selesai Mandiri')}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer"
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
