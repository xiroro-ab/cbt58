'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { initialSubject } from '@/lib/mockData';
import { initialStudents, resolveStudentSingleClass } from '@/lib/rosterStudents';
import { initialTeachers } from '@/lib/rosterTeachers';
import { Subject, Question, ExamResult, ExamNotification, ExamMessage, Student, Teacher, SchoolSettings, StudentAnswerItem } from '@/types/cbt';
import { shuffleQuestionsGroupedByType } from '@/lib/questionRandomizer';
import { Sidebar, NavItem } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { TeacherLogin } from '@/components/teacher/TeacherLogin';
import { ExamScreen } from '@/components/exam/ExamScreen';
import { HelpModal } from '@/components/modals/HelpModal';
import { CertificateModal } from '@/components/modals/CertificateModal';
import { ApkDownloadModal } from '@/components/modals/ApkDownloadModal';
import { Footer } from '@/components/layout/Footer';
import { broadcastAnnouncementToStudents } from '@/lib/liveMonitoringService';
import { lookupStudentExamSession, clearProctorCommand } from '@/lib/examSessionService';
import {
  fetchActiveSubject,
  fetchAllSubjects,
  fetchSubjectByToken,
  fetchQuestionsBySubject,
  fetchAllQuestions,
  insertQuestion,
  updateQuestion,
  removeQuestion,
  saveExamResult,
  updateExamResult,
  saveOrUpdateExamResult,
  deleteExamResult,
  fetchExamResults,
  fetchAllExamResults,
  updateSubjectInSupabase,
  insertSubject,
  deleteSubject,
  subscribeToExamResults,
  checkStudentLockStatus,
  checkStudentExamSubmission,
  clearStudentAutolockInSupabase,
  fetchNotifications,
  fetchMessages,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateMessageStatus,
  insertMessage,
  subscribeToNotifications,
  subscribeToMessages,
  deleteNotificationFromSupabase,
  clearAllNotificationsFromSupabase,
  deleteMessageFromSupabase,
  clearAllMessagesFromSupabase,
  fetchStudents,
  insertStudent,
  bulkInsertStudents,
  updateStudentInSupabase,
  removeStudentFromSupabase,
  bulkRemoveStudentsFromSupabase,
  fetchTeachers,
  insertTeacher,
  updateTeacherStatusInSupabase,
  subscribeToTeacherStatus,
  updateTeacherPhotoInSupabase,
  updateTeacherAssignmentsInSupabase,
  mergeTeachers,
  findMatchingSubject,
  checkSubjectIsActive,
  fetchSchoolSettingsFromSupabase,
  saveSchoolSettingsToSupabase,
  defaultSchoolSettings
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
  Languages,
  CheckCircle2,
  IdCard,
  Clock,
  FileText,
  AlertTriangle,
  Play,
  X,
  ShieldAlert,
  Info,
  Loader2,
  Ban,
  Smartphone,
  Download
} from 'lucide-react';

// Kata-kata umum mata pelajaran yang dikecualikan dari pemotongan kata kunci agar tidak terjadi kebocoran mapel lintas guru
const GENERIC_SUBJECT_STOP_WORDS = new Set([
  'bahasa', 'pendidikan', 'ilmu', 'pengetahuan', 'seni', 'budaya', 'terpadu',
  'umum', 'dasar', 'kelas', 'semester', 'ganjil', 'genap', 'ujian', 'asesmen',
  'sumatif', 'tengah', 'akhir', 'asas', 'asat', 'pts', 'pas', 'pat', 'us',
  'smp', 'smpn', 'tingkat', 'paket', 'soal'
]);

// Helper pengecekan hak akses mata pelajaran per guru (mencakup pencocokan multi-kata kunci & mapel buatan guru)
export function isSubjectBelongToTeacher(s: Subject, teacher: Teacher | null, createdIds: string[] = []): boolean {
  if (!teacher || teacher.role === 'admin' || teacher.role === 'pengawas') return true;
  if (createdIds.includes(s.id)) return true;

  const sLower = s.title.toLowerCase();

  const checkMatch = (teacherSubStr: string) => {
    const tLower = teacherSubStr.toLowerCase().trim();
    if (!tLower) return false;
    // 1. Cocok penuh (contoh: "Informatika" di dalam "ASAS GANJIL INFORMATIKA KELAS 9")
    if (sLower.includes(tLower) || tLower.includes(sLower)) return true;

    // 2. Cocok kata kunci unik setelah difilter dari kata-kata umum
    const keywords = tLower
      .split(/[\s&,/()-]+/)
      .map(w => w.trim())
      .filter(w => w.length >= 3 && !GENERIC_SUBJECT_STOP_WORDS.has(w));

    if (keywords.length > 0 && keywords.some(kw => sLower.includes(kw))) {
      return true;
    }
    return false;
  };

  // 1. Cek dari penugasan guru (assignments)
  if (teacher.assignments && teacher.assignments.length > 0) {
    for (const asg of teacher.assignments) {
      if (checkMatch(asg.subject)) return true;
    }
  }

  // 2. Cek dari mata pelajaran utama guru (teacher.subject)
  if (teacher.subject && checkMatch(teacher.subject)) {
    return true;
  }

  return false;
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  // Sesi Dewan Guru & Pengawas CBT Resmi (Diinisialisasi dari cache lokal / initialTeachers tanpa placeholder)
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('cbt_cached_teachers');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cleaned = parsed.filter(t => !t.id?.match(/^tea-\d{2}$/) && t.id !== '__cbt_school_settings__');
            if (cleaned.length > 0) return cleaned;
          }
        }
      } catch (e) {
        console.warn('Failed reading cbt_cached_teachers:', e);
      }
    }
    return initialTeachers;
  });
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [activeAssignmentSubject, setActiveAssignmentSubject] = useState<string>('');
  const [viewMode, setViewMode] = useState<'teacher_login' | 'teacher' | 'student_login' | 'student_exam'>('teacher_login');
  const [currentNav, setCurrentNav] = useState<NavItem>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [certificateTargetResult, setCertificateTargetResult] = useState<ExamResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState<Subject>(initialSubject);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [selectedStudentClass, setSelectedStudentClass] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [inputToken, setInputToken] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifyingLogin, setIsVerifyingLogin] = useState(false);
  const [isStartingExam, setIsStartingExam] = useState(false);

  // State Pengaturan Satuan Pendidikan, Pejabat & TTE Barcode (Terhubung ke Supabase Cloud & Local Storage)
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(defaultSchoolSettings);
  const [isSettingsLoadedFromSupabase, setIsSettingsLoadedFromSupabase] = useState(false);

  useEffect(() => {
    // 1. Muat dari localStorage seketika agar tidak terjadi kedip/blank
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cbt_school_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSchoolSettings(prev => ({
            ...defaultSchoolSettings,
            ...prev,
            ...parsed,
            logoLeft: parsed.logoLeft || defaultSchoolSettings.logoLeft,
            logoRight: parsed.logoRight || defaultSchoolSettings.logoRight,
            examExitPassword: parsed.examExitPassword || prev.examExitPassword || defaultSchoolSettings.examExitPassword || 'palembang58'
          }));
          if (parsed.examExitPassword) {
            setIsSettingsLoadedFromSupabase(true);
          }
        }
      } catch (err) {
        console.warn('Gagal membaca cbt_school_settings dari localStorage:', err);
      }
    }

    // 2. Muat data resmi terbaru dari Database Supabase Cloud (Permanen & Lintas Perangkat)
    fetchSchoolSettingsFromSupabase().then(dbSettings => {
      if (dbSettings) {
        setSchoolSettings(dbSettings);
        setIsSettingsLoadedFromSupabase(true);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('cbt_school_settings', JSON.stringify(dbSettings));
          } catch {}
        }
      }
    }).catch(err => {
      console.warn('Gagal sinkron school settings dari Supabase:', err);
    });
  }, []);

  // Sinkronisasi Terpusat Password Keluar ke Android Exambro (Opsi 2)
  useEffect(() => {
    // Hanya kirim jika sudah dimuat dari data nyata (local cache/cloud), hindari menimpa dengan default palembang58
    if (!isSettingsLoadedFromSupabase && !schoolSettings?.examExitPassword) return;

    const exitPass = (schoolSettings?.examExitPassword || '').trim();
    if (exitPass && typeof window !== 'undefined') {
      (window as any).__CBT_EXIT_PASSWORD__ = exitPass;
      try {
        if ((window as any).AndroidExambro?.syncExitPassword) {
          (window as any).AndroidExambro.syncExitPassword(exitPass);
        }
      } catch (e) {
        console.warn('Gagal syncExitPassword ke AndroidExambro:', e);
      }
    }
  }, [schoolSettings?.examExitPassword, isSettingsLoadedFromSupabase]);

  const handleUpdateSchoolSettings = async (newSettings: SchoolSettings) => {
    // Pastikan examExitPassword dan teacherRegistrationPasscode selalu terjaga
    const safeSettings: SchoolSettings = {
      ...schoolSettings,
      ...newSettings,
      examExitPassword: newSettings.examExitPassword || schoolSettings.examExitPassword || 'palembang58',
      teacherRegistrationPasscode: newSettings.teacherRegistrationPasscode || schoolSettings.teacherRegistrationPasscode || 'GURU58'
    };

    // 1. Perbarui state UI seketika
    setSchoolSettings(safeSettings);

    // 2. Simpan ke localStorage lokal browser
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cbt_school_settings', JSON.stringify(safeSettings));
      } catch (err) {
        console.warn('Peringatan kuota localStorage saat menyimpan pengaturan:', err);
      }
    }

    // 3. Simpan permanen ke Database Supabase Cloud agar seluruh guru & perangkat tersinkronisasi
    try {
      const res = await saveSchoolSettingsToSupabase(safeSettings);
      if (res.success) {
        console.log('✅ Pengaturan kop surat & sekolah tersimpan ke Supabase Database.');
      } else {
        console.warn('⚠️ Gagal menyimpan ke Supabase:', res.error);
      }
    } catch (err) {
      console.error('Exception simpan school settings ke Supabase:', err);
    }
  };

  // State Modal Briefing & Informasi Ujian Sebelum Masuk Soal
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [briefingData, setBriefingData] = useState<{
    subject: Subject;
    student: Student | null;
    questions: Question[];
  } | null>(null);
  const [studentResumeSession, setStudentResumeSession] = useState<{
    startTime: number;
    remainingSeconds: number;
    answers?: StudentAnswerItem[];
  } | null>(null);
  const [agreedBriefingRules, setAgreedBriefingRules] = useState(true);

  // Storage Keys untuk persistensi status dibaca/dihapus di browser
  const NOTIF_STORAGE_KEY = 'cbt_notif_read_ids';
  const NOTIF_ALL_READ_KEY = 'cbt_notif_all_read';
  const NOTIF_DELETED_KEY = 'cbt_notif_deleted_ids';
  const MSG_RESOLVED_KEY = 'cbt_msg_resolved_ids';
  const MSG_DELETED_KEY = 'cbt_msg_deleted_ids';

  // Live Notifications State (Lonceng 🔔) - Murni 100% dari Supabase Cloud (tanpa placeholder)
  const [notifications, setNotifications] = useState<ExamNotification[]>([]);

  // Live Messages State (Amplop ✉️ - Kendala Siswa & Broadcast Pengawas) - Murni 100% dari Supabase
  const [messages, setMessages] = useState<ExamMessage[]>([]);

  // Unique class list strictly from student roster
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.className && s.className.trim()) {
        set.add(s.className.trim());
      }
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [students]);

  // Filtered student list for student login autocomplete
  const classStudents = useMemo(() => {
    return students.filter(s => s.className === selectedStudentClass);
  }, [students, selectedStudentClass]);

  const matchedStudent = useMemo(() => {
    if (!studentName.trim()) return null;
    return (
      classStudents.find(
        s => s.name.toLowerCase().trim() === studentName.toLowerCase().trim()
      ) ||
      students.find(
        s => s.name.toLowerCase().trim() === studentName.toLowerCase().trim()
      )
    );
  }, [classStudents, students, studentName]);

  // Auto-deteksi mata pelajaran secara aman (verifikasi cloud jika token disembunyikan dari browser siswa)
  const [tokenVerifiedSubject, setTokenVerifiedSubject] = useState<Subject | null>(null);

  useEffect(() => {
    const clean = inputToken.trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setTokenVerifiedSubject(null);
      return;
    }

    const localMatched = subjects.find(s => s.token && s.token.trim().toUpperCase() === clean);
    if (localMatched) {
      setTokenVerifiedSubject(localMatched);
      return;
    }

    let isMounted = true;
    fetchSubjectByToken(clean).then(sub => {
      if (isMounted && sub) {
        setTokenVerifiedSubject(sub);
      }
    }).catch(() => {});

    return () => { isMounted = false; };
  }, [inputToken, subjects]);

  const detectedSubject = tokenVerifiedSubject;

  // Prefetch butir soal di latar belakang segera setelah token mapel valid & aktif terdeteksi (0ms saat Mulai Ujian)
  useEffect(() => {
    if (detectedSubject?.id && detectedSubject.isActive) {
      fetchQuestionsBySubject(detectedSubject.id).catch(() => {});
    }
  }, [detectedSubject?.id, detectedSubject?.isActive]);

  // 1. Load data awal dari Supabase & sinkronkan dengan cache lokal
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Baca sesi guru lebih dulu: katalog foto hanya diunduh di perangkat guru,
        // bukan di 300 perangkat siswa.
        const savedTeacherId = typeof window !== 'undefined'
          ? localStorage.getItem('cbt_logged_teacher_id')
          : null;

        // Ambil data guru resmi dari Supabase & deteksi sesi aktif
        const tList = await fetchTeachers(Boolean(savedTeacherId));
        let loadedTeachers = initialTeachers;
        if (tList && tList.length > 0) {
          const cleaned = tList.filter(t => !t.id?.match(/^tea-\d{2}$/) && t.id !== '__cbt_school_settings__');
          loadedTeachers = cleaned.length > 0 ? cleaned : initialTeachers;
          setTeachers(loadedTeachers);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('cbt_cached_teachers', JSON.stringify(loadedTeachers));
            } catch (e) {}
          }
        }

        let savedTeacher: Teacher | null = null;
        if (typeof window !== 'undefined') {
          if (savedTeacherId) {
            savedTeacher = loadedTeachers.find(t => t.id === savedTeacherId) || null;
            if (savedTeacher) {
              const photo = localStorage.getItem(`cbt_teacher_${savedTeacher.id}_photo`);
              if (photo) {
                savedTeacher.photoUrl = photo;
                savedTeacher.avatar = photo;
              }
              savedTeacher.status = 'Aktif Mengawas';
              savedTeacher.lastLogin = new Date().toISOString();
              setCurrentTeacher(savedTeacher);
              setViewMode('teacher');
              updateTeacherStatusInSupabase(savedTeacher.id, 'Aktif Mengawas').catch(() => {});
            }
          }
        }

        // Ambil seluruh mata pelajaran resmi dari Supabase Cloud
        const allSubs = await fetchAllSubjects();
        let activeSub: Subject;

        if (allSubs && allSubs.length > 0) {
          // KEAMANAN TOKEN: Jika belum ada guru login, sterilkan properti 'token' agar siswa tidak bisa mengintip token mapel lain lewat DevTools/Console
          const publicSubs = savedTeacher
            ? allSubs
            : allSubs.map(s => ({ ...s, token: '' }));
          setSubjects(publicSubs);

          if (savedTeacher) {
            const firstAsg = savedTeacher.assignments?.[0];
            const targetName = firstAsg ? firstAsg.subject : (savedTeacher.subject || '');
            const matched = findMatchingSubject(allSubs, targetName);
            activeSub = matched || allSubs.find(s => s.isActive) || allSubs[0];
            setActiveAssignmentSubject(firstAsg ? firstAsg.subject : activeSub.title);
          } else {
            activeSub = allSubs.find(s => s.isActive) || allSubs[0];
            setActiveAssignmentSubject(activeSub.title);
          }

          setSubject(activeSub);
          // Siswa wajib memilih kelas & memasukkan token sendiri (tanpa prefill)

          // Muat seluruh bank soal & database nilai HANYA jika yang membuka adalah Guru yang terautentikasi.
          // OPTIMASI SKALA 300 SISWA: Mencegah 300 siswa serentak menembak ribuan kueri bank soal dan database nilai saat membuka halaman login.
          if (savedTeacher) {
            const allQList = await fetchAllQuestions();
            if (allQList && allQList.length > 0) {
              setQuestions(allQList);
            } else {
              const qList = await fetchQuestionsBySubject(activeSub.id);
              setQuestions(qList || []);
            }

            const allResList = await fetchAllExamResults();
            if (allResList && allResList.length > 0) {
              setResults(allResList);
            } else {
              const resList = await fetchExamResults(activeSub.id);
              setResults(resList || []);
            }
          } else {
            setQuestions([]);
            setResults([]);
          }
        } else {
          activeSub = {
            id: '',
            title: 'Belum Ada Ujian',
            className: '',
            durationMinutes: 60,
            violationLimit: 3,
            token: '',
            isActive: false,
            scoringRules: initialSubject.scoringRules
          };
          setSubjects([]);
          setSubject(activeSub);
          setQuestions([]);
          setResults([]);
        }

        // Ambil data roster siswa dari Supabase (fallback ke 301 siswa resmi DAPODIK)
        const stdList = await fetchStudents();
        if (stdList && stdList.length > 0) {
          setStudents(stdList);
        }

        // Baca cache notifikasi & filter localStorage
        let readNotifIds: string[] = [];
        let allNotifsRead = false;
        let deletedNotifIds: string[] = [];
        let resolvedMsgIds: string[] = [];
        let deletedMsgIds: string[] = [];

        if (typeof window !== 'undefined') {
          try {
            readNotifIds = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]');
            allNotifsRead = localStorage.getItem(NOTIF_ALL_READ_KEY) === 'true';
            deletedNotifIds = JSON.parse(localStorage.getItem(NOTIF_DELETED_KEY) || '[]');
            resolvedMsgIds = JSON.parse(localStorage.getItem(MSG_RESOLVED_KEY) || '[]');
            deletedMsgIds = JSON.parse(localStorage.getItem(MSG_DELETED_KEY) || '[]');
          } catch (e) {
            console.warn('Gagal membaca cache notifikasi:', e);
          }
        }

        // Ambil notifikasi & kendala siswa MURNI 100% dari Supabase (tanpa placeholder apapun)
        if (activeSub.id) {
          const notifList = await fetchNotifications(activeSub.id);
          const filteredNotifs = (notifList || [])
            .filter(n => !deletedNotifIds.includes(n.id))
            .map(n => ({
              ...n,
              isRead: n.isRead || allNotifsRead || readNotifIds.includes(n.id)
            }));
          setNotifications(filteredNotifs);

          const msgList = await fetchMessages(activeSub.id);
          const filteredMsgs = (msgList || [])
            .filter(m => !deletedMsgIds.includes(m.id))
            .map(m => ({
              ...m,
              status: (resolvedMsgIds.includes(m.id) ? 'resolved' : m.status) as 'pending' | 'resolved' | 'acknowledged'
            }));
          setMessages(filteredMsgs);
        } else {
          setNotifications([]);
          setMessages([]);
        }

        // Cek parameter URL untuk membuka ruang ujian siswa secara langsung (?mode=student)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('mode') === 'student' || urlParams.get('view') === 'student') {
            setViewMode('student_login');
          }
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Realtime listener: Dapatkan hasil ujian baru, notifikasi, dan kendala siswa dari Supabase
  // OPTIMASI SUPABASE FREE TIER: Hanya aktifkan koneksi realtime database saat pengguna berada di tampilan GURU.
  // Mencegah 300 siswa membuka 300 koneksi websocket database exam_results yang dapat melampaui batas free tier.
  useEffect(() => {
    if (viewMode !== 'teacher' || !subject?.id) return;

    // Realtime hasil ujian global (Mendukung INSERT, UPDATE, dan DELETE seketika untuk semua mapel)
    const unsubResults = subscribeToExamResults('', changePayload => {
      if (changePayload.action === 'DELETE') {
        const cleanTarget = changePayload.studentName ? changePayload.studentName.toLowerCase().trim() : '';
        setResults(prev => prev.filter(r =>
          r.id !== changePayload.resultId &&
          !(cleanTarget && r.studentName.toLowerCase().trim() === cleanTarget && r.subjectId === changePayload.subjectId)
        ));
        if (cleanTarget && typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`cbt_submitted_${changePayload.subjectId}_${cleanTarget}`);
            localStorage.removeItem(`cbt_blocked_${changePayload.subjectId}_${cleanTarget}`);
            localStorage.removeItem(`cbt_exam_state_${changePayload.subjectId}_${cleanTarget}`);
            localStorage.removeItem(`cbt_exam_questions_${changePayload.subjectId}_${cleanTarget}`);
            if (changePayload.studentName) {
              localStorage.removeItem(`cbt_answers_${changePayload.studentName}_${changePayload.subjectId}`);
            }
          } catch {}
        }
      } else if (changePayload.result) {
        const res = changePayload.result;
        const cleanName = res.studentName.toLowerCase().trim();
        setResults(prev => {
          const filtered = prev.filter(r => r.id !== res.id && !(r.studentName.toLowerCase().trim() === cleanName && r.subjectId === res.subjectId));
          return [res, ...filtered];
        });
      }
    });

    // Realtime notifikasi event sistem (Lonceng 🔔)
    const unsubNotifs = subscribeToNotifications(newNotif => {
      setNotifications(prev => {
        if (prev.some(n => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
    });

    // Realtime pesan kendala siswa (Amplop ✉️)
    const unsubMsgs = subscribeToMessages(newMsg => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [newMsg, ...prev];
      });
    });

    return () => {
      unsubResults();
      unsubNotifs();
      unsubMsgs();
    };
  }, [viewMode, subject?.id]);

  // 2b. Auto-sync background poller untuk Teacher Dashboard & Database Nilai
  // OPTIMASI SUPABASE FREE TIER: Gunakan interval 20 detik (karena Realtime Push di atas sudah instan sub-detik)
  // Menjaga database tetap ringan dan terhindar dari pool exhaustion.
  useEffect(() => {
    if (viewMode !== 'teacher' || !subject?.id) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const cloudResults = await fetchAllExamResults();
        if (!isMounted || !cloudResults) return;

        setResults(prev => {
          if (prev.length !== cloudResults.length) return cloudResults;
          const hasDiff = cloudResults.some((c, i) => {
            const p = prev[i];
            if (!p) return true;
            return p.id !== c.id || p.score !== c.score || p.violationCount !== c.violationCount;
          });
          return hasDiff ? cloudResults : prev;
        });
      } catch {}
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [viewMode]);

  // 2c. Heartbeat keaktifan mengawas guru ke Supabase Cloud setiap 30 detik
  useEffect(() => {
    if (!currentTeacher?.id || viewMode !== 'teacher') return;

    const pingActivity = () => {
      updateTeacherStatusInSupabase(currentTeacher.id, 'Aktif Mengawas').catch(() => {});
    };

    pingActivity();
    const interval = setInterval(pingActivity, 30000);

    return () => clearInterval(interval);
  }, [currentTeacher?.id, viewMode]);

  // 2d. Auto-sync status keaktifan dewan guru dari Supabase Cloud setiap 25 detik
  useEffect(() => {
    if (viewMode !== 'teacher') return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const cloudTeachers = await fetchTeachers(false);
        if (!isMounted || !cloudTeachers || cloudTeachers.length === 0) return;

        setTeachers(prev => {
          const hasChanges = cloudTeachers.some(ct => {
            const existing = prev.find(p => p.id === ct.id);
            if (!existing) return true;
            return existing.status !== ct.status || existing.lastLogin !== ct.lastLogin;
          });
          if (!hasChanges) return prev;
          return cloudTeachers;
        });
      } catch {}
    }, 25000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [viewMode]);

  // 2e. Realtime listener: Dapatkan update status online/offline guru lain seketika lintas perangkat & jaringan
  useEffect(() => {
    if (viewMode !== 'teacher') return;

    const unsub = subscribeToTeacherStatus(payload => {
      setTeachers(prev =>
        prev.map(t =>
          t.id === payload.teacherId
            ? { ...t, status: payload.status, lastLogin: payload.lastLogin }
            : t
        )
      );
    });

    return () => unsub();
  }, [viewMode]);

  const handleUpdateSubject = async (updated: Subject) => {
    setSubject(updated);
    setSubjects(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    try {
      await updateSubjectInSupabase(updated);
    } catch (err) {
      console.warn('Update subject fallback to local:', err);
    }
  };

  const handleAddSubject = async (newSub: Subject) => {
    setSubjects(prev => {
      const exists = prev.some(s => s.id === newSub.id);
      return exists ? prev.map(s => s.id === newSub.id ? newSub : s) : [...prev, newSub];
    });
    setSubject(newSub);
    try {
      const inserted = await insertSubject(newSub);
      if (inserted && inserted.id) {
        setSubjects(prev => prev.map(s => s.id === newSub.id ? inserted : s));
        setSubject(inserted);
      }
    } catch (err) {
      console.warn('Supabase insert subject fallback:', err);
    }
  };

  const handleDeleteSubject = async (subId: string) => {
    setSubjects(prev => {
      const remaining = prev.filter(s => s.id !== subId);
      if (subject.id === subId) {
        if (remaining.length > 0) {
          setSubject(remaining[0]);
        } else {
          setSubject({
            id: '',
            title: 'Belum Ada Ujian',
            className: '',
            durationMinutes: 60,
            violationLimit: 3,
            token: '',
            isActive: false,
            scoringRules: initialSubject.scoringRules
          });
        }
      }
      return remaining;
    });
    try {
      await deleteSubject(subId);
    } catch (err) {
      console.warn('Supabase delete subject fallback:', err);
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
      await removeQuestion(qId, subject?.id);
    } catch (err) {
      console.warn('Supabase delete fallback to local state:', err);
    }
  };

  const handleUpdateQuestion = async (updatedQ: Question) => {
    setQuestions(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
    try {
      await updateQuestion(updatedQ);
    } catch (err) {
      console.warn('Supabase update question fallback to local state:', err);
    }
  };

  const handleUpdateResult = async (updatedResult: ExamResult) => {
    const cleanName = updatedResult.studentName.toLowerCase().trim();
    const cleanClass = (updatedResult.className || '').toLowerCase().trim();
    setResults(prev => {
      const filtered = prev.filter(
        r => r.id !== updatedResult.id && !(
          r.studentName.toLowerCase().trim() === cleanName &&
          r.subjectId === updatedResult.subjectId &&
          (!cleanClass || !r.className || r.className.toLowerCase().trim() === cleanClass)
        )
      );
      return [updatedResult, ...filtered];
    });
    try {
      await saveOrUpdateExamResult(updatedResult);
    } catch (err) {
      console.warn('Supabase update result fallback to local state:', err);
    }
  };

  const handleDeleteResult = async (resultId: string, subjectId?: string, studentName?: string, className?: string) => {
    const cleanName = studentName ? studentName.toLowerCase().trim() : '';
    setResults(prev =>
      prev.filter(r => {
        if (resultId && r.id === resultId) return false;
        if (cleanName && r.studentName && r.studentName.toLowerCase().trim() === cleanName) {
          if (!subjectId || !r.subjectId || r.subjectId === subjectId) return false;
        }
        return true;
      })
    );
    try {
      await deleteExamResult(resultId, subjectId || subject?.id, studentName, className);
    } catch (err) {
      console.warn('Supabase delete result fallback to local state:', err);
    }
  };

  // Student Roster CRUD Handlers
  const handleAddStudent = async (newStudent: Student) => {
    setStudents(prev => [newStudent, ...prev]);
    try {
      await insertStudent(newStudent);
    } catch (err) {
      console.warn('Supabase insert student fallback:', err);
    }
  };

  const handleUpdateStudent = async (updated: Student) => {
    setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
    try {
      await updateStudentInSupabase(updated);
    } catch (err) {
      console.warn('Supabase update student fallback:', err);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
    try {
      await removeStudentFromSupabase(studentId);
    } catch (err) {
      console.warn('Supabase delete student fallback:', err);
    }
  };

  const handleBulkInsertStudents = async (newStudents: Student[]) => {
    setStudents(prev => {
      const incomingNisns = new Set(newStudents.map(s => s.nisn));
      const filtered = prev.filter(s => !incomingNisns.has(s.nisn));
      return [...newStudents, ...filtered];
    });
    try {
      await bulkInsertStudents(newStudents);
    } catch (err) {
      console.warn('Supabase bulk insert students fallback:', err);
    }
  };

  const handleBulkDeleteStudents = async (studentIds: string[]) => {
    const idSet = new Set(studentIds);
    setStudents(prev => prev.filter(s => !idSet.has(s.id)));
    try {
      await bulkRemoveStudentsFromSupabase(studentIds);
    } catch (err) {
      console.warn('Supabase bulk delete students fallback:', err);
    }
  };

  // Teacher Login & Session Handlers (Skenario 30 Guru & Multi-Mapel/Multi-Rombel)
  const handleTeacherLoginSuccess = async (teacher: Teacher) => {
    if (typeof window !== 'undefined') {
      const photo = localStorage.getItem(`cbt_teacher_${teacher.id}_photo`);
      if (photo && !teacher.photoUrl) {
        teacher.photoUrl = photo;
        teacher.avatar = photo;
      }
      localStorage.setItem('cbt_logged_teacher_id', teacher.id);
    }
    if (currentTeacher?.id && currentTeacher.id !== teacher.id) {
      updateTeacherStatusInSupabase(currentTeacher.id, 'Offline').catch(() => {});
    }
    const loggedInTeacher: Teacher = {
      ...teacher,
      status: 'Aktif Mengawas',
      lastLogin: new Date().toISOString()
    };
    setCurrentTeacher(loggedInTeacher);
    setTeachers(prev => prev.map(t => {
      if (t.id === teacher.id) return loggedInTeacher;
      if (currentTeacher?.id && t.id === currentTeacher.id) return { ...t, status: 'Offline' };
      return t;
    }));
    setViewMode('teacher');

    const firstAsg = teacher.assignments && teacher.assignments.length > 0
      ? teacher.assignments[0]
      : null;

    try {
      const allSubs = await fetchAllSubjects();
      const subsToUse = allSubs && allSubs.length > 0 ? allSubs : subjects;
      setSubjects(subsToUse);

      const targetSubName = firstAsg ? firstAsg.subject : (teacher.subject || '');
      const matchedSub = findMatchingSubject(subsToUse, targetSubName);
      const activeSubToUse = matchedSub || subsToUse.find(s => s.isActive) || subsToUse[0];

      if (activeSubToUse) {
        setSubject({
          ...activeSubToUse,
          className: firstAsg?.classes?.length ? firstAsg.classes.join(', ') : activeSubToUse.className
        });
        setActiveAssignmentSubject(firstAsg ? firstAsg.subject : (matchedSub ? matchedSub.title : 'Semua Mata Pelajaran'));
        if (firstAsg?.classes?.length) {
          setSelectedStudentClass(firstAsg.classes[0]);
        } else if (activeSubToUse.className) {
          setSelectedStudentClass(activeSubToUse.className.split(',')[0].trim());
        }
      }

      if (matchedSub && matchedSub.id) {
        const qList = await fetchQuestionsBySubject(matchedSub.id);
        setQuestions(prev => {
          const otherQuestions = prev.filter(q => q.subjectId && q.subjectId !== matchedSub.id);
          return [...otherQuestions, ...(qList || [])];
        });
        const resList = await fetchExamResults(matchedSub.id);
        setResults(prev => {
          const otherResults = prev.filter(r => r.subjectId && r.subjectId !== matchedSub.id);
          return [...(resList || []), ...otherResults];
        });
      }

      // Selalu muat seluruh bank soal & database nilai secara asinkron untuk sesi guru / admin
      fetchAllQuestions().then(allQ => {
        if (allQ && allQ.length > 0) setQuestions(allQ);
      }).catch(() => {});
      fetchAllExamResults().then(allR => {
        if (Array.isArray(allR)) setResults(allR);
      }).catch(() => {});
    } catch (err) {
      console.warn('Gagal memuat mapel untuk guru/pengawas:', err);
    }

    try {
      await updateTeacherStatusInSupabase(teacher.id, 'Aktif Mengawas');
    } catch (err) {
      console.warn('Gagal update status guru:', err);
    }
  };

  const handleSelectAssignment = async (subjectName: string) => {
    setActiveAssignmentSubject(subjectName);
    if (!currentTeacher) return;

    const matchedSub = findMatchingSubject(subjects, subjectName);
    if (matchedSub) {
      const asg = currentTeacher.assignments?.find(a => a.subject === subjectName);
      setSubject({
        ...matchedSub,
        className: asg?.classes?.length ? asg.classes.join(', ') : matchedSub.className
      });
      if (asg?.classes?.length) {
        setSelectedStudentClass(asg.classes[0]);
      } else if (matchedSub.className) {
        setSelectedStudentClass(matchedSub.className.split(',')[0].trim());
      }

      if (matchedSub.id) {
        try {
          const qList = await fetchQuestionsBySubject(matchedSub.id);
          setQuestions(prev => {
            const otherQuestions = prev.filter(q => q.subjectId && q.subjectId !== matchedSub.id);
            return [...otherQuestions, ...(qList || [])];
          });
          const resList = await fetchExamResults(matchedSub.id);
          setResults(prev => {
            const otherResults = prev.filter(r => r.subjectId && r.subjectId !== matchedSub.id);
            return [...(resList || []), ...otherResults];
          });
        } catch (err) {
          console.warn('Gagal fetch data assignment dari Supabase:', err);
        }
      }
    }
  };

  const handleTeacherLogout = () => {
    if (currentTeacher?.id) {
      const loggingOutId = currentTeacher.id;
      updateTeacherStatusInSupabase(loggingOutId, 'Offline').catch(() => {});
      setTeachers(prev => prev.map(t => t.id === loggingOutId ? { ...t, status: 'Offline' } : t));
    }
    setCurrentTeacher(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cbt_logged_teacher_id');
    }
    setViewMode('teacher_login');
  };

  const handleSwitchTeacher = (teacher: Teacher) => {
    handleTeacherLoginSuccess(teacher);
  };

  const handleRegisterTeacher = async (newTeacher: Teacher): Promise<boolean> => {
    setTeachers(prev => {
      const updated = [newTeacher, ...prev.filter(t => t.id !== newTeacher.id && t.nip !== newTeacher.nip && t.email !== newTeacher.email)];
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cbt_cached_teachers', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });
    try {
      await insertTeacher(newTeacher);
      return true;
    } catch (err) {
      console.warn('Supabase insert teacher fallback:', err);
      return true;
    }
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    // Jika guru yang diperbarui adalah guru yang sedang login
    if (currentTeacher?.id === updatedTeacher.id) {
      setCurrentTeacher(updatedTeacher);
      // Sinkronkan mapel aktif jika perlu
      const hasCurrentMapel = updatedTeacher.assignments?.some(a => a.subject === activeAssignmentSubject);
      if (!hasCurrentMapel) {
        const nextSubject = updatedTeacher.assignments?.[0]?.subject || updatedTeacher.subject;
        if (nextSubject) {
          setActiveAssignmentSubject(nextSubject);
          const matchedSub = findMatchingSubject(subjects, nextSubject);
          if (matchedSub) {
            const asg = updatedTeacher.assignments?.find(a => a.subject === nextSubject);
            setSubject({
              ...matchedSub,
              className: asg?.classes?.length ? asg.classes.join(', ') : matchedSub.className
            });
            if (asg?.classes?.length) {
              setSelectedStudentClass(asg.classes[0]);
            }
          }
        }
      } else {
        // Jika masih mengampu mapel aktif yang sama tapi rombel kelasnya berubah
        const asg = updatedTeacher.assignments?.find(a => a.subject === activeAssignmentSubject);
        if (asg?.classes?.length) {
          setSubject(prev => ({
            ...prev,
            className: asg.classes.join(', ')
          }));
          if (!asg.classes.includes(selectedStudentClass)) {
            setSelectedStudentClass(asg.classes[0]);
          }
        }
      }
    }

    setTeachers(prev => {
      const updated = prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cbt_cached_teachers', JSON.stringify(updated));
          if (updatedTeacher.photoUrl) {
            localStorage.setItem(`cbt_teacher_${updatedTeacher.id}_photo`, updatedTeacher.photoUrl);
          }
        } catch (e) {}
      }
      return updated;
    });

    updateTeacherPhotoInSupabase(updatedTeacher.id, updatedTeacher.photoUrl || '', updatedTeacher.nip).catch(console.warn);
    updateTeacherAssignmentsInSupabase(
      updatedTeacher.id,
      updatedTeacher.assignments || [],
      updatedTeacher.subject || '',
      updatedTeacher.classes || []
    ).catch(console.warn);
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentClass.trim()) {
      setLoginError(language === 'id' ? 'Harap pilih rombel / kelas Anda terlebih dahulu.' : 'Please select your class first.');
      return;
    }

    if (!studentName.trim()) {
      setLoginError(language === 'id' ? 'Harap pilih nama lengkap siswa dari daftar kelas.' : 'Please select student name.');
      return;
    }

    if (!inputToken.trim()) {
      setLoginError(language === 'id' ? 'Harap masukkan token ujian resmi yang diberikan oleh guru pengawas.' : 'Please enter the exam token.');
      return;
    }

    const cleanToken = inputToken.trim().toUpperCase();
    // 1. Auto-deteksi mata pelajaran berdasarkan token yang dimasukkan siswa (Lokal atau Cloud Database)
    let matchedSub = tokenVerifiedSubject || subjects.find(
      s => s.token && s.token.trim().toUpperCase() === cleanToken
    );

    if (!matchedSub) {
      matchedSub = (await fetchSubjectByToken(cleanToken)) || undefined;
    }

    if (!matchedSub) {
      setLoginError(
        language === 'id'
          ? `Token "${inputToken}" tidak ditemukan! Silakan tanyakan token resmi kepada guru pengawas.`
          : `Exam token "${inputToken}" not found! Please ask your proctor.`
      );
      return;
    }

    // 1b. Validasi Status Aktif Paket Ujian (Penolakan langsung jika jadwal ujian dinonaktifkan guru)
    if (!matchedSub.isActive) {
      setLoginError(
        language === 'id'
          ? `AKSES DITUTUP: Jadwal ujian "${matchedSub.title}" saat ini berstatus NON-AKTIF (terkunci) oleh Guru Pengawas. Siswa tidak dapat mengikuti ujian ini.`
          : `ACCESS DENIED: Exam "${matchedSub.title}" is currently INACTIVE (locked) by the proctor. Students cannot start this exam.`
      );
      return;
    }

    // 2. Validasi apakah rombel kelas siswa berhak mengikuti ujian mapel ini
    const isClassMatching = (targetClass: string, studentCls: string) => {
      if (!targetClass || targetClass.toLowerCase().includes('semua')) return true;
      if (!studentCls) return true;
      const t = targetClass.toUpperCase();
      const s = studentCls.toUpperCase();
      if (t.includes(s)) return true;
      const sConverted = s.replace(/^VIII\./, '8.').replace(/^VII\./, '7.').replace(/^IX\./, '9.');
      const sRoman = s.replace(/^8\./, 'VIII.').replace(/^7\./, 'VII.').replace(/^9\./, 'IX.');
      return t.includes(sConverted) || t.includes(sRoman);
    };

    if (!isClassMatching(matchedSub.className, selectedStudentClass)) {
      setLoginError(
        language === 'id'
          ? `Token "${inputToken}" adalah untuk ujian ${matchedSub.title} (Rombel: ${matchedSub.className}). Kelas Anda (${selectedStudentClass}) tidak terdaftar untuk ujian ini.`
          : `Token "${inputToken}" is for ${matchedSub.title} (${matchedSub.className}). Your class (${selectedStudentClass}) is not scheduled for this exam.`
      );
      return;
    }

    setIsVerifyingLogin(true);
    setLoginError('');

    try {
      // 3. Verifikasi Paralel Cepat (Cek Status Aktif Realtime di Supabase, Anti Re-Login, Anti-Cheat Lock & Muat Butir Soal serentak)
      const [liveIsActive, submissionStatus, lockStatus, studentSession, loadedQuestions] = await Promise.all([
        checkSubjectIsActive(matchedSub.id),
        checkStudentExamSubmission(matchedSub.id, studentName, selectedStudentClass),
        checkStudentLockStatus(matchedSub.id, studentName, matchedSub.violationLimit || 3, selectedStudentClass),
        lookupStudentExamSession(matchedSub.id, studentName, selectedStudentClass),
        fetchQuestionsBySubject(matchedSub.id).catch(err => {
          console.warn('Gagal memuat soal ujian:', err);
          return [] as Question[];
        })
      ]);

      if (liveIsActive === false) {
        setSubjects(prev => prev.map(s => s.id === matchedSub.id ? { ...s, isActive: false } : s));
        setLoginError(
          language === 'id'
            ? `AKSES DITUTUP: Jadwal ujian "${matchedSub.title}" saat ini telah DINONAKTIFKAN (terkunci) oleh Guru Pengawas. Sesi ujian tidak dapat diikuti saat ini.`
            : `ACCESS DENIED: Exam "${matchedSub.title}" has been DEACTIVATED (locked) by the proctor. You cannot start the exam at this time.`
        );
        return;
      }

      if (submissionStatus.isSubmitted) {
        setLoginError(
          language === 'id'
            ? `AKSES DITOLAK (ANTI-RELOGIN): Siswa "${studentName}" sudah pernah menyelesaikan dan mengumpulkan ujian "${matchedSub.title}" pada ${submissionStatus.submittedAt || 'sesi sebelumnya'} (Skor: ${submissionStatus.score}%). Anda tidak diperbolehkan mengerjakan ulang kecuali lembar ujian Anda di-reset oleh Guru Pengawas.`
            : `ACCESS DENIED (ANTI-RELOGIN): Student "${studentName}" has already completed and submitted "${matchedSub.title}" on ${submissionStatus.submittedAt || 'previous session'} (Score: ${submissionStatus.score}%). Retakes are forbidden unless reset by your proctor.`
        );
        return;
      }

      if (lockStatus.isBlocked) {
        setLoginError(
          language === 'id'
            ? `AKSES DITOLAK (UJIAN DIBLOKIR): Akun siswa "${studentName}" saat ini sedang DIBLOKIR oleh sistem anti-cheat karena telah melampaui batas toleransi pelanggaran (${matchedSub.violationLimit || 3}x). Anda TIDAK DAPAT mengerjakan ujian dari awal. Silakan hubungi Guru Pengawas untuk membuka kunci ("Buka Kunci") atau mereset ujian Anda.`
            : `ACCESS DENIED (EXAM LOCKED): Student "${studentName}" is currently BLOCKED by the anti-cheat system for exceeding the violation limit (${matchedSub.violationLimit || 3}x). Retakes are forbidden. Please contact your proctor to unlock or reset your exam.`
        );
        return;
      } else {
        // Siswa TIDAK terkunci di database (!lockStatus.isBlocked).
        // Guru telah membuka kunci akun siswa ini atau siswa belum pernah terkunci.
        const cleanName = studentName.toLowerCase().trim();
        const cleanClass = selectedStudentClass ? selectedStudentClass.toLowerCase().trim() : '';

        // 1. Bersihkan flag blocked di localStorage karena guru sudah membuka kuncinya
        // Serta bersihkan perintah pengawas usang di server (mis. RESET_EXAM) agar tidak menendang siswa keluar
        clearProctorCommand(matchedSub.id, studentName, selectedStudentClass).catch(() => {});
        if (typeof window !== 'undefined') {
          try {
            if (cleanClass) {
              localStorage.removeItem(`cbt_blocked_${matchedSub.id}_${cleanClass}_${cleanName}`);
            }
            localStorage.removeItem(`cbt_blocked_${matchedSub.id}_${cleanName}`);
          } catch {}
        }

        // 2. Baca state lokal yang tersimpan
        const localStateKey = cleanClass
          ? `cbt_exam_state_${matchedSub.id}_${cleanClass}_${cleanName}`
          : `cbt_exam_state_${matchedSub.id}_${cleanName}`;

        let parsedLocalState: any = null;
        if (typeof window !== 'undefined') {
          try {
            const rawState = localStorage.getItem(localStateKey) || localStorage.getItem(`cbt_exam_state_${matchedSub.id}_${cleanName}`);
            if (rawState) {
              parsedLocalState = JSON.parse(rawState);
              // Buka flag isLocked di localStorage lokal agar ujian siswa dapat dilanjutkan seketika
              parsedLocalState.isLocked = false;
              parsedLocalState.violationCount = lockStatus.violationCount || 0;
              localStorage.setItem(localStateKey, JSON.stringify(parsedLocalState));
            }
          } catch {}
        }

        // 3. Cek apakah ada sesi aktif di server Supabase (ongoing atau blocked)
        const serverHasSession = Boolean(
          studentSession.session &&
          (studentSession.session.status === 'ongoing' || studentSession.session.status === 'blocked')
        );

        // Jika localStorage lokal tidak memiliki jawaban tetapi server Supabase memiliki jawaban siswa:
        // Pulihkan jawaban dari server database ke localStorage (mis. jika siswa berganti HP atau cache terhapus)
        if (
          (!parsedLocalState || !Array.isArray(parsedLocalState.answers) || parsedLocalState.answers.length === 0) &&
          studentSession.session &&
          Array.isArray(studentSession.session.answers) &&
          studentSession.session.answers.length > 0
        ) {
          parsedLocalState = {
            answers: studentSession.session.answers,
            secondsRemaining: studentSession.session.remainingSeconds || (matchedSub.durationMinutes * 60),
            violationCount: lockStatus.violationCount || 0,
            isLocked: false,
            startTime: studentSession.session.startTime || Date.now(),
            currentIndex: 0,
            lastSavedTime: Date.now()
          };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(localStateKey, JSON.stringify(parsedLocalState));
            } catch {}
          }
        }

        // 4. Deteksi apakah sesi ini dapat dilanjutkan (Resume)
        const hasAnswers = Boolean(
          (parsedLocalState && Array.isArray(parsedLocalState.answers) && parsedLocalState.answers.length > 0) ||
          (studentSession.session && Array.isArray(studentSession.session.answers) && studentSession.session.answers.length > 0)
        );

        const hasResumableSession = serverHasSession || hasAnswers;

        if (hasResumableSession) {
          const savedSeconds = Number(
            parsedLocalState?.secondsRemaining ||
            studentSession.session?.remainingSeconds ||
            (matchedSub.durationMinutes * 60)
          );
          const lastSavedAt = Number(parsedLocalState?.lastSavedTime || 0);
          const elapsed = lastSavedAt > 0 ? Math.floor((Date.now() - lastSavedAt) / 1000) : 0;
          // Jangan biarkan sisa waktu menjadi 0 jika siswa lama menunggu guru membuka kuncinya.
          // Berikan minimal 120 detik (2 menit) agar siswa sempat menyelesaikan sisa soal.
          const effectiveRemaining = Math.max(120, savedSeconds - elapsed);
          const restoredAnswers = (parsedLocalState?.answers && parsedLocalState.answers.length > 0)
            ? parsedLocalState.answers
            : (studentSession.session?.answers || []);

          setStudentResumeSession({
            startTime: Number(parsedLocalState?.startTime || studentSession.session?.startTime || Date.now()),
            remainingSeconds: effectiveRemaining,
            answers: restoredAnswers
          });
        } else {
          setStudentResumeSession(null);
        }
      }

      if (!loadedQuestions || loadedQuestions.length === 0) {
        setLoginError(
          language === 'id'
            ? `Paket ujian "${matchedSub.title}" belum memiliki butir soal yang diunggah oleh guru pengawas. Silakan hubungi guru yang bersangkutan.`
            : `No questions found for "${matchedSub.title}". Please contact your teacher or proctor.`
        );
        return;
      }

      // 4. Persistensi Susunan Butir Soal Siswa (Cegah reshuffle jika siswa melanjutkan ujian di tengah jalan setelah HP lag/kill task)
      const cleanName = studentName.toLowerCase().trim();
      const cleanClass = selectedStudentClass ? selectedStudentClass.toLowerCase().trim() : '';
      const questionsStorageKey = cleanClass
        ? `cbt_exam_questions_${matchedSub.id}_${cleanClass}_${cleanName}`
        : `cbt_exam_questions_${matchedSub.id}_${cleanName}`;
      let finalQuestions: Question[] = [];

      if (typeof window !== 'undefined') {
        try {
          const savedQ = localStorage.getItem(questionsStorageKey) || localStorage.getItem(`cbt_exam_questions_${matchedSub.id}_${cleanName}`);
          if (savedQ) {
            const parsed: Question[] = JSON.parse(savedQ);
            if (Array.isArray(parsed) && parsed.length === loadedQuestions.length) {
              const loadedIdSet = new Set(loadedQuestions.map(q => q.id));
              const allMatch = parsed.every(q => loadedIdSet.has(q.id));
              if (allMatch) {
                finalQuestions = parsed;
              }
            }
          }
        } catch {}
      }

      // 4b. KEAMANAN UJIAN: Sterilisasi kunci jawaban agar tidak dapat diintip siswa lewat LocalStorage / DevTools
      const sanitizedLoaded = loadedQuestions.map(q => {
        const { answer, ...cleanQ } = q;
        return cleanQ as Question;
      });

      if (finalQuestions.length === 0) {
        finalQuestions = shuffleQuestionsGroupedByType(sanitizedLoaded);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(questionsStorageKey, JSON.stringify(finalQuestions));
          } catch {}
        }
      } else {
        // Sterilkan juga jika paket soal dipulihkan dari penyimpanan lokal sesi sebelumnya
        finalQuestions = finalQuestions.map(q => {
          const { answer, ...cleanQ } = q;
          return cleanQ as Question;
        });
      }

      // Pasang otomatis mata pelajaran & butir soal yang terdeteksi
      setSubject(matchedSub);
      setQuestions(finalQuestions);
      setLoginError('');

      // Suguhkan Modal Informasi Ujian sebelum masuk ke lembar soal ujian
      setBriefingData({
        subject: matchedSub,
        student: matchedStudent || null,
        questions: finalQuestions
      });
      setAgreedBriefingRules(true);
      setShowBriefModal(true);
    } catch (err) {
      console.error('Error verifikasi ujian:', err);
      setLoginError(
        language === 'id'
          ? 'Terjadi kendala saat memverifikasi akses ujian. Silakan coba klik Mulai Ujian sekali lagi.'
          : 'Failed to verify exam access. Please try again.'
      );
    } finally {
      setIsVerifyingLogin(false);
    }
  };

  const handleConfirmStartExam = async () => {
    if (briefingData?.subject?.id) {
      try {
        const liveActive = await checkSubjectIsActive(briefingData.subject.id);
        if (liveActive === false) {
          setShowBriefModal(false);
          setLoginError(
            language === 'id'
              ? `AKSES DITUTUP: Jadwal ujian "${briefingData.subject.title}" baru saja DINONAKTIFKAN oleh Guru Pengawas.`
              : `ACCESS DENIED: Exam "${briefingData.subject.title}" was just DEACTIVATED by the proctor.`
          );
          return;
        }
      } catch {}
      // Bersihkan perintah pengawas usang di server sebelum mulai ujian
      clearProctorCommand(briefingData.subject.id, studentName, selectedStudentClass).catch(() => {});
    }
    setShowBriefModal(false);
    setViewMode('student_exam');
  };

  const handleExamExit = useCallback(() => {
    if (currentTeacher) {
      setViewMode('teacher');
    } else {
      setViewMode('student_login');
    }
  }, [currentTeacher]);

  const handleFinishExam = async (resultData: any) => {
    const cleanName = resultData.studentName.toLowerCase().trim();
    const finalClass = resolveStudentSingleClass(resultData.studentName, resultData.className || selectedStudentClass);
    const cleanClass = finalClass.toLowerCase().trim();

    if (typeof window !== 'undefined') {
      try {
        if (cleanClass) {
          localStorage.setItem(`cbt_submitted_${subject.id}_${cleanClass}_${cleanName}`, JSON.stringify({
            score: resultData.score,
            submittedAt: resultData.submittedAt
          }));
          localStorage.removeItem(`cbt_exam_questions_${subject.id}_${cleanClass}_${cleanName}`);
        }
        localStorage.setItem(`cbt_submitted_${subject.id}_${cleanName}`, JSON.stringify({
          score: resultData.score,
          submittedAt: resultData.submittedAt
        }));
        localStorage.removeItem(`cbt_exam_questions_${subject.id}_${cleanName}`);
      } catch {}
    }

    const newResult: ExamResult = {
      id: `res-${Date.now()}`,
      subjectId: subject.id,
      subjectTitle: subject.title,
      studentId: matchedStudent?.id || `std-${Date.now()}`,
      studentName: resultData.studentName,
      className: finalClass,
      score: resultData.score,
      totalEarned: resultData.totalEarned,
      totalMax: resultData.totalMax,
      answers: resultData.answers,
      submittedAt: resultData.submittedAt,
      violationCount: resultData.violationCount,
      details: resultData.details
    };

    setResults(prev => {
      const filtered = prev.filter(
        r => r.id !== newResult.id && !(
          r.studentName.toLowerCase().trim() === cleanName &&
          r.subjectId === subject.id &&
          (!cleanClass || !r.className || r.className.toLowerCase().trim() === cleanClass)
        )
      );
      return [newResult, ...filtered];
    });
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

  // Handlers Notifikasi & Pesan (Opsi A) dengan Sinkronisasi Ganda (Supabase + LocalStorage)
  const handleMarkAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(NOTIF_ALL_READ_KEY, 'true');
        const readNotifIds = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]');
        const currentIds = notifications.map(n => n.id);
        const merged = Array.from(new Set([...readNotifIds, ...currentIds]));
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
    }
    try {
      await markAllNotificationsAsRead(subject.id);
    } catch (err) {
      console.warn('Gagal update isRead di Supabase:', err);
    }
  };

  const handleMarkSingleNotificationRead = async (notifId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notifId ? { ...n, isRead: true } : n))
    );
    if (typeof window !== 'undefined') {
      try {
        const readNotifIds = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]');
        if (!readNotifIds.includes(notifId)) {
          readNotifIds.push(notifId);
          localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(readNotifIds));
        }
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
    }
    try {
      await markNotificationAsRead(notifId);
    } catch (err) {
      console.warn('Gagal markNotificationAsRead di Supabase:', err);
    }
  };

  const handleResolveMessage = async (msgId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, status: 'resolved' } : m))
    );
    if (typeof window !== 'undefined') {
      try {
        const resolvedMsgIds = JSON.parse(localStorage.getItem(MSG_RESOLVED_KEY) || '[]');
        if (!resolvedMsgIds.includes(msgId)) {
          resolvedMsgIds.push(msgId);
          localStorage.setItem(MSG_RESOLVED_KEY, JSON.stringify(resolvedMsgIds));
        }
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
    }
    try {
      await updateMessageStatus(msgId, 'resolved');
    } catch (err) {
      console.warn('Gagal updateMessageStatus di Supabase:', err);
    }
  };

  const handleSendBroadcast = async (broadcastText: string) => {
    if (!broadcastText.trim()) return;

    // 1. Siarkan langsung via Realtime Broadcast lintas HP siswa, laptop guru, dan tab browser (0ms)
    broadcastAnnouncementToStudents({
      text: broadcastText.trim(),
      subjectId: subject?.id,
      senderName: currentTeacher?.name || 'Guru Pengawas'
    });

    const newMsg: ExamMessage = {
      id: `msg-${Date.now()}`,
      subjectId: subject?.id || '',
      senderName: currentTeacher?.name || 'Guru Pengawas',
      senderRole: 'teacher',
      targetType: 'broadcast',
      title: 'Pengumuman Pengawas Ruang',
      body: broadcastText.trim(),
      status: 'acknowledged',
      createdAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [newMsg, ...prev]);

    try {
      await insertMessage(newMsg);
    } catch (err) {
      console.warn('Gagal kirim broadcast ke Supabase:', err);
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    if (typeof window !== 'undefined') {
      try {
        const deletedNotifIds = JSON.parse(localStorage.getItem(NOTIF_DELETED_KEY) || '[]');
        if (!deletedNotifIds.includes(notifId)) {
          deletedNotifIds.push(notifId);
          localStorage.setItem(NOTIF_DELETED_KEY, JSON.stringify(deletedNotifIds));
        }
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
    }
    try {
      await deleteNotificationFromSupabase(notifId);
    } catch (err) {
      console.warn('Gagal delete notification di Supabase:', err);
    }
  };

  const handleClearAllNotifications = async () => {
    const allIds = notifications.map(n => n.id);
    setNotifications([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(NOTIF_ALL_READ_KEY, 'true');
        const deletedNotifIds = JSON.parse(localStorage.getItem(NOTIF_DELETED_KEY) || '[]');
        const merged = Array.from(new Set([...deletedNotifIds, ...allIds]));
        localStorage.setItem(NOTIF_DELETED_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
    }
    try {
      await clearAllNotificationsFromSupabase(subject.id);
    } catch (err) {
      console.warn('Gagal clear all notifications di Supabase:', err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    if (typeof window !== 'undefined') {
      try {
        const deletedMsgIds = JSON.parse(localStorage.getItem(MSG_DELETED_KEY) || '[]');
        if (!deletedMsgIds.includes(msgId)) {
          deletedMsgIds.push(msgId);
          localStorage.setItem(MSG_DELETED_KEY, JSON.stringify(deletedMsgIds));
        }
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
    }
    try {
      await deleteMessageFromSupabase(msgId);
    } catch (err) {
      console.warn('Gagal delete message di Supabase:', err);
    }
  };

  const handleClearAllMessages = async () => {
    const allIds = messages.map(m => m.id);
    setMessages([]);
    if (typeof window !== 'undefined') {
      try {
        const deletedMsgIds = JSON.parse(localStorage.getItem(MSG_DELETED_KEY) || '[]');
        const merged = Array.from(new Set([...deletedMsgIds, ...allIds]));
        localStorage.setItem(MSG_DELETED_KEY, JSON.stringify(merged));
      } catch (e) {
        console.warn('Storage sync error:', e);
      }
    }
    try {
      await clearAllMessagesFromSupabase(subject.id);
    } catch (err) {
      console.warn('Gagal clear all messages di Supabase:', err);
    }
  };

  // Ambil daftar ID mapel buatan guru dari localStorage
  const teacherCreatedSubjectIds = useMemo(() => {
    if (typeof window !== 'undefined' && currentTeacher?.id) {
      try {
        const stored = localStorage.getItem(`cbt_teacher_${currentTeacher.id}_created_subjects`);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [currentTeacher?.id]);

  // Hitung jumlah paket ujian riil yang berhak diakses guru / pengawas
  const teacherExamsCount = useMemo(() => {
    if (!currentTeacher || currentTeacher.role === 'admin' || currentTeacher.role === 'pengawas') {
      return subjects.length;
    }
    return subjects.filter(s => isSubjectBelongToTeacher(s, currentTeacher, teacherCreatedSubjectIds)).length;
  }, [subjects, currentTeacher, teacherCreatedSubjectIds]);

  // Hitung jumlah butir soal riil yang berhak diakses guru / pengawas
  const teacherQuestionsCount = useMemo(() => {
    if (!currentTeacher || currentTeacher.role === 'admin' || currentTeacher.role === 'pengawas') {
      return questions.length;
    }
    const mySubjectIds = new Set(
      subjects
        .filter(s => isSubjectBelongToTeacher(s, currentTeacher, teacherCreatedSubjectIds))
        .map(s => s.id)
    );
    return questions.filter(q => q.subjectId && mySubjectIds.has(q.subjectId)).length;
  }, [questions, subjects, currentTeacher, teacherCreatedSubjectIds]);

  // Hitung jumlah lembar nilai hasil ujian (Database Nilai) riil yang berhak diakses guru / pengawas
  const teacherResultsCount = useMemo(() => {
    if (!currentTeacher || currentTeacher.role === 'admin' || currentTeacher.role === 'pengawas') {
      return results.length;
    }
    const mySubjectIds = new Set(
      subjects
        .filter(s => isSubjectBelongToTeacher(s, currentTeacher, teacherCreatedSubjectIds))
        .map(s => s.id)
    );
    const allowedSubjectNames = [
      currentTeacher.subject,
      ...(currentTeacher.assignments?.map(a => a.subject) || [])
    ].filter(Boolean).map(s => s.toLowerCase().trim());

    return results.filter(r => {
      if (r.subjectId && mySubjectIds.has(r.subjectId)) return true;
      const subTitle = (r.subjectTitle || '').toLowerCase().trim();
      return allowedSubjectNames.some(as => {
        if (subTitle.includes(as) || as.includes(subTitle)) return true;
        const keywords = as.split(/[\s&,/()-]+/).map(w => w.trim()).filter(w => w.length >= 3 && !GENERIC_SUBJECT_STOP_WORDS.has(w));
        return keywords.length > 0 && keywords.some(kw => subTitle.includes(kw));
      });
    }).length;
  }, [results, subjects, currentTeacher, teacherCreatedSubjectIds]);

  // =========================================================================
  // VIEW 0: LAYAR LOGIN GURU & PENGAWAS (PORTAL RESMI & PENDAFTARAN AKUN GURU)
  // =========================================================================
  if (viewMode === 'teacher_login') {
    return (
      <>
        <TeacherLogin
          teachers={teachers}
          onLoginSuccess={handleTeacherLoginSuccess}
          onRegisterTeacher={handleRegisterTeacher}
          onSwitchToStudentLogin={() => setViewMode('student_login')}
          onOpenApkModal={() => setIsApkModalOpen(true)}
        />
        <ApkDownloadModal
          isOpen={isApkModalOpen}
          onClose={() => setIsApkModalOpen(false)}
        />
      </>
    );
  }

  // =========================================================================
  // VIEW 1: LAYAR PENGERJAAN UJIAN SISWA (FULLSCREEN / ANTI-CHEAT)
  // =========================================================================
  if (viewMode === 'student_exam') {
    return (
      <ErrorBoundary fallbackTitle="Pemulihan Sesi Ujian Siswa">
        <ExamScreen
          subject={subject}
          questions={questions}
          studentName={studentName}
          studentClass={resolveStudentSingleClass(studentName, selectedStudentClass || matchedStudent?.className)}
          initialStartTime={studentResumeSession?.startTime}
          initialRemainingSeconds={studentResumeSession?.remainingSeconds}
          initialAnswers={studentResumeSession?.answers}
          onFinishExam={handleFinishExam}
          onExit={handleExamExit}
        />
      </ErrorBoundary>
    );
  }

  // =========================================================================
  // VIEW 2: LAYAR LOGIN / VERIFIKASI SISWA SEBELUM MULAI UJIAN
  // =========================================================================
  if (viewMode === 'student_login') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors relative">
        {/* Top Minimalist Controls */}
        <div className="w-full max-w-md mx-auto flex items-center justify-between p-3 sm:p-6 pb-2">
          <button
            onClick={() => {
              if (currentTeacher) {
                setViewMode('teacher');
              } else {
                setViewMode('teacher_login');
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-violet-600 transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>
              {currentTeacher
                ? t.backToTeacherBtn
                : language === 'id'
                ? 'Kembali ke Login Guru'
                : 'Back to Teacher Login'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsApkModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-xs font-bold text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition shadow-xs cursor-pointer"
              title="Download Aplikasi CBT Android (Exambro)"
            >
              <Smartphone className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span className="hidden sm:inline">Aplikasi Android</span>
              <span className="sm:hidden">APK</span>
            </button>

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
        <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in fade-in zoom-in-95 duration-200 my-auto">
          <div className="text-center space-y-2">
            <div className="inline-flex p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs mb-1">
              <img
                src="https://raw.githubusercontent.com/xiroro-ab/smp58dataguru/refs/heads/main/ico.png"
                alt="Logo SMPN 58"
                className="w-10 h-10 object-contain"
              />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {t.studentLoginTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subject.title} • {students.length} Siswa Terdaftar di Sistem
            </p>
          </div>

          {/* Banner Unduh Aplikasi Android (Exambro) */}
          <button
            type="button"
            onClick={() => setIsApkModalOpen(true)}
            className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-violet-50 via-slate-50 to-emerald-50 dark:from-violet-950/40 dark:via-slate-800/40 dark:to-emerald-950/30 border border-violet-200/70 dark:border-violet-800/60 flex items-center justify-between text-left hover:border-violet-400 dark:hover:border-violet-600 transition group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Aplikasi Ujian Android (Exambro)
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    v3.1
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Khusus HP Android (Kunci layar anti-curang)
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-violet-600 group-hover:bg-violet-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs flex-shrink-0">
              <Download className="w-3 h-3" />
              <span>Info & Unduh</span>
            </span>
          </button>

          <form onSubmit={handleStartExam} className="space-y-4 text-xs font-medium">
            {/* Pilihan Kelas (Wajib Kosong di Awal & Dibuka Terlebih Dahulu) */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-violet-600" />
                  <span>{t.studentClassLabel}</span>
                </span>
                <span className="text-[10px] text-slate-400">Langkah 1: Pilih Kelas</span>
              </label>
              <select
                required
                value={selectedStudentClass}
                onChange={e => {
                  setSelectedStudentClass(e.target.value);
                  setStudentName('');
                  setLoginError('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
              >
                <option value="">-- Pilih Rombel / Kelas Anda Terlebih Dahulu --</option>
                {availableClasses.map(cls => {
                  const count = students.filter(s => s.className === cls).length;
                  return (
                    <option key={cls} value={cls}>
                      Kelas {cls} ({count} Siswa)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Nama Siswa dengan Dropdown Pilihan Roster Kelas (Terkunci Sebelum Kelas Dipilih) */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-600" />
                  <span>{t.studentNameLabel}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {selectedStudentClass ? `${classStudents.length} Siswa Terdaftar` : 'Pilih kelas dahulu'}
                </span>
              </label>
              <select
                required
                disabled={!selectedStudentClass}
                value={studentName}
                onChange={e => {
                  setStudentName(e.target.value);
                  setLoginError('');
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100 ${
                  !selectedStudentClass
                    ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-70'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer'
                }`}
              >
                <option value="">
                  {selectedStudentClass
                    ? `-- Klik untuk Pilih Nama Siswa (${selectedStudentClass}) --`
                    : '-- Pilih Kelas Terlebih Dahulu --'}
                </option>
                {classStudents
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} (NISN: {s.nisn})
                    </option>
                  ))}
              </select>

              {/* Status Verifikasi Roster Siswa */}
              {matchedStudent && (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">Terdaftar di Roster Resmi</p>
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                      NISN: <span className="font-mono font-semibold">{matchedStudent.nisn}</span> • JK: {matchedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Token Ujian (Wajib Diisi Siswa & Auto-Deteksi Mapel) */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                  <span>{t.studentTokenLabel}</span>
                </span>
                <span className="text-[10px] text-slate-400">Wajib diisi siswa</span>
              </label>
              <input
                type="text"
                required
                value={inputToken}
                onChange={e => {
                  setInputToken(e.target.value.toUpperCase());
                  setLoginError('');
                }}
                placeholder="CONTOH: SMP58INF"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase tracking-widest font-mono text-center font-bold text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />

              {/* Status Auto-Deteksi Token Mata Pelajaran */}
              {detectedSubject && (
                detectedSubject.isActive ? (
                  <div className="mt-2 p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 flex items-center gap-2.5 text-[11px] text-violet-700 dark:text-violet-300 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold">{detectedSubject.title}</p>
                      <p className="text-[10px] text-violet-600/80 dark:text-violet-400/80">
                        {detectedSubject.examDate && (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 mr-1.5">
                            Tanggal: {detectedSubject.examDate} •
                          </span>
                        )}
                        Rombel: <span className="font-semibold">{detectedSubject.className || 'Semua Rombel'}</span> • Durasi: {detectedSubject.durationMinutes} Menit • Toleransi: {detectedSubject.violationLimit || 3}x
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex items-center gap-2.5 text-[11px] text-rose-700 dark:text-rose-300 animate-in fade-in">
                    <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold">
                        {detectedSubject.title}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold ml-1.5">
                          Non-Aktif
                        </span>
                      </p>
                      <p className="text-[10px] text-rose-600/90 dark:text-rose-400/90">
                        Jadwal ujian ini sedang dinonaktifkan (terkunci) oleh Guru Pengawas. Siswa belum dapat memulai ujian.
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-center text-xs">
                {loginError}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isVerifyingLogin || !selectedStudentClass || !studentName || !inputToken}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-75 disabled:cursor-wait text-white font-bold text-xs shadow-md shadow-violet-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
              >
                {isVerifyingLogin ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memverifikasi Akses Ujian...</span>
                  </>
                ) : (
                  <>
                    <span>{t.startExamBtn}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{t.antiCheatWarning}</span>
          </div>
        </div>

        {/* MODAL KONFIRMASI & INFORMASI UJIAN (BRIEFING MODAL SEBELUM MASUK SOAL) */}
        {showBriefModal && briefingData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
            <div className="max-w-xl w-full max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
              {/* Header Modal */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                    <Info className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      Konfirmasi & Informasi Ujian
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      SMP Negeri 58 Palembang • Mohon baca dengan seksama
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBriefModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Konten Scrollable */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
                {/* Identitas Peserta & Mapel */}
                <div className="p-4 rounded-2xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-violet-100 dark:border-violet-900/50 pb-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Mata Pelajaran:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {briefingData.subject.title}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Nama Siswa:</span>
                      <strong className="text-slate-900 dark:text-white">{studentName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Rombel / Kelas:</span>
                      <strong className="text-slate-900 dark:text-white">{selectedStudentClass}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tanggal Ujian:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {briefingData.subject.examDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </strong>
                    </div>
                    {briefingData.student && (
                      <>
                        <div>
                          <span className="text-slate-400 block text-[10px]">NISN:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{briefingData.student.nisn}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Jenis Kelamin:</span>
                          <span className="text-slate-800 dark:text-slate-200">{briefingData.student.gender === 'L' || briefingData.student.gender === 'Laki-Laki' ? 'Laki-Laki' : 'Perempuan'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Ringkasan Parameter Ujian */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-violet-600 dark:text-violet-400" />
                    <span className="text-[10px] text-slate-400 block">Durasi Waktu</span>
                    <strong className="text-xs text-slate-900 dark:text-white">
                      {briefingData.subject.durationMinutes} Menit
                    </strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                    <FileText className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] text-slate-400 block">Jumlah Soal</span>
                    <strong className="text-xs text-slate-900 dark:text-white">
                      {briefingData.questions.length} Butir
                    </strong>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                    <ShieldAlert className="w-4 h-4 mx-auto mb-1 text-rose-500" />
                    <span className="text-[10px] text-slate-400 block">Batas Pelanggaran</span>
                    <strong className="text-xs text-rose-600 dark:text-rose-400">
                      {briefingData.subject.violationLimit || 3}x Batas
                    </strong>
                  </div>
                </div>

                {/* Petunjuk & Tata Tertib Anti-Cheat (Ketat) */}
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Tata Tertib & Pengawasan Anti-Cheat:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 pl-1">
                    <li>
                      Ujian wajib dikerjakan dalam mode <strong>Layar Penuh (Fullscreen)</strong>.
                    </li>
                    <li>
                      <strong>Dilarang keras berpindah tab, membuka jendela lain, keluar aplikasi, atau split-screen.</strong> Setiap kehilangan fokus akan dicatat sebagai pelanggaran dan dilaporkan realtime ke pengawas.
                    </li>
                    <li>
                      <strong>Dilarang menekan tombol Kembali (Back) HP.</strong> Sistem secara otomatis mengunci tombol navigasi. Menekan tombol Back akan dihitung sebagai pelanggaran.
                    </li>
                    <li>
                      Batas maksimal pelanggaran sistem adalah <strong>{briefingData.subject.violationLimit || 3} kali</strong>. Jika melampaui, lembar ujian akan <strong>terkunci otomatis (diskualifikasi)</strong> dan hanya dapat dibuka oleh Guru Pengawas di ruangan.
                    </li>
                    <li>
                      Jawaban tersimpan otomatis ke database secara realtime.
                    </li>
                  </ul>
                </div>

                {/* Persetujuan Peserta */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedBriefingRules}
                    onChange={e => setAgreedBriefingRules(e.target.checked)}
                    className="mt-0.5 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                    Saya telah membaca, memahami, dan bersedia mematuhi seluruh tata tertib pelaksanaan ujian di atas secara jujur dan tertib.
                  </span>
                </label>
              </div>

              {/* Footer Aksi Modal */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBriefModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!agreedBriefingRules || isStartingExam}
                  onClick={handleConfirmStartExam}
                  className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-violet-600/20 flex items-center gap-2 transition active:scale-[0.99] cursor-pointer"
                >
                  {isStartingExam ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Menyiapkan Lembar Ujian...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Saya Mengerti & Mulai Mengerjakan Ujian</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DOWNLOAD APK RESMI */}
        <ApkDownloadModal
          isOpen={isApkModalOpen}
          onClose={() => setIsApkModalOpen(false)}
        />

        {/* Global Footer Copyright */}
        <Footer className="mt-8 border-t border-slate-200/60 dark:border-slate-800/60 bg-transparent w-full" />
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: PANEL GURU / DASHBOARD UTAMA SAAS (TABOR STUDY FORMAL THEME)
  // =========================================================================
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors print:h-auto print:overflow-visible print:bg-white print:text-black print:block">
      {/* SIDEBAR FORMAL DENGAN DRAWER MOBILE */}
      <Sidebar
        currentNav={currentNav}
        onSelectNav={setCurrentNav}
        examsCount={teacherExamsCount}
        questionsCount={teacherQuestionsCount}
        studentsCount={students.length}
        resultsCount={teacherResultsCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onOpenApkDownload={() => setIsApkModalOpen(true)}
        currentTeacher={currentTeacher}
        onLogout={handleTeacherLogout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* MAIN CONTAINER */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto overflow-x-hidden print:h-auto print:overflow-visible print:bg-white print:block">
        {/* NAVBAR HEADER DENGAN NOTIFIKASI & PESAN KENDALA AKTIF (OPSI A) */}
        <Navbar
          onStartStudentExam={() => setViewMode('student_login')}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
          onOpenAddQuestion={() => setIsAddModalOpen(true)}
          notifications={notifications}
          messages={messages}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onMarkNotificationRead={handleMarkSingleNotificationRead}
          onDeleteNotification={handleDeleteNotification}
          onClearAllNotifications={handleClearAllNotifications}
          onResolveMessage={handleResolveMessage}
          onDeleteMessage={handleDeleteMessage}
          onClearAllMessages={handleClearAllMessages}
          onSendBroadcast={handleSendBroadcast}
          currentTeacher={currentTeacher}
          teachers={teachers}
          allSubjects={subjects}
          activeAssignmentSubject={activeAssignmentSubject || currentTeacher?.subject}
          onSelectAssignment={handleSelectAssignment}
          onSelectNav={setCurrentNav}
          onLogoutTeacher={handleTeacherLogout}
          onSwitchTeacher={handleSwitchTeacher}
          onRefreshTeachers={async () => {
            try {
              const freshTeachers = await fetchTeachers();
              if (freshTeachers && freshTeachers.length > 0) {
                setTeachers(freshTeachers);
              }
            } catch {}
          }}
        />

        {/* DASHBOARD CONTENT BODY */}
        <main className={`flex-1 min-w-0 print:h-auto print:overflow-visible print:bg-white ${isCertificatesModalOpen ? 'print:hidden' : ''}`}>
          <ErrorBoundary fallbackTitle="Pemulihan Dashboard Guru">
            <TeacherDashboard
              currentNav={currentNav}
              subject={subject}
              questions={questions}
              results={results}
              students={students}
              currentTeacher={currentTeacher}
              teachers={teachers}
              allSubjects={subjects}
              onSelectNav={setCurrentNav}
              onSelectSubject={async (selectedSub) => {
                setSubject(selectedSub);
                if (selectedSub.className) {
                  const firstCls = selectedSub.className.split(',')[0].trim();
                  if (firstCls && !firstCls.includes('Semua')) {
                    setSelectedStudentClass(firstCls);
                  }
                }
                if (selectedSub.id) {
                  try {
                    const qList = await fetchQuestionsBySubject(selectedSub.id);
                    setQuestions(prev => {
                      const otherQuestions = prev.filter(q => q.subjectId && q.subjectId !== selectedSub.id);
                      return [...otherQuestions, ...(qList || [])];
                    });
                    const resList = await fetchExamResults(selectedSub.id);
                    setResults(prev => {
                      const otherResults = prev.filter(r => r.subjectId && r.subjectId !== selectedSub.id);
                      return [...(resList || []), ...otherResults];
                    });
                  } catch (err) {
                    console.warn('Gagal memuat soal/hasil untuk mapel:', err);
                  }
                }
              }}
              onUpdateSubject={handleUpdateSubject}
              onAddSubject={handleAddSubject}
              onDeleteSubject={handleDeleteSubject}
              onAddQuestion={handleAddQuestion}
              onUpdateQuestion={handleUpdateQuestion}
              onDeleteQuestion={handleDeleteQuestion}
              onUpdateResult={handleUpdateResult}
              onDeleteResult={handleDeleteResult}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onBulkInsertStudents={handleBulkInsertStudents}
              onBulkDeleteStudents={handleBulkDeleteStudents}
              isAddModalOpen={isAddModalOpen}
              onCloseAddModal={() => setIsAddModalOpen(false)}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onStartStudentExam={() => setViewMode('student_login')}
              searchQuery={searchQuery}
              onOpenCertificates={handleOpenCertificates}
              schoolSettings={schoolSettings}
              onUpdateSchoolSettings={handleUpdateSchoolSettings}
              onUpdateTeacher={handleUpdateTeacher}
            />
          </ErrorBoundary>
        </main>

        {/* Global Footer Copyright */}
        <Footer />
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
        allSubjects={subjects}
        students={students}
        schoolSettings={schoolSettings}
        currentTeacher={currentTeacher}
      />

      {/* MODAL DOWNLOAD APK RESMI */}
      <ApkDownloadModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        isTeacherView={true}
        activeExitPassword={schoolSettings.examExitPassword || 'palembang58'}
      />
    </div>
  );
}
