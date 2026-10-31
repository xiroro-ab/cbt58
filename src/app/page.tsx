'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { initialSubject } from '@/lib/mockData';
import { initialStudents } from '@/lib/rosterStudents';
import { initialTeachers } from '@/lib/rosterTeachers';
import { Subject, Question, ExamResult, ExamNotification, ExamMessage, Student, Teacher } from '@/types/cbt';
import { shuffleQuestionsGroupedByType } from '@/lib/questionRandomizer';
import { Sidebar, NavItem } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { TeacherLogin } from '@/components/teacher/TeacherLogin';
import { ExamScreen } from '@/components/exam/ExamScreen';
import { HelpModal } from '@/components/modals/HelpModal';
import { CertificateModal } from '@/components/modals/CertificateModal';
import {
  fetchActiveSubject,
  fetchAllSubjects,
  fetchQuestionsBySubject,
  insertQuestion,
  updateQuestion,
  removeQuestion,
  saveExamResult,
  updateExamResult,
  saveOrUpdateExamResult,
  deleteExamResult,
  fetchExamResults,
  updateSubjectInSupabase,
  insertSubject,
  deleteSubject,
  subscribeToExamResults,
  checkStudentLockStatus,
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
  mergeTeachers,
  findMatchingSubject
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
  IdCard
} from 'lucide-react';

// Helper pengecekan hak akses mata pelajaran per guru (mencakup pencocokan multi-kata kunci & mapel buatan guru)
export function isSubjectBelongToTeacher(s: Subject, teacher: Teacher | null, createdIds: string[] = []): boolean {
  if (!teacher || teacher.role === 'admin' || teacher.role === 'pengawas') return true;
  if (createdIds.includes(s.id)) return true;

  const sLower = s.title.toLowerCase();

  // 1. Cek dari penugasan guru (assignments)
  if (teacher.assignments && teacher.assignments.length > 0) {
    for (const asg of teacher.assignments) {
      const asgLower = asg.subject.toLowerCase();
      if (sLower.includes(asgLower) || asgLower.includes(sLower)) return true;
      const keywords = asgLower.split(/[\s&,/]+/).filter(w => w.length >= 3);
      if (keywords.some(kw => sLower.includes(kw))) return true;
    }
  }

  // 2. Cek dari mata pelajaran utama guru (teacher.subject)
  if (teacher.subject) {
    const tSubLower = teacher.subject.toLowerCase();
    if (sLower.includes(tSubLower) || tSubLower.includes(sLower)) return true;
    const keywords = tSubLower.split(/[\s&,/]+/).filter(w => w.length >= 3);
    if (keywords.some(kw => sLower.includes(kw))) return true;
  }

  return false;
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  // Sesi 30 Guru & Pengawas CBT (Diinisialisasi instan dari cache lokal agar tidak ada jeda login)
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('cbt_cached_teachers');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return mergeTeachers(parsed, initialTeachers);
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [certificateTargetResult, setCertificateTargetResult] = useState<ExamResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState<Subject>(initialSubject);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [selectedStudentClass, setSelectedStudentClass] = useState<string>('VIII.1');
  const [studentName, setStudentName] = useState('');
  const [inputToken, setInputToken] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  // 1. Load data awal dari Supabase & sinkronkan dengan cache lokal
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Ambil data guru dari Supabase & deteksi sesi aktif
        const tList = await fetchTeachers();
        let loadedTeachers = initialTeachers;
        if (tList && tList.length > 0) {
          loadedTeachers = tList;
          setTeachers(tList);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('cbt_cached_teachers', JSON.stringify(tList));
            } catch (e) {}
          }
        }

        let savedTeacher: Teacher | null = null;
        if (typeof window !== 'undefined') {
          const savedTeacherId = localStorage.getItem('cbt_logged_teacher_id');
          if (savedTeacherId) {
            savedTeacher = loadedTeachers.find(t => t.id === savedTeacherId) || null;
            if (savedTeacher) {
              setCurrentTeacher(savedTeacher);
              setViewMode('teacher');
            }
          }
        }

        // Ambil seluruh mata pelajaran resmi dari Supabase Cloud
        const allSubs = await fetchAllSubjects();
        let activeSub: Subject;

        if (allSubs && allSubs.length > 0) {
          setSubjects(allSubs);

          if (savedTeacher) {
            const firstAsg = savedTeacher.assignments?.[0];
            const targetName = firstAsg ? firstAsg.subject : (savedTeacher.subject || '');
            const matched = findMatchingSubject(allSubs, targetName);
            activeSub = matched || allSubs.find(s => s.isActive) || allSubs[0];
            setActiveAssignmentSubject(firstAsg ? firstAsg.subject : activeSub.title);
            if (firstAsg?.classes?.length) {
              setSelectedStudentClass(firstAsg.classes[0]);
            } else if (activeSub.className) {
              setSelectedStudentClass(activeSub.className.split(',')[0].trim());
            }
          } else {
            activeSub = allSubs.find(s => s.isActive) || allSubs[0];
            setActiveAssignmentSubject(activeSub.title);
            if (activeSub.className) {
              setSelectedStudentClass(activeSub.className.split(',')[0].trim());
            }
          }

          setSubject(activeSub);
          if (activeSub.token) setInputToken(activeSub.token);

          // Muat soal dan hasil ujian dari Supabase langsung untuk activeSub
          const qList = await fetchQuestionsBySubject(activeSub.id);
          setQuestions(qList || []);

          const resList = await fetchExamResults(activeSub.id);
          setResults(resList || []);
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
  useEffect(() => {
    if (!subject?.id) return;

    // Realtime hasil ujian (Mendukung INSERT, UPDATE, dan DELETE seketika)
    const unsubResults = subscribeToExamResults(subject.id, changePayload => {
      if (changePayload.action === 'DELETE') {
        setResults(prev => prev.filter(r =>
          r.id !== changePayload.resultId &&
          !(changePayload.studentName && r.studentName.toLowerCase().trim() === changePayload.studentName.toLowerCase().trim() && r.subjectId === changePayload.subjectId)
        ));
      } else if (changePayload.result) {
        const res = changePayload.result;
        setResults(prev => {
          const matchIdx = prev.findIndex(r =>
            r.id === res.id ||
            (r.studentName.toLowerCase().trim() === res.studentName.toLowerCase().trim() && r.subjectId === res.subjectId)
          );
          if (matchIdx >= 0) {
            const next = [...prev];
            next[matchIdx] = res;
            return next;
          }
          return [res, ...prev];
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
  }, [subject?.id]);

  // 2b. Auto-sync background poller untuk Teacher Dashboard & Database Nilai
  // Memastikan data 100% selalu up-to-date setiap beberapa detik tanpa perlu refresh manual browser
  useEffect(() => {
    if (viewMode !== 'teacher' || !subject?.id) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const cloudResults = await fetchExamResults(subject.id);
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
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [viewMode, subject?.id]);

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
    setResults(prev => {
      const matchIndex = prev.findIndex(
        r => r.id === updatedResult.id ||
             (r.studentName.toLowerCase().trim() === updatedResult.studentName.toLowerCase().trim() && r.subjectId === updatedResult.subjectId)
      );
      if (matchIndex >= 0) {
        const next = [...prev];
        next[matchIndex] = updatedResult;
        return next;
      }
      return [updatedResult, ...prev];
    });
    try {
      await saveOrUpdateExamResult(updatedResult);
    } catch (err) {
      console.warn('Supabase update result fallback to local state:', err);
    }
  };

  const handleDeleteResult = async (resultId: string, subjectId?: string, studentName?: string) => {
    setResults(prev =>
      prev.filter(
        r => r.id !== resultId && !(studentName && r.studentName.toLowerCase().trim() === studentName.toLowerCase().trim() && r.subjectId === subjectId)
      )
    );
    try {
      await deleteExamResult(resultId, subjectId || subject?.id, studentName);
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
    setCurrentTeacher(teacher);
    setViewMode('teacher');
    if (typeof window !== 'undefined') {
      localStorage.setItem('cbt_logged_teacher_id', teacher.id);
    }

    const firstAsg = teacher.assignments && teacher.assignments.length > 0
      ? teacher.assignments[0]
      : null;

    try {
      const allSubs = await fetchAllSubjects();
      const subsToUse = allSubs && allSubs.length > 0 ? allSubs : subjects;
      setSubjects(subsToUse);

      const targetSubName = firstAsg ? firstAsg.subject : (teacher.subject || '');
      const matchedSub = findMatchingSubject(subsToUse, targetSubName);

      if (matchedSub) {
        setSubject({
          ...matchedSub,
          className: firstAsg?.classes?.length ? firstAsg.classes.join(', ') : matchedSub.className
        });
        setActiveAssignmentSubject(firstAsg ? firstAsg.subject : matchedSub.title);
        if (firstAsg?.classes?.length) {
          setSelectedStudentClass(firstAsg.classes[0]);
        } else if (matchedSub.className) {
          setSelectedStudentClass(matchedSub.className.split(',')[0].trim());
        }

        if (matchedSub.id) {
          const qList = await fetchQuestionsBySubject(matchedSub.id);
          setQuestions(qList || []);
          const resList = await fetchExamResults(matchedSub.id);
          setResults(resList || []);
        }
      }
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
          setQuestions(qList || []);
          const resList = await fetchExamResults(matchedSub.id);
          setResults(resList || []);
        } catch (err) {
          console.warn('Gagal fetch data assignment dari Supabase:', err);
        }
      }
    }
  };

  const handleTeacherLogout = () => {
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

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setLoginError(language === 'id' ? 'Harap pilih atau masukkan nama lengkap siswa.' : 'Please enter student name.');
      return;
    }

    const cleanToken = inputToken.trim().toUpperCase();
    // 1. Auto-deteksi mata pelajaran berdasarkan token yang dimasukkan siswa
    const matchedSub = subjects.find(
      s => s.token.trim().toUpperCase() === cleanToken && s.isActive
    );

    if (!matchedSub) {
      setLoginError(
        language === 'id'
          ? `Token "${inputToken}" tidak ditemukan atau belum aktif! Silakan tanyakan token resmi kepada guru pengawas.`
          : `Exam token "${inputToken}" not found or inactive! Please ask your proctor.`
      );
      return;
    }

    // 2. Validasi apakah rombel kelas siswa berhak mengikuti ujian mapel ini
    if (
      matchedSub.className &&
      !matchedSub.className.includes('Semua') &&
      !matchedSub.className.includes(selectedStudentClass)
    ) {
      setLoginError(
        language === 'id'
          ? `Token "${inputToken}" adalah untuk ujian ${matchedSub.title} (Rombel: ${matchedSub.className}). Kelas Anda (${selectedStudentClass}) tidak terdaftar untuk ujian ini.`
          : `Token "${inputToken}" is for ${matchedSub.title} (${matchedSub.className}). Your class (${selectedStudentClass}) is not scheduled for this exam.`
      );
      return;
    }

    // 3. Validasi Anti Re-Login (Cegah Siswa Mengerjakan Ulang Tanpa Izin Pengawas)
    const normalizedName = studentName.toLowerCase().trim();

    // Selalu sinkronkan riwayat ujian siswa dari database cloud
    let currentResults = results;
    let cloudSynced = false;
    try {
      const cloudResults = await fetchExamResults(matchedSub.id);
      cloudSynced = true;
      currentResults = cloudResults;
      setResults(prev => {
        const cloudIds = new Set(cloudResults.map(r => r.id));
        const others = prev.filter(r => r.subjectId !== matchedSub.id && !cloudIds.has(r.id));
        return [...cloudResults, ...others];
      });
    } catch (err) {
      console.warn('Gagal sinkronisasi anti-relogin dari database:', err);
    }

    const alreadySubmittedInCloud = currentResults.find(
      r => r.subjectId === matchedSub.id && r.studentName.toLowerCase().trim() === normalizedName
    );

    let alreadySubmittedInStorage: ExamResult | null = null;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`cbt_results_${matchedSub.id}`);
        if (stored) {
          const list: ExamResult[] = JSON.parse(stored);
          const found = list.find(r => r.studentName.toLowerCase().trim() === normalizedName);
          if (found) {
            // Jika database cloud sudah sinkron dan siswa tidak ada di database hasil ujian
            // (karena sudah di-reset oleh guru/pengawas), bersihkan cache usang dari browser siswa
            if (cloudSynced && !alreadySubmittedInCloud) {
              const cleaned = list.filter(r => r.studentName.toLowerCase().trim() !== normalizedName);
              localStorage.setItem(`cbt_results_${matchedSub.id}`, JSON.stringify(cleaned));
              localStorage.removeItem(`cbt_answers_${studentName}_${matchedSub.id}`);
              alreadySubmittedInStorage = null;
            } else {
              alreadySubmittedInStorage = found;
            }
          }
        }
      } catch {}
    }

    const previousSubmission = alreadySubmittedInCloud || alreadySubmittedInStorage;
    if (previousSubmission) {
      setLoginError(
        language === 'id'
          ? `AKSES DITOLAK (ANTI-RELOGIN): Siswa "${studentName}" sudah pernah menyelesaikan dan mengumpulkan ujian "${matchedSub.title}" pada ${previousSubmission.submittedAt || 'sesi sebelumnya'} (Skor: ${previousSubmission.score}%). Anda tidak diperbolehkan mengerjakan ulang kecuali lembar ujian Anda di-reset oleh Guru Pengawas.`
          : `ACCESS DENIED: Student "${studentName}" has already completed and submitted "${matchedSub.title}" on ${previousSubmission.submittedAt || 'previous session'}. Retakes are not allowed unless reset by your proctor.`
      );
      return;
    }

    // 3b. Validasi Anti-Cheat Lock (Cegah Siswa Terkunci Mengulang dari Awal dengan Me-refresh Browser)
    const lockStatus = await checkStudentLockStatus(matchedSub.id, studentName, matchedSub.violationLimit || 3);
    if (lockStatus.isBlocked) {
      setLoginError(
        language === 'id'
          ? `AKSES DITOLAK (UJIAN DIBLOKIR): Akun siswa "${studentName}" saat ini sedang DIBLOKIR oleh sistem anti-cheat karena telah melampaui batas toleransi pelanggaran (${matchedSub.violationLimit || 3}x). Anda TIDAK DAPAT mengerjakan ujian dari awal. Silakan hubungi Guru Pengawas untuk membuka kunci ("Buka Kunci") atau mereset ujian Anda.`
          : `ACCESS DENIED (EXAM LOCKED): Student "${studentName}" is currently BLOCKED by the anti-cheat system for exceeding the violation limit (${matchedSub.violationLimit || 3}x). Retakes are forbidden. Please contact your proctor to unlock or reset your exam.`
      );
      return;
    }

    // 4. Muat butir soal riil untuk paket ujian ini sebelum masuk ke layar ujian
    let loadedQuestions: Question[] = [];
    try {
      loadedQuestions = await fetchQuestionsBySubject(matchedSub.id);
    } catch (err) {
      console.warn('Gagal memuat soal ujian:', err);
    }

    if (!loadedQuestions || loadedQuestions.length === 0) {
      setLoginError(
        language === 'id'
          ? `Paket ujian "${matchedSub.title}" belum memiliki butir soal yang diunggah oleh guru pengawas. Silakan hubungi guru yang bersangkutan.`
          : `No questions found for "${matchedSub.title}". Please contact your teacher or proctor.`
      );
      return;
    }

    // Acak butir soal secara proporsional per kelompok tipe soal
    const randomizedQuestions = shuffleQuestionsGroupedByType(loadedQuestions);

    // Pasang otomatis mata pelajaran & butir soal yang terdeteksi
    setSubject(matchedSub);
    setQuestions(randomizedQuestions);
    setLoginError('');
    setViewMode('student_exam');
  };

  const handleFinishExam = async (resultData: any) => {
    const newResult: ExamResult = {
      id: `res-${Date.now()}`,
      subjectId: subject.id,
      subjectTitle: subject.title,
      studentId: matchedStudent?.id || `std-${Date.now()}`,
      studentName: resultData.studentName,
      className: resultData.className || selectedStudentClass || subject.className,
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
    const newMsg: ExamMessage = {
      id: `msg-${Date.now()}`,
      subjectId: subject.id,
      senderName: 'Guru Pengawas',
      senderRole: 'teacher',
      targetType: 'broadcast',
      title: 'Pengumuman Pengawas Ruang',
      body: broadcastText,
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

  // =========================================================================
  // VIEW 0: LAYAR LOGIN GURU & PENGAWAS (PORTAL RESMI & PENDAFTARAN AKUN GURU)
  // =========================================================================
  if (viewMode === 'teacher_login') {
    return (
      <TeacherLogin
        teachers={teachers}
        onLoginSuccess={handleTeacherLoginSuccess}
        onRegisterTeacher={handleRegisterTeacher}
        onSwitchToStudentLogin={() => setViewMode('student_login')}
      />
    );
  }

  // =========================================================================
  // VIEW 1: LAYAR PENGERJAAN UJIAN SISWA (FULLSCREEN / ANTI-CHEAT)
  // =========================================================================
  if (viewMode === 'student_exam') {
    return (
      <ExamScreen
        subject={subject}
        questions={questions}
        studentName={studentName}
        studentClass={selectedStudentClass}
        onFinishExam={handleFinishExam}
        onExit={() => {
          if (currentTeacher) {
            setViewMode('teacher');
          } else {
            setViewMode('teacher_login');
          }
        }}
      />
    );
  }

  // =========================================================================
  // VIEW 2: LAYAR LOGIN / VERIFIKASI SISWA SEBELUM MULAI UJIAN
  // =========================================================================
  if (viewMode === 'student_login') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between items-center p-3 sm:p-6 transition-colors">
        {/* Top Minimalist Controls */}
        <div className="w-full max-w-md flex items-center justify-between py-2">
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
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-8 space-y-6 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in fade-in zoom-in-95 duration-200 my-auto">
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

          <form onSubmit={handleStartExam} className="space-y-4 text-xs font-medium">
            {/* Pilihan Kelas */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-violet-600" />
                  <span>{t.studentClassLabel}</span>
                </span>
                <span className="text-[10px] text-slate-400">Pilih dari daftar</span>
              </label>
              <select
                value={selectedStudentClass}
                onChange={e => {
                  setSelectedStudentClass(e.target.value);
                  setStudentName('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition cursor-pointer"
              >
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

            {/* Nama Siswa dengan Dropdown Pilihan Roster Kelas */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-600" />
                  <span>{t.studentNameLabel}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {classStudents.length} Siswa Terdaftar
                </span>
              </label>
              <select
                required
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition cursor-pointer"
              >
                <option value="">-- Klik untuk Pilih Nama Siswa ({selectedStudentClass}) --</option>
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
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300">
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

            {/* Token Ujian */}
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

        <footer className="text-center text-[11px] text-slate-400 dark:text-slate-500 py-3">
          SMP Negeri 58 Palembang • Sistem Ujian Berbasis Komputer
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: PANEL GURU / DASHBOARD UTAMA SAAS (TABOR STUDY FORMAL THEME)
  // =========================================================================
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden font-sans transition-colors">
      {/* SIDEBAR FORMAL DENGAN DRAWER MOBILE */}
      <Sidebar
        currentNav={currentNav}
        onSelectNav={setCurrentNav}
        examsCount={teacherExamsCount}
        questionsCount={questions.length}
        studentsCount={students.length}
        resultsCount={results.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        currentTeacher={currentTeacher}
        onLogout={handleTeacherLogout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
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
          onLogoutTeacher={handleTeacherLogout}
          onSwitchTeacher={handleSwitchTeacher}
        />

        {/* DASHBOARD CONTENT BODY */}
        <main className="flex-1">
          <TeacherDashboard
            currentNav={currentNav}
            subject={subject}
            questions={questions}
            results={results}
            students={students}
            currentTeacher={currentTeacher}
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
                  setQuestions(qList || []);
                  const resList = await fetchExamResults(selectedSub.id);
                  setResults(resList || []);
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
