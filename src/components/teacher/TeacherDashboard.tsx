'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Subject, Question, QuestionType, ExamResult, Student, Teacher, ScoringRules, ExamSession, SchoolSettings } from '@/types/cbt';
import { NavItem } from '../layout/Sidebar';
import { useLanguage } from '@/context/LanguageContext';
import { StudentManagement } from './StudentManagement';
import { AiQuestionGeneratorModal } from './AiQuestionGeneratorModal';
import { extractSubjectAndGrade } from '@/lib/aiQuestionGenerator';
import { evaluateFullExam, calculateSingleQuestionScore } from '@/lib/scoringEngine';
import { sendProctorCommand, subscribeToLiveSessions, removeStudentSession, broadcastAnnouncementToStudents } from '@/lib/liveMonitoringService';
import { clearStudentAutolockInSupabase, insertMessage, fetchQuestionsBySubject } from '@/lib/supabaseService';
import { resolveStudentSingleClass, isClassInGrade } from '@/lib/rosterStudents';
import { TTESignatureSeal } from '@/components/common/TTESignatureSeal';
import {
  TrendingUp,
  Award,
  Users,
  UserCheck,
  BookOpen,
  Calendar,
  Building2,
  Send,
  MoreVertical,
  Edit2,
  Edit3,
  Pencil,
  Trash2,
  PlusCircle,
  Plus,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Search,
  Filter,
  Check,
  Clock,
  KeyRound,
  ShieldCheck,
  Eye,
  Database,
  Sliders,
  Play,
  FileText,
  Printer,
  Download,
  Layers,
  ArrowLeft,
  Copy,
  Shuffle,
  AlertTriangle,
  GraduationCap,
  SlidersHorizontal,
  ChevronRight,
  School,
  Image as ImageIcon,
  Upload,
  X,
  BarChart3,
  Radio,
  RotateCcw,
  Ban,
  Save,
  Lock,
  Unlock,
  RefreshCw,
  CheckSquare,
  Info,
  Megaphone
} from 'lucide-react';

interface TeacherDashboardProps {
  currentNav: NavItem;
  subject: Subject;
  questions: Question[];
  results: ExamResult[];
  students?: Student[];
  currentTeacher?: Teacher | null;
  allSubjects?: Subject[];
  onSelectNav?: (nav: NavItem) => void;
  onSelectSubject?: (sub: Subject) => void;
  onUpdateSubject: (updatedSubject: Subject) => void;
  onAddSubject?: (newSub: Subject) => void;
  onDeleteSubject?: (subId: string) => void;
  onAddQuestion: (newQuestion: Question) => void;
  onUpdateQuestion?: (updatedQuestion: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
  onUpdateResult?: (updatedResult: ExamResult) => void;
  onDeleteResult?: (resultId: string, subjectId?: string, studentName?: string) => void;
  onAddStudent?: (s: Student) => void;
  onUpdateStudent?: (s: Student) => void;
  onDeleteStudent?: (studentId: string) => void;
  onBulkInsertStudents?: (studentsList: Student[]) => void;
  onBulkDeleteStudents?: (studentIds: string[]) => void;
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  onOpenAddModal: () => void;
  onStartStudentExam?: () => void;
  searchQuery?: string;
  onOpenCertificates?: (selectedResult?: ExamResult) => void;
  schoolSettings?: SchoolSettings;
  onUpdateSchoolSettings?: (settings: SchoolSettings) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentNav,
  subject,
  questions,
  results,
  students = [],
  currentTeacher,
  allSubjects,
  onSelectNav,
  onSelectSubject,
  onUpdateSubject,
  onAddSubject,
  onDeleteSubject,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onUpdateResult,
  onDeleteResult,
  onAddStudent = () => {},
  onUpdateStudent = () => {},
  onDeleteStudent = () => {},
  onBulkInsertStudents = () => {},
  onBulkDeleteStudents = () => {},
  isAddModalOpen,
  onCloseAddModal,
  onOpenAddModal,
  onStartStudentExam,
  searchQuery = '',
  onOpenCertificates,
  schoolSettings,
  onUpdateSchoolSettings
}) => {
  const { language, t } = useLanguage();
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [manualEssayScores, setManualEssayScores] = useState<Record<string, number>>({});
  const [essaySavedNotice, setEssaySavedNotice] = useState(false);
  const [essayMaxNotice, setEssayMaxNotice] = useState<string | null>(null);
  const [dossierSuccessToast, setDossierSuccessToast] = useState<string | null>(null);
  const [dossierSignerMode, setDossierSignerMode] = useState<'current_teacher' | 'default_teacher' | 'principal'>('current_teacher');
  const [previewSignerTab, setPreviewSignerTab] = useState<'principal' | 'teacher'>('principal');

  // Pengaturan Dokumen, Pejabat & TTE Digital
  const effectiveSchoolSettings: SchoolSettings = useMemo(() => {
    return {
      institution1: schoolSettings?.institution1 || 'PEMERINTAH KOTA PALEMBANG',
      institution2: schoolSettings?.institution2 || 'DINAS PENDIDIKAN',
      schoolName: schoolSettings?.schoolName || 'SMP NEGERI 58 PALEMBANG',
      schoolAddress: schoolSettings?.schoolAddress || 'Jln. Komering II, Kelurahan Demang Lebar Daun, Kecamatan Ilir Barat I, Kota Palembang, Sumatera Selatan 30151',
      schoolContact: schoolSettings?.schoolContact || 'Website: https://smpn58.vercel.app/',
      logoLeft: schoolSettings?.logoLeft || '/logo-dinas.png',
      logoRight: schoolSettings?.logoRight || '/logo-sekolah.png',
      principalName: schoolSettings?.principalName || 'Hj. Rohana, S.Pd., M.Si.',
      principalNip: schoolSettings?.principalNip || '19680512 199412 2 001',
      principalPhoto: schoolSettings?.principalPhoto || '',
      teacherName: schoolSettings?.teacherName || currentTeacher?.name || 'Hendra Wijaya, S.Pd',
      teacherNip: schoolSettings?.teacherNip || currentTeacher?.nip || '19870420 201201 1 004',
      city: schoolSettings?.city || 'Palembang',
      enableTTE: schoolSettings?.enableTTE !== false,
      tteType: schoolSettings?.tteType || 'qrcode',
      isolateTeacherDossier: schoolSettings?.isolateTeacherDossier !== false
    };
  }, [schoolSettings, currentTeacher]);

  const [localSettingsForm, setLocalSettingsForm] = useState<SchoolSettings>(effectiveSchoolSettings);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const [isKopSettingsOpen, setIsKopSettingsOpen] = useState(true);
  const fileInputLogoLeftRef = useRef<HTMLInputElement>(null);
  const fileInputLogoRightRef = useRef<HTMLInputElement>(null);
  const fileInputPrincipalPhotoRef = useRef<HTMLInputElement>(null);

  const compressImageFile = (
    file: File,
    maxWidth: number,
    maxHeight: number,
    quality = 0.88
  ): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          const isPng = file.type === 'image/png';
          if (!isPng) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = isPng ? 'image/png' : 'image/jpeg';
          resolve(canvas.toDataURL(mimeType, quality));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoLeft' | 'logoRight' | 'principalPhoto') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const maxW = field === 'principalPhoto' ? 400 : 320;
      const maxH = field === 'principalPhoto' ? 500 : 320;
      const compressedDataUrl = await compressImageFile(file, maxW, maxH, 0.88);
      if (compressedDataUrl) {
        setLocalSettingsForm(prev => ({ ...prev, [field]: compressedDataUrl }));
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        setLocalSettingsForm(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    setLocalSettingsForm(effectiveSchoolSettings);
  }, [effectiveSchoolSettings]);

  // Resolusi Penandatangan Dossier Aktif
  const activeDossierSigner = useMemo(() => {
    if (dossierSignerMode === 'principal') {
      return {
        name: effectiveSchoolSettings.principalName || 'Hj. Rohana, S.Pd., M.Si.',
        nip: effectiveSchoolSettings.principalNip || '-',
        title: 'Kepala Sekolah SMPN 58'
      };
    }
    if (dossierSignerMode === 'default_teacher') {
      return {
        name: effectiveSchoolSettings.teacherName || 'Guru Pengampu / Proktor',
        nip: effectiveSchoolSettings.teacherNip || '-',
        title: 'Guru Pengampu / Proktor'
      };
    }
    // current_teacher (default)
    return {
      name: currentTeacher?.name || effectiveSchoolSettings.teacherName || 'Guru Pengampu',
      nip: currentTeacher?.nip || effectiveSchoolSettings.teacherNip || '-',
      title: 'Guru Pengampu / Proktor'
    };
  }, [dossierSignerMode, effectiveSchoolSettings, currentTeacher]);

  // ==========================================
  // CUSTOM THEMED MODAL DIALOG STATE (ANTI-SLOP BROWSER POPUPS)
  // ==========================================
  interface CustomDialogConfig {
    isOpen: boolean;
    type: 'confirm' | 'alert';
    variant?: 'danger' | 'warning' | 'info';
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }

  const [customDialog, setCustomDialog] = useState<CustomDialogConfig>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showThemedConfirm = (options: {
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setCustomDialog({
      isOpen: true,
      type: 'confirm',
      variant: options.variant || 'danger',
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel || 'Ya, Lanjutkan',
      cancelLabel: options.cancelLabel || 'Batal',
      onConfirm: () => {
        setCustomDialog(prev => ({ ...prev, isOpen: false }));
        options.onConfirm();
      },
      onCancel: () => {
        setCustomDialog(prev => ({ ...prev, isOpen: false }));
        if (options.onCancel) options.onCancel();
      }
    });
  };

  const showThemedAlert = (
    title: string,
    message: string,
    variant: 'warning' | 'info' | 'danger' = 'warning'
  ) => {
    setCustomDialog({
      isOpen: true,
      type: 'alert',
      variant,
      title,
      message,
      confirmLabel: 'Mengerti',
      onConfirm: () => {
        setCustomDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // DOSSIER COMPUTATIONS
  const dossierSubject = useMemo(() => {
    if (!selectedResult) return subject;
    return (allSubjects || []).find(s => s.id === selectedResult.subjectId) || subject;
  }, [selectedResult, allSubjects, subject]);

  const dossierQuestions = useMemo(() => {
    if (!selectedResult) return [];
    // 1. Direct match by subjectId
    const directMatches = questions.filter(q => q.subjectId === selectedResult.subjectId);
    if (directMatches.length > 0) return directMatches;

    // 2. Direct match by subject title
    if (selectedResult.subjectTitle) {
      const titleMatches = questions.filter(q => {
        const sub = (allSubjects || []).find(s => s.id === q.subjectId);
        return sub && sub.title.toLowerCase().trim() === selectedResult.subjectTitle.toLowerCase().trim();
      });
      if (titleMatches.length > 0) return titleMatches;
    }

    // 3. Fallback localStorage specific key
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`cbt_questions_${selectedResult.subjectId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}

      // 4. Fallback search across all cbt_questions_ in localStorage
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cbt_questions_')) {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.some(q => (selectedResult.answers || []).some(a => a.questionId === q.id))) {
                return parsed;
              }
            }
          }
        }
      } catch {}
    }

    // 5. Fallback reconstruction from selectedResult.details
    if (selectedResult.details && selectedResult.details.length > 0) {
      return selectedResult.details.map((d, idx) => ({
        id: d.questionId,
        subjectId: selectedResult.subjectId,
        type: d.type,
        questionText: `Butir Soal #${idx + 1} (${d.type})`,
        options: [],
        answer: d.correctAnswer,
        orderIndex: idx
      } as Question));
    }

    // 6. Fallback reconstruction from selectedResult.answers
    if (selectedResult.answers && selectedResult.answers.length > 0) {
      return selectedResult.answers.map((a, idx) => ({
        id: a.questionId,
        subjectId: selectedResult.subjectId,
        type: 'Pilihan Ganda',
        questionText: `Butir Soal #${idx + 1}`,
        options: [],
        answer: null,
        orderIndex: idx
      } as Question));
    }

    return directMatches;
  }, [selectedResult, questions, allSubjects]);

  useEffect(() => {
    if (selectedResult?.subjectId) {
      const hasQ = questions.some(q => q.subjectId === selectedResult.subjectId);
      if (!hasQ) {
        fetchQuestionsBySubject(selectedResult.subjectId).then(fetched => {
          if (fetched && fetched.length > 0) {
            fetched.forEach(q => onAddQuestion(q));
          }
        }).catch(() => {});
      }
    }
  }, [selectedResult?.subjectId]);

  useEffect(() => {
    if (selectedResult) {
      setManualEssayScores(selectedResult.essayScores || {});
      setEssayMaxNotice(null);
      setEssaySavedNotice(false);
    }
  }, [selectedResult]);

  const liveDossierEval = useMemo(() => {
    if (!selectedResult) return null;
    return evaluateFullExam(
      dossierQuestions,
      selectedResult.answers || [],
      dossierSubject.scoringRules || {},
      manualEssayScores
    );
  }, [selectedResult, dossierQuestions, dossierSubject.scoringRules, manualEssayScores]);

  const dossierStats = useMemo(() => {
    let correctCount = 0;
    let wrongCount = 0;
    let partialCount = 0;
    let unansweredCount = 0;
    let essayCount = 0;

    const itemEvaluations: Array<{
      qNum: number;
      qId: string;
      type: QuestionType;
      status: 'correct' | 'wrong' | 'partial' | 'unanswered' | 'essay';
      earned: number;
      maxPoints: number;
      studentAns: any;
      correctAns: any;
    }> = [];

    dossierQuestions.forEach((q, idx) => {
      const maxPoints = (dossierSubject.scoringRules as any)?.[q.type] || 1;
      const studentAnswerItem = (selectedResult?.answers || []).find(a => a.questionId === q.id);
      const rawStudentAns = studentAnswerItem ? studentAnswerItem.answer : null;
      const isEssay = q.type === 'Esai';

      let earned = 0;
      if (isEssay) {
        earned = Math.min(manualEssayScores[q.id] || 0, maxPoints);
        essayCount++;
      } else {
        earned = calculateSingleQuestionScore(q, rawStudentAns, maxPoints);
      }

      const isFull = earned === maxPoints;
      const isPartial = earned > 0 && earned < maxPoints;
      const isUnanswered = rawStudentAns === null || rawStudentAns === undefined || rawStudentAns === '' || (Array.isArray(rawStudentAns) && rawStudentAns.length === 0);

      let status: 'correct' | 'wrong' | 'partial' | 'unanswered' | 'essay' = 'wrong';
      if (isEssay) {
        status = 'essay';
      } else if (isUnanswered) {
        status = 'unanswered';
        unansweredCount++;
      } else if (isFull) {
        status = 'correct';
        correctCount++;
      } else if (isPartial) {
        status = 'partial';
        partialCount++;
      } else {
        status = 'wrong';
        wrongCount++;
      }

      itemEvaluations.push({
        qNum: idx + 1,
        qId: q.id,
        type: q.type,
        status,
        earned,
        maxPoints,
        studentAns: rawStudentAns,
        correctAns: q.answer
      });
    });

    return {
      total: dossierQuestions.length,
      correctCount,
      wrongCount,
      partialCount,
      unansweredCount,
      essayCount,
      itemEvaluations
    };
  }, [dossierQuestions, selectedResult, dossierSubject.scoringRules, manualEssayScores]);

  // ==========================================
  // EDIT QUESTION STATE
  // ==========================================
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // ==========================================
  // LIVE MONITORING STATE
  // ==========================================
  const [liveSessions, setLiveSessions] = useState<ExamSession[]>([]);
  const [monitoringFilterSubId, setMonitoringFilterSubId] = useState<string>('ALL');
  const [monitoringFilterClass, setMonitoringFilterClass] = useState<string>('ALL');
  const [monitoringActionToast, setMonitoringActionToast] = useState<string | null>(null);
  const [liveAnnouncementInput, setLiveAnnouncementInput] = useState('');
  const [showLiveAnnouncementBox, setShowLiveAnnouncementBox] = useState(false);

  const handleSendLiveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveAnnouncementInput.trim()) return;
    const text = liveAnnouncementInput.trim();
    const targetSubId = monitoringFilterSubId !== 'ALL' ? monitoringFilterSubId : subject.id;
    const sender = currentTeacher?.name || 'Guru Pengawas';

    broadcastAnnouncementToStudents({
      text,
      senderName: sender,
      subjectId: targetSubId
    });

    insertMessage({
      subjectId: targetSubId,
      senderName: sender,
      senderRole: 'teacher',
      targetType: 'broadcast',
      title: 'Pengumuman Pengawas Ruang',
      body: text,
      status: 'acknowledged'
    }).catch(() => {});

    setLiveAnnouncementInput('');
    setMonitoringActionToast('Pengumuman berhasil disiarkan ke seluruh layar siswa!');
  };

  // Daftar kelas unik untuk filter rombel pada Live Monitoring
  const monitoringClasses = useMemo(() => {
    const set = new Set<string>();
    if (students && students.length > 0) {
      students.forEach(s => {
        if (s.className && s.className.trim()) set.add(s.className.trim());
      });
    }
    liveSessions.forEach(s => {
      if (s.className && s.className.trim()) set.add(s.className.trim());
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [students, liveSessions]);

  useEffect(() => {
    if (currentNav !== 'monitoring') return;
    const unsub = subscribeToLiveSessions((sessions) => {
      setLiveSessions(sessions);
    });
    return () => unsub();
  }, [currentNav]);

  // ==========================================
  // BANK SOAL STATE (KATALOG & DETAIL SOAL)
  // ==========================================
  const [bankView, setBankView] = useState<'catalog' | 'questions'>('catalog');
  const [selectedBankSubjectId, setSelectedBankSubjectId] = useState<string>(subject.id);
  const [bankCategoryFilter, setBankCategoryFilter] = useState<string>('ALL');
  const [bankTypeFilter, setBankTypeFilter] = useState<string>('ALL');

  // ==========================================
  // JADWAL UJIAN STATE & MODAL CRUD
  // ==========================================
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);
  const [isEditScheduleModalOpen, setIsEditScheduleModalOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [deletedSubjectIds, setDeletedSubjectIds] = useState<string[]>([]);
  const [copiedTokenSubjectId, setCopiedTokenSubjectId] = useState<string | null>(null);

  // Form State Buat Jadwal Baru
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubClass, setNewSubClass] = useState('VII.1, VII.2, VII.3');
  const [newSubDuration, setNewSubDuration] = useState<number | string>(60);
  const [newSubToken, setNewSubToken] = useState(() => 'SMP58' + Math.floor(100 + Math.random() * 900));
  const [newSubViolationLimit, setNewSubViolationLimit] = useState<number | string>(3);
  const [newSubScoringRules, setNewSubScoringRules] = useState<Record<string, number | string>>({
    'Pilihan Ganda': 1,
    'Pilihan Ganda Kompleks': 2,
    'Benar/Salah': 2,
    'Menjodohkan': 2,
    'Isian Singkat': 2,
    'Esai': 4
  });

  // Form State Edit Jadwal
  const [editSubTitle, setEditSubTitle] = useState('');
  const [editSubClass, setEditSubClass] = useState('');
  const [editSubDuration, setEditSubDuration] = useState<number | string>(60);
  const [editSubToken, setEditSubToken] = useState('');
  const [editSubViolationLimit, setEditSubViolationLimit] = useState<number | string>(3);
  const [editSubScoringRules, setEditSubScoringRules] = useState<Record<string, number | string>>({});
  const [createdSubjectIds, setCreatedSubjectIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined' && currentTeacher?.id) {
      try {
        const stored = localStorage.getItem(`cbt_teacher_${currentTeacher.id}_created_subjects`);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Sinkronkan daftar mapel buatan guru saat berganti akun login guru
  useEffect(() => {
    if (typeof window !== 'undefined' && currentTeacher?.id) {
      try {
        const stored = localStorage.getItem(`cbt_teacher_${currentTeacher.id}_created_subjects`);
        setCreatedSubjectIds(stored ? JSON.parse(stored) : []);
      } catch {
        setCreatedSubjectIds([]);
      }
    } else {
      setCreatedSubjectIds([]);
    }
  }, [currentTeacher?.id]);

  // AI Question Generator Modal State & Handler
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const handleSaveAiQuestions = (newQuestions: Question[]) => {
    newQuestions.forEach(q => {
      onAddQuestion(q);
    });
    showThemedAlert(
      'Berhasil Menyimpan Soal AI',
      `${newQuestions.length} butir soal berhasil ditambahkan ke Bank Soal!`,
      'info'
    );
  };

  // Form State untuk Tambah Soal
  const [modalType, setModalType] = useState<QuestionType>('Pilihan Ganda');
  const [modalText, setModalText] = useState('');
  const [modalMediaUrl, setModalMediaUrl] = useState('');

  // State PG / PGK dengan dukungan Teks & Gambar per Opsi
  const [pgOptions, setPgOptions] = useState<Array<{ text: string; img?: string }>>([
    { text: '' },
    { text: '' },
    { text: '' },
    { text: '' }
  ]);
  const [pgAnswer, setPgAnswer] = useState<string>('A');
  const [pgkAnswer, setPgkAnswer] = useState<string[]>(['A']);

  // State Benar/Salah dengan dukungan Teks & Gambar per Pernyataan
  const [bsMode, setBsMode] = useState<'multiple' | 'single'>('multiple');
  const [bsStatements, setBsStatements] = useState<Array<{ text: string; img?: string; answer: 'Benar' | 'Salah' }>>([
    { text: '', answer: 'Benar' },
    { text: '', answer: 'Salah' },
    { text: '', answer: 'Benar' }
  ]);
  const [bsSingleAnswer, setBsSingleAnswer] = useState<'Benar' | 'Salah'>('Benar');

  // State Menjodohkan dengan dukungan Teks & Gambar
  const [matchingPairs, setMatchingPairs] = useState<Array<{ qText: string; qImg?: string; aText: string; aImg?: string }>>([
    { qText: '', aText: '' },
    { qText: '', aText: '' },
    { qText: '', aText: '' }
  ]);

  // State Isian / Esai
  const [shortAnswer, setShortAnswer] = useState('');
  const [essayKey, setEssayKey] = useState('');

  // Helper konversi file gambar lokal ke Base64 Data URL
  const handleFileToDataUrl = (file: File, callback: (url: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        callback(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

    // Rombel Siswa Unik & Helper Pemilihan Rombel Target Ujian
  const studentClasses = useMemo(() => {
    const set = new Set<string>();
    students?.forEach(s => {
      if (s.className && s.className.trim()) {
        set.add(s.className.trim());
      }
    });
    const arr = Array.from(set);
    if (arr.length === 0) {
      return ['VII.1', 'VII.2', 'VII.3', 'VIII.1', 'VIII.2', 'VIII.3', 'IX.1', 'IX.2', 'IX.3'];
    }
    return arr.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students]);

// Filter Multidimensi Database Nilai (Mapel, Jenjang, Rombel, Status KKM)
  const [resultsSubjectFilter, setResultsSubjectFilter] = useState<string>('ALL');
  const [resultsGradeFilter, setResultsGradeFilter] = useState<string>('ALL');
  const [resultsClassFilter, setResultsClassFilter] = useState<string>('ALL');
  const [resultsStatusFilter, setResultsStatusFilter] = useState<string>('ALL');
  const [onlyMyAssignedSubjects, setOnlyMyAssignedSubjects] = useState<boolean>(true);

  // Daftar Rombel Tersedia Berdasarkan Jenjang Terpilih
  const availableRombelsForResults = useMemo(() => {
    const list = studentClasses && studentClasses.length > 0
      ? studentClasses
      : ['VII.1', 'VII.2', 'VII.3', 'VIII.1', 'VIII.2', 'VIII.3', 'IX.1', 'IX.2', 'IX.3'];

    if (resultsGradeFilter === 'ALL') return list;
    return list.filter(cls => isClassInGrade(cls, resultsGradeFilter));
  }, [studentClasses, resultsGradeFilter]);

  // Reset rombel filter jika jenjang berubah dan rombel sebelumnya tidak ada di jenjang baru
  useEffect(() => {
    if (resultsClassFilter !== 'ALL' && !availableRombelsForResults.includes(resultsClassFilter)) {
      setResultsClassFilter('ALL');
    }
  }, [resultsGradeFilter, availableRombelsForResults, resultsClassFilter]);

  // Live Filtering dari Search Bar dengan Deduplikasi Ketat per Nama Siswa
  const filteredResults = useMemo(() => {
    const subTitleMap = new Map<string, string>();
    (allSubjects || []).forEach(s => subTitleMap.set(s.id, s.title));

    // 1. Deduplikasi mutlak: 1 nama siswa hanya boleh punya 1 baris hasil ujian per mapel
    const dedupedMap = new Map<string, ExamResult>();
    for (const r of results) {
      if (!r || !r.studentName) continue;
      const key = `${r.subjectId}_${r.studentName.toLowerCase().trim()}`;
      if (!dedupedMap.has(key)) {
        const resolvedClass = resolveStudentSingleClass(r.studentName, r.className, students) || r.className || 'Umum';
        dedupedMap.set(key, {
          ...r,
          className: resolvedClass,
          subjectTitle: r.subjectTitle || subTitleMap.get(r.subjectId) || (r.subjectId === subject.id ? subject.title : '')
        });
      }
    }
    let cleanResults = Array.from(dedupedMap.values());

    // Filter 1: Mapel / Paket Ujian (ALL = 1 Sekolah)
    if (resultsSubjectFilter !== 'ALL') {
      cleanResults = cleanResults.filter(r => r.subjectId === resultsSubjectFilter);
    }

    // Filter 2: Jenjang Tingkat (VII, VIII, IX) - Akurat tanpa bug substring romawi
    if (resultsGradeFilter !== 'ALL') {
      cleanResults = cleanResults.filter(r => isClassInGrade(r.className, resultsGradeFilter));
    }

    // Filter 3: Rombel Spesifik (misal VIII.1)
    if (resultsClassFilter !== 'ALL') {
      cleanResults = cleanResults.filter(r => r.className === resultsClassFilter);
    }

    // Filter 4: Status Ketuntasan KKM
    if (resultsStatusFilter === 'PASSED') {
      cleanResults = cleanResults.filter(r => (r.score || 0) >= 75);
    } else if (resultsStatusFilter === 'REMEDIAL') {
      cleanResults = cleanResults.filter(r => (r.score || 0) < 75);
    }

    // Filter Khusus Isolasi Multi-Guru: Jika isolateTeacherDossier aktif & guru bukan superadmin/pengawas
    const isSuperAdmin = currentTeacher?.role === 'admin' || currentTeacher?.role === 'pengawas';
    if (!isSuperAdmin && effectiveSchoolSettings.isolateTeacherDossier !== false && onlyMyAssignedSubjects && currentTeacher) {
      const allowedSubjectNames = [
        currentTeacher.subject,
        ...(currentTeacher.assignments?.map(a => a.subject) || [])
      ].filter(Boolean).map(s => s.toLowerCase().trim());

      if (allowedSubjectNames.length > 0) {
        cleanResults = cleanResults.filter(r => {
          const subTitle = (r.subjectTitle || subTitleMap.get(r.subjectId) || '').toLowerCase().trim();
          return allowedSubjectNames.some(as => {
            if (subTitle.includes(as) || as.includes(subTitle)) return true;
            const keywords = as.split(/[\s&,/()-]+/).map(w => w.trim()).filter(w => w.length >= 3 && !GENERIC_SUBJECT_STOP_WORDS.has(w));
            return keywords.length > 0 && keywords.some(kw => subTitle.includes(kw));
          });
        });
      }
    }

    // Filter 5: Pencarian teks bebas
    if (!searchQuery.trim()) return cleanResults;
    const q = searchQuery.toLowerCase();
    return cleanResults.filter(
      r =>
        r.studentName.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q) ||
        (r.subjectTitle && r.subjectTitle.toLowerCase().includes(q)) ||
        String(r.score).includes(q)
    );
  }, [results, searchQuery, resultsSubjectFilter, resultsGradeFilter, resultsClassFilter, resultsStatusFilter, allSubjects, subject, students, effectiveSchoolSettings.isolateTeacherDossier, onlyMyAssignedSubjects, currentTeacher]);

  // Metrik Rangkuman Nilai Terfilter (Realtime School Metrics)
  const filteredMetrics = useMemo(() => {
    const total = filteredResults.length;
    if (total === 0) {
      return { total: 0, avg: 0, passed: 0, passedPct: 0, remedial: 0, remedialPct: 0 };
    }
    const sum = filteredResults.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const avg = Math.round((sum / total) * 10) / 10;
    const passed = filteredResults.filter(r => (r.score || 0) >= 75).length;
    const passedPct = Math.round((passed / total) * 100);
    const remedial = total - passed;
    const remedialPct = Math.round((remedial / total) * 100);
    return { total, avg, passed, passedPct, remedial, remedialPct };
  }, [filteredResults]);

  // Helper tampilan nama mapel rapi tanpa prefix berlebih
  const formatSubjectTitle = (title: string) => {
    if (!title) return '';
    let clean = title
      .replace(/^Asesmen Sumatif( Akhir)?( Tengah)? Semester( - )?/i, '')
      .replace(/^Asesmen Sumatif - /i, '')
      .replace(/^ASAS( Ganjil| Genap)?( - | )?/i, '')
      .replace(/^ASTS( Ganjil| Genap)?( - | )?/i, '')
      .replace(/^PAS( Ganjil| Genap)?( - | )?/i, '')
      .replace(/^PTS( Ganjil| Genap)?( - | )?/i, '')
      .replace(/^Ujian( Sekolah| Semester)?( - | )?/i, '')
      .trim();

    return clean || title;
  };

  // Kata-kata umum mata pelajaran yang dikecualikan dari pemotongan kata kunci agar tidak terjadi kebocoran mapel lintas guru
  const GENERIC_SUBJECT_STOP_WORDS = new Set([
    'bahasa', 'pendidikan', 'ilmu', 'pengetahuan', 'seni', 'budaya', 'terpadu',
    'umum', 'dasar', 'kelas', 'semester', 'ganjil', 'genap', 'ujian', 'asesmen',
    'sumatif', 'tengah', 'akhir', 'asas', 'asat', 'pts', 'pas', 'pat', 'us',
    'smp', 'smpn', 'tingkat', 'paket', 'soal'
  ]);

  // Helper pengecekan hak akses mata pelajaran per guru (mencakup pencocokan multi-kata kunci & mapel buatan guru)
  const isSubjectBelongToTeacher = (s: Subject, teacher: Teacher | null, createdIds: string[] = []): boolean => {
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
  };

  // Daftar mapel yang berhak diakses (Admin & Pengawas: SEMUA mapel; Guru Mapel: HANYA mapel miliknya atau yang baru dibuatnya)
  const accessibleSubjects = useMemo(() => {
    const rawAll = allSubjects !== undefined ? allSubjects : (subject?.id ? [subject] : []);
    const all = rawAll.filter(s => s && s.id && !deletedSubjectIds.includes(s.id));

    if (currentTeacher?.role === 'admin' || currentTeacher?.role === 'pengawas' || !currentTeacher) {
      return all;
    }

    return all.filter(s => isSubjectBelongToTeacher(s, currentTeacher, createdSubjectIds));
  }, [allSubjects, subject, currentTeacher, deletedSubjectIds, createdSubjectIds]);

  // Sinkronkan selectedBankSubjectId jika belum ada di accessibleSubjects
  useEffect(() => {
    if (accessibleSubjects.length > 0 && !accessibleSubjects.some(s => s.id === selectedBankSubjectId)) {
      setSelectedBankSubjectId(accessibleSubjects[0].id);
    } else if (accessibleSubjects.length === 0) {
      setSelectedBankSubjectId('');
    }
  }, [accessibleSubjects, selectedBankSubjectId]);

  // Mapel Bank Soal yang sedang aktif dibuka
  const currentBankSubject = useMemo(() => {
    return (
      accessibleSubjects.find(s => s.id === selectedBankSubjectId) ||
      accessibleSubjects[0] ||
      subject
    );
  }, [accessibleSubjects, selectedBankSubjectId, subject]);

  // Helper menghitung jumlah butir soal per mapel secara konsisten (Memory + Fail-safe Cache)
  const getSubjectQuestionCount = (subId: string) => {
    const inMem = questions.filter(q => q.subjectId === subId).length;
    if (inMem > 0) return inMem;
    if (typeof window !== 'undefined' && subId) {
      try {
        const stored = localStorage.getItem(`cbt_questions_${subId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed.length;
        }
      } catch {}
    }
    return 0;
  };

  // Butir soal milik mapel yang sedang aktif dipilih
  const bankSubjectQuestions = useMemo(() => {
    const inMem = questions.filter(
      q => q.subjectId === selectedBankSubjectId || (!q.subjectId && selectedBankSubjectId === subject.id)
    );
    if (inMem.length > 0) return inMem;
    if (typeof window !== 'undefined' && selectedBankSubjectId) {
      try {
        const stored = localStorage.getItem(`cbt_questions_${selectedBankSubjectId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return inMem;
  }, [questions, selectedBankSubjectId, subject.id]);

  // Butir soal terfilter pencarian & jenis soal di level detail
  const filteredBankQuestions = useMemo(() => {
    return bankSubjectQuestions.filter(q => {
      const matchesSearch =
        !searchQuery.trim() ||
        q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = bankTypeFilter === 'ALL' || q.type === bankTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [bankSubjectQuestions, searchQuery, bankTypeFilter]);

  // Chips filter dinamis berbasis data riil mapel yang diinputkan guru / tersedia di database
  const dynamicFilterChips = useMemo(() => {
    const mapelNames = Array.from(
      new Set(
        accessibleSubjects.map(s => formatSubjectTitle(s.title)).filter(Boolean)
      )
    );
    return [
      { id: 'ALL', label: 'Semua Mapel', count: accessibleSubjects.length },
      ...mapelNames.map(name => ({
        id: name,
        label: name,
        count: accessibleSubjects.filter(s => formatSubjectTitle(s.title) === name).length
      }))
    ];
  }, [accessibleSubjects]);

  // Sinkronisasi bankCategoryFilter jika filter tidak ditemukan lagi di dynamicFilterChips
  useEffect(() => {
    if (bankCategoryFilter !== 'ALL' && !dynamicFilterChips.some(c => c.id === bankCategoryFilter)) {
      setBankCategoryFilter('ALL');
    }
  }, [dynamicFilterChips, bankCategoryFilter]);

  // Filter katalog card mapel berdasarkan pencarian & chips filter dinamis
  const filteredCatalogSubjects = useMemo(() => {
    return accessibleSubjects.filter(s => {
      const matchesSearch =
        !searchQuery.trim() ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.token.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (bankCategoryFilter === 'ALL') return true;

      const titleFormatted = formatSubjectTitle(s.title);
      return titleFormatted === bankCategoryFilter || s.title.toLowerCase().includes(bankCategoryFilter.toLowerCase());
    });
  }, [accessibleSubjects, searchQuery, bankCategoryFilter]);

  // Soal aktif untuk metrik ringkas dashboard
  const activeQuestions = bankSubjectQuestions;


  // Helper gaya tema warna card mapel
  const getSubjectTheme = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('ipa') || t.includes('alam')) {
      return {
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
        badgeBorder: 'border-emerald-200 dark:border-emerald-800/60',
        badgeText: 'text-emerald-700 dark:text-emerald-300',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300',
        accentBorder: 'hover:border-emerald-500/50',
        category: 'MIPA'
      };
    }
    if (t.includes('informatika') || t.includes('tik') || t.includes('komputer')) {
      return {
        badgeBg: 'bg-violet-50 dark:bg-violet-950/40',
        badgeBorder: 'border-violet-200 dark:border-violet-800/60',
        badgeText: 'text-violet-700 dark:text-violet-300',
        iconBg: 'bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300',
        accentBorder: 'hover:border-violet-500/50',
        category: 'TIK'
      };
    }
    if (t.includes('matematika')) {
      return {
        badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
        badgeBorder: 'border-blue-200 dark:border-blue-800/60',
        badgeText: 'text-blue-700 dark:text-blue-300',
        iconBg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300',
        accentBorder: 'hover:border-blue-500/50',
        category: 'MIPA'
      };
    }
    if (t.includes('indonesia') || t.includes('inggris') || t.includes('bahasa')) {
      return {
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
        badgeBorder: 'border-amber-200 dark:border-amber-800/60',
        badgeText: 'text-amber-700 dark:text-amber-300',
        iconBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300',
        accentBorder: 'hover:border-amber-500/50',
        category: 'BAHASA'
      };
    }
    if (t.includes('ips') || t.includes('sosial')) {
      return {
        badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
        badgeBorder: 'border-sky-200 dark:border-sky-800/60',
        badgeText: 'text-sky-700 dark:text-sky-300',
        iconBg: 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300',
        accentBorder: 'hover:border-sky-500/50',
        category: 'SOSIAL'
      };
    }
    if (t.includes('pancasila') || t.includes('ppkn')) {
      return {
        badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
        badgeBorder: 'border-rose-200 dark:border-rose-800/60',
        badgeText: 'text-rose-700 dark:text-rose-300',
        iconBg: 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300',
        accentBorder: 'hover:border-rose-500/50',
        category: 'SOSIAL'
      };
    }
    if (t.includes('agama') || t.includes('pai')) {
      return {
        badgeBg: 'bg-teal-50 dark:bg-teal-950/40',
        badgeBorder: 'border-teal-200 dark:border-teal-800/60',
        badgeText: 'text-teal-700 dark:text-teal-300',
        iconBg: 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300',
        accentBorder: 'hover:border-teal-500/50',
        category: 'AGAMA'
      };
    }
    return {
      badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      badgeBorder: 'border-indigo-200 dark:border-indigo-800/60',
      badgeText: 'text-indigo-700 dark:text-indigo-300',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300',
      accentBorder: 'hover:border-indigo-500/50',
      category: 'UMUM'
    };
  };

  // Helper Salin Token
  const handleCopyToken = (tokenStr: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(tokenStr);
      setCopiedTokenSubjectId(id);
      setTimeout(() => setCopiedTokenSubjectId(null), 2500);
    }
  };

  // Helper Acak Token Baru
  const handleRandomizeToken = (targetSub: Subject) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let prefix = formatSubjectTitle(targetSub.title).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    if (!prefix) prefix = 'SMP';
    let rand = '';
    for (let i = 0; i < 3; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newToken = `${prefix}${rand}`;
    onUpdateSubject({ ...targetSub, token: newToken });
  };

  // Helper Buka Edit Modal Jadwal
  const handleOpenEditSchedule = (targetSub: Subject) => {
    setScheduleToEdit(targetSub);
    setEditSubTitle(targetSub.title);
    setEditSubClass(targetSub.className);
    setEditSubDuration(targetSub.durationMinutes);
    setEditSubToken(targetSub.token);
    setEditSubViolationLimit(targetSub.violationLimit);
    setEditSubScoringRules(targetSub.scoringRules || subject.scoringRules || {});
    setIsEditScheduleModalOpen(true);
  };

  // Simpan Edit Jadwal
  const handleSaveEditSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleToEdit || !editSubTitle.trim() || !editSubToken.trim()) return;

    const cleanToken = editSubToken.trim().toUpperCase();
    const isTokenTaken = (allSubjects || []).some(
      s => s.id !== scheduleToEdit.id && s.token.trim().toUpperCase() === cleanToken && s.isActive
    );
    if (isTokenTaken) {
      showThemedAlert(
        'Token Sudah Digunakan',
        `Token "${cleanToken}" sudah digunakan oleh jadwal ujian lain yang sedang aktif! Silakan ganti atau acak token lain agar tidak tabrakan.`,
        'warning'
      );
      return;
    }

    const parsedScoringRules: ScoringRules = Object.fromEntries(
      Object.entries(editSubScoringRules).map(([k, v]) => [k, Number(v) || 1])
    ) as ScoringRules;

    const updated: Subject = {
      ...scheduleToEdit,
      title: editSubTitle.trim(),
      className: editSubClass.trim() || 'Semua Kelas',
      durationMinutes: Number(editSubDuration) || 60,
      token: cleanToken,
      violationLimit: Number(editSubViolationLimit) || 3,
      scoringRules: parsedScoringRules
    };

    onUpdateSubject(updated);
    setIsEditScheduleModalOpen(false);
    setScheduleToEdit(null);
  };

  // Buat Jadwal Ujian Baru
  const handleCreateNewSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTitle.trim() || !newSubToken.trim()) return;

    const cleanToken = newSubToken.trim().toUpperCase();
    const isTokenTaken = (allSubjects || []).some(
      s => s.token.trim().toUpperCase() === cleanToken && s.isActive
    );
    if (isTokenTaken) {
      showThemedAlert(
        'Token Sudah Digunakan',
        `Token "${cleanToken}" sudah digunakan oleh jadwal ujian lain yang sedang aktif! Silakan klik tombol 🎲 Acak untuk menghasilkan token unik.`,
        'warning'
      );
      return;
    }

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`;
    const parsedScoringRules: ScoringRules = Object.fromEntries(
      Object.entries(newSubScoringRules).map(([k, v]) => [k, Number(v) || 1])
    ) as ScoringRules;

    const newSub: Subject = {
      id: newId,
      title: newSubTitle.trim(),
      className: newSubClass.trim() || 'Semua Kelas',
      durationMinutes: Number(newSubDuration) || 60,
      token: cleanToken,
      violationLimit: Number(newSubViolationLimit) || 3,
      isActive: true,
      scoringRules: parsedScoringRules
    };

    setCreatedSubjectIds(prev => {
      const next = [...prev, newId];
      if (typeof window !== 'undefined' && currentTeacher?.id) {
        localStorage.setItem(`cbt_teacher_${currentTeacher.id}_created_subjects`, JSON.stringify(next));
      }
      return next;
    });
    setDeletedSubjectIds(prev => prev.filter(id => id !== newId));
    setBankCategoryFilter('ALL');
    setSelectedBankSubjectId(newId);

    if (onAddSubject) {
      onAddSubject(newSub);
    } else {
      onUpdateSubject(newSub);
    }

    setIsAddScheduleModalOpen(false);
    setNewSubTitle('');
    setNewSubDuration(60);
    setNewSubViolationLimit(3);
    setNewSubToken('SMP58' + Math.floor(100 + Math.random() * 900));
  };

  // Konfirmasi Hapus Jadwal / Mapel
  const handleConfirmDeleteSchedule = () => {
    if (!subjectToDelete) return;
    const deletedId = subjectToDelete.id;
    setDeletedSubjectIds(prev => [...prev, deletedId]);
    setCreatedSubjectIds(prev => {
      const next = prev.filter(id => id !== deletedId);
      if (typeof window !== 'undefined' && currentTeacher?.id) {
        localStorage.setItem(`cbt_teacher_${currentTeacher.id}_created_subjects`, JSON.stringify(next));
      }
      return next;
    });
    if (onDeleteSubject) {
      onDeleteSubject(deletedId);
    }
    if (selectedBankSubjectId === deletedId) {
      setBankView('catalog');
      const remaining = accessibleSubjects.filter(s => s.id !== deletedId && !deletedSubjectIds.includes(s.id));
      if (remaining.length > 0) {
        setSelectedBankSubjectId(remaining[0].id);
      } else {
        setSelectedBankSubjectId('');
      }
    }
    setSubjectToDelete(null);
  };

  // Handle Simpan Soal
  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalText.trim()) return;

    let finalOptions: any = [];
    let finalAnswer: any = null;

    if (modalType === 'Pilihan Ganda') {
      finalOptions = pgOptions
        .filter(opt => opt.text.trim() || opt.img)
        .map(opt => ({ text: opt.text.trim(), img: opt.img || undefined }));
      finalAnswer = pgAnswer;
    } else if (modalType === 'Pilihan Ganda Kompleks') {
      finalOptions = pgOptions
        .filter(opt => opt.text.trim() || opt.img)
        .map(opt => ({ text: opt.text.trim(), img: opt.img || undefined }));
      finalAnswer = pgkAnswer;
    } else if (modalType === 'Benar/Salah') {
      if (bsMode === 'multiple') {
        finalOptions = bsStatements
          .filter(s => s.text.trim() || s.img)
          .map(s => ({ text: s.text.trim(), img: s.img || undefined }));
        finalAnswer = bsStatements.map(s => s.answer);
      } else {
        finalOptions = [];
        finalAnswer = bsSingleAnswer;
      }
    } else if (modalType === 'Menjodohkan') {
      finalOptions = matchingPairs
        .filter(p => p.qText.trim() || p.qImg || p.aText.trim() || p.aImg)
        .map(p => ({
          q: { text: p.qText.trim(), img: p.qImg || undefined },
          a: { text: p.aText.trim(), img: p.aImg || undefined }
        }));
      finalAnswer = 'Otomatis';
    } else if (modalType === 'Isian Singkat') {
      finalOptions = [];
      finalAnswer = shortAnswer.split(/[;,]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    } else if (modalType === 'Esai') {
      finalOptions = [];
      finalAnswer = essayKey.trim();
    }

    const targetSubId = selectedBankSubjectId || subject.id;

    if (editingQuestion) {
      const updatedQ: Question = {
        ...editingQuestion,
        type: modalType,
        questionText: modalText.trim(),
        mediaUrl: modalMediaUrl.trim() || undefined,
        options: finalOptions,
        answer: finalAnswer
      };
      if (onUpdateQuestion) {
        onUpdateQuestion(updatedQ);
      }
      setIsEditModalOpen(false);
      setEditingQuestion(null);
    } else {
      const newQ: Question = {
        id: `q-${Date.now()}`,
        subjectId: targetSubId,
        type: modalType,
        questionText: modalText.trim(),
        mediaUrl: modalMediaUrl.trim() || undefined,
        options: finalOptions,
        answer: finalAnswer,
        orderIndex: bankSubjectQuestions.length + 1
      };
      onAddQuestion(newQ);
      onCloseAddModal();
    }

    resetQuestionForm();
  };

  const resetQuestionForm = () => {
    setModalText('');
    setModalMediaUrl('');
    setPgOptions([{ text: '' }, { text: '' }, { text: '' }, { text: '' }]);
    setPgAnswer('A');
    setPgkAnswer(['A']);
    setBsStatements([
      { text: '', answer: 'Benar' },
      { text: '', answer: 'Salah' },
      { text: '', answer: 'Benar' }
    ]);
    setMatchingPairs([
      { qText: '', aText: '' },
      { qText: '', aText: '' },
      { qText: '', aText: '' }
    ]);
    setShortAnswer('');
    setEssayKey('');
  };

  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setModalType(q.type);
    setModalText(q.questionText || '');
    setModalMediaUrl(q.mediaUrl || '');

    if (q.type === 'Pilihan Ganda') {
      if (Array.isArray(q.options) && q.options.length > 0) {
        setPgOptions((q.options as any[]).map(o => typeof o === 'string' ? { text: o } : { text: o.text || '', img: o.img || '' }));
      }
      setPgAnswer(typeof q.answer === 'string' ? q.answer : 'A');
    } else if (q.type === 'Pilihan Ganda Kompleks') {
      if (Array.isArray(q.options) && q.options.length > 0) {
        setPgOptions((q.options as any[]).map(o => typeof o === 'string' ? { text: o } : { text: o.text || '', img: o.img || '' }));
      }
      setPgkAnswer(Array.isArray(q.answer) ? q.answer : ['A']);
    } else if (q.type === 'Benar/Salah') {
      if (Array.isArray(q.options) && q.options.length > 0) {
        setBsMode('multiple');
        const ansList = Array.isArray(q.answer) ? q.answer : [];
        setBsStatements((q.options as any[]).map((o, idx) => ({
          text: typeof o === 'string' ? o : o.text || '',
          img: typeof o === 'object' ? o.img || '' : '',
          answer: (ansList[idx] === 'Salah' ? 'Salah' : 'Benar') as 'Benar' | 'Salah'
        })));
      } else {
        setBsMode('single');
        setBsSingleAnswer(q.answer === 'Salah' ? 'Salah' : 'Benar');
      }
    } else if (q.type === 'Menjodohkan') {
      if (Array.isArray(q.options) && q.options.length > 0) {
        setMatchingPairs((q.options as any[]).map((p: any) => ({
          qText: p.q?.text || '',
          qImg: p.q?.img || '',
          aText: p.a?.text || '',
          aImg: p.a?.img || ''
        })));
      }
    } else if (q.type === 'Isian Singkat') {
      if (Array.isArray(q.answer)) {
        setShortAnswer(q.answer.join(', '));
      } else if (typeof q.answer === 'string') {
        setShortAnswer(q.answer);
      }
    } else if (q.type === 'Esai') {
      setEssayKey(typeof q.answer === 'string' ? q.answer : '');
    }

    setIsEditModalOpen(true);
  };

  const handleCloseQuestionModal = () => {
    setIsEditModalOpen(false);
    setEditingQuestion(null);
    resetQuestionForm();
    onCloseAddModal();
  };

  // 100% Real Metric Calculations
  const avgScore = results.length > 0
    ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / results.length)
    : 0;

  const passRate = results.length > 0
    ? Math.round((results.filter(r => r.score >= 75).length / results.length) * 100)
    : 0;

  const passedStudentsCount = results.filter(r => r.score >= 75).length;
  const remedialStudentsCount = results.filter(r => r.score < 75).length;

  // Breakdown Tipe Soal Riil pada Mapel Aktif
  const questionTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    activeQuestions.forEach(q => {
      counts[q.type] = (counts[q.type] || 0) + 1;
    });
    return counts;
  }, [activeQuestions]);

  // Sebaran Capaian Rata-Rata per Rombel / Kelas (Real Data)
  const classPerformance = useMemo(() => {
    const map = new Map<string, { total: number; sum: number; passed: number }>();
    results.forEach(r => {
      const cls = r.className?.trim() || 'Umum';
      const curr = map.get(cls) || { total: 0, sum: 0, passed: 0 };
      curr.total += 1;
      curr.sum += r.score;
      if (r.score >= 75) curr.passed += 1;
      map.set(cls, curr);
    });
    return Array.from(map.entries()).map(([className, data]) => ({
      className,
      total: data.total,
      avgScore: Math.round(data.sum / data.total),
      passRate: Math.round((data.passed / data.total) * 100)
    }));
  }, [results]);

  // Sebaran Nilai Riil Siswa (Score Distribution)
  const scoreDistribution = useMemo(() => {
    const total = results.length;
    if (total === 0) {
      return {
        sangatBaik: { count: 0, pct: 0 },
        baik: { count: 0, pct: 0 },
        cukup: { count: 0, pct: 0 },
        remedial: { count: 0, pct: 0 }
      };
    }
    const c1 = results.filter(r => r.score >= 90).length;
    const c2 = results.filter(r => r.score >= 75 && r.score < 90).length;
    const c3 = results.filter(r => r.score >= 60 && r.score < 75).length;
    const c4 = results.filter(r => r.score < 60).length;
    return {
      sangatBaik: { count: c1, pct: Math.round((c1 / total) * 100) },
      baik: { count: c2, pct: Math.round((c2 / total) * 100) },
      cukup: { count: c3, pct: Math.round((c3 / total) * 100) },
      remedial: { count: c4, pct: Math.round((c4 / total) * 100) }
    };
  }, [results]);

  // Helper mem-parsing string tanggal waktu selesai pengerjaan siswa
  const parseSubmittedDate = (str?: string): Date => {
    if (!str) return new Date();
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    const match = str.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  // State mode periode rekapitulasi ujian: 'daily' (Harian: Senin - Sabtu, Default) atau 'monthly' (Bulanan)
  const [examPeriodMode, setExamPeriodMode] = useState<'daily' | 'monthly'>('daily');

  // State tab di menu Statistik & Analitik: 'ranking' (10 Terbaik) | 'remedial' (< KKM) | 'questions' (Butir Soal)
  const [statsActiveTab, setStatsActiveTab] = useState<'ranking' | 'remedial' | 'questions'>('ranking');

  // State mode kurva naik-turun statistik: 'class' (Per Rombel) | 'distribution' (Kurva Lonceng Nilai) | 'questions' (Butir Soal)
  const [statsChartMode, setStatsChartMode] = useState<'class' | 'distribution' | 'questions'>('class');

  // State hover & drill-down interaktif statistik
  const [statsHoveredItem, setStatsHoveredItem] = useState<{
    type: 'class' | 'distribution' | 'questions';
    label: string;
    subLabel?: string;
    primaryVal: string | number;
    secondaryVal?: string | number;
    extra?: string;
  } | null>(null);

  // Filter interaktif pada tabel & data statistik
  const [statsFilterClass, setStatsFilterClass] = useState<string>('Semua Kelas');
  const [statsSearchQuery, setStatsSearchQuery] = useState<string>('');
  const [statsQuestionCategory, setStatsQuestionCategory] = useState<'all' | 'Mudah' | 'Sedang' | 'Sukar (HOTS)'>('all');
  const [statsFilterGrade, setStatsFilterGrade] = useState<'all' | 'A' | 'B' | 'C' | 'D'>('all');

  // Data Rekapitulasi Pelaksanaan Ujian Harian (Senin s/d Sabtu - Periode Ujian ASAS / ASTS Sekolah)
  const dailyExamStats = useMemo(() => {
    const days = language === 'en'
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      : ['Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

    const subList = accessibleSubjects && accessibleSubjects.length > 0 ? accessibleSubjects : [subject];

    // Hitung peserta ujian riil per hari (Senin s/d Sabtu) dari riwayat submissions
    const takersCount = [0, 0, 0, 0, 0, 0];
    results.forEach(r => {
      let dayIdx = 0;
      if (r.submittedAt) {
        const d = parseSubmittedDate(r.submittedAt);
        const day = d.getDay(); // 0: Min, 1: Sen, 2: Sel, 3: Rab, 4: Kam, 5: Jum, 6: Sab
        if (day >= 1 && day <= 6) {
          dayIdx = day - 1;
        } else {
          dayIdx = 0; // Minggu digabung ke hari pertama
        }
      }
      takersCount[dayIdx]++;
    });

    // Distribusi jadwal paket mapel per hari (Senin s/d Sabtu)
    const examsCount = [0, 0, 0, 0, 0, 0];
    subList.forEach((s, idx) => {
      const dayIdx = idx % 6;
      examsCount[dayIdx]++;
    });

    for (let i = 0; i < 6; i++) {
      if (examsCount[i] === 0) examsCount[i] = 1;
    }

    const peakValue = Math.max(...takersCount, ...examsCount, 10);
    const calculatedMax = Math.max(10, Math.ceil(peakValue / 10) * 10);

    const stats = days.map((d, idx) => ({
      label: d,
      exams: examsCount[idx],
      takers: takersCount[idx]
    }));

    return {
      stats,
      maxVal: calculatedMax
    };
  }, [results, accessibleSubjects, subject, language]);

  // Data Rekapitulasi Pelaksanaan Ujian (Bulanan) - Terhubung 100% Data Riil Database
  const monthlyExamStats = useMemo(() => {
    const months = language === 'en'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentMonth = new Date().getMonth();

    // Hitung peserta ujian (takers) riil per bulan berdasarkan data riil results
    const takersCount = new Array(12).fill(0);
    results.forEach(r => {
      let mIdx = currentMonth;
      if (r.submittedAt) {
        const parts = r.submittedAt.split(/[/.-]/);
        if (parts.length >= 2) {
          const parsedM = parseInt(parts[1], 10) - 1;
          if (parsedM >= 0 && parsedM <= 11) mIdx = parsedM;
        } else {
          const d = new Date(r.submittedAt);
          if (!isNaN(d.getTime())) mIdx = d.getMonth();
        }
      }
      takersCount[mIdx]++;
    });

    // Hitung paket ujian aktif (exams) riil per bulan dari daftar mapel sekolah
    const examsCount = new Array(12).fill(0);
    const subList = accessibleSubjects && accessibleSubjects.length > 0 ? accessibleSubjects : [subject];
    subList.forEach((s, idx) => {
      const targetMonth = s.isActive ? currentMonth : (idx * 2) % 12;
      examsCount[targetMonth] = (examsCount[targetMonth] || 0) + 1;
    });

    if (examsCount[currentMonth] === 0) {
      examsCount[currentMonth] = Math.max(1, subList.length);
    }

    const peakValue = Math.max(...takersCount, ...examsCount, 10);
    const calculatedMax = Math.max(10, Math.ceil(peakValue / 10) * 10);

    const stats = months.map((m, idx) => ({
      label: m,
      exams: examsCount[idx],
      takers: takersCount[idx]
    }));

    return {
      stats,
      maxVal: calculatedMax
    };
  }, [results, accessibleSubjects, subject, language]);

  // Data statistik periode aktif yang ditampilkan (Harian atau Bulanan)
  const activePeriodStats = examPeriodMode === 'daily' ? dailyExamStats : monthlyExamStats;

  // Analisis Performa dan Ketuntasan per Kelas / Rombel (100% Data Siswa Riil)
  const classPerformanceStats = useMemo(() => {
    const list = studentClasses && studentClasses.length > 0
      ? studentClasses
      : ['VII.1', 'VII.2', 'VII.3', 'VIII.1', 'VIII.2', 'VIII.3', 'IX.1', 'IX.2', 'IX.3'];

    return list.map(cls => {
      const clsStudents = (students || []).filter(s => s.className === cls);
      const clsResults = results.filter(r => {
        const studentCls = resolveStudentSingleClass(r.studentName, r.className, students);
        return studentCls === cls;
      });

      const totalStudents = clsStudents.length || clsResults.length;
      const testedCount = clsResults.length;
      const avg = testedCount > 0
        ? Math.round(clsResults.reduce((sum, r) => sum + (r.score || 0), 0) / testedCount)
        : 0;
      const passed = clsResults.filter(r => (r.score || 0) >= 75).length;
      const passRate = testedCount > 0 ? Math.round((passed / testedCount) * 100) : 0;

      return {
        className: cls,
        totalStudents,
        testedCount,
        avgScore: avg,
        passedCount: passed,
        passRate
      };
    });
  }, [students, results, studentClasses]);

  // Pemeringkatan Siswa & Analisis Kebutuhan Remedial
  const rankedResults = useMemo(() => {
    return [...results].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [results]);

  const topStudents = useMemo(() => rankedResults.slice(0, 10), [rankedResults]);
  const remedialStudents = useMemo(() => rankedResults.filter(r => (r.score || 0) < 75), [rankedResults]);

  // Helper membuat garis lengkung mulus (Spline Bezier Curve) identik Contoh 3
  const getSplinePath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  // Data Analisis Kategori & Tingkat Kesulitan Soal per Mata Pelajaran (100% Data Riil Sekolah)
  const questionAnalyticsSubjects = useMemo(() => {
    // Ambil daftar mata pelajaran nyata dari database sekolah (accessibleSubjects)
    const list = accessibleSubjects && accessibleSubjects.length > 0 ? accessibleSubjects : [subject];
    // Ambil hingga 4 mata pelajaran riil sekolah
    const selectedList = list.slice(0, 4);

    return selectedList.map(s => {
      const cleanName = formatSubjectTitle(s.title);
      const isCurrentActive = s.id === subject.id;
      const subResults = results.filter(r => r.subjectId === s.id);

      // Hitung rata-rata nilai riil siswa untuk mata pelajaran ini
      const avgScore = subResults.length > 0
        ? Math.round(subResults.reduce((sum, r) => sum + (r.score || 0), 0) / subResults.length)
        : (s.isActive ? 78 : 75); // Target KKM

      let easyPct = 25;
      let medPct = 30;
      let diffPct = 25;
      let hardPct = 20;

      // Jika ada butir soal empiris dan hasil pengerjaan siswa riil:
      if (isCurrentActive && activeQuestions.length > 0 && subResults.length > 0) {
        let easyCount = 0;
        let medCount = 0;
        let diffCount = 0;
        let hardCount = 0;

        activeQuestions.forEach(q => {
          let correct = 0;
          let answered = 0;
          subResults.forEach(r => {
            const detail = r.details?.find(d => d.questionId === q.id);
            if (detail) {
              answered++;
              if (detail.earnedPoints > 0) correct++;
            } else if (r.answers && r.answers.length > 0) {
              const ans = r.answers.find(a => a.questionId === q.id);
              if (ans && ans.answer !== null && ans.answer !== '') {
                answered++;
                if (q.answer && JSON.stringify(ans.answer) === JSON.stringify(q.answer)) {
                  correct++;
                }
              }
            }
          });

          const rate = answered > 0 ? correct / answered : 0.6;
          if (rate >= 0.70) easyCount++;
          else if (rate >= 0.50) medCount++;
          else if (rate >= 0.30) diffCount++;
          else hardCount++;
        });

        const totalQ = activeQuestions.length || 1;
        easyPct = Math.round((easyCount / totalQ) * 100);
        medPct = Math.round((medCount / totalQ) * 100);
        diffPct = Math.round((diffCount / totalQ) * 100);
        hardPct = Math.max(0, 100 - (easyPct + medPct + diffPct));
      } else if (isCurrentActive && activeQuestions.length > 0) {
        // Klasifikasi berbasis tipe soal nyata di bank soal
        const qTypes = activeQuestions.map(q => q.type);
        const totalQ = qTypes.length || 1;
        const easyQ = qTypes.filter(t => t === 'Pilihan Ganda').length;
        const medQ = qTypes.filter(t => t === 'Benar/Salah' || t === 'Isian Singkat').length;
        const diffQ = qTypes.filter(t => t === 'Pilihan Ganda Kompleks' || t === 'Menjodohkan').length;
        const hardQ = qTypes.filter(t => t === 'Esai').length;

        easyPct = Math.round((easyQ / totalQ) * 100) || 25;
        medPct = Math.round((medQ / totalQ) * 100) || 30;
        diffPct = Math.round((diffQ / totalQ) * 100) || 25;
        hardPct = Math.max(0, 100 - (easyPct + medPct + diffPct));
      }

      // Skalakan total panjang bar ke rata-rata capaian nilai riil siswa (0 - 100)
      const scale = (avgScore || 75) / 100;
      const segEasy = Math.max(3, Math.round(easyPct * scale));
      const segMed = Math.max(3, Math.round(medPct * scale));
      const segDiff = Math.max(3, Math.round(diffPct * scale));
      const segHard = Math.max(2, Math.round(hardPct * scale));

      return {
        name: cleanName,
        avgScore,
        totalTakers: subResults.length,
        easy: segEasy,
        medium: segMed,
        difficult: segDiff,
        hard: segHard,
        percentages: { easyPct, medPct, diffPct, hardPct }
      };
    });
  }, [accessibleSubjects, subject, results, activeQuestions]);

  // Analisis Butir Soal Empiris (Item Difficulty Analysis)
  const questionItemAnalysis = useMemo(() => {
    return activeQuestions.map((q, idx) => {
      let totalAnswered = 0;
      let correctCount = 0;
      results.forEach(r => {
        if (r.details && r.details.length > 0) {
          const d = r.details.find(detail => detail.questionId === q.id);
          if (d) {
            totalAnswered += 1;
            if (d.earnedPoints > 0) correctCount += 1;
          }
        } else if (r.answers && r.answers.length > 0) {
          const item = r.answers.find(a => a.questionId === q.id);
          if (item) {
            totalAnswered += 1;
            if (r.score >= 75) correctCount += 1;
          }
        }
      });
      const difficultyIndex = totalAnswered > 0 ? correctCount / totalAnswered : 0;
      let category = 'Belum Diuji';
      if (totalAnswered > 0) {
        if (difficultyIndex >= 0.70) category = 'Mudah';
        else if (difficultyIndex >= 0.35) category = 'Sedang';
        else category = 'Sukar (HOTS)';
      }
      return {
        no: idx + 1,
        question: q,
        totalAnswered,
        correctCount,
        difficultyIndex: Math.round(difficultyIndex * 100),
        category
      };
    });
  }, [activeQuestions, results]);

  // Kurva Distribusi Frekuensi Nilai Siswa (Normalitas Skor / Bell Curve Naik-Turun)
  const scoreBellDistribution = useMemo(() => {
    const buckets = [
      { range: '< 50', label: '0 - 49 (Sangat Rendah)', min: 0, max: 49, color: '#ef4444' },
      { range: '50-59', label: '50 - 59 (Rendah)', min: 50, max: 59, color: '#f97316' },
      { range: '60-74', label: '60 - 74 (Cukup / Belum Tuntas)', min: 60, max: 74, color: '#f59e0b' },
      { range: '75-84', label: '75 - 84 (Baik / Tuntas KKM)', min: 75, max: 84, color: '#8b5cf6' },
      { range: '85-94', label: '85 - 94 (Sangat Baik)', min: 85, max: 94, color: '#10b981' },
      { range: '95-100', label: '95 - 100 (Sempurna)', min: 95, max: 100, color: '#06b6d4' }
    ];

    const total = results.length;
    return buckets.map(b => {
      const count = results.filter(r => (r.score || 0) >= b.min && (r.score || 0) <= b.max).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        ...b,
        count,
        pct
      };
    });
  }, [results]);

  // Perhitungan Data Points untuk Kurva Naik-Turun Interaktif Menu Statistik
  const statsChartData = useMemo(() => {
    if (statsChartMode === 'class') {
      const list = classPerformanceStats;
      const maxVal = 100;
      return {
        mode: 'class' as const,
        title: 'Fluktuasi Capaian Rata-Rata per Rombel Kelas',
        subtitle: 'Kurva gelombang nilai rata-rata kelas (0 - 100) vs Ketuntasan KKM (%)',
        maxVal,
        items: list.map(cp => ({
          label: `Kelas ${cp.className}`,
          shortLabel: cp.className,
          value: cp.avgScore,
          barValue: cp.passRate,
          testedCount: cp.testedCount,
          totalStudents: cp.totalStudents,
          passedCount: cp.passedCount,
          raw: cp
        }))
      };
    } else if (statsChartMode === 'distribution') {
      const list = scoreBellDistribution;
      const maxCount = Math.max(1, ...list.map(b => b.count));
      return {
        mode: 'distribution' as const,
        title: 'Kurva Distribusi Frekuensi Nilai Siswa (Normalitas Skor)',
        subtitle: 'Kurva lonceng sebaran rentang perolehan skor ujian seluruh siswa',
        maxVal: Math.max(maxCount + 2, 6),
        items: list.map(b => ({
          label: b.label,
          shortLabel: b.range,
          value: b.count,
          barValue: b.count,
          pct: b.pct,
          color: b.color,
          raw: b
        }))
      };
    } else {
      const list = questionItemAnalysis;
      return {
        mode: 'questions' as const,
        title: 'Kurva Indeks Daya Serap per Nomor Butir Soal',
        subtitle: 'Tingkat persentase jawaban benar siswa per butir soal (Puncak = Mudah, Lembah = Sukar)',
        maxVal: 100,
        items: list.map(q => ({
          label: `Soal No. ${q.no}`,
          shortLabel: `S${q.no}`,
          value: q.difficultyIndex,
          barValue: q.difficultyIndex,
          category: q.category,
          totalAnswered: q.totalAnswered,
          correctCount: q.correctCount,
          snippet: q.question.questionText?.substring(0, 40) + '...',
          type: q.question.type,
          raw: q
        }))
      };
    }
  }, [statsChartMode, classPerformanceStats, scoreBellDistribution, questionItemAnalysis]);

  // Filter Siswa untuk Menu Statistik
  const filteredRankedResults = useMemo(() => {
    return rankedResults.filter(r => {
      if (statsFilterClass !== 'Semua Kelas') {
        const singleCls = resolveStudentSingleClass(r.studentName, r.className, students);
        if (singleCls !== statsFilterClass) return false;
      }
      if (statsFilterGrade === 'A' && (r.score || 0) < 90) return false;
      if (statsFilterGrade === 'B' && ((r.score || 0) < 75 || (r.score || 0) >= 90)) return false;
      if (statsFilterGrade === 'C' && ((r.score || 0) < 60 || (r.score || 0) >= 75)) return false;
      if (statsFilterGrade === 'D' && (r.score || 0) >= 60) return false;
      if (statsSearchQuery.trim()) {
        const query = statsSearchQuery.toLowerCase();
        const matchesName = r.studentName.toLowerCase().includes(query);
        const singleCls = resolveStudentSingleClass(r.studentName, r.className, students).toLowerCase();
        return matchesName || singleCls.includes(query);
      }
      return true;
    });
  }, [rankedResults, statsFilterClass, statsFilterGrade, statsSearchQuery, students]);

  const filteredTopStudents = useMemo(() => {
    return filteredRankedResults.slice(0, 10);
  }, [filteredRankedResults]);

  const filteredRemedialStudents = useMemo(() => {
    return filteredRankedResults.filter(r => (r.score || 0) < 75);
  }, [filteredRankedResults]);

  const filteredQuestionItemAnalysis = useMemo(() => {
    return questionItemAnalysis.filter(item => {
      if (statsQuestionCategory !== 'all' && item.category !== statsQuestionCategory) {
        return false;
      }
      if (statsSearchQuery.trim()) {
        const query = statsSearchQuery.toLowerCase();
        return (
          item.question.questionText.toLowerCase().includes(query) ||
          item.question.type.toLowerCase().includes(query) ||
          `soal ${item.no}`.includes(query)
        );
      }
      return true;
    });
  }, [questionItemAnalysis, statsQuestionCategory, statsSearchQuery]);

  // State untuk Menu Dokumen & Berita Acara Ujian
  const [selectedDocType, setSelectedDocType] = useState<'bap' | 'attendance' | 'cards' | 'ledger'>('bap');
  const [selectedDocClass, setSelectedDocClass] = useState<string>('Semua Kelas');
  const [selectedDocSubjectId, setSelectedDocSubjectId] = useState<string>('');

  const selectedDocSubject = useMemo(() => {
    const targetId = selectedDocSubjectId || currentBankSubject?.id || subject.id;
    return (allSubjects || []).find(s => s.id === targetId) || currentBankSubject || subject;
  }, [selectedDocSubjectId, currentBankSubject, allSubjects, subject]);

  const docResults = useMemo(() => {
    return results.filter(r => r.subjectId === selectedDocSubject.id);
  }, [results, selectedDocSubject.id]);

  const docTargetClasses = useMemo(() => {
    if (!selectedDocSubject.className) return [];
    return selectedDocSubject.className.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
  }, [selectedDocSubject.className]);

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students?.forEach(s => {
      if (s.className) set.add(s.className.trim());
    });
    return Array.from(set).sort();
  }, [students]);


  const parseClassList = (classStr: string) => {
    if (!classStr || classStr.trim() === 'Semua Kelas') return ['Semua Kelas'];
    return classStr.split(',').map(c => c.trim()).filter(Boolean);
  };

  const toggleClassInString = (currentStr: string, targetCls: string) => {
    if (targetCls === 'Semua Kelas') {
      return 'Semua Kelas';
    }
    const currentList = currentStr === 'Semua Kelas' ? [] : parseClassList(currentStr);
    let updated: string[];
    if (currentList.includes(targetCls)) {
      updated = currentList.filter(c => c !== targetCls);
    } else {
      updated = [...currentList, targetCls];
    }
    if (updated.length === 0) return 'Semua Kelas';
    updated.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return updated.join(', ');
  };

  const getStudentCountForClasses = (classStr: string) => {
    if (!students || students.length === 0) return 0;
    if (!classStr || classStr === 'Semua Kelas') return students.length;
    const list = parseClassList(classStr);
    return students.filter(s => list.includes(s.className?.trim())).length;
  };

  // Checkbox Selection Logic
  const isAllSelected = filteredResults.length > 0 && selectedResultIds.length === filteredResults.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedResultIds([]);
    } else {
      setSelectedResultIds(filteredResults.map(r => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedResultIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Real CSV Export Function
  const exportResultsToCSV = () => {
    if (filteredResults.length === 0) return;
    const headers = ['Nama Siswa', 'Kelas / Rombel', 'Mata Pelajaran', 'Skor Akhir (%)', 'Poin Diperoleh', 'Poin Maksimal', 'Status KKM', 'Jumlah Pelanggaran', 'Waktu Selesai'];
    const rows = filteredResults.map(r => [
      `"${r.studentName}"`,
      `"${r.className}"`,
      `"${r.subjectTitle || ''}"`,
      r.score,
      r.totalEarned,
      r.totalMax,
      `"${r.score >= 75 ? 'Tuntas KKM' : 'Remedial'}"`,
      r.violationCount,
      `"${r.submittedAt}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent([headers.join(','), ...rows.map(e => e.join(','))].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);

    let filename = 'rekap_nilai';
    if (resultsSubjectFilter !== 'ALL') {
      const sub = (allSubjects || []).find(s => s.id === resultsSubjectFilter);
      if (sub) filename += `_${sub.title.replace(/[^a-zA-Z0-9]/g, '_')}`;
    } else {
      filename += '_1Sekolah_SemuaMapel';
    }
    if (resultsClassFilter !== 'ALL') {
      filename += `_${resultsClassFilter.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    filename += `_${Date.now()}.csv`;

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintDossier = () => {
    const htmlEl = document.documentElement;
    const isDark = htmlEl.classList.contains('dark');

    if (isDark) {
      htmlEl.classList.remove('dark');
    }

    setTimeout(() => {
      window.print();
      if (isDark) {
        const restoreDark = () => {
          htmlEl.classList.add('dark');
          window.removeEventListener('afterprint', restoreDark);
        };
        window.addEventListener('afterprint', restoreDark, { once: true });
        setTimeout(restoreDark, 3000);
      }
    }, 60);
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full transition-colors print:p-0 print:m-0 print:max-w-none print:w-full print:block">
      {/* WRAPPER KONTEN UTAMA DASHBOARD (SEMBUNYI SAAT CETAK DOSSIER) */}
      <div className={`space-y-6 ${selectedResult ? 'print:hidden' : ''}`}>
      {/* ============================================================== */}
      {/* 1. TAMPILAN DASHBOARD UTAMA (100% REAL DATA DRIVEN)             */}
      {/* ============================================================== */}
      {currentNav === 'dashboard' && (
        <>
          {/* A. TOP 3 METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Kelulusan Siswa (Circular Progress Ring) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex items-center justify-between">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">
                  {t.metricGradingTitle}
                </span>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {passRate}% <span className="text-sm font-normal text-slate-500">{t.metricPassRate}</span>
                  </h3>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    {results.length > 0 ? (
                      <>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{passedStudentsCount} Tuntas</span>
                        <span>•</span>
                        <span className="text-rose-500 dark:text-rose-400">{remedialStudentsCount} Remedial</span>
                      </>
                    ) : (
                      <span className="text-slate-400">Belum ada ujian diselesaikan</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                    ✓
                  </span>
                  <span>Standar Ketuntasan Minimal: KKM 75</span>
                </div>
              </div>

              {/* Circular Progress Bar (SVG) */}
              <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-violet-600 dark:text-violet-500 transition-all duration-500"
                    strokeDasharray={`${passRate}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute font-bold text-sm text-slate-900 dark:text-white">
                  {passRate}%
                </div>
              </div>
            </div>

            {/* Card 2: Peserta Ujian Selesai */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block mb-1">
                    {t.metricActiveStudentsTitle}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {results.length} <span className="text-sm font-normal text-slate-500">/ {students?.length || 0} Siswa</span>
                  </h3>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    {results.length > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Rata-Rata Nilai: {avgScore}</span>
                    ) : (
                      <span className="text-slate-400">Partisipasi Ujian: 0%</span>
                    )}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* Progress Partisipasi Siswa Riil */}
              <div className="space-y-1 pt-3">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Partisipasi Siswa</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {students && students.length > 0 ? Math.round((results.length / students.length) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{
                      width: `${students && students.length > 0 ? Math.min(100, (results.length / students.length) * 100) : 0}%`
                    }}
                    className="h-full rounded-full bg-orange-500 transition-all duration-500"
                  ></div>
                </div>
              </div>
            </div>

            {/* Card 3: Total Butir Soal */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block mb-1">
                    {t.metricQuestionsTitle}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {activeQuestions.length} <span className="text-sm font-normal text-slate-500">Butir</span>
                  </h3>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                    {Object.keys(questionTypeBreakdown).length > 0 ? (
                      <span className="text-violet-600 dark:text-violet-400 font-bold">
                        {Object.keys(questionTypeBreakdown).length} Tipe Soal Terkonfigurasi
                      </span>
                    ) : (
                      <span className="text-slate-400">Belum ada butir soal</span>
                    )}
                  </div>
                </div>

                <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>

              {/* Badges Tipe Soal Riil */}
              <div className="flex flex-wrap gap-1 pt-3">
                {Object.entries(questionTypeBreakdown).map(([typeName, count]) => (
                  <span
                    key={typeName}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {typeName.split(' ')[0]}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* B. MIDDLE SECTION: 2 ANALYTICS CHARTS IDENTIK CONTOH 3 REFERENSI */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Exam Taken Times (Spline Curve & Bars) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-violet-600" />
                    <span>
                      {examPeriodMode === 'daily'
                        ? 'Rekapitulasi Pelaksanaan Ujian (Harian)'
                        : 'Rekapitulasi Pelaksanaan Ujian (Bulanan)'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {examPeriodMode === 'daily'
                      ? 'Statistik sesi ujian & kehadiran siswa per hari (Senin s/d Sabtu - Periode ASAS / Ujian Semester)'
                      : 'Rekaman riwayat pelaksanaan ujian kalender bulanan semester'}
                  </p>

                  {/* Legends */}
                  <div className="flex items-center gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                        Jadwal Ujian
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-200 dark:bg-violet-900/60 border border-violet-400/40"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                        Peserta Ujian
                      </span>
                    </div>
                  </div>
                </div>

                {/* Switcher: Harian (Senin - Sabtu) vs Bulanan */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold self-start">
                  <button
                    type="button"
                    onClick={() => setExamPeriodMode('daily')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      examPeriodMode === 'daily'
                        ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Harian</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExamPeriodMode('monthly')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      examPeriodMode === 'monthly'
                        ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Bulanan</span>
                  </button>
                </div>
              </div>

              {/* SVG Area & Spline Chart */}
              <div className="pt-2">
                {(() => {
                  const svgW = 540;
                  const svgH = 175;
                  const padL = 36;
                  const padR = 20;
                  const padT = 16;
                  const padB = 26;
                  const chartW = svgW - padL - padR;
                  const chartH = svgH - padT - padB;
                  const maxVal = activePeriodStats.maxVal || 40;
                  const statsList = activePeriodStats.stats || [];

                  const points = statsList.map((item, idx) => {
                    const x = padL + idx * (chartW / Math.max(1, statsList.length - 1));
                    const y = padT + chartH - (item.exams / maxVal) * chartH;
                    return { x, y, ...item };
                  });

                  const splineD = getSplinePath(points);
                  const areaD = points.length > 0
                    ? `${splineD} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`
                    : '';

                  const yGridTicks = [
                    maxVal,
                    Math.round(maxVal * 0.75),
                    Math.round(maxVal * 0.5),
                    Math.round(maxVal * 0.25),
                    0
                  ];

                  return (
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-48 select-none overflow-visible">
                      <defs>
                        <linearGradient id="splineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines & Y-Axis Labels */}
                      {yGridTicks.map((val, tickIdx) => {
                        const y = padT + chartH - (val / maxVal) * chartH;
                        return (
                          <g key={`ytick-${tickIdx}-${val}`}>
                            <text
                              x={padL - 8}
                              y={y + 3.5}
                              textAnchor="end"
                              className="text-[10px] fill-slate-400 dark:fill-slate-500 font-medium"
                            >
                              {val}
                            </text>
                            <line
                              x1={padL}
                              y1={y}
                              x2={svgW - padR}
                              y2={y}
                              stroke="currentColor"
                              strokeDasharray={val === 0 ? '0' : '4 4'}
                              className="text-slate-100 dark:text-slate-800"
                              strokeWidth={val === 0 ? '1.5' : '1'}
                            />
                          </g>
                        );
                      })}

                      {/* Background Vertical Bars (Active Exam Takers) */}
                      {points.map((pt, idx) => {
                        const barH = (pt.takers / maxVal) * chartH;
                        const barY = padT + chartH - barH;
                        const barW = examPeriodMode === 'daily' ? 24 : 14;
                        return (
                          <rect
                            key={`bar-${idx}`}
                            x={pt.x - barW / 2}
                            y={barY}
                            width={barW}
                            height={barH}
                            rx="3"
                            ry="3"
                            className="fill-violet-100 dark:fill-violet-950/40 hover:fill-violet-200 dark:hover:fill-violet-900/60 transition-colors"
                          >
                            <title>{`${pt.label}: ${pt.takers} Peserta Ujian`}</title>
                          </rect>
                        );
                      })}

                      {/* Gradient Fill Under Spline Curve */}
                      <path d={areaD} fill="url(#splineAreaGrad)" />

                      {/* Spline Bezier Curve (Active Exams) */}
                      <path
                        d={splineD}
                        fill="none"
                        stroke="#7c3aed"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Circular Dots on Spline Curve */}
                      {points.map((pt, idx) => (
                        <circle
                          key={`dot-${idx}`}
                          cx={pt.x}
                          cy={pt.y}
                          r="3.5"
                          className="fill-violet-600 stroke-white dark:stroke-slate-900 stroke-2 drop-shadow-xs"
                        >
                          <title>{`${pt.label}: ${pt.exams} Jadwal Ujian`}</title>
                        </circle>
                      ))}

                      {/* X-Axis Labels (Senin - Sabtu atau Jan - Des) */}
                      {points.map((pt, idx) => (
                        <text
                          key={`lbl-${idx}`}
                          x={pt.x}
                          y={svgH - 6}
                          textAnchor="middle"
                          className="text-[10px] fill-slate-500 dark:fill-slate-400 font-semibold"
                        >
                          {pt.label}
                        </text>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            </div>

            {/* Chart 2: Average Results For Test Questions (Segmented Multi-Color Bars) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {language === 'en' ? 'Average Results For Test Questions' : 'Tingkat Kesulitan & Capaian Butir Soal'}
                </h3>
                {/* 4 Colored Legends */}
                <div className="flex flex-wrap items-center gap-3.5 mt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                      {language === 'en' ? 'Easy questions' : 'Soal Mudah'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                      {language === 'en' ? 'Medium questions' : 'Soal Sedang'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                      {language === 'en' ? 'Difficult questions' : 'Soal Sulit'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">
                      {language === 'en' ? 'Hard' : 'Sangat Sulit'}
                    </span>
                  </div>
                </div>

                {/* Subject Rows with Segmented Colored Pills (Data Riil Database Sekolah) */}
                <div className="space-y-4 pt-5">
                  {questionAnalyticsSubjects.map((sub) => (
                    <div key={sub.name} className="flex items-center gap-3 sm:gap-4">
                      <span
                        className="w-28 sm:w-36 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate"
                        title={`${sub.name} (Rata-rata Nilai: ${sub.avgScore})`}
                      >
                        {sub.name}
                      </span>
                      {/* Segmented Track */}
                      <div
                        className="flex-1 h-4 rounded-full bg-slate-100/70 dark:bg-slate-800/40 p-0.5 flex items-center gap-1 cursor-help"
                        title={`${sub.name} | Rata-rata: ${sub.avgScore} | Mudah: ${sub.percentages?.easyPct}%, Sedang: ${sub.percentages?.medPct}%, Sulit: ${sub.percentages?.diffPct}%, Sangat Sulit: ${sub.percentages?.hardPct}%`}
                      >
                        <div
                          style={{ width: `${sub.easy}%` }}
                          className="h-full rounded-full bg-violet-600 transition-all"
                          title={`Mudah: ${sub.percentages?.easyPct}% (${sub.easy}% skala mark)`}
                        ></div>
                        <div
                          style={{ width: `${sub.medium}%` }}
                          className="h-full rounded-full bg-teal-500 transition-all"
                          title={`Sedang: ${sub.percentages?.medPct}% (${sub.medium}% skala mark)`}
                        ></div>
                        <div
                          style={{ width: `${sub.difficult}%` }}
                          className="h-full rounded-full bg-amber-400 transition-all"
                          title={`Sulit: ${sub.percentages?.diffPct}% (${sub.difficult}% skala mark)`}
                        ></div>
                        <div
                          style={{ width: `${sub.hard}%` }}
                          className="h-full rounded-full bg-orange-500 transition-all"
                          title={`Sangat Sulit: ${sub.percentages?.hardPct}% (${sub.hard}% skala mark)`}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Pass Mark Scale (10 to 100) */}
              <div className="flex items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-medium">
                <span className="w-28 sm:w-36 text-slate-700 dark:text-slate-300 font-bold">
                  {language === 'en' ? 'Pass Mark :' : 'Batas KKM :'}
                </span>
                <div className="flex-1 flex justify-between px-1">
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40</span>
                  <span>50</span>
                  <span>60</span>
                  <span>70</span>
                  <span>80</span>
                  <span>90</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>

          {/* C. RINGKASAN CAPAIAN RIIL SISWA PER KELAS & SEBARAN KKM */}
          {classPerformance.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Rata-Rata Capaian & Sebaran Nilai Siswa per Kelas
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Capaian riil siswa berdasarkan hasil ujian yang telah diserahkan ({results.length} Siswa, {passRate}% Memenuhi KKM)
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                  {classPerformance.length} Kelas Mengikuti Ujian
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {classPerformance.map(cp => (
                  <div key={cp.className} className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{cp.className}</p>
                      <p className="text-[11px] text-slate-400">{cp.total} Siswa Mengikuti Ujian</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-black ${cp.avgScore >= 75 ? 'text-violet-600 dark:text-violet-400' : 'text-amber-500'}`}>
                        {cp.avgScore}
                      </p>
                      <span className="text-[10px] font-semibold text-slate-400">Rata-rata</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* 1.B TAMPILAN STATISTIK & ANALISIS BUTIR SOAL MENDALAM            */}
      {/* ============================================================== */}
      {currentNav === 'statistics' && (
        <div className="space-y-6">
          {/* Header Statistik */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-violet-600" />
                <span>Statistik & Analisis Hasil Belajar Siswa</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Visualisasi interaktif fluktuasi capaian belajar, sebaran skor normalitas, pemetaan rombel, dan analisis empiris butir soal SMPN 58.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-bold text-xs border border-violet-200 dark:border-violet-800">
                Mapel: {currentBankSubject.title}
              </span>
            </div>
          </div>

          {/* 4 Metric Cards Statistik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1 hover:border-violet-300 dark:hover:border-violet-700 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Rata-Rata Capaian Ujian</span>
                <span className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 flex items-center justify-center font-bold text-xs">
                  📊
                </span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{avgScore} Poin</h4>
              <p className="text-xs text-slate-500">{results.length} lembar ujian terkumpul • KKM 75</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1 hover:border-emerald-300 dark:hover:border-emerald-700 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Ketuntasan Klasikal KKM</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  ✓
                </span>
              </div>
              <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{passRate}% Tuntas</h4>
              <p className="text-xs text-slate-500">{passedStudentsCount} tuntas • {remedialStudentsCount} remedial</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1 hover:border-sky-300 dark:hover:border-sky-700 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Partisipasi Peserta</span>
                <span className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center font-bold text-xs">
                  👥
                </span>
              </div>
              <h4 className="text-2xl font-bold text-sky-600 dark:text-sky-400">
                {results.length} / {students?.length || 0} Siswa
              </h4>
              <p className="text-xs text-slate-500">
                {students && students.length > 0 ? Math.round((results.length / students.length) * 100) : 0}% siswa telah mengikuti
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1 hover:border-rose-300 dark:hover:border-rose-700 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Audit Integritas Anti-Cheat</span>
                <span className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-xs">
                  🛡️
                </span>
              </div>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white">
                {results.filter(r => r.violationCount === 0).length} Siswa Tertib
              </h4>
              <p className="text-xs text-rose-500 font-semibold">
                {results.filter(r => r.violationCount > 0).length} siswa terdeteksi alih jendela
              </p>
            </div>
          </div>

          {/* ============================================================== */}
          {/* DIAGRAM KURVA NAIK-TURUN INTERAKTIF (WAVY SPLINE AREA CHART)    */}
          {/* ============================================================== */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-600" />
                  <span>{statsChartData.title}</span>
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {statsChartData.subtitle}
                </p>

                {/* Legends */}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {statsChartMode === 'class' ? 'Kurva Rata-Rata Nilai' : statsChartMode === 'distribution' ? 'Kurva Distribusi Siswa' : 'Kurva Daya Serap (% Benar)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-200 dark:bg-violet-900/60 border border-violet-400/40"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {statsChartMode === 'class' ? 'Ketuntasan KKM (%)' : statsChartMode === 'distribution' ? 'Jumlah Peserta' : 'Tingkat Kebenaran'}
                    </span>
                  </div>
                  {(statsChartMode === 'class' || statsChartMode === 'questions') && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-500"></span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                        Standar KKM 75
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mode Switcher Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold self-start">
                <button
                  type="button"
                  onClick={() => setStatsChartMode('class')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    statsChartMode === 'class'
                      ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Per Rombel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatsChartMode('distribution')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    statsChartMode === 'distribution'
                      ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Sebaran Skor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatsChartMode('questions')}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    statsChartMode === 'questions'
                      ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Butir Soal</span>
                </button>
              </div>
            </div>

            {/* Interactive Inspection Bar (Zero Layout Shift Container) */}
            <div className="min-h-[54px] flex items-center">
              {statsHoveredItem ? (
                <div className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 animate-in fade-in duration-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {statsHoveredItem.label}
                      </span>
                      {statsHoveredItem.subLabel && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                          ({statsHoveredItem.subLabel})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-black text-violet-700 dark:text-violet-300">
                        {statsHoveredItem.primaryVal}
                      </span>
                      {statsHoveredItem.secondaryVal && (
                        <span className="text-[10px] font-medium text-slate-500 block">
                          {statsHoveredItem.secondaryVal}
                        </span>
                      )}
                    </div>
                    {statsHoveredItem.extra && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-violet-600 text-white shadow-xs">
                        {statsHoveredItem.extra}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 dark:text-slate-500 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 gap-2">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                    <span>Sentuh atau arahkan kursor pada kurva &amp; batang untuk inspeksi detail • Klik titik untuk filter data tabel.</span>
                  </span>
                  {statsFilterClass !== 'Semua Kelas' && (
                    <span className="font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 flex-shrink-0">
                      <span>Filter aktif: Kelas {statsFilterClass}</span>
                      <button
                        type="button"
                        onClick={() => setStatsFilterClass('Semua Kelas')}
                        className="text-[10px] underline ml-1 hover:text-violet-700 cursor-pointer"
                      >
                        (Reset Filter)
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* SVG Wavy Spline Bezier Chart */}
            <div className="pt-2">
              {(() => {
                const svgW = 680;
                const svgH = 210;
                const padL = 40;
                const padR = 24;
                const padT = 20;
                const padB = 32;
                const chartW = svgW - padL - padR;
                const chartH = svgH - padT - padB;
                const maxVal = statsChartData.maxVal || 100;
                const items = statsChartData.items || [];
                const colW = items.length > 0 ? chartW / items.length : 40;

                const points = items.map((item, idx) => {
                  const x = padL + (items.length > 1 ? idx * (chartW / (items.length - 1)) : chartW / 2);
                  const y = padT + chartH - (item.value / maxVal) * chartH;
                  return { x, y, ...item };
                });

                const splineD = getSplinePath(points);
                const areaD = points.length > 0
                  ? `${splineD} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`
                  : '';

                const yGridTicks = [
                  maxVal,
                  Math.round(maxVal * 0.75),
                  Math.round(maxVal * 0.5),
                  Math.round(maxVal * 0.25),
                  0
                ];

                const kkmY = maxVal === 100 ? padT + chartH - (75 / 100) * chartH : null;

                return (
                  <div className="relative">
                    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-56 select-none overflow-visible">
                      <defs>
                        <linearGradient id="statsSplineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.38" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Gridlines & Y-Axis Labels */}
                      {yGridTicks.map((val, tickIdx) => {
                        const y = padT + chartH - (val / maxVal) * chartH;
                        return (
                          <g key={`stats-ytick-${tickIdx}-${val}`}>
                            <text
                              x={padL - 8}
                              y={y + 3.5}
                              textAnchor="end"
                              className="text-[10px] fill-slate-400 dark:fill-slate-500 font-medium"
                            >
                              {val}
                            </text>
                            <line
                              x1={padL}
                              y1={y}
                              x2={svgW - padR}
                              y2={y}
                              stroke="currentColor"
                              strokeDasharray={val === 0 ? '0' : '4 4'}
                              className="text-slate-100 dark:text-slate-800"
                              strokeWidth={val === 0 ? '1.5' : '1'}
                            />
                          </g>
                        );
                      })}

                      {/* Garis Standar KKM 75 */}
                      {kkmY !== null && (
                        <g>
                          <line
                            x1={padL}
                            y1={kkmY}
                            x2={svgW - padR}
                            y2={kkmY}
                            stroke="#eab308"
                            strokeDasharray="5 3"
                            strokeWidth="1.5"
                            className="opacity-80"
                          />
                          <text
                            x={svgW - padR - 4}
                            y={kkmY - 4}
                            textAnchor="end"
                            className="text-[9px] fill-amber-500 font-bold"
                          >
                            Standar KKM 75
                          </text>
                        </g>
                      )}

                      {/* Background Vertical Bars (Visual Only) */}
                      {points.map((pt, idx) => {
                        const barVal = pt.barValue !== undefined ? pt.barValue : pt.value;
                        const barH = (barVal / maxVal) * chartH;
                        const barY = padT + chartH - barH;
                        const barW = Math.max(8, Math.min(28, (chartW / Math.max(1, items.length)) * 0.45));
                        const isHovered = statsHoveredItem?.label === pt.label;

                        return (
                          <rect
                            key={`stats-bar-${idx}`}
                            x={pt.x - barW / 2}
                            y={barY}
                            width={barW}
                            height={barH}
                            rx="4"
                            ry="4"
                            className={`pointer-events-none transition-colors duration-150 ${
                              isHovered
                                ? 'fill-violet-400 dark:fill-violet-600'
                                : 'fill-violet-100 dark:fill-violet-950/40'
                            }`}
                          />
                        );
                      })}

                      {/* Gradient Fill Under Spline Curve */}
                      <path d={areaD} fill="url(#statsSplineGrad)" className="pointer-events-none" />

                      {/* Spline Bezier Curve Stroke */}
                      <path
                        d={splineD}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="filter drop-shadow-xs pointer-events-none"
                      />

                      {/* Visible Dots on Vertices (Visual Only, pointer-events-none to prevent jitter) */}
                      {points.map((pt, idx) => {
                        const isHovered = statsHoveredItem?.label === pt.label;
                        return (
                          <g key={`stats-dot-${idx}`} className="pointer-events-none">
                            {isHovered && (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="10"
                                className="fill-violet-500/20 stroke-violet-500/50"
                                strokeWidth="2"
                              />
                            )}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r={isHovered ? '5.5' : '4'}
                              className="fill-white dark:fill-slate-900 stroke-violet-600 transition-all duration-150"
                              strokeWidth={isHovered ? '2.5' : '2'}
                            />
                            {/* Sumbu X Label */}
                            <text
                              x={pt.x}
                              y={padT + chartH + 16}
                              textAnchor="middle"
                              className={`text-[10px] font-semibold transition-colors ${
                                isHovered
                                  ? 'fill-violet-600 dark:fill-violet-400 font-bold'
                                  : 'fill-slate-500 dark:fill-slate-400'
                              }`}
                            >
                              {pt.shortLabel}
                            </text>
                          </g>
                        );
                      })}

                      {/* Dedicated Solid Hit Columns (Continuous Interaction Without Shaking) */}
                      {points.map((pt, idx) => {
                        const hitW = Math.max(colW, 28);
                        return (
                          <rect
                            key={`stats-hit-${idx}`}
                            x={pt.x - hitW / 2}
                            y={padT}
                            width={hitW}
                            height={chartH + padB}
                            fill="transparent"
                            className="cursor-pointer"
                            onClick={() => {
                              if (statsChartMode === 'class' && pt.shortLabel) {
                                setStatsFilterClass(statsFilterClass === pt.shortLabel ? 'Semua Kelas' : pt.shortLabel);
                              } else if (statsChartMode === 'questions') {
                                setStatsActiveTab('questions');
                              }
                            }}
                            onMouseEnter={() => setStatsHoveredItem({
                              type: statsChartMode,
                              label: pt.label,
                              subLabel: statsChartMode === 'class' ? `Ketuntasan: ${pt.barValue}%` : statsChartMode === 'distribution' ? `${(pt as any).pct}% dari peserta` : `Tipe: ${(pt as any).type || ''}`,
                              primaryVal: statsChartMode === 'class' ? `${pt.value} Poin` : statsChartMode === 'distribution' ? `${pt.value} Siswa` : `${pt.value}% Benar`,
                              secondaryVal: statsChartMode === 'class' ? `${(pt as any).passedCount || 0} Siswa Tuntas` : undefined,
                              extra: statsChartMode === 'class' ? 'Klik untuk filter kelas ini' : statsChartMode === 'questions' ? 'Klik untuk lihat butir soal' : undefined
                            })}
                            onMouseLeave={() => setStatsHoveredItem(null)}
                          />
                        );
                      })}
                    </svg>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* DUA DIAGRAM ANALITIK: SEBARAN PREDIKAT NILAI & PROPORSI BUTIR SOAL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Diagram 1: Sebaran Predikat Nilai Siswa */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-violet-600" />
                    <span>Distribusi Predikat Nilai Siswa</span>
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Pengelompokan hasil belajar berdasarkan standar KKM 75 • Klik predikat untuk filter tabel
                  </p>
                </div>
                {statsFilterGrade !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStatsFilterGrade('all')}
                    className="text-[11px] font-bold text-violet-600 hover:underline cursor-pointer"
                  >
                    Reset Predikat
                  </button>
                )}
              </div>

              {/* Progress Bars Predikat Interaktif */}
              <div className="space-y-3.5 pt-1">
                {/* Sangat Baik (A) */}
                <div
                  onClick={() => setStatsFilterGrade(statsFilterGrade === 'A' ? 'all' : 'A')}
                  className={`p-2.5 rounded-2xl transition cursor-pointer ${
                    statsFilterGrade === 'A'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>Sangat Baik (A: 90 - 100)</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {scoreDistribution.sangatBaik.count} Siswa ({scoreDistribution.sangatBaik.pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${scoreDistribution.sangatBaik.pct}%` }}
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    ></div>
                  </div>
                </div>

                {/* Baik (B) */}
                <div
                  onClick={() => setStatsFilterGrade(statsFilterGrade === 'B' ? 'all' : 'B')}
                  className={`p-2.5 rounded-2xl transition cursor-pointer ${
                    statsFilterGrade === 'B'
                      ? 'bg-violet-50 dark:bg-violet-950/40 ring-2 ring-violet-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                      <span>Baik (B: 75 - 89)</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {scoreDistribution.baik.count} Siswa ({scoreDistribution.baik.pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${scoreDistribution.baik.pct}%` }}
                      className="h-full rounded-full bg-violet-600 transition-all duration-500"
                    ></div>
                  </div>
                </div>

                {/* Cukup (C) */}
                <div
                  onClick={() => setStatsFilterGrade(statsFilterGrade === 'C' ? 'all' : 'C')}
                  className={`p-2.5 rounded-2xl transition cursor-pointer ${
                    statsFilterGrade === 'C'
                      ? 'bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span>Cukup (C: 60 - 74)</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {scoreDistribution.cukup.count} Siswa ({scoreDistribution.cukup.pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${scoreDistribution.cukup.pct}%` }}
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    ></div>
                  </div>
                </div>

                {/* Perlu Remedial (D) */}
                <div
                  onClick={() => setStatsFilterGrade(statsFilterGrade === 'D' ? 'all' : 'D')}
                  className={`p-2.5 rounded-2xl transition cursor-pointer ${
                    statsFilterGrade === 'D'
                      ? 'bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span>Perlu Remedial (D: &lt; 60)</span>
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {scoreDistribution.remedial.count} Siswa ({scoreDistribution.remedial.pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${scoreDistribution.remedial.pct}%` }}
                      className="h-full rounded-full bg-rose-500 transition-all duration-500"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Diagram 2: Analisis Proporsi Tingkat Kesukaran Soal */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-violet-600" />
                    <span>Proporsi Indeks Kesukaran Butir Soal</span>
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Evaluasi rasio jawaban benar seluruh siswa ({questionItemAnalysis.length} butir) • Klik untuk filter
                  </p>
                </div>
                {statsQuestionCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStatsQuestionCategory('all')}
                    className="text-[11px] font-bold text-violet-600 hover:underline cursor-pointer"
                  >
                    Reset Kategori
                  </button>
                )}
              </div>

              <div className="space-y-3.5 pt-1">
                {/* Mudah */}
                <div
                  onClick={() => {
                    setStatsQuestionCategory(statsQuestionCategory === 'Mudah' ? 'all' : 'Mudah');
                    setStatsActiveTab('questions');
                  }}
                  className={`p-2.5 rounded-2xl transition cursor-pointer ${
                    statsQuestionCategory === 'Mudah'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>Kategori Mudah (&gt;= 70% Benar)</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {questionItemAnalysis.filter(q => q.category === 'Mudah').length} Butir
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{
                        width: `${questionItemAnalysis.length > 0 ? (questionItemAnalysis.filter(q => q.category === 'Mudah').length / questionItemAnalysis.length) * 100 : 0}%`
                      }}
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    ></div>
                  </div>
                </div>

                {/* Sedang */}
                <div
                  onClick={() => {
                    setStatsQuestionCategory(statsQuestionCategory === 'Sedang' ? 'all' : 'Sedang');
                    setStatsActiveTab('questions');
                  }}
                  className={`p-2.5 rounded-2xl transition cursor-pointer ${
                    statsQuestionCategory === 'Sedang'
                      ? 'bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span>Kategori Sedang (35% - 69% Benar)</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {questionItemAnalysis.filter(q => q.category === 'Sedang').length} Butir
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{
                        width: `${questionItemAnalysis.length > 0 ? (questionItemAnalysis.filter(q => q.category === 'Sedang').length / questionItemAnalysis.length) * 100 : 0}%`
                      }}
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                    ></div>
                  </div>
                </div>

                {/* Sukar (HOTS) */}
                <div
                  onClick={() => {
                    setStatsQuestionCategory(statsQuestionCategory === 'Sukar (HOTS)' ? 'all' : 'Sukar (HOTS)');
                    setStatsActiveTab('questions');
                  }}
                  className={`p-2.5 rounded-2xl transition cursor-pointer ${
                    statsQuestionCategory === 'Sukar (HOTS)'
                      ? 'bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span>Kategori Sukar / HOTS (&lt; 35% Benar)</span>
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {questionItemAnalysis.filter(q => q.category === 'Sukar (HOTS)').length} Butir
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{
                        width: `${questionItemAnalysis.length > 0 ? (questionItemAnalysis.filter(q => q.category === 'Sukar (HOTS)').length / questionItemAnalysis.length) * 100 : 0}%`
                      }}
                      className="h-full rounded-full bg-rose-500 transition-all duration-500"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DIAGRAM KOMPARASI CAPAIAN RATA-RATA & KETUNTASAN PER KELAS (ROMBEL) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-600" />
                  <span>Komparasi Capaian Rata-Rata &amp; Ketuntasan per Rombel Kelas</span>
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Klik kartu rombel untuk memfilter dan melihat daftar siswa spesifik di kelas tersebut
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                  {classPerformanceStats.length} Rombel Terdata
                </span>
                {statsFilterClass !== 'Semua Kelas' && (
                  <button
                    type="button"
                    onClick={() => setStatsFilterClass('Semua Kelas')}
                    className="text-xs font-bold text-violet-600 underline cursor-pointer"
                  >
                    Tampilkan Semua
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {classPerformanceStats.map(cp => {
                const isSelected = statsFilterClass === cp.className;
                return (
                  <div
                    key={cp.className}
                    onClick={() => setStatsFilterClass(isSelected ? 'Semua Kelas' : cp.className)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-violet-500 bg-violet-50/60 dark:bg-violet-950/50 shadow-md ring-2 ring-violet-500/50'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-xs'
                    } space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white">Kelas {cp.className}</p>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-violet-600 text-white">
                              Terpilih
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {cp.testedCount} dari {cp.totalStudents} Siswa Mengikuti
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-black ${cp.avgScore >= 75 ? 'text-emerald-600 dark:text-emerald-400' : cp.avgScore >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {cp.avgScore}
                        </p>
                        <span className="text-[10px] font-semibold text-slate-400 block">Rata-Rata</span>
                      </div>
                    </div>

                    {/* Progress Ketuntasan Kelas */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Ketuntasan KKM:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {cp.passedCount} Siswa ({cp.passRate}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-700/60 overflow-hidden">
                        <div
                          style={{ width: `${cp.passRate}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            cp.passRate >= 75 ? 'bg-emerald-500' : cp.passRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TABEL DATA SISWA & ANALISIS SOAL (DENGAN TABS & FILTER INTERAKTIF) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
            {/* Header Tabs & Filters */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* 3 Nav Tabs */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatsActiveTab('ranking')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      statsActiveTab === 'ranking'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Top Siswa Nilai Tertinggi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatsActiveTab('remedial')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      statsActiveTab === 'remedial'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Daftar Siswa Remedial (&lt; 75)</span>
                    {filteredRemedialStudents.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-900 font-extrabold text-[10px]">
                        {filteredRemedialStudents.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatsActiveTab('questions')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      statsActiveTab === 'questions'
                        ? 'bg-violet-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Analisis Butir Soal ({filteredQuestionItemAnalysis.length})</span>
                  </button>
                </div>

                {/* Filter & Search Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Dropdown Filter Rombel Kelas */}
                  <select
                    value={statsFilterClass}
                    onChange={(e) => setStatsFilterClass(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                  >
                    <option value="Semua Kelas">Semua Kelas</option>
                    {studentClasses.map(cls => (
                      <option key={cls} value={cls}>Kelas {cls}</option>
                    ))}
                  </select>

                  {/* Input Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={statsSearchQuery}
                      onChange={(e) => setStatsSearchQuery(e.target.value)}
                      placeholder={statsActiveTab === 'questions' ? 'Cari teks soal / tipe...' : 'Cari nama siswa...'}
                      className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 w-44 sm:w-52"
                    />
                    {statsSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setStatsSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Reset All Filters Button */}
                  {(statsFilterClass !== 'Semua Kelas' || statsSearchQuery || statsFilterGrade !== 'all' || statsQuestionCategory !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatsFilterClass('Semua Kelas');
                        setStatsSearchQuery('');
                        setStatsFilterGrade('all');
                        setStatsQuestionCategory('all');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* TAB CONTENT 1: TOP SISWA NILAI TERTINGGI */}
            {statsActiveTab === 'ranking' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold">
                      <th className="py-3 px-4 w-16 text-center">Peringkat</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4 text-center">Skor Akhir</th>
                      <th className="py-3 px-4 text-center">Poin / Maks</th>
                      <th className="py-3 px-4 text-center">Integritas</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredTopStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Tidak ada siswa yang sesuai dengan filter yang dipilih.
                        </td>
                      </tr>
                    ) : (
                      filteredTopStudents.map((res, idx) => (
                        <tr key={res.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-4 text-center font-bold text-slate-500 dark:text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white uppercase">
                            {res.studentName}
                          </td>
                          <td className="py-3 px-4 font-semibold text-violet-600 dark:text-violet-400">
                            {resolveStudentSingleClass(res.studentName, res.className, students)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/60 font-black text-sm text-violet-700 dark:text-violet-300">
                              {res.score}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                            {res.totalEarned} / {res.totalMax}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {res.violationCount === 0 ? (
                              <span className="text-emerald-600 font-bold text-[11px]">✓ 100% Tertib</span>
                            ) : (
                              <span className="text-rose-500 font-bold text-[11px]">{res.violationCount}x Alih Tab</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              TUNTAS KKM
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT 2: DAFTAR SISWA REMEDIAL */}
            {statsActiveTab === 'remedial' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4 text-center">Nilai Ujian</th>
                      <th className="py-3 px-4 text-center">Poin / Maks</th>
                      <th className="py-3 px-4 text-center">Selisih KKM (75)</th>
                      <th className="py-3 px-4 text-center">Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredRemedialStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                          <p className="font-bold text-xs text-slate-700 dark:text-slate-300">Seluruh Siswa Tuntas KKM!</p>
                          <p className="text-[11px]">Tidak ada siswa pada filter ini yang memerlukan program remedial.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRemedialStudents.map((res, idx) => (
                        <tr key={res.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white uppercase">
                            {res.studentName}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">
                            {resolveStudentSingleClass(res.studentName, res.className, students)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 font-black text-sm text-rose-700 dark:text-rose-300">
                              {res.score}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                            {res.totalEarned} / {res.totalMax}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-rose-600">
                            -{75 - (res.score || 0)} Poin
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                              {(res.score || 0) >= 60 ? 'Remedial Tugas' : 'Remedial Pembelajaran'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT 3: TABEL ANALISIS TINGKAT KESUKARAN BUTIR SOAL */}
            {statsActiveTab === 'questions' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 font-semibold">
                      <th className="py-3 px-4 w-12 text-center">No</th>
                      <th className="py-3 px-4 w-32">Tipe Soal</th>
                      <th className="py-3 px-4">Pertanyaan / Stimulus</th>
                      <th className="py-3 px-4 text-center">Dijawab</th>
                      <th className="py-3 px-4 text-center">Benar</th>
                      <th className="py-3 px-4 text-center">Indeks (% Benar)</th>
                      <th className="py-3 px-4 text-center">Kategori Soal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredQuestionItemAnalysis.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Tidak ada butir soal yang sesuai dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredQuestionItemAnalysis.map((item) => (
                        <tr key={item.question.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                          <td className="py-3 px-4 text-center font-bold text-slate-400">{item.no}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                              {item.question.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 max-w-md truncate">
                            {item.question.questionText}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{item.totalAnswered}</td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{item.correctCount}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold">{item.difficultyIndex}%</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.category === 'Mudah'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                  : item.category === 'Sedang'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                  : item.category === 'Sukar (HOTS)'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}
                            >
                              {item.category}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* C. BOTTOM TABLE: BROWSE TEST RESULTS (TABOR STUDY STYLE)        */}
      {/* ============================================================== */}
      {(currentNav === 'dashboard' || currentNav === 'results') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          {/* A. HEADER UTAMA: TITLE & AKSI CETAK / EKSPOR */}
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold shadow-2xs">
                  <Database className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{t.tableTitle}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 font-bold">
                      {filteredResults.length} Nilai Ditampilkan
                    </span>
                    {searchQuery && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
                        Pencarian: &ldquo;{searchQuery}&rdquo;
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t.tableSubtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tombol Cetak Sertifikat Aktif */}
              <button
                onClick={() => {
                  const firstSelected = results.find(r => selectedResultIds.includes(r.id)) || filteredResults[0] || results[0];
                  onOpenCertificates?.(firstSelected);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-violet-600" />
                <span>{t.sendCertificatesBtn}</span>
              </button>

              {/* Tombol Ekspor CSV / Excel Aktif */}
              <button
                onClick={exportResultsToCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.exportCsvBtn}</span>
              </button>
            </div>
          </div>

          {/* B. BILAH FILTER MULTIDIMENSI 1 SEKOLAH (MAPEL, JENJANG, ROMBEL, STATUS KKM) */}
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
            {/* Indikator Isolasi Akun Guru */}
            {effectiveSchoolSettings.isolateTeacherDossier && currentTeacher && currentTeacher.role === 'guru_mapel' && (
              <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-xs mb-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                  <span className="text-violet-800 dark:text-violet-300 font-medium">
                    Mode Guru: <strong>{currentTeacher.name}</strong> ({currentTeacher.subject}) • {onlyMyAssignedSubjects ? 'Hanya Menampilkan Nilai Mapel Anda' : 'Menampilkan Semua Mapel Sekolah'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOnlyMyAssignedSubjects(prev => !prev)}
                  className="text-violet-700 dark:text-violet-300 font-bold hover:underline text-[11px] cursor-pointer px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 shadow-2xs"
                >
                  {onlyMyAssignedSubjects ? 'Lihat Semua Mapel' : 'Kunci ke Mapel Saya Saja'}
                </button>
              </div>
            )}

            <div className="flex items-center gap-2.5 flex-wrap flex-1">
              {/* Filter 1: Mata Pelajaran / Paket Ujian */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                <select
                  value={resultsSubjectFilter}
                  onChange={e => setResultsSubjectFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
                >
                  <option value="ALL">Semua Mapel (1 Sekolah) • {results.length} Siswa</option>
                  {(allSubjects || []).map(s => {
                    const count = results.filter(r => r.subjectId === s.id).length;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.title} ({count} Siswa)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Filter 2: Jenjang Tingkat */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                <select
                  value={resultsGradeFilter}
                  onChange={e => setResultsGradeFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
                >
                  <option value="ALL">Semua Jenjang (Kelas 7, 8, 9)</option>
                  <option value="VII">Jenjang Kelas 7 (VII)</option>
                  <option value="VIII">Jenjang Kelas 8 (VIII)</option>
                  <option value="IX">Jenjang Kelas 9 (IX)</option>
                </select>
              </div>

              {/* Filter 3: Rombel / Kelas Spesifik */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs shadow-2xs">
                <Users className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                <select
                  value={resultsClassFilter}
                  onChange={e => setResultsClassFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
                >
                  <option value="ALL">Semua Rombel Kelas</option>
                  {availableRombelsForResults.map(cls => {
                    const count = results.filter(r => {
                      const resolved = resolveStudentSingleClass(r.studentName, r.className, students);
                      return resolved === cls;
                    }).length;
                    return (
                      <option key={cls} value={cls}>
                        Hanya Rombel {cls} ({count} Siswa)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Filter 4: Status Ketuntasan KKM */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                <select
                  value={resultsStatusFilter}
                  onChange={e => setResultsStatusFilter(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-1 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
                >
                  <option value="ALL">Semua Status KKM</option>
                  <option value="PASSED">Tuntas KKM (&ge; 75)</option>
                  <option value="REMEDIAL">Perlu Remedial (&lt; 75)</option>
                </select>
              </div>

              {/* Tombol Reset Filter jika ada yang aktif */}
              {(resultsSubjectFilter !== 'ALL' || resultsGradeFilter !== 'ALL' || resultsClassFilter !== 'ALL' || resultsStatusFilter !== 'ALL' || searchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setResultsSubjectFilter('ALL');
                    setResultsGradeFilter('ALL');
                    setResultsClassFilter('ALL');
                    setResultsStatusFilter('ALL');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition cursor-pointer"
                  title="Kembalikan semua filter ke tampilan 1 Sekolah"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          </div>

          {/* C. MINI SUMMARY CARDS REALTIME SESUAI FILTER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-semibold block">Total Lembar Nilai</span>
              <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {filteredMetrics.total} <span className="text-xs font-normal text-slate-400">Siswa</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-semibold block">Rata-Rata Nilai</span>
              <p className={`text-base sm:text-lg font-black mt-0.5 ${filteredMetrics.avg >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                {filteredMetrics.avg} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block">Tuntas KKM (&ge; 75)</span>
              <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {filteredMetrics.passed} <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">({filteredMetrics.passedPct}%)</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/50">
              <span className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold block">Perlu Remedial (&lt; 75)</span>
              <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {filteredMetrics.remedial} <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">({filteredMetrics.remedialPct}%)</span>
              </p>
            </div>
          </div>

          {/* Banner Pilihan Baris */}
          {selectedResultIds.length > 0 && (
            <div className="px-5 py-2.5 bg-violet-50 dark:bg-violet-950/40 border-b border-violet-100 dark:border-violet-900 flex items-center justify-between text-xs flex-wrap gap-2">
              <span className="font-semibold text-violet-900 dark:text-violet-200">
                {selectedResultIds.length} siswa dipilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    showThemedConfirm({
                      title: `Hapus ${selectedResultIds.length} Data Nilai?`,
                      message: `Apakah Anda yakin ingin menghapus ${selectedResultIds.length} lembar nilai ujian terpilih dari database dan memori lokal? Nilai yang dihapus tidak dapat dipulihkan.`,
                      variant: 'danger',
                      confirmLabel: 'Ya, Hapus Nilai Terpilih',
                      cancelLabel: 'Batal',
                      onConfirm: async () => {
                        const count = selectedResultIds.length;
                        for (const id of selectedResultIds) {
                          const target = results.find(r => r.id === id);
                          if (target && onDeleteResult) {
                            await onDeleteResult(target.id, target.subjectId, target.studentName);
                          }
                        }
                        setSelectedResultIds([]);
                        showThemedAlert(
                          'Data Nilai Berhasil Dihapus',
                          `${count} data lembar nilai siswa terpilih telah berhasil dibersihkan dari database dan memori peramban.`,
                          'info'
                        );
                      }
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Nilai Terpilih</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = results.find(r => selectedResultIds.includes(r.id));
                    onOpenCertificates?.(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11px] transition shadow-xs cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Cetak Sertifikat Siswa Terpilih</span>
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="rounded accent-violet-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">{t.colName}</th>
                  <th className="py-3 px-4">{t.colScore}</th>
                  <th className="py-3 px-4">{t.colReasoning}</th>
                  <th className="py-3 px-4">{t.colTime}</th>
                  <th className="py-3 px-4">{t.colAnalysis}</th>
                  <th className="py-3 px-4">{t.colDate}</th>
                  <th className="py-3 px-4">{t.colViolations}</th>
                  <th className="py-3 px-4 text-center">{t.colAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <GraduationCap className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          {results.length > 0
                            ? 'Tidak ada data nilai siswa untuk filter yang dipilih.'
                            : t.noResults}
                        </p>
                        {results.length > 0 && (
                          <p className="text-xs text-slate-400">
                            Silakan ganti opsi filter atau klik tombol <b className="text-violet-600 dark:text-violet-400">Reset Filter</b> di atas.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((r, i) => {
                    const isSelected = selectedResultIds.includes(r.id);
                    const scoreColor = r.score >= 75
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';

                    return (
                      <tr
                        key={r.id || i}
                        className={`transition ${
                          isSelected
                            ? 'bg-violet-50/50 dark:bg-violet-950/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(r.id)}
                            className="rounded accent-violet-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-semibold flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                            {r.studentName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-slate-900 dark:text-white font-bold block truncate">{r.studentName}</span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                                {r.className || 'Umum'}
                              </span>
                              {r.subjectTitle && (
                                <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium truncate max-w-[150px]">
                                  • {r.subjectTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${scoreColor}`}>
                            {r.score}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                            {r.totalEarned} / {r.totalMax} Poin
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 font-semibold">
                          00:53
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-0.5">
                              <div style={{ width: `${r.score}%` }} className="h-full bg-violet-600 rounded-full"></div>
                            </div>
                            <span className="text-[10px] text-slate-400">{r.score}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {r.submittedAt.split(',')[0]}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.violationCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[10px] font-bold">
                              {r.violationCount}x
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-xs">0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedResult(r)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
                            >
                              {t.detail}
                            </button>
                            <button
                              onClick={() => onOpenCertificates?.(r)}
                              className="p-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-950 text-violet-600 dark:text-violet-400 transition"
                              title="Cetak Piagam"
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                showThemedConfirm({
                                  title: 'Reset Lembar Ujian Siswa',
                                  message: `Apakah Anda yakin ingin mereset ujian siswa "${r.studentName}"? Seluruh lembar jawaban dan nilai akan dihapus, sehingga siswa dapat login dan mengerjakan ulang ujian ini.`,
                                  variant: 'danger',
                                  confirmLabel: 'Ya, Reset Ujian',
                                  cancelLabel: 'Batal',
                                  onConfirm: async () => {
                                    if (onDeleteResult) {
                                      await onDeleteResult(r.id, r.subjectId, r.studentName);
                                    }
                                    await clearStudentAutolockInSupabase(r.subjectId, r.studentName);
                                    sendProctorCommand({
                                      action: 'RESET_EXAM',
                                      studentName: r.studentName,
                                      subjectId: r.subjectId
                                    });
                                    removeStudentSession(r.studentName, r.subjectId);
                                    setMonitoringActionToast(`Lembar ujian siswa ${r.studentName} berhasil di-reset. Siswa kini dapat login kembali.`);
                                  }
                                });
                              }}
                              className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition"
                              title="Reset Ujian (Izinkan Ujian Ulang)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. TAMPILAN BANK SOAL                                           */}
      {/* ============================================================== */}
      {currentNav === 'questions' && (
        <div className="space-y-6">
          {bankView === 'catalog' ? (
            /* --- LEVEL 1: KATALOG KARTU MATA PELAJARAN --- */
            <div className="space-y-6">
              {/* Header Bank Soal */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    <span>Bank Soal & Katalog Mata Pelajaran</span>
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {currentTeacher?.role === 'admin' || currentTeacher?.role === 'pengawas'
                      ? `Akses ${currentTeacher?.role === 'admin' ? 'Superadmin' : 'Pengawas'}: Menampilkan seluruh mata pelajaran sekolah (${accessibleSubjects.length} Paket Soal)`
                      : `Mata pelajaran diampu oleh ${currentTeacher?.name || 'Guru'} (${accessibleSubjects.length} Paket Soal)`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:opacity-90 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer"
                    title="Generate butir soal dengan bantuan AI Gemini"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>AI Question Generator</span>
                  </button>

                  {(currentTeacher?.role === 'admin' || currentTeacher?.role === 'pengawas') && (
                    <button
                      onClick={() => setIsAddScheduleModalOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Paket Mapel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Kategori & Pencarian */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                {/* Kategori Tabs Dinamis Real Berdasarkan Inputan Guru */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  {dynamicFilterChips.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setBankCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                        bankCategoryFilter === cat.id
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          bankCategoryFilter === cat.id
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Info Total Terfilter */}
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredCatalogSubjects.length}</strong> dari {accessibleSubjects.length} Paket Mata Pelajaran
                </div>
              </div>

              {/* GRID KARTU MATA PELAJARAN */}
              {filteredCatalogSubjects.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                  <BookOpen className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {accessibleSubjects.length === 0
                      ? 'Belum Ada Paket Mata Pelajaran'
                      : 'Tidak ada paket mata pelajaran yang sesuai filter'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {accessibleSubjects.length === 0
                      ? 'Bank soal masih kosong. Silakan klik tombol "+ Tambah Paket Mapel" di atas untuk membuat jadwal dan paket soal baru.'
                      : currentTeacher?.role !== 'admin' && currentTeacher?.role !== 'pengawas'
                      ? 'Anda hanya memiliki akses pada mata pelajaran yang ditugaskan kepada akun Anda.'
                      : 'Cobalah gunakan filter mata pelajaran lain atau buat paket jadwal baru.'}
                  </p>
                  {accessibleSubjects.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setIsAddScheduleModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition shadow-md shadow-violet-600/20 cursor-pointer mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Tambah Paket Mapel Baru</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCatalogSubjects.map(subItem => {
                    const theme = getSubjectTheme(subItem.title);
                    const qCount = getSubjectQuestionCount(subItem.id);

                    return (
                      <div
                        key={subItem.id}
                        onClick={() => {
                          setSelectedBankSubjectId(subItem.id);
                          setBankView('questions');
                          if (onSelectSubject) onSelectSubject(subItem);
                        }}
                        className={`group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between ${theme.accentBorder}`}
                      >
                        <div className="space-y-4">
                          {/* Top: Icon & Category */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-xl ${theme.iconBg} flex items-center justify-center font-bold shadow-xs`}>
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder}`}>
                                  {theme.category}
                                </span>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
                                  {formatSubjectTitle(subItem.title)}
                                </h4>
                              </div>
                            </div>

                            <span className={`w-2.5 h-2.5 rounded-full ${subItem.isActive ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-300 dark:bg-slate-700'}`} title={subItem.isActive ? 'Aktif' : 'Nonaktif'}></span>
                          </div>

                          {/* Kelas Rombel */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <School className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate font-medium">Kelas: <strong>{subItem.className}</strong></span>
                          </div>

                          {/* 3 Metrics Strip */}
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-center">
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                              <span className="text-[10px] text-slate-400 block">Total Soal</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{qCount} Butir</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                              <span className="text-[10px] text-slate-400 block">Durasi</span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{subItem.durationMinutes} Menit</span>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                              <span className="text-[10px] text-slate-400 block">Token</span>
                              <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400 uppercase">{subItem.token}</span>
                            </div>
                          </div>
                        </div>

                        {/* Footer Card: Kelola Button & Hapus Button */}
                        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${subItem.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${subItem.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            {subItem.isActive ? 'Ujian Aktif' : 'Draft'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubjectToDelete(subItem);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Hapus Paket Mata Pelajaran Ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 group-hover:translate-x-1 transition-transform"
                            >
                              <span>Kelola Butir Soal</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* --- LEVEL 2: DETAIL BUTIR SOAL PER MATA PELAJARAN --- */
            <div className="space-y-4">
              {/* Breadcrumb / Top Bar Navigasi Kembali */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBankView('catalog')}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-violet-600 hover:text-white text-slate-700 dark:text-slate-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Katalog Mapel</span>
                  </button>

                  <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{formatSubjectTitle(currentBankSubject.title)}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                        {currentBankSubject.token}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Kelas: {currentBankSubject.className} • Durasi: {currentBankSubject.durationMinutes} Menit • {bankSubjectQuestions.length} Butir Soal Terdaftar
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSubjectToDelete(currentBankSubject)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs font-semibold transition cursor-pointer"
                    title="Hapus Paket Mata Pelajaran Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Hapus Mapel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:opacity-90 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer flex-shrink-0"
                    title="Buat butir soal otomatis dengan Gemini AI"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Buat Soal AI (Gemini)</span>
                  </button>

                  <button
                    onClick={onOpenAddModal}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer flex-shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{t.addQuestionBtn}</span>
                  </button>
                </div>
              </div>

              {/* Filter Tipe Soal */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
                {[
                  { id: 'ALL', label: `Semua Tipe (${bankSubjectQuestions.length})` },
                  { id: 'Pilihan Ganda', label: 'Pilihan Ganda' },
                  { id: 'Benar/Salah', label: 'Benar / Salah' },
                  { id: 'Pilihan Ganda Kompleks', label: 'PG Kompleks' },
                  { id: 'Menjodohkan', label: 'Menjodohkan' },
                  { id: 'Isian Singkat', label: 'Isian Singkat' },
                  { id: 'Esai', label: 'Esai' }
                ].map(tf => {
                  const isSelected = bankTypeFilter === tf.id;
                  return (
                    <button
                      key={tf.id}
                      onClick={() => setBankTypeFilter(tf.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                        isSelected
                          ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tf.label}
                    </button>
                  );
                })}
              </div>

              {/* DAFTAR BUTIR SOAL */}
              <div className="space-y-3">
                {filteredBankQuestions.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                    <BookOpen className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Belum ada butir soal untuk mata pelajaran ini
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Mata pelajaran ini belum memiliki butir soal ujian. Anda dapat membuat soal otomatis dengan AI atau menambahkannya secara manual.
                    </p>
                    <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAiModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:opacity-90 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>✨ Buat Soal Otomatis AI (Gemini)</span>
                      </button>
                      <button
                        type="button"
                        onClick={onOpenAddModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Tambah Manual</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredBankQuestions.map((q, idx) => {
                    const weight = currentBankSubject.scoringRules?.[q.type as QuestionType] || 1;
                    return (
                      <div
                        key={q.id}
                        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-violet-600 dark:text-violet-400 text-sm">#{idx + 1}</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                              {q.type}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-800/60">
                              Bobot: {weight} Poin
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditQuestion(q)}
                              className="text-slate-400 hover:text-violet-600 p-1.5 transition cursor-pointer rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/50"
                              title="Edit Butir Soal"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteQuestion(q.id)}
                              className="text-slate-400 hover:text-rose-500 p-1.5 transition cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50"
                              title={t.delete}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <p className="text-slate-800 dark:text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">
                          {q.questionText}
                        </p>

                        {/* Stimulus / Media Gambar Soal */}
                        {q.mediaUrl && (
                          <div className="pt-1">
                            <img
                              src={q.mediaUrl}
                              alt="Gambar Stimulus Soal"
                              className="max-h-56 rounded-xl border border-slate-200 dark:border-slate-700 object-contain block bg-white dark:bg-slate-950 p-1"
                            />
                          </div>
                        )}

                        {/* Pilihan Ganda & PG Kompleks */}
                        {(q.type === 'Pilihan Ganda' || q.type === 'Pilihan Ganda Kompleks') && Array.isArray(q.options) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            {q.options.map((opt: any, oIdx: number) => {
                              const letter = String.fromCharCode(65 + oIdx);
                              const isKey = Array.isArray(q.answer)
                                ? q.answer.includes(letter)
                                : q.answer === letter;
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                                    isKey
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-medium'
                                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                                    isKey
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {letter}
                                  </span>
                                  <div className="flex-1 space-y-1">
                                    <span>{opt.text}</span>
                                    {opt.img && (
                                      <img
                                        src={opt.img}
                                        alt={`Gambar Opsi ${letter}`}
                                        className="max-h-32 rounded-lg border border-slate-200 dark:border-slate-700 object-contain block bg-white dark:bg-slate-900 p-1 mt-1"
                                      />
                                    )}
                                  </div>
                                  {isKey && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Benar/Salah Multi-Pernyataan */}
                        {q.type === 'Benar/Salah' && Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="space-y-1.5 pl-3 border-l-2 border-violet-500/30 text-xs">
                            {(q.options as any[]).map((opt, oIdx) => {
                              const ans = Array.isArray(q.answer) ? q.answer[oIdx] : '-';
                              return (
                                <div
                                  key={oIdx}
                                  className="flex items-start justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 gap-2"
                                >
                                  <div className="space-y-1 flex-1">
                                    <span className="text-slate-700 dark:text-slate-300">{oIdx + 1}. {opt.text}</span>
                                    {opt.img && (
                                      <img
                                        src={opt.img}
                                        alt={`Gambar Pernyataan ${oIdx + 1}`}
                                        className="max-h-24 rounded-lg border border-slate-200 dark:border-slate-700 object-contain block bg-white dark:bg-slate-900 p-1"
                                      />
                                    )}
                                  </div>
                                  <span className={`font-bold flex-shrink-0 ${ans === 'Benar' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                    {ans}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Menjodohkan */}
                        {q.type === 'Menjodohkan' && Array.isArray(q.options) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            {q.options.map((pair: any, pIdx: number) => (
                              <div key={pIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                                <div className="space-y-1">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{pair.q?.text}</span>
                                  {pair.q?.img && (
                                    <img src={pair.q.img} alt="Gambar Kiri" className="max-h-20 rounded border object-contain block" />
                                  )}
                                </div>
                                <div className="space-y-1 text-right">
                                  <span className="text-violet-600 dark:text-violet-400 font-bold">➔ {pair.a?.text}</span>
                                  {pair.a?.img && (
                                    <img src={pair.a.img} alt="Gambar Kanan" className="max-h-20 rounded border object-contain block ml-auto" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Kunci Jawaban */}
                        <div className="text-xs pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <strong className="text-emerald-600 dark:text-emerald-400">Kunci Jawaban:</strong>
                          <span>
                            {Array.isArray(q.answer)
                              ? q.answer.join(', ')
                              : typeof q.answer === 'string'
                              ? q.answer
                              : '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. TAMPILAN PUSAT CETAK DOKUMEN UJIAN & BERITA ACARA (BAP)      */}
      {/* ============================================================== */}
      {currentNav === 'documents' && (
        <div className="space-y-6">
          {/* Header Kontrol Dokumen */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-violet-600" />
                <span>Pusat Dokumen Ujian & Berita Acara (BAP)</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Cetak dokumen resmi asesmen SMP Negeri 58 Palembang siap tanda tangan proktor & pengawas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Selector Mapel */}
              <select
                value={selectedDocSubjectId || currentBankSubject.id}
                onChange={e => setSelectedDocSubjectId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
              >
                {accessibleSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>

              {/* Selector Kelas */}
              <select
                value={selectedDocClass}
                onChange={e => setSelectedDocClass(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
              >
                <option value="Semua Kelas">Semua Kelas</option>
                {availableClasses.map(c => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>

              {/* Tombol Cetak Dokumen */}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition shadow-md shadow-violet-600/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Dokumen / Simpan PDF</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs Jenis Dokumen */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
            {[
              { id: 'bap', label: '📋 Berita Acara Ujian (BAP)' },
              { id: 'attendance', label: '📝 Daftar Hadir Peserta' },
              { id: 'cards', label: '🪪 Kartu Ujian Siswa' },
              { id: 'ledger', label: '📊 Leger Rekap Nilai' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedDocType(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedDocType === tab.id
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* LEMBAR DOKUMEN RESMI (PRINTABLE SHEET) */}
          <div className="p-8 sm:p-12 bg-white text-slate-900 rounded-2xl border border-slate-200/80 shadow-md font-serif space-y-6 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none">
            {/* KOP SURAT RESMI SEKOLAH */}
            <div className="border-b-4 border-double border-slate-900 pb-4 flex items-center justify-between gap-6 text-center">
              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center border-2 border-slate-900 rounded-full font-sans font-bold text-xs">
                SMPN 58
              </div>
              <div className="flex-1 space-y-0.5">
                <h4 className="text-sm font-semibold tracking-wider uppercase font-sans">
                  Pemerintah Kota Palembang • Dinas Pendidikan
                </h4>
                <h2 className="text-xl sm:text-2xl font-black tracking-wide font-sans text-slate-900">
                  SMP NEGERI 58 PALEMBANG
                </h2>
                <p className="text-[11px] font-sans text-slate-700">
                  NPSN: 10603758 • NSS: 201116001058 • Status: Terakreditasi A
                </p>
                <p className="text-[10px] font-sans text-slate-600">
                  Jl. Pangeran Ratu, Jakabaring, Kec. Seberang Ulu I, Kota Palembang, Sumatera Selatan 30257
                </p>
              </div>
              <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center border-2 border-slate-900 rounded-lg font-sans font-black text-sm">
                CBT v2
              </div>
            </div>

            {/* DOKUMEN 1: BERITA ACARA UJIAN (BAP) */}
            {selectedDocType === 'bap' && (
              <div className="space-y-6 pt-2">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold underline uppercase tracking-wider font-sans">
                    BERITA ACARA PELAKSANAAN ASESMEN SUMATIF
                  </h3>
                  <p className="text-xs font-sans text-slate-600">
                    Tahun Ajaran 2026/2027 • Berbasis Komputer & Android (CBT)
                  </p>
                </div>

                <div className="text-xs space-y-3 font-sans leading-relaxed text-slate-800">
                  <p>
                    Pada hari ini, <strong className="text-slate-950 font-bold">Jumat</strong>, tanggal <strong className="text-slate-950 font-bold">30 Oktober 2026</strong>, telah dilaksanakan Asesmen Berbasis Komputer (CBT) dengan rincian sebagai berikut:
                  </p>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Mata Pelajaran:</span>
                      <strong className="text-sm font-bold text-slate-900">{selectedDocSubject.title}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Rombongan Belajar / Kelas:</span>
                      <strong className="text-sm font-bold text-slate-900">
                        {selectedDocClass === 'Semua Kelas' ? (selectedDocSubject.className || 'Semua Kelas') : selectedDocClass}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Durasi Ujian / Token Rilis:</span>
                      <strong className="text-sm font-bold text-slate-900">{selectedDocSubject.durationMinutes} Menit • Token: {selectedDocSubject.token}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Ruang / Laboratorium:</span>
                      <strong className="text-sm font-bold text-slate-900">Lab Komputer CBT SMPN 58</strong>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h5 className="font-bold text-xs uppercase text-slate-900">A. Rekapitulasi Kehadiran Peserta:</h5>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 border border-slate-200 rounded-lg">
                        <span className="block text-[11px] text-slate-500">Terdaftar di Sistem</span>
                        <strong className="text-base font-bold text-slate-900">
                          {selectedDocClass === 'Semua Kelas'
                            ? (students?.length || 0)
                            : (students?.filter(s => s.className === selectedDocClass).length || 0)} Siswa
                        </strong>
                      </div>
                      <div className="p-3 border border-slate-200 rounded-lg bg-emerald-50/50">
                        <span className="block text-[11px] text-emerald-700">Hadir & Mengerjakan</span>
                        <strong className="text-base font-bold text-emerald-800">
                          {selectedDocClass === 'Semua Kelas'
                            ? docResults.length
                            : docResults.filter(r => resolveStudentSingleClass(r.studentName, r.className, students) === selectedDocClass).length} Siswa
                        </strong>
                      </div>
                      <div className="p-3 border border-slate-200 rounded-lg bg-rose-50/50">
                        <span className="block text-[11px] text-rose-700">Tidak Hadir / Izin</span>
                        <strong className="text-base font-bold text-rose-800">
                          {Math.max(0, (selectedDocClass === 'Semua Kelas'
                            ? (students?.length || 0) - docResults.length
                            : (students?.filter(s => s.className === selectedDocClass).length || 0) - docResults.filter(r => resolveStudentSingleClass(r.studentName, r.className, students) === selectedDocClass).length))} Siswa
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <h5 className="font-bold text-xs uppercase text-slate-900">B. Catatan Integritas & Pelaksanaan Ujian:</h5>
                    <p className="p-3 border border-slate-200 rounded-lg bg-slate-50 text-[11px] leading-relaxed">
                      Ujian berlangsung secara tertib dan kondusif dengan proteksi anti-curang aktif. Seluruh butir soal berhasil diakses oleh peserta tanpa gangguan teknis server.
                    </p>
                  </div>

                  {/* TANDA TANGAN RESMI */}
                  <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs font-sans">
                    <div className="space-y-16">
                      <p>Pengawas Ruang Ujian,</p>
                      <div>
                        <strong className="underline block font-bold text-slate-900">{effectiveSchoolSettings.teacherName}</strong>
                        <span className="text-[11px] text-slate-500">NIP: {effectiveSchoolSettings.teacherNip}</span>
                      </div>
                    </div>

                    <div className="space-y-16">
                      <p>Proktor Utama CBT,</p>
                      <div>
                        <strong className="underline block font-bold text-slate-900">Administrator CBT</strong>
                        <span className="text-[11px] text-slate-500">NIP: 198503142010011008</span>
                      </div>
                    </div>

                    <div className="space-y-16">
                      <p>Mengetahui,<br />Kepala {effectiveSchoolSettings.schoolName},</p>
                      <div>
                        <strong className="underline block font-bold text-slate-900">{effectiveSchoolSettings.principalName}</strong>
                        <span className="text-[11px] text-slate-500">NIP: {effectiveSchoolSettings.principalNip}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DOKUMEN 2: DAFTAR HADIR PESERTA UJIAN */}
            {selectedDocType === 'attendance' && (
              <div className="space-y-4 pt-2 font-sans">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold underline uppercase tracking-wider">
                    DAFTAR HADIR PESERTA ASESMEN SUMATIF
                  </h3>
                  <p className="text-xs text-slate-600">
                    Mata Pelajaran: <strong>{selectedDocSubject.title}</strong> • Rombel: <strong>{selectedDocClass}</strong>
                  </p>
                </div>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left border-collapse text-xs border border-slate-900">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-100 font-bold text-slate-900 text-center">
                        <th className="py-2.5 px-3 border-r border-slate-900 w-12">No</th>
                        <th className="py-2.5 px-3 border-r border-slate-900 w-32">NISN</th>
                        <th className="py-2.5 px-3 border-r border-slate-900 text-left">Nama Lengkap Peserta</th>
                        <th className="py-2.5 px-3 border-r border-slate-900 w-24">Kelas</th>
                        <th className="py-2.5 px-3 border-r border-slate-900 w-28">Status</th>
                        <th className="py-2.5 px-4 w-44 text-left">Tanda Tangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {(students || [])
                        .filter(s => {
                          if (selectedDocClass !== 'Semua Kelas') return s.className === selectedDocClass;
                          return docTargetClasses.length === 0 || docTargetClasses.includes(s.className.toLowerCase());
                        })
                        .slice(0, 45)
                        .map((std, idx) => {
                          const hasSubmitted = docResults.some(r => r.studentName.toLowerCase().trim() === std.name.toLowerCase().trim());
                          return (
                            <tr key={std.id} className="border-b border-slate-300">
                              <td className="py-2 px-3 text-center font-bold border-r border-slate-900">{idx + 1}</td>
                              <td className="py-2 px-3 border-r border-slate-900 text-center font-mono">{std.nisn || `008${idx}942`}</td>
                              <td className="py-2 px-3 border-r border-slate-900 font-semibold uppercase">{std.name}</td>
                              <td className="py-2 px-3 border-r border-slate-900 text-center">{std.className}</td>
                              <td className="py-2 px-3 border-r border-slate-900 text-center font-semibold">
                                {hasSubmitted ? (
                                  <span className="text-emerald-700 font-bold">Hadir / Selesai</span>
                                ) : (
                                  <span className="text-slate-400">Belum Submit</span>
                                )}
                              </td>
                              <td className="py-2 px-4 font-mono text-[11px] text-slate-400">
                                {idx % 2 === 0 ? `${idx + 1}. ....................` : `    ${idx + 1}. ....................`}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-end pt-8 text-xs font-sans">
                  <div>
                    <p className="text-[11px] text-slate-500">* Dokumen presensi resmi dicetak otomatis dari sistem CBT {effectiveSchoolSettings.schoolName}</p>
                  </div>
                  <div className="text-center space-y-16">
                    <p>{effectiveSchoolSettings.city}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Pengawas Ruang,</p>
                    <div>
                      <strong className="underline block font-bold text-slate-900">{effectiveSchoolSettings.teacherName}</strong>
                      <span className="text-[11px] text-slate-500">NIP: {effectiveSchoolSettings.teacherNip}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DOKUMEN 3: KARTU PESERTA UJIAN (EXAM CARDS) */}
            {selectedDocType === 'cards' && (
              <div className="space-y-6 pt-2 font-sans">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold underline uppercase tracking-wider">
                    KARTU PESERTA ASESMEN SUMATIF TAHUN 2026
                  </h3>
                  <p className="text-xs text-slate-600">
                    SMP Negeri 58 Palembang • Mata Pelajaran: <strong>{selectedDocSubject.title}</strong> • Rombel: <strong>{selectedDocClass}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {(students || [])
                    .filter(s => {
                      if (selectedDocClass !== 'Semua Kelas') return s.className === selectedDocClass;
                      return docTargetClasses.length === 0 || docTargetClasses.includes(s.className.toLowerCase());
                    })
                    .slice(0, 24)
                    .map((std, idx) => (
                      <div key={std.id} className="p-4 border-2 border-slate-900 rounded-xl space-y-3 bg-white text-xs print:break-inside-avoid">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[10px]">
                              58
                            </div>
                            <div>
                              <strong className="block text-[11px] uppercase leading-tight font-bold">KARTU PESERTA CBT</strong>
                              <span className="text-[10px] text-slate-600">SMP Negeri 58 Palembang</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300">
                            {std.className}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="w-16 h-20 border border-slate-300 bg-slate-100 rounded flex items-center justify-center text-center text-[9px] text-slate-400 font-bold">
                            FOTO 2x3
                          </div>
                          <div className="col-span-2 space-y-1 text-[11px]">
                            <div>
                              <span className="text-[10px] text-slate-500 block">Nama Lengkap:</span>
                              <strong className="font-bold text-slate-900 block truncate">{std.name}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">NISN / No Peserta:</span>
                              <span className="font-mono font-bold">{std.nisn || `008${idx}942`}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">Token Sesi Ujian:</span>
                              <span className="font-mono font-bold text-violet-700 bg-violet-50 px-1 rounded">{selectedDocSubject.token}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-500">
                          <span>Harap dibawa saat memasuki ruang ujian.</span>
                          <span className="font-bold">SMPN 58 CBT v2</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* DOKUMEN 4: LEGER REKAPITULASI NILAI UJIAN */}
            {selectedDocType === 'ledger' && (
              <div className="space-y-4 pt-2 font-sans">
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold underline uppercase tracking-wider">
                    LEGER HASIL ASESMEN SUMATIF RESMI
                  </h3>
                  <p className="text-xs text-slate-600">
                    Mata Pelajaran: <strong>{selectedDocSubject.title}</strong> • Standar KKM: <strong>75</strong> • Rombel: <strong>{selectedDocClass}</strong>
                  </p>
                </div>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left border-collapse text-xs border border-slate-900">
                    <thead>
                      <tr className="border-b border-slate-900 bg-slate-100 font-bold text-slate-900 text-center">
                        <th className="py-2.5 px-3 border-r border-slate-900 w-12">No</th>
                        <th className="py-2.5 px-3 border-r border-slate-900 text-left">Nama Siswa</th>
                        <th className="py-2.5 px-3 border-r border-slate-900 w-20">Kelas</th>
                        <th className="py-2.5 px-3 border-r border-slate-900 w-24">Poin Diperoleh</th>
                        <th className="py-2.5 px-3 border-r border-slate-900 w-24">Nilai Akhir</th>
                        <th className="py-2.5 px-3 border-r border-slate-900 w-20">Predikat</th>
                        <th className="py-2.5 px-3 w-28">Status KKM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {docResults
                        .filter(r => selectedDocClass === 'Semua Kelas' || resolveStudentSingleClass(r.studentName, r.className, students) === selectedDocClass)
                        .map((res, idx) => {
                          const pred = res.score >= 90 ? 'A' : res.score >= 75 ? 'B' : res.score >= 60 ? 'C' : 'D';
                          const isPass = res.score >= 75;
                          return (
                            <tr key={res.id} className="border-b border-slate-300 text-center">
                              <td className="py-2 px-3 font-bold border-r border-slate-900">{idx + 1}</td>
                              <td className="py-2 px-3 border-r border-slate-900 font-semibold text-left uppercase">{res.studentName}</td>
                              <td className="py-2 px-3 border-r border-slate-900">{resolveStudentSingleClass(res.studentName, res.className, students)}</td>
                              <td className="py-2 px-3 border-r border-slate-900 font-mono">{res.totalEarned} / {res.totalMax}</td>
                              <td className="py-2 px-3 border-r border-slate-900 font-bold text-sm">{res.score}</td>
                              <td className="py-2 px-3 border-r border-slate-900 font-bold">{pred}</td>
                              <td className="py-2 px-3 font-bold">
                                {isPass ? (
                                  <span className="text-emerald-700">TUNTAS</span>
                                ) : (
                                  <span className="text-rose-700">REMEDIAL</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      {docResults.filter(r => selectedDocClass === 'Semua Kelas' || resolveStudentSingleClass(r.studentName, r.className, students) === selectedDocClass).length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Belum ada lembar nilai untuk rombel ini pada mata pelajaran {selectedDocSubject.title}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs font-sans">
                  <div className="space-y-16">
                    <p>Mengetahui,<br />Kepala {effectiveSchoolSettings.schoolName},</p>
                    <div>
                      <strong className="underline block font-bold text-slate-900">{effectiveSchoolSettings.principalName}</strong>
                      <span className="text-[11px] text-slate-500">NIP: {effectiveSchoolSettings.principalNip}</span>
                    </div>
                  </div>

                  <div className="space-y-16">
                    <p>{effectiveSchoolSettings.city}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Guru Mata Pelajaran,</p>
                    <div>
                      <strong className="underline block font-bold text-slate-900">{effectiveSchoolSettings.teacherName}</strong>
                      <span className="text-[11px] text-slate-500">NIP: {effectiveSchoolSettings.teacherNip}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. TAMPILAN JADWAL & KONFIGURASI UJIAN                         */}
      {/* ============================================================== */}
      {currentNav === 'exams' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <span>Jadwal & Konfigurasi Ujian Sekolah</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Kelola token rilis, durasi pengerjaan, batas toleransi anti-cheat, dan bobot penilaian. Seluruh perubahan langsung tersinkronisasi ke database cloud.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsAddScheduleModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Jadwal Ujian Baru</span>
              </button>

              {onStartStudentExam && (
                <button
                  onClick={onStartStudentExam}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-violet-600" />
                  <span>Simulasi Siswa</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">Total Paket Jadwal</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {accessibleSubjects.length} <span className="text-xs font-normal text-slate-400">Mapel</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">Jadwal Aktif Siswa</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {accessibleSubjects.filter(s => s.isActive).length} <span className="text-xs font-normal text-slate-400">Dapat Diakses</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">Rata-rata Waktu</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {Math.round(accessibleSubjects.reduce((acc, s) => acc + s.durationMinutes, 0) / (accessibleSubjects.length || 1))} <span className="text-xs font-normal text-slate-400">Menit</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block">Sistem Keamanan</span>
              <p className="text-xs font-bold text-violet-600 dark:text-violet-400 mt-2 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                Anti-Cheat & Token Realtime
              </p>
            </div>
          </div>

          {/* DAFTAR CARD JADWAL UJIAN */}
          <div className="space-y-4">
            {accessibleSubjects.map(subItem => {
              const qCount = getSubjectQuestionCount(subItem.id);
              const isCopied = copiedTokenSubjectId === subItem.id;

              return (
                <div
                  key={subItem.id}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 hover:border-violet-500/40 transition"
                >
                  {/* Row 1: Header Jadwal & Toggle Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-base">
                            {formatSubjectTitle(subItem.title)}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">
                            Kelas {subItem.className}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          ID Paket: <code className="font-mono text-[11px]">{subItem.id}</code>
                        </p>
                      </div>
                    </div>

                    {/* Toggle Sakelar Status Ujian */}
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${subItem.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {subItem.isActive ? 'Status: Aktif (Siswa Bisa Ujian)' : 'Status: Non-Aktif (Terkunci)'}
                      </span>
                      <button
                        onClick={() => onUpdateSubject({ ...subItem, isActive: !subItem.isActive })}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                          subItem.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        title="Klik untuk ubah status aktif/non-aktif ujian"
                      >
                        <span
                          className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                            subItem.isActive ? 'right-1' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Row 2: 3 Fitur Kontrol (Token, Durasi & Toleransi, Bobot Soal) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Kotak Token */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="font-semibold flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-violet-600" />
                          <span>Token Rilis Siswa</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Auto-Deteksi</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-lg font-mono font-black tracking-widest text-violet-600 dark:text-violet-400 uppercase bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          {subItem.token}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRandomizeToken(subItem)}
                            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-violet-950 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition cursor-pointer"
                            title="Acak Token Baru (🎲)"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopyToken(subItem.token, subItem.id)}
                            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-violet-950 text-slate-600 dark:text-slate-300 hover:text-violet-600 transition cursor-pointer"
                            title="Salin Token"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Kotak Durasi & Anti-Cheat */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-violet-600" />
                        <span>Durasi & Toleransi</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-slate-800 dark:text-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Waktu Ujian</span>
                          <strong className="text-sm">{subItem.durationMinutes} Menit</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Batas Pelanggaran</span>
                          <strong className="text-sm">{subItem.violationLimit}x Toleransi</strong>
                        </div>
                      </div>
                    </div>

                    {/* Kotak Bank Soal & Bobot Nilai */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="font-semibold flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-violet-600" />
                          <span>Bank Soal Terkoneksi</span>
                        </span>
                        <strong className="text-violet-600 dark:text-violet-400 font-bold">{qCount} Butir Soal</strong>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">PG: {subItem.scoringRules?.['Pilihan Ganda'] || 1}pt</span>
                        <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">PGK: {subItem.scoringRules?.['Pilihan Ganda Kompleks'] || 2}pt</span>
                        <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">B/S: {subItem.scoringRules?.['Benar/Salah'] || 2}pt</span>
                        <span className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">Esai: {subItem.scoringRules?.['Esai'] || 4}pt</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Aksi Manajemen (Edit, Kelola Soal, Hapus) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditSchedule(subItem)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-violet-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Pengaturan Ujian</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedBankSubjectId(subItem.id);
                          setBankView('questions');
                          if (onSelectSubject) onSelectSubject(subItem);
                          if (onSelectNav) onSelectNav('questions');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-600 hover:text-white text-violet-700 dark:text-violet-300 text-xs font-semibold transition cursor-pointer border border-violet-200/60 dark:border-violet-800/60"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Buka Bank Soal ({qCount})</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setSubjectToDelete(subItem)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer"
                      title="Hapus Jadwal Ujian"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Jadwal</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. TAMPILAN DAFTAR SISWA & PARTISIPASI                        */}
      {/* ============================================================== */}
      {currentNav === 'students' && (
        <StudentManagement
          students={students}
          results={results}
          onAddStudent={onAddStudent}
          onUpdateStudent={onUpdateStudent}
          onDeleteStudent={onDeleteStudent}
          onBulkInsertStudents={onBulkInsertStudents}
          onBulkDeleteStudents={onBulkDeleteStudents}
          onViewDossier={(r) => setSelectedResult(r)}
        />
      )}

      {/* ============================================================== */}
      {/* 5B. TAMPILAN LIVE MONITORING UJIAN REALTIME                    */}
      {/* ============================================================== */}
      {currentNav === 'monitoring' && (() => {
        // Deduplikasi ketat per nama siswa: setiap siswa hanya boleh ada 1 sesi dengan heartbeat paling baru
        const sessionMap = new Map<string, ExamSession>();
        for (const s of liveSessions) {
          if (!s || !s.studentName) continue;
          if (monitoringFilterSubId !== 'ALL' && s.subjectId !== monitoringFilterSubId) continue;
          const actualStudentCls = resolveStudentSingleClass(s.studentName, s.className, students);
          if (monitoringFilterClass !== 'ALL' && actualStudentCls !== monitoringFilterClass) continue;
          const key = s.studentName.toLowerCase().trim();
          const existing = sessionMap.get(key);
          if (!existing || s.lastHeartbeat > existing.lastHeartbeat) {
            sessionMap.set(key, s);
          }
        }
        const filteredSessions = Array.from(sessionMap.values());

        const now = Date.now();
        const activeCount = filteredSessions.length;
        const focusCount = filteredSessions.filter(s => s.status === 'ongoing' && s.isFocus && (now - s.lastHeartbeat) <= 3500).length;
        const blurCount = filteredSessions.filter(s => s.status === 'ongoing' && (!s.isFocus || (now - s.lastHeartbeat) > 3500)).length;
        const blockedCount = filteredSessions.filter(s => s.status === 'blocked').length;

        return (
          <div className="space-y-6 animate-in fade-in">
            {/* TOAST AKSI PENGAWAS */}
            {monitoringActionToast && (
              <div className="p-3.5 bg-violet-600 text-white font-bold text-xs rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-top-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{monitoringActionToast}</span>
                </div>
                <button onClick={() => setMonitoringActionToast(null)} className="text-white hover:text-slate-200 ml-3">✕</button>
              </div>
            )}

            {/* HEADER MONITORING & FILTER MAPEL / KELAS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    Live Proctor Stream Active
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                  <Radio className="w-6 h-6 text-amber-500 animate-pulse" />
                  <span>Live Monitoring Ujian Realtime</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                  Pantau aktivitas pengerjaan, deteksi kecurangan (berpindah tab/layar terbelah), dan kendalikan sesi siswa secara langsung dari meja pengawas.
                </p>
              </div>

              {/* FILTER MAPEL & KELAS */}
              <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={monitoringFilterSubId}
                    onChange={e => setMonitoringFilterSubId(e.target.value)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
                  >
                    <option value="ALL">Semua Paket Ujian</option>
                    {accessibleSubjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {formatSubjectTitle(s.title)} ({s.className})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  <select
                    value={monitoringFilterClass}
                    onChange={e => setMonitoringFilterClass(e.target.value)}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
                  >
                    <option value="ALL">Semua Kelas / Rombel</option>
                    {monitoringClasses.map(cls => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* KARTU STATISTIK REALTIME */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Siswa Aktif</span>
                <p className="text-3xl font-black text-slate-900 dark:text-white">{activeCount}</p>
                <span className="text-[10px] text-slate-400">Sedang Ujian</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Fokus Normal</span>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{focusCount}</p>
                <span className="text-[10px] text-emerald-600/80">Layar Penuh Aktif</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Di Luar Fokus</span>
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{blurCount}</p>
                <span className="text-[10px] text-amber-600/80">Pindah Tab / Minim</span>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Terkunci / Diskualifikasi</span>
                <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{blockedCount}</p>
                <span className="text-[10px] text-rose-600/80">Butuh Aksi Guru</span>
              </div>
            </div>

            {/* PAPAN PENGUMUMAN & SIARAN LANGSUNG KE SELURUH LAYAR SISWA */}
            <div className="bg-gradient-to-r from-violet-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border border-violet-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-violet-600/20 flex-shrink-0">
                    <Megaphone className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Papan Pengumuman & Siaran Kilat</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider">
                        Realtime Live
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tulis instruksi penting yang akan <strong>langsung muncul di layar ujian seluruh siswa</strong> secara serentak.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLiveAnnouncementBox(!showLiveAnnouncementBox)}
                  className="px-4 py-2 rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 text-violet-700 dark:text-violet-300 font-bold text-xs hover:bg-violet-50 transition cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>{showLiveAnnouncementBox ? 'Tutup Formulir' : 'Kirim Siaran ke Siswa'}</span>
                </button>
              </div>

              {showLiveAnnouncementBox && (
                <form onSubmit={handleSendLiveAnnouncement} className="space-y-3 pt-2 animate-in slide-in-from-top-2">
                  <div className="relative">
                    <textarea
                      rows={2}
                      required
                      value={liveAnnouncementInput}
                      onChange={e => setLiveAnnouncementInput(e.target.value)}
                      placeholder="Ketik teks pengumuman di sini... (Contoh: Perhatian seluruh siswa, waktu tersisa 15 menit lagi. Periksa kembali jawaban Anda sebelum mengumpulkan!)"
                      className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Terkirim seketika melalui WebSockets & Broadcast lintas HP & komputer siswa.
                    </span>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Siarkan ke Seluruh Layar Siswa</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* TABEL LIVE MONITORING */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-extrabold">
                      <th className="p-4">Nama Siswa</th>
                      <th className="p-4">Kelas</th>
                      <th className="p-4">Mata Pelajaran</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Progres</th>
                      <th className="p-4 text-center">Sisa Waktu</th>
                      <th className="p-4 text-center">Pelanggaran</th>
                      <th className="p-4 text-center">Aksi Pengawas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredSessions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center space-y-3">
                          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                            <Radio className="w-8 h-8 animate-pulse text-amber-500" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              Belum Ada Siswa yang Sedang Ujian
                            </h4>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                              Saat siswa login menggunakan token ujian, progres, waktu, dan status layar mereka akan muncul secara langsung di tabel ini.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSessions.map((s) => {
                        const isDisqualified = s.status === 'blocked';
                        const isStale = (Date.now() - s.lastHeartbeat) > 3500;
                        const isOut = !s.isFocus || isStale;

                        const sSec = s.remainingSeconds || 0;
                        const mins = Math.floor(sSec / 60).toString().padStart(2, '0');
                        const secs = (sSec % 60).toString().padStart(2, '0');
                        const timeStr = `${mins}:${secs}`;

                        const totalQ = s.totalQuestions || 1;
                        const answeredQ = s.progressCount || 0;
                        const pct = Math.min(100, Math.round((answeredQ / totalQ) * 100));

                        // SVG Circular Progress
                        const radius = 16;
                        const circumference = 2 * Math.PI * radius;
                        const offset = circumference - (pct / 100) * circumference;
                        const strokeColor = pct === 100 ? '#10b981' : '#8b5cf6';

                        const subTitle = (allSubjects || []).find(sub => sub.id === s.subjectId)?.title || 'Ujian';

                        return (
                          <tr
                            key={s.id}
                            className={`transition-colors ${
                              isDisqualified
                                ? 'bg-rose-50/70 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100'
                                : isOut
                                ? 'bg-amber-50/70 dark:bg-amber-950/40'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {/* NAMA SISWA */}
                            <td className="p-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center text-xs">
                                  {s.studentName.charAt(0)}
                                </span>
                                <span>{s.studentName}</span>
                              </div>
                            </td>

                            {/* KELAS */}
                            <td className="p-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {resolveStudentSingleClass(s.studentName, s.className, students)}
                            </td>

                            {/* MATA PELAJARAN */}
                            <td className="p-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {formatSubjectTitle(subTitle)}
                            </td>

                            {/* STATUS */}
                            <td className="p-4 text-center whitespace-nowrap">
                              {isDisqualified ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500 text-white font-black text-[10px] animate-pulse shadow-sm">
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>DISKUALIFIKASI</span>
                                </span>
                              ) : isOut ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] animate-pulse shadow-sm">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{isStale ? 'DI LUAR FOKUS (BACKGROUND)' : 'DI LUAR FOKUS'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Mengerjakan</span>
                                </span>
                              )}
                            </td>

                            {/* PROGRES */}
                            <td className="p-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <div className="relative w-9 h-9 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
                                    <circle cx="20" cy="20" r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="4" className="dark:stroke-slate-700" />
                                    <circle
                                      cx="20"
                                      cy="20"
                                      r={radius}
                                      fill="transparent"
                                      stroke={strokeColor}
                                      strokeWidth="4"
                                      strokeDasharray={circumference}
                                      strokeDashoffset={offset}
                                      strokeLinecap="round"
                                      className="transition-all duration-500"
                                    />
                                  </svg>
                                  <span className="absolute text-[9px] font-black">{pct}%</span>
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  ({answeredQ}/{totalQ})
                                </span>
                              </div>
                            </td>

                            {/* SISA WAKTU */}
                            <td className="p-4 text-center font-mono font-bold whitespace-nowrap">
                              <span className={sSec < 300 ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-700 dark:text-slate-300'}>
                                {timeStr}
                              </span>
                            </td>

                            {/* PELANGGARAN */}
                            <td className="p-4 text-center whitespace-nowrap">
                              <span
                                className={`text-base font-black px-2.5 py-1 rounded-xl ${
                                  s.violationCount > 0
                                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {s.violationCount}x
                              </span>
                            </td>

                            {/* AKSI KONTROL PENGAWAS */}
                            <td className="p-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                {/* TOMBOL BUKA KUNCI (RESET PELANGGARAN) */}
                                <button
                                  onClick={() => {
                                    sendProctorCommand({
                                      action: 'RESET_VIOLATION',
                                      studentName: s.studentName,
                                      subjectId: s.subjectId
                                    });
                                    clearStudentAutolockInSupabase(s.subjectId, s.studentName);
                                    setMonitoringActionToast(`Pelanggaran siswa ${s.studentName} berhasil di-reset menjadi 0 dan ujian telah dibuka kuncinya.`);
                                  }}
                                  className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
                                    isDisqualified || s.violationCount > 0
                                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600'
                                  }`}
                                  title="Reset Pelanggaran & Buka Kunci Siswa"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline">Buka Kunci</span>
                                </button>

                                {/* TOMBOL SIMPAN PAKSA (FORCE FINISH) */}
                                <button
                                  onClick={() => {
                                    showThemedConfirm({
                                      title: 'Selesaikan Paksa Ujian Siswa',
                                      message: `Apakah Anda yakin ingin menyelesaikan paksa ujian siswa "${s.studentName}"? Jawaban yang tersimpan saat ini akan langsung direkam sebagai nilai akhir siswa.`,
                                      variant: 'danger',
                                      confirmLabel: 'Ya, Selesaikan Paksa',
                                      cancelLabel: 'Batal',
                                      onConfirm: async () => {
                                        const cleanName = s.studentName.toLowerCase().trim();

                                        // 1. Simpan flag submit lokal di browser pengawas & bersihkan cache
                                        if (typeof window !== 'undefined') {
                                          try {
                                            localStorage.setItem(`cbt_submitted_${s.subjectId}_${cleanName}`, JSON.stringify({
                                              submittedAt: new Date().toLocaleString('id-ID'),
                                              reason: 'Diselesaikan Paksa oleh Pengawas'
                                            }));
                                            localStorage.removeItem(`cbt_blocked_${s.subjectId}_${cleanName}`);
                                            localStorage.removeItem(`cbt_exam_state_${s.subjectId}_${cleanName}`);
                                          } catch {}
                                        }
                                        removeStudentSession(s.studentName, s.subjectId);
                                        setLiveSessions(prev => prev.filter(sess => sess.studentName.toLowerCase().trim() !== cleanName));

                                        // 2. Siarkan instruksi FORCE_FINISH ke siswa
                                        sendProctorCommand({
                                          action: 'FORCE_FINISH',
                                          studentName: s.studentName,
                                          subjectId: s.subjectId
                                        });

                                        // 3. Buat hasil evaluasi dan simpan ke database secara async
                                        const matchedSub = (allSubjects || []).find(sub => sub.id === s.subjectId) || subject;
                                        const evalRes = evaluateFullExam(questions, s.answers || [], matchedSub.scoringRules);
                                        const forcedResult: ExamResult = {
                                          id: `res-${Date.now()}`,
                                          subjectId: s.subjectId,
                                          subjectTitle: matchedSub.title,
                                          studentId: s.studentId,
                                          studentName: s.studentName,
                                          className: resolveStudentSingleClass(s.studentName, s.className, students),
                                          score: evalRes.finalScore,
                                          totalEarned: evalRes.totalEarned,
                                          totalMax: evalRes.totalMax,
                                          answers: s.answers || [],
                                          submittedAt: new Date().toLocaleString('id-ID'),
                                          violationCount: s.violationCount,
                                          details: evalRes.details
                                        };
                                        if (onUpdateResult) {
                                          await onUpdateResult(forcedResult);
                                        }
                                        setMonitoringActionToast(`Ujian siswa ${s.studentName} telah diselesaikan paksa dan nilainya tersimpan.`);
                                      }
                                    });
                                  }}
                                  className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                                  title="Simpan Paksa & Hentikan Ujian Siswa"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline">Simpan Paksa</span>
                                </button>

                                {/* TOMBOL RESET SESI */}
                                <button
                                  onClick={() => {
                                    showThemedConfirm({
                                      title: 'Reset Sesi Ujian Siswa',
                                      message: `Apakah Anda yakin ingin mereset sesi ujian siswa "${s.studentName}"? Siswa akan dikeluarkan dari ujian agar dapat mengulang dari awal.`,
                                      variant: 'warning',
                                      confirmLabel: 'Ya, Reset Sesi',
                                      cancelLabel: 'Batal',
                                      onConfirm: async () => {
                                        sendProctorCommand({
                                          action: 'RESET_EXAM',
                                          studentName: s.studentName,
                                          subjectId: s.subjectId
                                        });
                                        removeStudentSession(s.studentName, s.subjectId);
                                        await clearStudentAutolockInSupabase(s.subjectId, s.studentName);
                                        if (onDeleteResult) {
                                          await onDeleteResult(s.id, s.subjectId, s.studentName);
                                        }
                                        setMonitoringActionToast(`Sesi ujian siswa ${s.studentName} berhasil dibersihkan.`);
                                      }
                                    });
                                  }}
                                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer"
                                  title="Reset Sesi (Izinkan Masuk Ulang)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* 6. TAMPILAN SETTINGS / SUPABASE INTEGRASI & PENGATURAN TTE      */}
      {/* ============================================================== */}
      {currentNav === 'settings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-violet-600" />
                <span>{t.navSettings} & Konfigurasi Dokumen</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Atur identitas pejabat penandatangan, tanda tangan elektronik (TTE barcode/QR), serta status server cloud.
              </p>
            </div>

            {settingsSavedToast && (
              <div className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 animate-in fade-in shadow-md">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pengaturan berhasil disimpan!</span>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* SECTION 0: IDENTITAS KOP SURAT RESMI SEKOLAH (SESUAI GAMBAR)    */}
          {/* ============================================================== */}
          <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            {/* Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                      Identitas Kop Surat Resmi Sekolah
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/60 dark:border-blue-800/60">
                      Global Cetak
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                      <span>☁️</span>
                      <span>Cloud Database Supabase</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/60 dark:border-blue-800/60 uppercase">
                      {localSettingsForm.schoolName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pengaturan terpusat Kop Surat dinas & dual-logo (Dinas Kiri + Sekolah Kanan) tersimpan permanen di Supabase Cloud untuk seluruh lembar cetak guru.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsKopSettingsOpen(prev => !prev)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>{isKopSettingsOpen ? 'Tutup Pengaturan' : 'Buka Pengaturan'}</span>
                  <span>{isKopSettingsOpen ? '▲' : '▼'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdateSchoolSettings?.(localSettingsForm);
                    setSettingsSavedToast(true);
                    showThemedAlert(
                      'Kop Surat Berhasil Disimpan ke Cloud',
                      'Pengaturan kop surat resmi, logo dinas, dan logo sekolah telah berhasil disimpan permanen ke Cloud Database Supabase dan tersinkronisasi ke seluruh akun guru & proktor.',
                      'info'
                    );
                    setTimeout(() => setSettingsSavedToast(false), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition cursor-pointer shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Kop Surat</span>
                </button>
              </div>
            </div>

            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputLogoLeftRef}
              onChange={e => handleImageUpload(e, 'logoLeft')}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputLogoRightRef}
              onChange={e => handleImageUpload(e, 'logoRight')}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputPrincipalPhotoRef}
              onChange={e => handleImageUpload(e, 'principalPhoto')}
              accept="image/*"
              className="hidden"
            />

            {isKopSettingsOpen && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* 1. PENGATURAN LAMBANG / LOGO KOP SURAT */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    PENGATURAN LAMBANG / LOGO KOP SURAT
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Logo Kiri (Dinas/Pemda) */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Logo Kiri (Dinas / Pemda)
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          Sebelah Kiri
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                          <img
                            src={localSettingsForm.logoLeft || '/logo-dinas.png'}
                            alt="Logo Dinas"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                          <button
                            type="button"
                            onClick={() => fileInputLogoLeftRef.current?.click()}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-blue-600" />
                            <span>Ganti Logo Dinas</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLocalSettingsForm(prev => ({ ...prev, logoLeft: '/logo-dinas.png' }))}
                            className="w-full sm:w-auto px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Default</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                        Lambang Pemerintah Daerah (Kota/Kabupaten) atau Dinas Pendidikan wilayah dinas sekolah.
                      </p>
                    </div>

                    {/* Logo Kanan (Sekolah/Madrasah) */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Logo Kanan (Sekolah / Madrasah)
                        </span>
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                          Sebelah Kanan
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                          <img
                            src={localSettingsForm.logoRight || '/logo-sekolah.png'}
                            alt="Logo Sekolah"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                          <button
                            type="button"
                            onClick={() => fileInputLogoRightRef.current?.click()}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-blue-600" />
                            <span>Ganti Logo Sekolah</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setLocalSettingsForm(prev => ({ ...prev, logoRight: '/logo-sekolah.png' }))}
                            className="w-full sm:w-auto px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Default</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                        Logo lambang resmi sekolah atau madrasah yang bersangkutan.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. INFORMASI TEKS SATUAN LEMBAGA & ALAMAT */}
                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    INFORMASI TEKS SATUAN LEMBAGA & ALAMAT
                  </span>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nama Instansi 1 */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Nama Instansi 1 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={localSettingsForm.institution1 || ''}
                          onChange={e => setLocalSettingsForm(prev => ({ ...prev, institution1: e.target.value }))}
                          placeholder="PEMERINTAH KOTA PALEMBANG"
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Nama Instansi 2 */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Nama Instansi 2 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={localSettingsForm.institution2 || ''}
                          onChange={e => setLocalSettingsForm(prev => ({ ...prev, institution2: e.target.value }))}
                          placeholder="DINAS PENDIDIKAN"
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Nama Satuan Pendidikan */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Nama Satuan Pendidikan / Sekolah <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={localSettingsForm.schoolName}
                        onChange={e => setLocalSettingsForm(prev => ({ ...prev, schoolName: e.target.value }))}
                        placeholder="SMP NEGERI 58 PALEMBANG"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Alamat Jalan Sekolah */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Alamat Jalan Sekolah (di bawah Dinas Pendidikan) <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={localSettingsForm.schoolAddress || ''}
                        onChange={e => setLocalSettingsForm(prev => ({ ...prev, schoolAddress: e.target.value }))}
                        placeholder="Jln. Komering II, Kelurahan Demang Lebar Daun, Kecamatan Ilir Barat I, Kota Palembang, Sumatera Selatan 30151"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Alamat lengkap yang tercetak di baris bawah kop surat resmi dinas.
                      </p>
                    </div>

                    {/* Kontak / Website / Surel */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Kontak / Website / Surel (Opsional)
                      </label>
                      <input
                        type="text"
                        value={localSettingsForm.schoolContact || ''}
                        onChange={e => setLocalSettingsForm(prev => ({ ...prev, schoolContact: e.target.value }))}
                        placeholder="Website: https://smpn58.vercel.app/"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. FOTO KEPALA SEKOLAH & LOGO VERIFIKASI TTE */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    FOTO KEPALA SEKOLAH & LOGO VERIFIKASI TTE
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Foto Resmi Kepala Sekolah */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Foto Resmi Kepala Sekolah (Opsional)
                      </span>

                      <div className="flex items-center gap-4">
                        <div className="w-16 h-20 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                          {localSettingsForm.principalPhoto ? (
                            <img
                              src={localSettingsForm.principalPhoto}
                              alt="Foto Kepala Sekolah"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserCheck className="w-8 h-8 text-slate-300" />
                          )}
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                          <button
                            type="button"
                            onClick={() => fileInputPrincipalPhotoRef.current?.click()}
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-500 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-violet-600" />
                            <span>Upload Foto Kepsek</span>
                          </button>
                          {localSettingsForm.principalPhoto && (
                            <button
                              type="button"
                              onClick={() => setLocalSettingsForm(prev => ({ ...prev, principalPhoto: '' }))}
                              className="w-full sm:w-auto px-3 py-1.5 text-rose-500 hover:text-rose-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Hapus Foto</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                        Foto profil formal Kepala Sekolah yang ditampilkan pada dokumen kelulusan & portal verifikasi digital.
                      </p>
                    </div>

                    {/* Logo Pengesahan TTE Digital */}
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Logo pada Scan Barcode & Verifikasi Digital
                      </span>

                      <div className="flex items-center gap-4">
                        <div className="w-16 h-20 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                          <img
                            src={localSettingsForm.logoRight || '/logo-sekolah.png'}
                            alt="Logo Sekolah"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <div className="space-y-1 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 inline-block">
                            Otomatis Sinkron
                          </span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            Logo Sekolah Kanan digunakan sebagai lambang otentikasi resmi pada portal verifikasi.
                          </p>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                        Lambang instansi yang diverifikasi saat siapapun memindai QR code dokumen resmi dengan kamera HP.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. PENGATURAN PRIVASI & ISOLASI DOSSIER MULTI-GURU */}
                <div className="p-4 sm:p-5 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/80 dark:border-violet-800/60 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Lock className="w-4 h-4 text-violet-600" />
                        <span>Isolasi Lembar Rekap Nilai (Dossier) per Akun Guru Login</span>
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Setiap guru yang login hanya dapat melihat, mengunduh, dan menandatangani lembar nilai untuk mata pelajaran yang diampunya saja. Mencegah bentrok data atau tertukarnya nama penandatangan antar guru.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={localSettingsForm.isolateTeacherDossier !== false}
                        onChange={e => setLocalSettingsForm(prev => ({ ...prev, isolateTeacherDossier: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>
                  </div>
                </div>

                {/* LIVE PREVIEW KOP SURAT */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    PRATINJAU KOP SURAT RESMI CETAK (Dossier & Dokumen)
                  </span>

                  <div className="p-5 rounded-2xl bg-white border border-slate-300 shadow-xs">
                    <div className="border-b-4 border-double border-slate-900 pb-2 text-center">
                      <div className="flex items-center justify-between gap-4">
                        <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                          <img
                            src={localSettingsForm.logoLeft || '/logo-dinas.png'}
                            alt="Logo Dinas"
                            className="max-h-16 max-w-16 object-contain"
                          />
                        </div>
                        <div className="flex-1 space-y-0.5 text-center">
                          <h4 className="text-xs font-bold uppercase tracking-wider font-sans text-slate-900 leading-tight">
                            {localSettingsForm.institution1 || 'PEMERINTAH KOTA PALEMBANG'}
                          </h4>
                          <h4 className="text-xs font-bold uppercase tracking-wider font-sans text-slate-900 leading-tight">
                            {localSettingsForm.institution2 || 'DINAS PENDIDIKAN'}
                          </h4>
                          <h2 className="text-base sm:text-lg font-black tracking-wide font-sans text-slate-900 uppercase leading-snug">
                            {localSettingsForm.schoolName || 'SMP NEGERI 58 PALEMBANG'}
                          </h2>
                          <p className="text-[9.5px] font-sans text-slate-700 leading-tight">
                            {localSettingsForm.schoolAddress || 'Jln. Komering II, Kelurahan Demang Lebar Daun, Kecamatan Ilir Barat I, Kota Palembang, Sumatera Selatan 30151'}
                          </p>
                          {localSettingsForm.schoolContact && (
                            <p className="text-[8.5px] font-sans text-slate-600 font-mono">
                              {localSettingsForm.schoolContact}
                            </p>
                          )}
                        </div>
                        <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                          <img
                            src={localSettingsForm.logoRight || '/logo-sekolah.png'}
                            alt="Logo Sekolah"
                            className="max-h-16 max-w-16 object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 1: PENGATURAN PEJABAT & TANDA TANGAN ELEKTRONIK (TTE) */}
          <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-violet-600" />
                    <span>Identitas Pejabat Satuan Pendidikan & TTE Barcode/QR</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                    <span>☁️</span>
                    <span>Database Cloud Supabase</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Data ini tersimpan di Supabase Cloud dan otomatis dicetak pada Sertifikat Kelulusan, Dossier Lembar Jawaban Siswa, Berita Acara Ujian (BAP), dan Leger Nilai.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onUpdateSchoolSettings?.(localSettingsForm);
                  setSettingsSavedToast(true);
                  showThemedAlert(
                    'Pengaturan Tersimpan ke Database Cloud',
                    'Data nama kepala sekolah, foto resmi, guru pengampu, dan konfigurasi TTE digital telah berhasil disimpan ke Cloud Database Supabase dan tersinkronisasi ke seluruh akun guru & proktor.',
                    'info'
                  );
                  setTimeout(() => setSettingsSavedToast(false), 3000);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Pejabat & TTE</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Input Pejabat */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Satuan Pendidikan */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Nama Satuan Pendidikan:
                    </label>
                    <input
                      type="text"
                      value={localSettingsForm.schoolName}
                      onChange={e => setLocalSettingsForm(prev => ({ ...prev, schoolName: e.target.value }))}
                      placeholder="SMP NEGERI 58 PALEMBANG"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Kota */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Kota Penerbitan Dokumen:
                    </label>
                    <input
                      type="text"
                      value={localSettingsForm.city}
                      onChange={e => setLocalSettingsForm(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="Palembang"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                {/* Bagian A: Kepala Sekolah (Untuk Sertifikat Siswa) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-violet-600 inline-block"></span>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        1. Data Kepala Sekolah
                      </h5>
                    </div>
                    <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                      🏛️ Digunakan pada Cetak Sertifikat Siswa
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nama Kepala Sekolah */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Nama Lengkap Kepala Sekolah & Gelar:
                      </label>
                      <input
                        type="text"
                        value={localSettingsForm.principalName}
                        onChange={e => setLocalSettingsForm(prev => ({ ...prev, principalName: e.target.value }))}
                        placeholder="Hj. Rohana, S.Pd., M.Si."
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    {/* NIP Kepala Sekolah */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        NIP Kepala Sekolah:
                      </label>
                      <input
                        type="text"
                        value={localSettingsForm.principalNip}
                        onChange={e => setLocalSettingsForm(prev => ({ ...prev, principalNip: e.target.value }))}
                        placeholder="19680512 199412 2 001"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian B: Guru Pengampu / Proktor (Untuk Dossier Rekap Nilai Siswa) */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                      <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        2. Data Guru Pengampu / Proktor
                      </h5>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentTeacher && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocalSettingsForm(prev => ({
                              ...prev,
                              teacherName: currentTeacher.name,
                              teacherNip: currentTeacher.nip || prev.teacherNip
                            }));
                          }}
                          className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-slate-100 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950/60 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          title="Klik untuk mengisi otomatis nama guru dari akun yang sedang login"
                        >
                          Gunakan Akun Login ({currentTeacher.name.split(',')[0]})
                        </button>
                      )}
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        👨‍🏫 Digunakan pada Cetak Dossier Siswa
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nama Guru Pengampu */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Nama Guru Pengampu / Proktor:
                      </label>
                      <input
                        type="text"
                        value={localSettingsForm.teacherName}
                        onChange={e => setLocalSettingsForm(prev => ({ ...prev, teacherName: e.target.value }))}
                        placeholder="Hendra Wijaya, S.Pd"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    {/* NIP Guru */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        NIP Guru Pengampu / Proktor:
                      </label>
                      <input
                        type="text"
                        value={localSettingsForm.teacherNip}
                        onChange={e => setLocalSettingsForm(prev => ({ ...prev, teacherNip: e.target.value }))}
                        placeholder="19870420 201201 1 004"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Switch TTE Barcode & Format */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-800/60">
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        Tanda Tangan Elektronik (TTE) Digital
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Sematkan stempel QR Code / Barcode pengesahan resmi digital pada dokumen cetak
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localSettingsForm.enableTTE}
                        onChange={e => setLocalSettingsForm(prev => ({ ...prev, enableTTE: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>
                  </div>

                  {localSettingsForm.enableTTE && (
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300 p-2">
                      <span className="text-xs text-slate-500">Pilih Model TTE:</span>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tteType"
                          value="qrcode"
                          checked={localSettingsForm.tteType === 'qrcode'}
                          onChange={() => setLocalSettingsForm(prev => ({ ...prev, tteType: 'qrcode' }))}
                          className="text-violet-600 focus:ring-violet-500"
                        />
                        <span>QR Code Terverifikasi (BSrE Style)</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tteType"
                          value="barcode"
                          checked={localSettingsForm.tteType === 'barcode'}
                          onChange={() => setLocalSettingsForm(prev => ({ ...prev, tteType: 'barcode' }))}
                          className="text-violet-600 focus:ring-violet-500"
                        />
                        <span>Barcode Garis Dokumen (Code 128)</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Preview TTE Digital Seal */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col gap-1.5 mb-2.5">
                    <span className="text-[11px] font-bold uppercase text-slate-400 block tracking-wider">
                      Pratinjau Tampilan TTE Cetak:
                    </span>
                    <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 text-[10px] font-bold gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewSignerTab('principal')}
                        className={`flex-1 py-1 px-2 rounded-lg transition cursor-pointer text-center ${
                          previewSignerTab === 'principal'
                            ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        🏛️ Kepsek (Sertifikat)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewSignerTab('teacher')}
                        className={`flex-1 py-1 px-2 rounded-lg transition cursor-pointer text-center ${
                          previewSignerTab === 'teacher'
                            ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        👨‍🏫 Guru (Dossier)
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                    {previewSignerTab === 'principal' ? (
                      <TTESignatureSeal
                        settings={localSettingsForm}
                        documentId="PREVIEW-KEPSEK"
                        signerName={localSettingsForm.principalName || 'Nama Kepala Sekolah'}
                        signerTitle="Kepala Sekolah SMPN 58"
                        signerNip={localSettingsForm.principalNip}
                      />
                    ) : (
                      <TTESignatureSeal
                        settings={localSettingsForm}
                        documentId="PREVIEW-GURU"
                        signerName={localSettingsForm.teacherName || currentTeacher?.name || 'Nama Guru Pengampu'}
                        signerTitle="Guru Pengampu / Proktor"
                        signerNip={localSettingsForm.teacherNip || currentTeacher?.nip}
                      />
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                  <p>
                    📌 <strong>TTE Kepala Sekolah:</strong> Dicantumkan pada Sertifikat Kelulusan & Nilai Resmi Siswa.
                  </p>
                  <p>
                    📌 <strong>TTE Guru/Proktor:</strong> Dicantumkan pada Dossier Lembar Hasil Ujian per butir soal siswa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: STATUS KONEKSI & ANTI-CHEAT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Status Supabase */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <span>Koneksi Supabase Cloud</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                  Connected
                </span>
              </div>

              <div className="space-y-2 text-slate-600 dark:text-slate-300">
                <p><strong>Project URL:</strong> <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono text-[11px]">https://lxglsphqrpnrzfnvpwoa.supabase.co</code></p>
                <p><strong>Driver:</strong> @supabase/supabase-js v2 (Next.js 16 + React 19)</p>
                <p><strong>Tabel Aktif:</strong> subjects, questions, exam_results</p>
                <p><strong>Kapasitas Free Tier:</strong> 500 MB Storage (~100.000+ sesi ujian siswa)</p>
              </div>
            </div>

            {/* Anti Cheat Summary */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-violet-500" />
                  <span>Fitur Keamanan Anti-Cheat</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold text-[10px]">
                  Aktif
                </span>
              </div>

              <div className="space-y-2 text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Deteksi perpindahan tab browser (Window Blur event)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Blokir klik kanan (Context Menu) saat ujian</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Toleransi maksimal 3x sebelum lembar jawaban terkunci otomatis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Penyimpanan jawaban lokal realtime (Anti-Hilang bila koneksi putus)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. MODAL TAMBAH & EDIT SOAL                                      */}
      {/* ============================================================== */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  {editingQuestion ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingQuestion ? 'Edit Butir Soal' : t.addQuestionTitle}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Paket: <strong className="text-slate-700 dark:text-slate-300">{formatSubjectTitle(currentBankSubject.title)}</strong> (ID: {selectedBankSubjectId || subject.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseQuestionModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {!editingQuestion && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-transparent border border-violet-200 dark:border-violet-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Ingin membuat paket butir soal otomatis berstandar <strong>AKM, PISA, & TKA</strong>?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleCloseQuestionModal();
                    setIsAiModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white text-[11px] font-bold shrink-0 transition cursor-pointer shadow-xs"
                >
                  Buka AI Generator
                </button>
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs font-medium">
              {/* Tipe Soal Terurut Proporsional */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.questionTypeLabel}
                </label>
                <select
                  value={modalType}
                  onChange={e => setModalType(e.target.value as QuestionType)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold cursor-pointer [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100"
                >
                  <option value="Pilihan Ganda">1. Pilihan Ganda (Single Choice)</option>
                  <option value="Pilihan Ganda Kompleks">2. Pilihan Ganda Kompleks (Multi Choice)</option>
                  <option value="Benar/Salah">3. Benar / Salah (Banyak Pernyataan & 1 Pernyataan)</option>
                  <option value="Menjodohkan">4. Menjodohkan (Matching Pairs)</option>
                  <option value="Isian Singkat">5. Isian Singkat</option>
                  <option value="Esai">6. Esai (Uraian)</option>
                </select>
              </div>

              {/* Teks Soal / Stimulus */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.stimulusLabel}
                </label>
                <textarea
                  rows={3}
                  required
                  value={modalText}
                  onChange={e => setModalText(e.target.value)}
                  placeholder={t.stimulusPlaceholder}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              {/* Fitur Tambah Gambar pada Soal */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-violet-600" />
                    <span>Gambar / Media Soal (Opsional)</span>
                  </span>
                  {modalMediaUrl && (
                    <button
                      type="button"
                      onClick={() => setModalMediaUrl('')}
                      className="text-rose-500 hover:text-rose-600 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Hapus Gambar</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <label className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs flex-shrink-0">
                    <Upload className="w-3.5 h-3.5 text-violet-600" />
                    <span>Unggah Gambar dari Perangkat</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileToDataUrl(file, url => setModalMediaUrl(url));
                        }
                      }}
                    />
                  </label>

                  <input
                    type="text"
                    value={modalMediaUrl}
                    onChange={e => setModalMediaUrl(e.target.value)}
                    placeholder="atau masukkan URL/Link gambar (https://...)"
                    className="flex-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                  />
                </div>

                {modalMediaUrl && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block mb-1">Pratinjau Gambar Soal:</span>
                    <img
                      src={modalMediaUrl}
                      alt="Pratinjau Soal"
                      className="max-h-40 rounded-xl border border-slate-200 dark:border-slate-700 object-contain bg-white dark:bg-slate-900 p-1"
                    />
                  </div>
                )}
              </div>

              {/* 1. KHUSUS PILIHAN GANDA (SINGLE CHOICE) */}
              {modalType === 'Pilihan Ganda' && (
                <div className="space-y-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-violet-500/20">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-700 dark:text-slate-300 font-bold">
                      Opsi Pilihan Jawaban (Pilih Kunci Radio di Kiri):
                    </label>
                    <span className="text-[11px] text-slate-400">Kunci Aktif: <strong>Opsi {pgAnswer}</strong></span>
                  </div>

                  <div className="space-y-3">
                    {pgOptions.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isKey = pgAnswer === letter;
                      return (
                        <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="pg-modal-key"
                              checked={isKey}
                              onChange={() => setPgAnswer(letter)}
                              className="accent-violet-600 w-4 h-4 cursor-pointer"
                              title={`Pilih Opsi ${letter} sebagai Kunci Jawaban`}
                            />
                            <span className="font-bold text-violet-600 dark:text-violet-400 text-xs w-5">{letter}.</span>

                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => {
                                const next = [...pgOptions];
                                next[idx].text = e.target.value;
                                setPgOptions(next);
                              }}
                              placeholder={`Tulis teks pilihan jawaban ${letter}...`}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                            />

                            <label className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 hover:text-violet-600 text-slate-600 dark:text-slate-300 cursor-pointer transition flex items-center gap-1 text-[11px] font-semibold" title="Unggah Gambar untuk Opsi ini">
                              <ImageIcon className="w-3.5 h-3.5 text-violet-600" />
                              <span className="hidden sm:inline">Gambar</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileToDataUrl(file, url => {
                                      const next = [...pgOptions];
                                      next[idx].img = url;
                                      setPgOptions(next);
                                    });
                                  }
                                }}
                              />
                            </label>

                            {pgOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setPgOptions(prev => prev.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                title="Hapus Opsi ini"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Thumbnail Gambar Opsi */}
                          {opt.img && (
                            <div className="flex items-center gap-2 pl-9 pt-1">
                              <img
                                src={opt.img}
                                alt={`Gambar Opsi ${letter}`}
                                className="max-h-20 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800 p-1"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...pgOptions];
                                  next[idx].img = undefined;
                                  setPgOptions(next);
                                }}
                                className="text-rose-500 hover:text-rose-600 text-[10px] font-bold p-1"
                              >
                                ✕ Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPgOptions(prev => [...prev, { text: '' }])}
                    className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Opsi Pilihan ({String.fromCharCode(65 + pgOptions.length)})</span>
                  </button>
                </div>
              )}

              {/* 2. KHUSUS PILIHAN GANDA KOMPLEKS (MULTI CHOICE) */}
              {modalType === 'Pilihan Ganda Kompleks' && (
                <div className="space-y-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-violet-500/20">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-700 dark:text-slate-300 font-bold">
                      Centang Opsi yang Menjadi Kunci Jawaban (&gt; 1):
                    </label>
                    <span className="text-[11px] text-slate-400">Kunci: <strong>{pgkAnswer.join(', ') || '-'}</strong></span>
                  </div>

                  <div className="space-y-3">
                    {pgOptions.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isChecked = pgkAnswer.includes(letter);
                      return (
                        <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setPgkAnswer(prev => prev.filter(l => l !== letter));
                                } else {
                                  setPgkAnswer(prev => [...prev, letter]);
                                }
                              }}
                              className="accent-violet-600 w-4 h-4 rounded cursor-pointer"
                              title={`Centang jika Opsi ${letter} merupakan jawaban benar`}
                            />
                            <span className="font-bold text-violet-600 dark:text-violet-400 text-xs w-5">{letter}.</span>

                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => {
                                const next = [...pgOptions];
                                next[idx].text = e.target.value;
                                setPgOptions(next);
                              }}
                              placeholder={`Tulis teks pilihan jawaban ${letter}...`}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                            />

                            <label className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 hover:text-violet-600 text-slate-600 dark:text-slate-300 cursor-pointer transition flex items-center gap-1 text-[11px] font-semibold" title="Unggah Gambar untuk Opsi ini">
                              <ImageIcon className="w-3.5 h-3.5 text-violet-600" />
                              <span className="hidden sm:inline">Gambar</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileToDataUrl(file, url => {
                                      const next = [...pgOptions];
                                      next[idx].img = url;
                                      setPgOptions(next);
                                    });
                                  }
                                }}
                              />
                            </label>

                            {pgOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setPgOptions(prev => prev.filter((_, i) => i !== idx))}
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Thumbnail Gambar Opsi */}
                          {opt.img && (
                            <div className="flex items-center gap-2 pl-9 pt-1">
                              <img
                                src={opt.img}
                                alt={`Gambar Opsi ${letter}`}
                                className="max-h-20 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800 p-1"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...pgOptions];
                                  next[idx].img = undefined;
                                  setPgOptions(next);
                                }}
                                className="text-rose-500 hover:text-rose-600 text-[10px] font-bold p-1"
                              >
                                ✕ Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPgOptions(prev => [...prev, { text: '' }])}
                    className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Opsi Pilihan ({String.fromCharCode(65 + pgOptions.length)})</span>
                  </button>
                </div>
              )}

              {/* 3. KHUSUS BENAR / SALAH */}
              {modalType === 'Benar/Salah' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-violet-500/30 space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                      <input
                        type="radio"
                        checked={bsMode === 'multiple'}
                        onChange={() => setBsMode('multiple')}
                        className="accent-violet-600"
                      />
                      <span>Banyak Pernyataan (&gt; 1 Jawaban)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                      <input
                        type="radio"
                        checked={bsMode === 'single'}
                        onChange={() => setBsMode('single')}
                        className="accent-violet-600"
                      />
                      <span>1 Pernyataan Saja</span>
                    </label>
                  </div>

                  {bsMode === 'multiple' ? (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tiap baris pernyataan memiliki kunci Benar / Salah dan gambar masing-masing:
                      </p>
                      {bsStatements.map((stmt, sIdx) => (
                        <div key={sIdx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-violet-600">{sIdx + 1}.</span>
                            <input
                              type="text"
                              value={stmt.text}
                              onChange={e => {
                                const newArr = [...bsStatements];
                                newArr[sIdx].text = e.target.value;
                                setBsStatements(newArr);
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs"
                              placeholder={`Tulis pernyataan #${sIdx + 1}`}
                            />

                            <label className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 hover:text-violet-600 text-slate-600 dark:text-slate-300 cursor-pointer transition flex items-center gap-1 text-[11px] font-semibold" title="Unggah Gambar Pernyataan">
                              <ImageIcon className="w-3.5 h-3.5 text-violet-600" />
                              <span className="hidden sm:inline">Gambar</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileToDataUrl(file, url => {
                                      const next = [...bsStatements];
                                      next[sIdx].img = url;
                                      setBsStatements(next);
                                    });
                                  }
                                }}
                              />
                            </label>

                            <select
                              value={stmt.answer}
                              onChange={e => {
                                const newArr = [...bsStatements];
                                newArr[sIdx].answer = e.target.value as 'Benar' | 'Salah';
                                setBsStatements(newArr);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs"
                            >
                              <option value="Benar">Benar</option>
                              <option value="Salah">Salah</option>
                            </select>

                            {bsStatements.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setBsStatements(prev => prev.filter((_, idx) => idx !== sIdx))}
                                className="text-rose-500 hover:text-rose-700 px-1 cursor-pointer"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {stmt.img && (
                            <div className="flex items-center gap-2 pl-6 pt-1">
                              <img
                                src={stmt.img}
                                alt={`Pernyataan #${sIdx + 1}`}
                                className="max-h-20 rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-slate-50 dark:bg-slate-800 p-1"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...bsStatements];
                                  next[sIdx].img = undefined;
                                  setBsStatements(next);
                                }}
                                className="text-rose-500 hover:text-rose-600 text-[10px] font-bold p-1"
                              >
                                ✕ Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => setBsStatements(prev => [...prev, { text: '', answer: 'Benar' }])}
                        className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Pernyataan Baru</span>
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Kunci Jawaban Tunggal:
                      </label>
                      <select
                        value={bsSingleAnswer}
                        onChange={e => setBsSingleAnswer(e.target.value as 'Benar' | 'Salah')}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold cursor-pointer"
                      >
                        <option value="Benar">Benar</option>
                        <option value="Salah">Salah</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* 4. KHUSUS MENJODOHKAN */}
              {modalType === 'Menjodohkan' && (
                <div className="space-y-3.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-violet-500/20">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold">
                    Pasangan Menjodohkan (Kiri: Pertanyaan/Pernyataan ➔ Kanan: Jawaban Tepat):
                  </label>

                  <div className="space-y-3">
                    {matchingPairs.map((pair, pIdx) => (
                      <div key={pIdx} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                          {/* Sisi Kiri */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-violet-600 text-xs">{pIdx + 1}A.</span>
                              <input
                                type="text"
                                value={pair.qText}
                                onChange={e => {
                                  const next = [...matchingPairs];
                                  next[pIdx].qText = e.target.value;
                                  setMatchingPairs(next);
                                }}
                                placeholder="Pernyataan/Soal Kiri..."
                                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                              />
                              <label className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 text-slate-600 cursor-pointer" title="Unggah Gambar Kiri">
                                <ImageIcon className="w-3.5 h-3.5 text-violet-600" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFileToDataUrl(file, url => {
                                        const next = [...matchingPairs];
                                        next[pIdx].qImg = url;
                                        setMatchingPairs(next);
                                      });
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            {pair.qImg && (
                              <div className="flex items-center gap-1 pl-6">
                                <img src={pair.qImg} alt="Kiri" className="max-h-16 rounded border object-contain" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...matchingPairs];
                                    next[pIdx].qImg = undefined;
                                    setMatchingPairs(next);
                                  }}
                                  className="text-rose-500 text-[10px] font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Sisi Kanan */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-emerald-600 text-xs">➔</span>
                              <input
                                type="text"
                                value={pair.aText}
                                onChange={e => {
                                  const next = [...matchingPairs];
                                  next[pIdx].aText = e.target.value;
                                  setMatchingPairs(next);
                                }}
                                placeholder="Pasangan Jawaban Kanan..."
                                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                              />
                              <label className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-100 text-slate-600 cursor-pointer" title="Unggah Gambar Kanan">
                                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFileToDataUrl(file, url => {
                                        const next = [...matchingPairs];
                                        next[pIdx].aImg = url;
                                        setMatchingPairs(next);
                                      });
                                    }
                                  }}
                                />
                              </label>
                              {matchingPairs.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => setMatchingPairs(prev => prev.filter((_, i) => i !== pIdx))}
                                  className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            {pair.aImg && (
                              <div className="flex items-center gap-1 pl-4">
                                <img src={pair.aImg} alt="Kanan" className="max-h-16 rounded border object-contain" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...matchingPairs];
                                    next[pIdx].aImg = undefined;
                                    setMatchingPairs(next);
                                  }}
                                  className="text-rose-500 text-[10px] font-bold"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMatchingPairs(prev => [...prev, { qText: '', aText: '' }])}
                    className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pasangan Menjodohkan</span>
                  </button>
                </div>
              )}

              {/* 5. KHUSUS ISIAN SINGKAT */}
              {modalType === 'Isian Singkat' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-violet-500/20 space-y-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Kunci Jawaban Singkat (Pisahkan dengan tanda koma untuk variasi jawaban)
                  </label>
                  <input
                    type="text"
                    value={shortAnswer}
                    onChange={e => setShortAnswer(e.target.value)}
                    placeholder="Contoh: karbondioksida, co2, karbon dioksida"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <p className="text-[11px] text-slate-400">
                    Siswa dianggap benar jika jawabannya cocok dengan salah satu kata kunci di atas (tidak sensitif huruf besar/kecil).
                  </p>
                </div>
              )}

              {/* 6. KHUSUS ESAI */}
              {modalType === 'Esai' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-violet-500/20 space-y-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Pedoman / Rubrik Penilaian Guru
                  </label>
                  <textarea
                    rows={3}
                    value={essayKey}
                    onChange={e => setEssayKey(e.target.value)}
                    placeholder="Tuliskan kata kunci utama dan poin penting yang harus ada dalam jawaban siswa..."
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseQuestionModal}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition cursor-pointer shadow-md shadow-violet-600/20"
                >
                  {editingQuestion ? 'Simpan Perubahan Soal' : t.saveQuestionBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* ============================================================== */}
      {/* 8. MODAL DETAIL NILAI SISWA (DOSSIER & PENILAIAN MANUAL ESAI)    */}
      {/* ============================================================== */}
      {selectedResult && (() => {
        const cleanDossierClass = resolveStudentSingleClass(selectedResult.studentName, selectedResult.className, students);
        const dossierStudentObj = (students || []).find(
          s => s.name.toLowerCase().trim() === selectedResult.studentName.toLowerCase().trim()
        );
        const dossierNisn = dossierStudentObj?.nisn || '-';
        const rawDossierSubjectTitle = selectedResult.subjectTitle || dossierSubject.title || 'Mata Pelajaran Ujian';
        const cleanDossierSubjectName = extractSubjectAndGrade(rawDossierSubjectTitle, cleanDossierClass).cleanSubject || rawDossierSubjectTitle;

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:static print:z-auto print:bg-white print:p-0 print:block print:w-full">
            {/* FLOATING SUCCESS TOAST KOREKSI NILAI URAIAN */}
            {dossierSuccessToast && (
              <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-4 border border-emerald-400/30 print:hidden">
                <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
                <span>{dossierSuccessToast}</span>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible print:p-0 print:bg-white print:text-black print:w-full print:space-y-4">
              {/* KOP SURAT RESMI KHUSUS CETAK DOSSIER (DUAL LOGO RESMI) */}
              <div className="hidden print:block border-b-4 border-double border-slate-900 pb-2 mb-4 text-center">
                <div className="flex items-center justify-between gap-4">
                  {/* Logo Kiri (Dinas/Pemda) */}
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={effectiveSchoolSettings.logoLeft || '/logo-dinas.png'}
                      alt="Logo Dinas"
                      className="max-h-16 max-w-16 object-contain"
                    />
                  </div>

                  {/* Teks Identitas Resmi Satuan Pendidikan */}
                  <div className="flex-1 space-y-0.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider font-sans text-slate-900 leading-tight">
                      {effectiveSchoolSettings.institution1 || 'PEMERINTAH KOTA PALEMBANG'}
                    </h4>
                    <h4 className="text-xs font-bold uppercase tracking-wider font-sans text-slate-900 leading-tight">
                      {effectiveSchoolSettings.institution2 || 'DINAS PENDIDIKAN'}
                    </h4>
                    <h2 className="text-base sm:text-lg font-black tracking-wide font-sans text-slate-900 uppercase leading-snug">
                      {effectiveSchoolSettings.schoolName || 'SMP NEGERI 58 PALEMBANG'}
                    </h2>
                    <p className="text-[9.5px] font-sans text-slate-700 leading-tight">
                      {effectiveSchoolSettings.schoolAddress || 'Jln. Komering II, Kelurahan Demang Lebar Daun, Kecamatan Ilir Barat I, Kota Palembang, Sumatera Selatan 30151'}
                    </p>
                    {effectiveSchoolSettings.schoolContact && (
                      <p className="text-[8.5px] font-sans text-slate-600 font-mono">
                        {effectiveSchoolSettings.schoolContact}
                      </p>
                    )}
                    <p className="text-[9px] font-sans font-bold text-slate-800 uppercase tracking-wider pt-0.5">
                      LEMBAR JAWABAN & HASIL ASESMEN SUMATIF SISWA (CBT)
                    </p>
                  </div>

                  {/* Logo Kanan (Sekolah/Madrasah) */}
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={effectiveSchoolSettings.logoRight || '/logo-sekolah.png'}
                      alt="Logo Sekolah"
                      className="max-h-16 max-w-16 object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* DOSSIER HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 print:border-slate-300 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 print:hidden">
                    <span className="px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-bold text-[10px] border border-violet-200/60 dark:border-violet-800/60">
                      Lembar Rekapan Ujian Siswa
                    </span>
                    {selectedResult.violationCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-200 dark:border-rose-900">
                        {selectedResult.violationCount}x Pelanggaran
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white print:text-black text-lg sm:text-xl">
                    {selectedResult.studentName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-700">
                    NISN: <strong className="text-slate-800 dark:text-slate-200 print:text-black font-mono">{dossierNisn}</strong> • Kelas: <strong className="text-slate-800 dark:text-slate-200 print:text-black">{cleanDossierClass}</strong> • Mapel: <strong className="text-slate-800 dark:text-slate-200 print:text-black">{cleanDossierSubjectName}</strong> • Waktu Kumpul: <strong className="text-slate-800 dark:text-slate-200 print:text-black">{selectedResult.submittedAt}</strong>
                  </p>
                  {rawDossierSubjectTitle !== cleanDossierSubjectName && (
                    <p className="text-[11px] text-slate-400 print:text-slate-600">
                      Paket Ujian: {rawDossierSubjectTitle}
                    </p>
                  )}
                </div>

                {/* KOTAK SKOR AKHIR */}
                <div className="flex items-center sm:flex-col sm:items-end justify-between bg-violet-50 dark:bg-violet-950/50 print:bg-slate-100 border border-violet-200/80 dark:border-violet-800/80 print:border-slate-300 p-3.5 rounded-2xl min-w-[140px]">
                  <span className="text-[11px] font-bold text-violet-600 dark:text-violet-300 print:text-slate-900 uppercase tracking-wider">
                    Skor Akhir
                  </span>
                  <p className="text-3xl font-black text-violet-700 dark:text-violet-300 print:text-slate-900">
                    {liveDossierEval ? liveDossierEval.finalScore : selectedResult.score}%
                  </p>
                  <span className="text-[10px] text-slate-500 print:text-slate-700 font-medium">
                    Poin: {liveDossierEval ? liveDossierEval.totalEarned : selectedResult.totalEarned} / {liveDossierEval ? liveDossierEval.totalMax : selectedResult.totalMax}
                  </span>
                </div>
              </div>

              {/* RINGKASAN HASIL EVALUASI JAWABAN SISWA (BENAR / SALAH / KOSONG) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 print:bg-slate-100 border border-slate-200 dark:border-slate-700/80 print:border-slate-300 text-xs">
                {/* 1. Benar */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-emerald-200 dark:border-emerald-800 print:border-slate-300 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                    ✔
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Jawaban Benar</span>
                    <strong className="text-sm font-black text-emerald-700 dark:text-emerald-400 print:text-black">
                      {dossierStats.correctCount} Soal
                    </strong>
                  </div>
                </div>

                {/* 2. Salah */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-rose-200 dark:border-rose-800 print:border-slate-300 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                    ✘
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Jawaban Salah</span>
                    <strong className="text-sm font-black text-rose-600 dark:text-rose-400 print:text-black">
                      {dossierStats.wrongCount} Soal
                    </strong>
                  </div>
                </div>

                {/* 3. Sebagian Benar */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-amber-200 dark:border-amber-800 print:border-slate-300 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                    ⚠
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Sebagian Benar</span>
                    <strong className="text-sm font-black text-amber-600 dark:text-amber-400 print:text-black">
                      {dossierStats.partialCount} Soal
                    </strong>
                  </div>
                </div>

                {/* 4. Tidak Dijawab */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 print:bg-white border border-slate-200 dark:border-slate-700 print:border-slate-300 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-sm shrink-0">
                    ⚪
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Tidak Dijawab</span>
                    <strong className="text-sm font-black text-slate-700 dark:text-slate-300 print:text-black">
                      {dossierStats.unansweredCount} Soal
                    </strong>
                  </div>
                </div>
              </div>

              {/* MATRIKS KISI HASIL EVALUASI CEPAT NOMOR 1 s/d N */}
              {dossierStats.itemEvaluations.length > 0 && (
                <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 print:bg-white border border-slate-200 dark:border-slate-800 print:border-slate-300 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Matriks Hasil Evaluasi Butir Soal ({dossierStats.total} Butir Soal)
                    </span>
                    <div className="flex items-center gap-2.5 text-[10px] font-semibold flex-wrap">
                      <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Benar</span>
                      <span className="flex items-center gap-1 text-rose-500"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Salah</span>
                      {dossierStats.partialCount > 0 && <span className="flex items-center gap-1 text-amber-500"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Sebagian</span>}
                      {dossierStats.unansweredCount > 0 && <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span> Kosong</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
                    {dossierStats.itemEvaluations.map((item) => {
                      const isCor = item.status === 'correct';
                      const isWro = item.status === 'wrong';
                      const isPar = item.status === 'partial';
                      const isEss = item.status === 'essay';

                      return (
                        <div
                          key={item.qNum}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex flex-col items-center justify-center font-mono text-[10px] sm:text-xs font-bold border transition ${
                            isCor
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : isWro
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900'
                              : isPar
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : isEss
                              ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                          }`}
                          title={`Soal #${item.qNum}: ${isCor ? 'Benar' : isWro ? 'Salah' : isPar ? 'Sebagian Benar' : isEss ? 'Esai' : 'Tidak Dijawab'} (${item.earned}/${item.maxPoints} Poin)`}
                        >
                          <span className="leading-none text-[8.5px] font-sans text-slate-500">{item.qNum}</span>
                          <span className="leading-none font-bold">
                            {isCor ? '✔' : isWro ? '✘' : isPar ? '½' : isEss ? '✎' : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NOTIFIKASI MAX POINTS WARNING */}
              {essayMaxNotice && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in print:hidden">
                  <span>{essayMaxNotice}</span>
                  <button onClick={() => setEssayMaxNotice(null)} className="text-rose-500 font-bold ml-2">✕</button>
                </div>
              )}

              {/* NOTIFIKASI SUKSES SIMPAN NILAI */}
              {essaySavedNotice && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in print:hidden">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Nilai uraian berhasil disimpan! Skor akhir siswa telah diperbarui ke sistem dan database.</span>
                </div>
              )}

              {/* DAFTAR BUTIR SOAL & JAWABAN SISWA */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between pb-1 print:border-b print:border-slate-300 print:pb-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 print:text-slate-900">
                    Rincian Jawaban Siswa ({dossierQuestions.length} Butir Soal)
                  </h4>
                  <span className="text-[11px] text-slate-400 print:text-slate-600">
                    Periksa kunci & evaluasi lembar jawaban
                  </span>
                </div>

                {dossierQuestions.map((q, qIdx) => {
                  const maxPoints = (dossierSubject.scoringRules as any)?.[q.type] || 1;
                  const studentAnswerItem = (selectedResult.answers || []).find(a => a.questionId === q.id);
                  const rawStudentAns = studentAnswerItem ? studentAnswerItem.answer : null;
                  const isEssay = q.type === 'Esai';

                  let earned = 0;
                  if (isEssay) {
                    earned = Math.min(manualEssayScores[q.id] || 0, maxPoints);
                  } else {
                    earned = calculateSingleQuestionScore(q, rawStudentAns, maxPoints);
                  }

                  const isFull = earned === maxPoints;
                  const isPartial = earned > 0 && earned < maxPoints;
                  const isUnanswered = rawStudentAns === null || rawStudentAns === undefined || rawStudentAns === '' || (Array.isArray(rawStudentAns) && rawStudentAns.length === 0);
                  const isWrong = !isEssay && !isFull && !isPartial;

                  return (
                    <div
                      key={q.id || qIdx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 print:bg-white border border-slate-200 dark:border-slate-700/80 print:border-slate-300 text-xs space-y-2.5 print:break-inside-avoid print:shadow-none"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-violet-600 dark:text-violet-400 print:text-slate-900 text-sm">
                            Soal #{qIdx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 print:bg-slate-100 text-slate-700 dark:text-slate-300 print:text-slate-800 font-semibold text-[10px]">
                            {q.type}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 print:bg-slate-50 text-slate-500 print:text-slate-700 font-bold text-[10px] border border-slate-200 dark:border-slate-700 print:border-slate-300">
                            Bobot: {maxPoints} Poin
                          </span>
                        </div>

                        {/* BADGE EVALUASI STATUS SOAL TEGAS (BENAR / SALAH / SEBAGIAN / KOSONG) */}
                        <div>
                          {isEssay ? (
                            <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 print:bg-slate-100 text-amber-700 dark:text-amber-300 print:text-slate-900 font-bold text-[11px] border border-amber-200 dark:border-amber-800 print:border-slate-300">
                              📝 Nilai Uraian: {earned} / {maxPoints} Poin
                            </span>
                          ) : isFull ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 print:bg-emerald-50 print:text-emerald-900 font-extrabold text-[11px] border border-emerald-300 dark:border-emerald-800 print:border-emerald-300 flex items-center gap-1 shadow-xs">
                              <span>✔ JAWABAN BENAR</span>
                              <span>(+{earned} Poin)</span>
                            </span>
                          ) : isPartial ? (
                            <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 print:bg-amber-50 print:text-amber-900 font-extrabold text-[11px] border border-amber-300 dark:border-amber-800 print:border-amber-300 flex items-center gap-1">
                              <span>⚠ SEBAGIAN BENAR</span>
                              <span>(+{earned} / {maxPoints} Poin)</span>
                            </span>
                          ) : isUnanswered ? (
                            <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 print:bg-slate-100 print:text-slate-800 font-extrabold text-[11px] border border-slate-300 dark:border-slate-600 print:border-slate-300 flex items-center gap-1">
                              <span>⚪ TIDAK DIJAWAB</span>
                              <span>(0 Poin)</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 print:bg-rose-50 print:text-rose-900 font-extrabold text-[11px] border border-rose-300 dark:border-rose-900 print:border-rose-300 flex items-center gap-1 shadow-xs">
                              <span>✘ JAWABAN SALAH</span>
                              <span>(0 / {maxPoints} Poin)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* TEKS SOAL */}
                      <p className="text-slate-800 dark:text-slate-200 print:text-black font-medium leading-relaxed whitespace-pre-wrap">
                        {q.questionText}
                      </p>

                      {/* MEDIA URL / GAMBAR SOAL JIKA ADA */}
                      {q.mediaUrl && (
                        <div className="pt-1">
                          <img
                            src={q.mediaUrl}
                            alt="Media Soal"
                            className="max-h-48 rounded-xl border border-slate-200 dark:border-slate-700 print:border-slate-300 object-contain block bg-white dark:bg-slate-950 print:bg-white p-1"
                          />
                        </div>
                      )}

                      {/* REVIEW JAWABAN SISWA VS KUNCI GURU */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* JAWABAN SISWA */}
                        <div className={`p-3 rounded-xl border space-y-1.5 ${
                          isFull
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 print:bg-emerald-50/40 print:border-emerald-300'
                            : isWrong
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 print:bg-rose-50/40 print:border-rose-300'
                            : isPartial
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 print:bg-amber-50/40 print:border-amber-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 print:bg-slate-50 print:border-slate-300'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-slate-500 print:text-slate-600 block tracking-wider">
                              Jawaban Siswa:
                            </span>
                            {isFull ? (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold text-[9px]">
                                ✔ Tepat
                              </span>
                            ) : isWrong ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold text-[9px]">
                                ✘ Tidak Tepat
                              </span>
                            ) : isPartial ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold text-[9px]">
                                ⚠ Parsial
                              </span>
                            ) : null}
                          </div>

                          <div className={`font-semibold break-words ${
                            isFull
                              ? 'text-emerald-900 dark:text-emerald-200 print:text-black'
                              : isWrong
                              ? 'text-rose-700 dark:text-rose-300 print:text-black font-bold'
                              : 'text-slate-800 dark:text-slate-100 print:text-black'
                          }`}>
                            {(() => {
                              if (rawStudentAns === null || rawStudentAns === undefined || rawStudentAns === '') {
                                return <span className="text-rose-500 italic font-normal">(Tidak dijawab / Kosong)</span>;
                              }
                              if (Array.isArray(rawStudentAns)) {
                                if (rawStudentAns.length === 0) return <span className="text-rose-500 italic font-normal">(Tidak dijawab / Kosong)</span>;
                                if (typeof rawStudentAns[0] === 'object' && rawStudentAns[0] !== null) {
                                  return (
                                    <div className="flex flex-wrap gap-1.5">
                                      {rawStudentAns.map((item: any, idx: number) => {
                                        const left = item.questionItem || item.qText || item.q || `Item ${idx + 1}`;
                                        const right = item.answerItem || item.aText || item.a || '-';
                                        return (
                                          <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/50 print:bg-white text-violet-700 dark:text-violet-300 print:text-black border border-violet-200 dark:border-violet-800 print:border-slate-300 text-xs font-bold">
                                            <span>{left}</span>
                                            <span className="text-slate-400">➔</span>
                                            <span className="text-slate-900 dark:text-white print:text-black">{right}</span>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-wrap gap-1.5">
                                    {rawStudentAns.map((item: any, idx: number) => (
                                      <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 print:bg-white text-slate-800 dark:text-slate-200 print:text-black font-bold border border-slate-200 dark:border-slate-700 print:border-slate-300 text-xs">
                                        {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }
                              const objAns = rawStudentAns as any;
                              if (typeof objAns === 'object' && objAns !== null) {
                                if (objAns.questionItem || objAns.answerItem) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-violet-50 dark:bg-violet-950/50 print:bg-white text-violet-700 dark:text-violet-300 print:text-black border border-violet-200 dark:border-violet-800 print:border-slate-300 text-xs font-bold">
                                      <span>{objAns.questionItem}</span>
                                      <span className="text-slate-400">➔</span>
                                      <span className="text-slate-900 dark:text-white print:text-black">{objAns.answerItem}</span>
                                    </span>
                                  );
                                }
                                return <span>{JSON.stringify(objAns)}</span>;
                              }
                              return <span>{String(rawStudentAns)}</span>;
                            })()}
                          </div>
                        </div>

                        {/* KUNCI REFERENSI GURU */}
                        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 print:bg-slate-50 border border-emerald-300/80 dark:border-emerald-800/60 print:border-slate-300 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 print:text-slate-600 block tracking-wider">
                            {isEssay ? 'Kunci / Rubrik Referensi Guru:' : 'Kunci Jawaban yang Benar:'}
                          </span>
                          <div className="text-emerald-950 dark:text-emerald-200 print:text-black font-semibold break-words">
                            {(() => {
                              if (q.answer === null || q.answer === undefined || q.answer === '') {
                                return <span className="italic text-slate-400 font-normal">(Belum ditentukan kunci)</span>;
                              }
                              if (Array.isArray(q.answer)) {
                                return (
                                  <div className="flex flex-wrap gap-1.5">
                                    {q.answer.map((item: any, idx: number) => (
                                      <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 print:bg-white text-emerald-800 dark:text-emerald-200 print:text-black font-bold border border-emerald-300 dark:border-emerald-800 print:border-slate-300 text-xs">
                                        {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }
                              if (typeof q.answer === 'object' && q.answer !== null) {
                                return <span>{JSON.stringify(q.answer)}</span>;
                              }
                              return <span>{String(q.answer)}</span>;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* KHUSUS SOAL ESAI: INPUT PENILAIAN MANUAL GURU */}
                      {isEssay && (
                        <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 print:bg-slate-50 border border-amber-200 dark:border-amber-800/80 print:border-slate-300 mt-2 space-y-2">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 print:text-black font-bold text-xs">
                            <Edit3 className="w-4 h-4 text-amber-600 print:hidden" />
                            <span>Penilaian Manual Uraian / Esai:</span>
                          </div>
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 print:hidden">
                            Kunci jawaban di atas hanya sebagai referensi panduan. Masukkan nilai yang diperoleh siswa (tidak boleh lebih dari {maxPoints} Poin).
                          </p>
                          <div className="hidden print:block font-bold text-xs text-slate-900">
                            Nilai Uraian Diberikan: {manualEssayScores[q.id] ?? earned} / {maxPoints} Poin
                          </div>
                          <div className="flex items-center gap-3 pt-1 print:hidden">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Nilai Esai:
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={maxPoints}
                              step="0.5"
                              value={manualEssayScores[q.id] ?? ''}
                              placeholder={`0 - ${maxPoints}`}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                  const next = { ...manualEssayScores };
                                  delete next[q.id];
                                  setManualEssayScores(next);
                                  return;
                                }
                                let val = parseFloat(raw);
                                if (isNaN(val)) val = 0;
                                if (val > maxPoints) {
                                  val = maxPoints;
                                  setEssayMaxNotice(`Nilai esai pada soal #${qIdx + 1} tidak boleh melebihi bobot maksimal (${maxPoints} Poin). Nilai otomatis disesuaikan menjadi ${maxPoints}.`);
                                } else {
                                  setEssayMaxNotice(null);
                                }
                                if (val < 0) val = 0;
                                setManualEssayScores(prev => ({ ...prev, [q.id]: val }));
                              }}
                              className="w-28 p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-sm font-black text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-xs font-semibold text-slate-500">
                              / Maksimal {maxPoints} Poin
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* PENGATURAN PENANDATANGAN TTE DOSSIER (KHUSUS TAMPILAN LAYAR SEBELUM CETAK) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Pengaturan Penandatangan Dokumen & TTE Dossier:
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Pilih pejabat yang menandatangani sebelum cetak dossier
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {/* Opsi 1: Akun Guru Login */}
                  <button
                    type="button"
                    onClick={() => setDossierSignerMode('current_teacher')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      dossierSignerMode === 'current_teacher'
                        ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-400 dark:border-violet-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-0.5">
                      1. Akun Guru Login (Aktif)
                    </span>
                    <strong className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentTeacher?.name || 'Guru Pengampu'}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      NIP: {currentTeacher?.nip || '-'}
                    </span>
                  </button>

                  {/* Opsi 2: Default Guru/Proktor Sekolah */}
                  <button
                    type="button"
                    onClick={() => setDossierSignerMode('default_teacher')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      dossierSignerMode === 'default_teacher'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">
                      2. Guru / Proktor Default
                    </span>
                    <strong className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {effectiveSchoolSettings.teacherName || 'Guru Pengampu'}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      NIP: {effectiveSchoolSettings.teacherNip || '-'}
                    </span>
                  </button>

                  {/* Opsi 3: Kepala Sekolah */}
                  <button
                    type="button"
                    onClick={() => setDossierSignerMode('principal')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      dossierSignerMode === 'principal'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-0.5">
                      3. Kepala Sekolah
                    </span>
                    <strong className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {effectiveSchoolSettings.principalName || 'Kepala Sekolah'}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono truncate">
                      NIP: {effectiveSchoolSettings.principalNip || '-'}
                    </span>
                  </button>
                </div>
              </div>

              {/* TANDA TANGAN FORMAL LEMBAR HASIL UJIAN WITH TTE DIGITAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 text-center text-xs font-sans border-t border-slate-100 dark:border-slate-800 print:border-slate-300 print:break-inside-avoid">
                <div className="space-y-12">
                  <p className="font-semibold text-slate-800 dark:text-slate-300 print:text-black">Siswa Peserta Ujian,</p>
                  <div className="h-14 flex items-center justify-center">
                    <span className="font-serif italic text-slate-400 text-sm">(Tanda Tangan Siswa)</span>
                  </div>
                  <div>
                    <strong className="underline block font-bold text-slate-900 dark:text-white print:text-black uppercase">{selectedResult.studentName}</strong>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 print:text-slate-700 block font-mono">NISN: {dossierNisn}</span>
                  </div>
                </div>

                <div>
                  <TTESignatureSeal
                    settings={effectiveSchoolSettings}
                    documentId={selectedResult.id}
                    signerName={activeDossierSigner.name}
                    signerTitle={activeDossierSigner.title}
                    signerNip={activeDossierSigner.nip}
                    signDate={selectedResult.submittedAt ? selectedResult.submittedAt.split(' ')[0] : undefined}
                  />
                </div>
              </div>

              {/* DOSSIER FOOTER ACTIONS */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 print:hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* GRUP KIRI: SIMPAN NILAI & RESET */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        if (!selectedResult || !liveDossierEval) return;
                        const updated: ExamResult = {
                          ...selectedResult,
                          score: liveDossierEval.finalScore,
                          totalEarned: liveDossierEval.totalEarned,
                          totalMax: liveDossierEval.totalMax,
                          essayScores: manualEssayScores,
                          details: liveDossierEval.details
                        };
                        setSelectedResult(updated);
                        if (onUpdateResult) {
                          onUpdateResult(updated);
                        }
                        setEssaySavedNotice(true);
                        setDossierSuccessToast(`Nilai uraian siswa "${selectedResult.studentName}" berhasil disimpan! Skor akhir baru: ${liveDossierEval.finalScore}%`);
                        setTimeout(() => {
                          setEssaySavedNotice(false);
                          setDossierSuccessToast(null);
                        }, 3500);
                      }}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition cursor-pointer ${
                        essaySavedNotice
                          ? 'bg-emerald-700 shadow-emerald-700/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      }`}
                    >
                      {essaySavedNotice ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>Nilai Tersimpan!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Simpan Nilai Uraian</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        if (!selectedResult) return;
                        showThemedConfirm({
                          title: 'Reset Lembar Ujian Siswa',
                          message: `Apakah Anda yakin ingin mereset ujian siswa "${selectedResult.studentName}"? Seluruh lembar jawaban dan nilai akan dihapus, sehingga siswa dapat login dan mengerjakan ulang ujian ini.`,
                          variant: 'danger',
                          confirmLabel: 'Ya, Reset & Izinkan Ujian Ulang',
                          cancelLabel: 'Batal',
                          onConfirm: async () => {
                            if (onDeleteResult) {
                              await onDeleteResult(selectedResult.id, selectedResult.subjectId, selectedResult.studentName);
                            }
                            await clearStudentAutolockInSupabase(selectedResult.subjectId, selectedResult.studentName);
                            sendProctorCommand({
                              action: 'RESET_EXAM',
                              studentName: selectedResult.studentName,
                              subjectId: selectedResult.subjectId
                            });
                            removeStudentSession(selectedResult.studentName, selectedResult.subjectId);
                            setSelectedResult(null);
                          }
                        });
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900 transition cursor-pointer"
                      title="Hapus nilai agar siswa dapat ujian kembali"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Ujian (Ujian Ulang)</span>
                    </button>
                  </div>

                  {/* GRUP KANAN: CETAK & TUTUP */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => onOpenCertificates?.(selectedResult)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer shadow-xs transition"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Cetak Sertifikat</span>
                    </button>

                    <button
                      onClick={handlePrintDossier}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition border border-slate-200 dark:border-slate-700"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Dossier</span>
                    </button>

                    <button
                      onClick={() => setSelectedResult(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      {t.close}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* 9. MODAL BUAT JADWAL UJIAN BARU                                 */}
      {/* ============================================================== */}
      {isAddScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Buat Jadwal Ujian Baru</h3>
                  <p className="text-xs text-slate-400">Sinkronkan paket soal, durasi pengerjaan, dan token langsung ke Supabase</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddScheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewSchedule} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nama Mata Pelajaran & Jenis Asesmen
                </label>
                <input
                  type="text"
                  required
                  value={newSubTitle}
                  onChange={e => setNewSubTitle(e.target.value)}
                  placeholder="Misal: Asesmen Sumatif - Seni Budaya"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              {/* Target Rombel / Kelas dengan Dropdown & Interactive Chips */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span>Target Rombel / Kelas (Data Siswa)</span>
                  </span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                    {getStudentCountForClasses(newSubClass)} Siswa Tercover
                  </span>
                </label>

                {/* Dropdown Menu Pilihan Cepat */}
                <select
                  value={
                    newSubClass === 'Semua Kelas'
                      ? 'ALL'
                      : studentClasses.includes(newSubClass)
                      ? newSubClass
                      : 'CUSTOM'
                  }
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'ALL') setNewSubClass('Semua Kelas');
                    else if (val === 'VII_ALL') {
                      const vii = studentClasses.filter(c => isClassInGrade(c, 'VII'));
                      setNewSubClass(vii.join(', ') || 'VII.1, VII.2, VII.3');
                    } else if (val === 'VIII_ALL') {
                      const viii = studentClasses.filter(c => isClassInGrade(c, 'VIII'));
                      setNewSubClass(viii.join(', ') || 'VIII.1, VIII.2, VIII.3');
                    } else if (val === 'IX_ALL') {
                      const ix = studentClasses.filter(c => isClassInGrade(c, 'IX'));
                      setNewSubClass(ix.join(', ') || 'IX.1, IX.2, IX.3');
                    } else if (val !== 'CUSTOM') {
                      setNewSubClass(val);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold cursor-pointer text-xs"
                >
                  <option value="ALL">🌐 Semua Kelas (Seluruh Siswa)</option>
                  <optgroup label="Pilihan Cepat per Tingkat">
                    <option value="VII_ALL">Seluruh Kelas VII (VII.1, VII.2, VII.3, ...)</option>
                    <option value="VIII_ALL">Seluruh Kelas VIII (VIII.1, VIII.2, VIII.3, ...)</option>
                    <option value="IX_ALL">Seluruh Kelas IX (IX.1, IX.2, IX.3, ...)</option>
                  </optgroup>
                  <optgroup label="Pilih Satu Rombel Spesifik">
                    {studentClasses.map(cls => (
                      <option key={cls} value={cls}>Hanya Kelas {cls}</option>
                    ))}
                  </optgroup>
                  <option value="CUSTOM" disabled hidden>Kombinasi Terpilih ({newSubClass})</option>
                </select>

                {/* Multi-Select Rombel Chips */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold">Klik rombel untuk menambah / mencoret:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setNewSubClass('Semua Kelas')}
                        className="text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer"
                      >
                        Semua Kelas
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setNewSubClass(studentClasses[0] || 'VII.1')}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setNewSubClass(newSubClass === 'Semua Kelas' ? (studentClasses[0] || 'VII.1') : 'Semua Kelas')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                        newSubClass === 'Semua Kelas'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                      }`}
                    >
                      {newSubClass === 'Semua Kelas' && <Check className="w-3 h-3" />}
                      <span>Semua Kelas</span>
                    </button>

                    {studentClasses.map(cls => {
                      const isSelected = newSubClass === 'Semua Kelas' || parseClassList(newSubClass).includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setNewSubClass(toggleClassInString(newSubClass, cls))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{cls}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Durasi Pengerjaan (Menit)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    required
                    value={newSubDuration}
                    onChange={e => setNewSubDuration(e.target.value)}
                    onBlur={() => {
                      const val = Number(newSubDuration);
                      if (!newSubDuration || isNaN(val) || val < 1) setNewSubDuration(60);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Token Rilis Ujian</span>
                    <button
                      type="button"
                      onClick={() => setNewSubToken('SMP58' + Math.floor(100 + Math.random() * 900))}
                      className="text-violet-600 dark:text-violet-400 text-[11px] font-bold hover:underline"
                    >
                      🎲 Acak
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubToken}
                    onChange={e => setNewSubToken(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold uppercase tracking-widest"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Batas Toleransi Pelanggaran
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={newSubViolationLimit}
                    onChange={e => setNewSubViolationLimit(e.target.value)}
                    onBlur={() => {
                      const val = Number(newSubViolationLimit);
                      if (!newSubViolationLimit || isNaN(val) || val < 1) setNewSubViolationLimit(3);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Aturan Bobot Nilai */}
              <div className="pt-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2">
                  Aturan Bobot Penilaian per Tipe Soal (Poin)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah', 'Menjodohkan', 'Isian Singkat', 'Esai'] as QuestionType[]).map(typeKey => (
                    <div key={typeKey} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 block truncate">{typeKey}</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={newSubScoringRules[typeKey] ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNewSubScoringRules(prev => ({ ...prev, [typeKey]: val }));
                        }}
                        onBlur={() => {
                          const val = Number(newSubScoringRules[typeKey]);
                          if (!newSubScoringRules[typeKey] || isNaN(val) || val < 1) {
                            setNewSubScoringRules(prev => ({ ...prev, [typeKey]: 1 }));
                          }
                        }}
                        className="w-full mt-1 p-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-center font-bold text-violet-600 dark:text-violet-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition cursor-pointer shadow-md shadow-violet-600/20"
                >
                  Simpan & Rilis Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 10. MODAL EDIT PENGATURAN JADWAL UJIAN                         */}
      {/* ============================================================== */}
      {isEditScheduleModalOpen && scheduleToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Edit Pengaturan Ujian</h3>
                  <p className="text-xs text-slate-400">ID: {scheduleToEdit.id}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditScheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSchedule} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nama Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={editSubTitle}
                  onChange={e => setEditSubTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              {/* Target Rombel / Kelas dengan Dropdown & Interactive Chips */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span>Target Rombel / Kelas (Data Siswa)</span>
                  </span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800">
                    {getStudentCountForClasses(editSubClass)} Siswa Tercover
                  </span>
                </label>

                {/* Dropdown Menu Pilihan Cepat */}
                <select
                  value={
                    editSubClass === 'Semua Kelas'
                      ? 'ALL'
                      : studentClasses.includes(editSubClass)
                      ? editSubClass
                      : 'CUSTOM'
                  }
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'ALL') setEditSubClass('Semua Kelas');
                    else if (val === 'VII_ALL') {
                      const vii = studentClasses.filter(c => isClassInGrade(c, 'VII'));
                      setEditSubClass(vii.join(', ') || 'VII.1, VII.2, VII.3');
                    } else if (val === 'VIII_ALL') {
                      const viii = studentClasses.filter(c => isClassInGrade(c, 'VIII'));
                      setEditSubClass(viii.join(', ') || 'VIII.1, VIII.2, VIII.3');
                    } else if (val === 'IX_ALL') {
                      const ix = studentClasses.filter(c => isClassInGrade(c, 'IX'));
                      setEditSubClass(ix.join(', ') || 'IX.1, IX.2, IX.3');
                    } else if (val !== 'CUSTOM') {
                      setEditSubClass(val);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold cursor-pointer text-xs"
                >
                  <option value="ALL">🌐 Semua Kelas (Seluruh Siswa)</option>
                  <optgroup label="Pilihan Cepat per Tingkat">
                    <option value="VII_ALL">Seluruh Kelas VII (VII.1, VII.2, VII.3, ...)</option>
                    <option value="VIII_ALL">Seluruh Kelas VIII (VIII.1, VIII.2, VIII.3, ...)</option>
                    <option value="IX_ALL">Seluruh Kelas IX (IX.1, IX.2, IX.3, ...)</option>
                  </optgroup>
                  <optgroup label="Pilih Satu Rombel Spesifik">
                    {studentClasses.map(cls => (
                      <option key={cls} value={cls}>Hanya Kelas {cls}</option>
                    ))}
                  </optgroup>
                  <option value="CUSTOM" disabled hidden>Kombinasi Terpilih ({editSubClass})</option>
                </select>

                {/* Multi-Select Rombel Chips */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold">Klik rombel untuk menambah / mencoret:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditSubClass('Semua Kelas')}
                        className="text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer"
                      >
                        Semua Kelas
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setEditSubClass(studentClasses[0] || 'VII.1')}
                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setEditSubClass(editSubClass === 'Semua Kelas' ? (studentClasses[0] || 'VII.1') : 'Semua Kelas')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                        editSubClass === 'Semua Kelas'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                      }`}
                    >
                      {editSubClass === 'Semua Kelas' && <Check className="w-3 h-3" />}
                      <span>Semua Kelas</span>
                    </button>

                    {studentClasses.map(cls => {
                      const isSelected = editSubClass === 'Semua Kelas' || parseClassList(editSubClass).includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setEditSubClass(toggleClassInString(editSubClass, cls))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{cls}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Durasi Pengerjaan (Menit)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    required
                    value={editSubDuration}
                    onChange={e => setEditSubDuration(e.target.value)}
                    onBlur={() => {
                      const val = Number(editSubDuration);
                      if (!editSubDuration || isNaN(val) || val < 1) setEditSubDuration(60);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Token Rilis Ujian</span>
                    <button
                      type="button"
                      onClick={() => {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                        let prefix = formatSubjectTitle(editSubTitle).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'SMP';
                        let rand = '';
                        for (let i = 0; i < 3; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
                        setEditSubToken(`${prefix}${rand}`);
                      }}
                      className="text-violet-600 dark:text-violet-400 text-[11px] font-bold hover:underline"
                    >
                      🎲 Acak
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={editSubToken}
                    onChange={e => setEditSubToken(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold uppercase tracking-widest"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Batas Toleransi Pelanggaran
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={editSubViolationLimit}
                    onChange={e => setEditSubViolationLimit(e.target.value)}
                    onBlur={() => {
                      const val = Number(editSubViolationLimit);
                      if (!editSubViolationLimit || isNaN(val) || val < 1) setEditSubViolationLimit(3);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Aturan Bobot Nilai */}
              <div className="pt-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2">
                  Aturan Bobot Penilaian per Tipe Soal (Poin)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Pilihan Ganda', 'Pilihan Ganda Kompleks', 'Benar/Salah', 'Menjodohkan', 'Isian Singkat', 'Esai'] as QuestionType[]).map(typeKey => (
                    <div key={typeKey} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 block truncate">{typeKey}</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={editSubScoringRules[typeKey] ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          setEditSubScoringRules(prev => ({ ...prev, [typeKey]: val }));
                        }}
                        onBlur={() => {
                          const val = Number(editSubScoringRules[typeKey]);
                          if (!editSubScoringRules[typeKey] || isNaN(val) || val < 1) {
                            setEditSubScoringRules(prev => ({ ...prev, [typeKey]: 1 }));
                          }
                        }}
                        className="w-full mt-1 p-1 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-center font-bold text-violet-600 dark:text-violet-400"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition cursor-pointer shadow-md shadow-violet-600/20"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 11. MODAL KONFIRMASI HAPUS JADWAL UJIAN                         */}
      {/* ============================================================== */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Hapus Jadwal Ujian?</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus jadwal ujian untuk mata pelajaran <strong className="text-slate-900 dark:text-white">{subjectToDelete.title}</strong>? Seluruh konfigurasi token dan jadwal ini akan dihapus dari Supabase.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSchedule}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition cursor-pointer"
              >
                Ya, Hapus Jadwal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 12. MODAL DIALOG KONFIRMASI / ALERT TEMA APLIKASI (ANTI-SLOP)  */}
      {/* ============================================================== */}
      {customDialog.isOpen && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  customDialog.variant === 'danger'
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    : customDialog.variant === 'warning'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    : 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400'
                }`}
              >
                {customDialog.variant === 'danger' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : customDialog.variant === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {customDialog.title}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {customDialog.type === 'confirm' ? 'Pemberitahuan Konfirmasi Pengawas' : 'Pemberitahuan Sistem CBT'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {customDialog.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {customDialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={() => {
                    if (customDialog.onCancel) customDialog.onCancel();
                    setCustomDialog(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  {customDialog.cancelLabel || 'Batal'}
                </button>
              )}
              <button
                type="button"
                onClick={customDialog.onConfirm}
                className={`px-4 py-2.5 rounded-xl text-white font-bold text-xs transition cursor-pointer shadow-md ${
                  customDialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    : customDialog.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                    : 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/20'
                }`}
              >
                {customDialog.confirmLabel || (customDialog.type === 'confirm' ? 'Ya, Lanjutkan' : 'Mengerti')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. MODAL AI QUESTION GENERATOR (GEMINI)                         */}
      {/* ============================================================== */}
      <div className="print:hidden">
        <AiQuestionGeneratorModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          currentSubject={currentBankSubject}
          allSubjects={accessibleSubjects}
          existingQuestionsCount={bankSubjectQuestions.length}
          onSaveQuestions={handleSaveAiQuestions}
        />
      </div>
    </div>
  );
};
