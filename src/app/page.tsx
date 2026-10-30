'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { initialSubject, sampleQuestions } from '@/lib/mockData';
import { initialStudents } from '@/lib/rosterStudents';
import { initialTeachers } from '@/lib/rosterTeachers';
import { Subject, Question, ExamResult, ExamNotification, ExamMessage, Student, Teacher } from '@/types/cbt';
import { Sidebar, NavItem } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { TeacherLogin } from '@/components/teacher/TeacherLogin';
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
  subscribeToExamResults,
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
  updateTeacherStatusInSupabase
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

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  // Sesi 30 Guru & Pengawas CBT
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [activeAssignmentSubject, setActiveAssignmentSubject] = useState<string>('');
  const [viewMode, setViewMode] = useState<'teacher_login' | 'teacher' | 'student_login' | 'student_exam'>('teacher_login');
  const [currentNav, setCurrentNav] = useState<NavItem>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);
  const [certificateTargetResult, setCertificateTargetResult] = useState<ExamResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [subject, setSubject] = useState<Subject>(initialSubject);
  const [questions, setQuestions] = useState<Question[]>(sampleQuestions);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [selectedStudentClass, setSelectedStudentClass] = useState<string>('VII.1');
  const [studentName, setStudentName] = useState('AISYAH');
  const [inputToken, setInputToken] = useState('IPA2026');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Storage Keys untuk persistensi status dibaca/dihapus di browser
  const NOTIF_STORAGE_KEY = 'cbt_notif_read_ids';
  const NOTIF_ALL_READ_KEY = 'cbt_notif_all_read';
  const NOTIF_DELETED_KEY = 'cbt_notif_deleted_ids';
  const MSG_RESOLVED_KEY = 'cbt_msg_resolved_ids';
  const MSG_DELETED_KEY = 'cbt_msg_deleted_ids';

  // Seed data default yang sudah aman (default dibaca agar tidak ada badge palsu saat refresh)
  const initialSeedNotifications: ExamNotification[] = [
    {
      id: 'notif-seed-1',
      type: 'submission',
      title: 'Ujian IPA Selesai',
      message: 'Siswa AISYAH (Kelas VII.1) telah menyelesaikan ujian dengan skor 87%.',
      isRead: true,
      createdAt: 'Baru saja'
    },
    {
      id: 'notif-seed-2',
      type: 'system',
      title: 'Database Supabase Terhubung',
      message: 'Koneksi cloud PostgreSQL lxglsphqrpnrzfnvpwoa aktif & sinkron.',
      isRead: true,
      createdAt: '08:00'
    }
  ];

  const initialSeedMessages: ExamMessage[] = [
    {
      id: 'msg-seed-1',
      senderName: 'AISYAH',
      senderRole: 'student',
      targetType: 'proctor',
      studentClass: 'VII.1',
      questionNumber: 4,
      title: 'Kendala Gambar Soal',
      body: 'Pak/Bu Pengawas, gambar diagram sel pada soal no. 4 tidak muncul di layar saya.',
      status: 'resolved',
      createdAt: '08:15'
    }
  ];

  // Live Notifications State (Lonceng 🔔)
  const [notifications, setNotifications] = useState<ExamNotification[]>(initialSeedNotifications);

  // Live Messages State (Amplop ✉️ - Opsi A: Kendala Siswa & Broadcast Pengawas)
  const [messages, setMessages] = useState<ExamMessage[]>(initialSeedMessages);

  // Unique class list from students & subject
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.className) set.add(s.className);
    });
    if (subject?.className) set.add(subject.className);
    return Array.from(set).sort();
  }, [students, subject?.className]);

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

        // Ambil data roster siswa dari Supabase (fallback ke 301 initialStudents)
        const stdList = await fetchStudents();
        if (stdList && stdList.length > 0) {
          setStudents(stdList);
        }

        // Baca cache localStorage
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

        // Ambil notifikasi dari Supabase & filter dengan status localStorage
        const notifList = await fetchNotifications(sub.id);
        const sourceNotifs = notifList && notifList.length > 0 ? notifList : initialSeedNotifications;
        const filteredNotifs = sourceNotifs
          .filter(n => !deletedNotifIds.includes(n.id))
          .map(n => ({
            ...n,
            isRead: n.isRead || allNotifsRead || readNotifIds.includes(n.id)
          }));
        setNotifications(filteredNotifs);

        // Ambil pesan kendala dari Supabase & filter dengan status localStorage
        const msgList = await fetchMessages(sub.id);
        const sourceMsgs = msgList && msgList.length > 0 ? msgList : initialSeedMessages;
        const filteredMsgs = sourceMsgs
          .filter(m => !deletedMsgIds.includes(m.id))
          .map(m => ({
            ...m,
            status: (resolvedMsgIds.includes(m.id) ? 'resolved' : m.status) as 'pending' | 'resolved' | 'acknowledged'
          }));
        setMessages(filteredMsgs);

        // Ambil data 30 guru dari Supabase (fallback ke initialTeachers)
        const tList = await fetchTeachers();
        if (tList && tList.length > 0) {
          setTeachers(tList);
        }

        // Cek sesi login guru yang tersimpan di browser
        if (typeof window !== 'undefined') {
          const savedTeacherId = localStorage.getItem('cbt_logged_teacher_id');
          if (savedTeacherId) {
            const listToSearch = tList && tList.length > 0 ? tList : initialTeachers;
            const foundTeacher = listToSearch.find(t => t.id === savedTeacherId);
            if (foundTeacher) {
              setCurrentTeacher(foundTeacher);
              const firstAsg = foundTeacher.assignments?.[0];
              if (firstAsg) {
                setActiveAssignmentSubject(firstAsg.subject);
                setSubject(prev => ({
                  ...prev,
                  title: `Asesmen Sumatif - ${firstAsg.subject}`,
                  className: firstAsg.classes.join(', ')
                }));
                if (firstAsg.classes.length > 0) {
                  setSelectedStudentClass(firstAsg.classes[0]);
                }
              } else {
                setActiveAssignmentSubject(foundTeacher.subject);
                if (foundTeacher.classes?.length > 0) {
                  setSubject(prev => ({
                    ...prev,
                    title: `Asesmen Sumatif - ${foundTeacher.subject}`,
                    className: foundTeacher.classes.join(', ')
                  }));
                  setSelectedStudentClass(foundTeacher.classes[0]);
                }
              }
              setViewMode('teacher');
            }
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

    // Realtime hasil ujian
    const unsubResults = subscribeToExamResults(subject.id, newResult => {
      setResults(prev => {
        if (prev.some(r => r.id === newResult.id)) return prev;
        return [newResult, ...prev];
      });
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

    if (firstAsg) {
      setActiveAssignmentSubject(firstAsg.subject);
      setSubject(prev => ({
        ...prev,
        title: `Asesmen Sumatif - ${firstAsg.subject}`,
        className: firstAsg.classes.join(', ')
      }));
      if (firstAsg.classes.length > 0) {
        setSelectedStudentClass(firstAsg.classes[0]);
      }
    } else if (
      teacher.subject &&
      !teacher.subject.includes('Waka') &&
      !teacher.subject.includes('Kepala Sekolah') &&
      !teacher.subject.includes('BK')
    ) {
      setActiveAssignmentSubject(teacher.subject);
      setSubject(prev => ({
        ...prev,
        title: `Asesmen Sumatif - ${teacher.subject}`,
        className: teacher.classes.join(', ') || prev.className
      }));
      if (teacher.classes.length > 0) {
        setSelectedStudentClass(teacher.classes[0]);
      }
    } else {
      setActiveAssignmentSubject(teacher.subject || '');
    }

    try {
      await updateTeacherStatusInSupabase(teacher.id, 'Aktif Mengawas');
    } catch (err) {
      console.warn('Gagal update status guru:', err);
    }
  };

  const handleSelectAssignment = (subjectName: string) => {
    setActiveAssignmentSubject(subjectName);
    if (!currentTeacher) return;
    const asg = currentTeacher.assignments?.find(a => a.subject === subjectName);
    if (asg) {
      setSubject(prev => ({
        ...prev,
        title: `Asesmen Sumatif - ${asg.subject}`,
        className: asg.classes.join(', ')
      }));
      if (asg.classes.length > 0) {
        setSelectedStudentClass(asg.classes[0]);
      }
    } else if (currentTeacher.subject === subjectName) {
      setSubject(prev => ({
        ...prev,
        title: `Asesmen Sumatif - ${currentTeacher.subject}`,
        className: currentTeacher.classes.join(', ')
      }));
      if (currentTeacher.classes.length > 0) {
        setSelectedStudentClass(currentTeacher.classes[0]);
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
    setTeachers(prev => [newTeacher, ...prev]);
    try {
      await insertTeacher(newTeacher);
      return true;
    } catch (err) {
      console.warn('Supabase insert teacher fallback:', err);
      return true;
    }
  };

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setLoginError(language === 'id' ? 'Harap pilih atau masukkan nama lengkap siswa.' : 'Please enter student name.');
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 transition-colors relative">
        {/* Top Minimalist Controls */}
        <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-8 sm:right-8 flex items-center justify-between">
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
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 rounded-2xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60 shadow-xs mb-1">
              <GraduationCap className="w-7 h-7" />
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
                  const firstStudentInClass = students.find(s => s.className === e.target.value);
                  if (firstStudentInClass) setStudentName(firstStudentInClass.name);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
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

            {/* Nama Siswa dengan Autocomplete / Datalist Roster */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-600" />
                  <span>{t.studentNameLabel}</span>
                </span>
                <span className="text-[10px] text-slate-400">Pilih / ketik nama</span>
              </label>
              <input
                type="text"
                required
                list="roster-students-list"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="Ketik atau pilih nama siswa..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
              <datalist id="roster-students-list">
                {classStudents.map(s => (
                  <option key={s.id} value={s.name}>
                    NISN: {s.nisn} ({s.gender === 'L' ? 'Laki-laki' : 'Perempuan'})
                  </option>
                ))}
              </datalist>

              {/* Status Verifikasi Roster Siswa */}
              {matchedStudent ? (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold">Terdaftar di Roster Resmi</p>
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                      NISN: <span className="font-mono font-semibold">{matchedStudent.nisn}</span> • JK: {matchedStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </p>
                  </div>
                </div>
              ) : studentName.trim() ? (
                <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-700 dark:text-amber-300">
                  Nama belum cocok persis dengan roster Kelas {selectedStudentClass}. Pastikan memilih nama dari opsi datalist.
                </div>
              ) : null}
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
        {/* NAVBAR HEADER DENGAN NOTIFIKASI & PESAN KENDALA AKTIF (OPSI A) */}
        <Navbar
          onStartStudentExam={() => setViewMode('student_login')}
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
            onUpdateSubject={handleUpdateSubject}
            onAddQuestion={handleAddQuestion}
            onDeleteQuestion={handleDeleteQuestion}
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
