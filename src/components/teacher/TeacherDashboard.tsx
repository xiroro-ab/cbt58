'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Subject, Question, QuestionType, ExamResult, Student, Teacher, ScoringRules } from '@/types/cbt';
import { NavItem } from '../layout/Sidebar';
import { useLanguage } from '@/context/LanguageContext';
import { StudentManagement } from './StudentManagement';
import {
  TrendingUp,
  Award,
  Users,
  BookOpen,
  Calendar,
  Send,
  MoreVertical,
  Edit2,
  Edit3,
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
  BarChart3
} from 'lucide-react';

interface TeacherDashboardProps {
  currentNav: NavItem;
  subject: Subject;
  questions: Question[];
  results: ExamResult[];
  students?: Student[];
  currentTeacher?: Teacher | null;
  allSubjects?: Subject[];
  onSelectSubject?: (sub: Subject) => void;
  onUpdateSubject: (updatedSubject: Subject) => void;
  onAddSubject?: (newSub: Subject) => void;
  onDeleteSubject?: (subId: string) => void;
  onAddQuestion: (newQuestion: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
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
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentNav,
  subject,
  questions,
  results,
  students = [],
  currentTeacher,
  allSubjects,
  onSelectSubject,
  onUpdateSubject,
  onAddSubject,
  onDeleteSubject,
  onAddQuestion,
  onDeleteQuestion,
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
  onOpenCertificates
}) => {
  const { language, t } = useLanguage();
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);

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
  const [createdSubjectIds, setCreatedSubjectIds] = useState<string[]>([]);

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

  // Live Filtering dari Search Bar
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return results;
    const q = searchQuery.toLowerCase();
    return results.filter(
      r =>
        r.studentName.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q) ||
        String(r.score).includes(q)
    );
  }, [results, searchQuery]);

  // Helper tampilan nama mapel rapi tanpa prefix berlebih
  const formatSubjectTitle = (title: string) => {
    if (!title) return '';
    return title
      .replace(/^Asesmen Sumatif( Akhir)?( Tengah)? Semester( - )?/i, '')
      .replace(/^Asesmen Sumatif - /i, '')
      .trim();
  };

  // Daftar mapel yang berhak diakses (Admin: SEMUA mapel; Guru Mapel: HANYA mapel miliknya atau yang baru dibuatnya)
  const accessibleSubjects = useMemo(() => {
    const rawAll = allSubjects !== undefined ? allSubjects : (subject?.id ? [subject] : []);
    const all = rawAll.filter(s => s && s.id && !deletedSubjectIds.includes(s.id));

    if (currentTeacher?.role === 'admin' || !currentTeacher) {
      return all;
    }

    const isCreatedBySelf = (s: Subject) => createdSubjectIds.includes(s.id);

    if (currentTeacher.assignments && currentTeacher.assignments.length > 0) {
      const assignedMapelNames = currentTeacher.assignments.map(a => a.subject.toLowerCase());
      const filtered = all.filter(s => {
        if (isCreatedBySelf(s)) return true;
        const sLower = s.title.toLowerCase();
        return assignedMapelNames.some(name => sLower.includes(name) || name.includes(sLower));
      });
      return filtered;
    }

    if (currentTeacher.subject) {
      const tSubjectLower = currentTeacher.subject.toLowerCase();
      const matched = all.filter(s => isCreatedBySelf(s) || s.title.toLowerCase().includes(tSubjectLower));
      return matched;
    }

    return all;
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

  // Butir soal milik mapel yang sedang aktif dipilih
  const bankSubjectQuestions = useMemo(() => {
    return questions.filter(
      q => q.subjectId === selectedBankSubjectId || (!q.subjectId && selectedBankSubjectId === subject.id)
    );
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

    const parsedScoringRules: ScoringRules = Object.fromEntries(
      Object.entries(editSubScoringRules).map(([k, v]) => [k, Number(v) || 1])
    ) as ScoringRules;

    const updated: Subject = {
      ...scheduleToEdit,
      title: editSubTitle.trim(),
      className: editSubClass.trim() || 'Semua Kelas',
      durationMinutes: Number(editSubDuration) || 60,
      token: editSubToken.trim().toUpperCase(),
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

    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`;
    const parsedScoringRules: ScoringRules = Object.fromEntries(
      Object.entries(newSubScoringRules).map(([k, v]) => [k, Number(v) || 1])
    ) as ScoringRules;

    const newSub: Subject = {
      id: newId,
      title: newSubTitle.trim(),
      className: newSubClass.trim() || 'Semua Kelas',
      durationMinutes: Number(newSubDuration) || 60,
      token: newSubToken.trim().toUpperCase(),
      violationLimit: Number(newSubViolationLimit) || 3,
      isActive: true,
      scoringRules: parsedScoringRules
    };

    setCreatedSubjectIds(prev => [...prev, newId]);
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

  // State untuk Menu Dokumen & Berita Acara Ujian
  const [selectedDocType, setSelectedDocType] = useState<'bap' | 'attendance' | 'cards' | 'ledger'>('bap');
  const [selectedDocClass, setSelectedDocClass] = useState<string>('Semua Kelas');
  const [selectedDocSubjectId, setSelectedDocSubjectId] = useState<string>('');

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students?.forEach(s => {
      if (s.className) set.add(s.className.trim());
    });
    return Array.from(set).sort();
  }, [students]);

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
    if (results.length === 0) return;
    const headers = ['Nama Siswa', 'Kelas', 'Skor Akhir (%)', 'Poin Diperoleh', 'Poin Maksimal', 'Jumlah Pelanggaran', 'Waktu Selesai'];
    const rows = results.map(r => [
      `"${r.studentName}"`,
      `"${r.className}"`,
      r.score,
      r.totalEarned,
      r.totalMax,
      r.violationCount,
      `"${r.submittedAt}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Nilai_CBT_${subject.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full transition-colors">
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

          {/* B. MIDDLE SECTION: 2 ANALYTICS CHARTS (REAL DATA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Rata-Rata Capaian Nilai per Kelas (Real Data) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Rata-Rata Nilai per Kelas / Rombel
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Capaian riil siswa berdasarkan hasil ujian yang telah diserahkan
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">Rata-Rata Kelas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">KKM (75)</span>
                  </div>
                </div>
              </div>

              {classPerformance.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                  <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-1" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Belum ada hasil ujian masuk</p>
                  <p className="text-[11px] text-slate-400">Rata-rata capaian tiap kelas akan terplot otomatis saat siswa selesai ujian.</p>
                </div>
              ) : (
                <div className="pt-2 space-y-3">
                  <div className="h-40 flex items-end gap-3 pt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                    {classPerformance.map((cp) => (
                      <div key={cp.className} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {cp.avgScore}
                        </span>
                        <div
                          style={{ height: `${Math.max(12, Math.min(100, cp.avgScore))}%` }}
                          className={`w-full max-w-[48px] rounded-t-lg transition-all ${
                            cp.avgScore >= 75 ? 'bg-violet-600 hover:bg-violet-500' : 'bg-amber-500 hover:bg-amber-400'
                          }`}
                          title={`${cp.className}: Rata-rata ${cp.avgScore} (${cp.total} siswa)`}
                        ></div>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate max-w-full">
                          {cp.className}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>* Garis batas kelulusan KKM: 75</span>
                    <span>Total {classPerformance.length} Kelas Mengikuti Ujian</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Distribusi Sebaran Nilai Siswa (Real Data) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Distribusi Sebaran Nilai Siswa
                </h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Pengelompokan skor riil seluruh peserta ujian
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <span className="text-slate-600 dark:text-slate-400">≥ 90 (Sangat Baik): {scoreDistribution.sangatBaik.count} Siswa</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                    <span className="text-slate-600 dark:text-slate-400">75 - 89 (Baik): {scoreDistribution.baik.count} Siswa</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="text-slate-600 dark:text-slate-400">60 - 74 (Cukup): {scoreDistribution.cukup.count} Siswa</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="text-slate-600 dark:text-slate-400">&lt; 60 (Remedial): {scoreDistribution.remedial.count} Siswa</span>
                  </div>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                  <Award className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-1" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Belum ada sebaran nilai</p>
                  <p className="text-[11px] text-slate-400">Histogram sebaran nilai akan langsung terbentuk saat ujian dimulai.</p>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {/* Single comprehensive distribution bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>Proporsi Keseluruhan ({results.length} Siswa)</span>
                      <span className="text-slate-400 font-normal">{passRate}% Memenuhi KKM</span>
                    </div>
                    <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden gap-0.5 p-0.5 shadow-inner">
                      {scoreDistribution.sangatBaik.pct > 0 && (
                        <div
                          style={{ width: `${scoreDistribution.sangatBaik.pct}%` }}
                          className="h-full rounded-sm bg-violet-600 transition-all"
                          title={`Sangat Baik: ${scoreDistribution.sangatBaik.count} siswa (${scoreDistribution.sangatBaik.pct}%)`}
                        ></div>
                      )}
                      {scoreDistribution.baik.pct > 0 && (
                        <div
                          style={{ width: `${scoreDistribution.baik.pct}%` }}
                          className="h-full rounded-sm bg-teal-500 transition-all"
                          title={`Baik: ${scoreDistribution.baik.count} siswa (${scoreDistribution.baik.pct}%)`}
                        ></div>
                      )}
                      {scoreDistribution.cukup.pct > 0 && (
                        <div
                          style={{ width: `${scoreDistribution.cukup.pct}%` }}
                          className="h-full rounded-sm bg-amber-400 transition-all"
                          title={`Cukup: ${scoreDistribution.cukup.count} siswa (${scoreDistribution.cukup.pct}%)`}
                        ></div>
                      )}
                      {scoreDistribution.remedial.pct > 0 && (
                        <div
                          style={{ width: `${scoreDistribution.remedial.pct}%` }}
                          className="h-full rounded-sm bg-rose-500 transition-all"
                          title={`Remedial: ${scoreDistribution.remedial.count} siswa (${scoreDistribution.remedial.pct}%)`}
                        ></div>
                      )}
                    </div>
                  </div>

                  {/* Class breakdown bars if available */}
                  <div className="space-y-2 pt-2">
                    {classPerformance.map((cp) => {
                      const classResults = results.filter(r => (r.className?.trim() || 'Umum') === cp.className);
                      const totalC = classResults.length || 1;
                      const sb = Math.round((classResults.filter(r => r.score >= 90).length / totalC) * 100);
                      const b = Math.round((classResults.filter(r => r.score >= 75 && r.score < 90).length / totalC) * 100);
                      const c = Math.round((classResults.filter(r => r.score >= 60 && r.score < 75).length / totalC) * 100);
                      const rem = Math.round((classResults.filter(r => r.score < 60).length / totalC) * 100);

                      return (
                        <div key={cp.className} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>{cp.className} ({classResults.length} Siswa)</span>
                            <span className="text-xs text-violet-600 dark:text-violet-400 font-bold">Rata-rata: {cp.avgScore}</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden gap-0.5 p-0.5">
                            {sb > 0 && <div style={{ width: `${sb}%` }} className="h-full rounded-sm bg-violet-600"></div>}
                            {b > 0 && <div style={{ width: `${b}%` }} className="h-full rounded-sm bg-teal-500"></div>}
                            {c > 0 && <div style={{ width: `${c}%` }} className="h-full rounded-sm bg-amber-400"></div>}
                            {rem > 0 && <div style={{ width: `${rem}%` }} className="h-full rounded-sm bg-rose-500"></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* 1.B TAMPILAN STATISTIK & ANALISIS BUTIR SOAL MENDALAM            */}
      {/* ============================================================== */}
      {currentNav === 'statistics' && (
        <div className="space-y-6">
          {/* Header Statistik */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-violet-600" />
                <span>Statistik & Analisis Butir Soal Empiris</span>
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Evaluasi daya serap materi, indeks tingkat kesukaran soal, dan log integritas ruang ujian.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 font-bold text-xs border border-violet-200 dark:border-violet-800">
                Mapel: {currentBankSubject.title}
              </span>
            </div>
          </div>

          {/* 3 Metric Cards Statistik */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-400">Rata-Rata Capaian Ujian</span>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{avgScore} Poin</h4>
              <p className="text-xs text-slate-500">Dari total {results.length} lembar jawaban siswa terkumpul</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-400">Ketuntasan Klasikal KKM</span>
              <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{passRate}% Tuntas</h4>
              <p className="text-xs text-slate-500">{passedStudentsCount} siswa tuntas • {remedialStudentsCount} perlu remedial</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-400">Audit Integritas Layar</span>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white">
                {results.filter(r => r.violationCount === 0).length} Siswa Tertib
              </h4>
              <p className="text-xs text-rose-500 font-semibold">
                {results.filter(r => r.violationCount > 0).length} siswa terdeteksi alih jendela
              </p>
            </div>
          </div>

          {/* TABEL ANALISIS TINGKAT KESUKARAN BUTIR SOAL */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tabel Tingkat Kesukaran Butir Soal (Difficulty Index)
                </h4>
                <p className="text-xs text-slate-400">
                  Dihitung otomatis berdasarkan jawaban seluruh peserta pada paket soal ini
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold">{questionItemAnalysis.length} Butir Dianalisis</span>
            </div>

            {questionItemAnalysis.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Belum ada butir soal pada mapel ini untuk dianalisis.
              </div>
            ) : (
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
                    {questionItemAnalysis.map((item) => (
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
                    ))}
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
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t.tableTitle}</span>
                {searchQuery && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 font-bold">
                    Filter: &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {t.tableSubtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tombol Cetak Sertifikat Aktif */}
              <button
                onClick={() => {
                  const firstSelected = results.find(r => selectedResultIds.includes(r.id)) || results[0];
                  onOpenCertificates?.(firstSelected);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <Award className="w-3.5 h-3.5 text-violet-600" />
                <span>{t.sendCertificatesBtn}</span>
              </button>

              {/* Tombol Ekspor CSV / Excel Aktif */}
              <button
                onClick={exportResultsToCSV}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.exportCsvBtn}</span>
              </button>
            </div>
          </div>

          {/* Banner Pilihan Baris */}
          {selectedResultIds.length > 0 && (
            <div className="px-5 py-2.5 bg-violet-50 dark:bg-violet-950/40 border-b border-violet-100 dark:border-violet-900 flex items-center justify-between text-xs">
              <span className="font-semibold text-violet-900 dark:text-violet-200">
                {selectedResultIds.length} siswa dipilih
              </span>
              <button
                onClick={() => {
                  const target = results.find(r => selectedResultIds.includes(r.id));
                  onOpenCertificates?.(target);
                }}
                className="px-3 py-1 rounded-lg bg-violet-600 text-white font-bold text-[11px]"
              >
                Cetak Sertifikat Siswa Terpilih
              </button>
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
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      {t.noResults}
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
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 text-white font-bold text-[11px] flex items-center justify-center">
                            {r.studentName.charAt(0)}
                          </div>
                          <span className="text-slate-900 dark:text-white font-bold">{r.studentName}</span>
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
                    {currentTeacher?.role === 'admin'
                      ? `Akses Superadmin: Menampilkan seluruh mata pelajaran sekolah (${accessibleSubjects.length} Paket Soal)`
                      : `Mata pelajaran diampu oleh ${currentTeacher?.name || 'Guru'} (${accessibleSubjects.length} Paket Soal)`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {currentTeacher?.role === 'admin' && (
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
                      : currentTeacher?.role !== 'admin'
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
                    const qCount = questions.filter(q => q.subjectId === subItem.id).length;

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
                      Mata pelajaran ini belum memiliki butir soal ujian. Klik tombol "+ Tambah Soal" di atas untuk mulai membuat soal.
                    </p>
                    <button
                      onClick={onOpenAddModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Tambah Butir Soal Pertama</span>
                    </button>
                  </div>
                ) : (
                  filteredBankQuestions.map((q, idx) => {
                    const weight = currentBankSubject.scoringRules?.[q.type] || 1;
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
                          <button
                            onClick={() => onDeleteQuestion(q.id)}
                            className="text-slate-400 hover:text-rose-500 p-1.5 transition cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            title={t.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                {accessibleSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>

              {/* Selector Kelas */}
              <select
                value={selectedDocClass}
                onChange={e => setSelectedDocClass(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
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
                      <strong className="text-sm font-bold text-slate-900">{currentBankSubject.title}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Rombongan Belajar / Kelas:</span>
                      <strong className="text-sm font-bold text-slate-900">
                        {selectedDocClass === 'Semua Kelas' ? (currentBankSubject.className || 'Semua Kelas') : selectedDocClass}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Durasi Ujian / Token Rilis:</span>
                      <strong className="text-sm font-bold text-slate-900">{currentBankSubject.durationMinutes} Menit • Token: {currentBankSubject.token}</strong>
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
                            ? results.length
                            : results.filter(r => r.className === selectedDocClass).length} Siswa
                        </strong>
                      </div>
                      <div className="p-3 border border-slate-200 rounded-lg bg-rose-50/50">
                        <span className="block text-[11px] text-rose-700">Tidak Hadir / Izin</span>
                        <strong className="text-base font-bold text-rose-800">
                          {Math.max(0, (selectedDocClass === 'Semua Kelas'
                            ? (students?.length || 0) - results.length
                            : (students?.filter(s => s.className === selectedDocClass).length || 0) - results.filter(r => r.className === selectedDocClass).length))} Siswa
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
                        <strong className="underline block font-bold text-slate-900">{currentTeacher?.name || 'Hendra Wijaya, S.Pd'}</strong>
                        <span className="text-[11px] text-slate-500">NIP: {currentTeacher?.nip || '198704202012011004'}</span>
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
                      <p>Mengetahui,<br />Kepala SMP Negeri 58,</p>
                      <div>
                        <strong className="underline block font-bold text-slate-900">Hj. Rohana, S.Pd., M.Si.</strong>
                        <span className="text-[11px] text-slate-500">NIP: 196805121994122001</span>
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
                    Mata Pelajaran: <strong>{currentBankSubject.title}</strong> • Rombel: <strong>{selectedDocClass}</strong>
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
                        .filter(s => selectedDocClass === 'Semua Kelas' || s.className === selectedDocClass)
                        .slice(0, 35)
                        .map((std, idx) => {
                          const hasSubmitted = results.some(r => r.studentName.toLowerCase() === std.name.toLowerCase());
                          return (
                            <tr key={std.id} className="border-b border-slate-300">
                              <td className="py-2 px-3 text-center font-bold border-r border-slate-900">{idx + 1}</td>
                              <td className="py-2 px-3 border-r border-slate-900 text-center font-mono">{std.nisn || `008${idx}942`}</td>
                              <td className="py-2 px-3 border-r border-slate-900 font-semibold uppercase">{std.name}</td>
                              <td className="py-2 px-3 border-r border-slate-900 text-center">{std.className}</td>
                              <td className="py-2 px-3 border-r border-slate-900 text-center font-semibold">
                                {hasSubmitted ? (
                                  <span className="text-emerald-700">Hadir / Selesai</span>
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
                    <p className="text-[11px] text-slate-500">* Dokumen presensi resmi dicetak otomatis dari sistem CBT SMPN 58 Palembang</p>
                  </div>
                  <div className="text-center space-y-16">
                    <p>Palembang, 30 Oktober 2026<br />Pengawas Ruang,</p>
                    <div>
                      <strong className="underline block font-bold text-slate-900">{currentTeacher?.name || 'Hendra Wijaya, S.Pd'}</strong>
                      <span className="text-[11px] text-slate-500">NIP: {currentTeacher?.nip || '198704202012011004'}</span>
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
                    SMP Negeri 58 Palembang • Rombel: <strong>{selectedDocClass}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {(students || [])
                    .filter(s => selectedDocClass === 'Semua Kelas' || s.className === selectedDocClass)
                    .slice(0, 12)
                    .map((std, idx) => (
                      <div key={std.id} className="p-4 border-2 border-slate-900 rounded-xl space-y-3 bg-white text-xs">
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
                              <span className="font-mono font-bold text-violet-700 bg-violet-50 px-1 rounded">{currentBankSubject.token}</span>
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
                    Mata Pelajaran: <strong>{currentBankSubject.title}</strong> • Standar KKM: <strong>75</strong> • Rombel: <strong>{selectedDocClass}</strong>
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
                      {results
                        .filter(r => selectedDocClass === 'Semua Kelas' || r.className === selectedDocClass)
                        .map((res, idx) => {
                          const pred = res.score >= 90 ? 'A' : res.score >= 75 ? 'B' : res.score >= 60 ? 'C' : 'D';
                          const isPass = res.score >= 75;
                          return (
                            <tr key={res.id} className="border-b border-slate-300 text-center">
                              <td className="py-2 px-3 font-bold border-r border-slate-900">{idx + 1}</td>
                              <td className="py-2 px-3 border-r border-slate-900 font-semibold text-left uppercase">{res.studentName}</td>
                              <td className="py-2 px-3 border-r border-slate-900">{res.className}</td>
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
                      {results.filter(r => selectedDocClass === 'Semua Kelas' || r.className === selectedDocClass).length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Belum ada lembar nilai untuk rombel ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs font-sans">
                  <div className="space-y-16">
                    <p>Mengetahui,<br />Kepala SMP Negeri 58,</p>
                    <div>
                      <strong className="underline block font-bold text-slate-900">Hj. Rohana, S.Pd., M.Si.</strong>
                      <span className="text-[11px] text-slate-500">NIP: 196805121994122001</span>
                    </div>
                  </div>

                  <div className="space-y-16">
                    <p>Palembang, 30 Oktober 2026<br />Guru Mata Pelajaran,</p>
                    <div>
                      <strong className="underline block font-bold text-slate-900">{currentTeacher?.name || 'Guru Pengampu'}</strong>
                      <span className="text-[11px] text-slate-500">NIP: {currentTeacher?.nip || '198704202012011004'}</span>
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
              const qCount = questions.filter(q => q.subjectId === subItem.id).length;
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
      {/* 6. TAMPILAN SETTINGS / SUPABASE INTEGRASI                      */}
      {/* ============================================================== */}
      {currentNav === 'settings' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.navSettings}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Konfigurasi arsitektur cloud, anti-cheat, dan keamanan ujian</p>
          </div>

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
      {/* 7. MODAL TAMBAH SOAL BARU                                       */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.addQuestionTitle}</h3>
                  <p className="text-xs text-slate-400">
                    Paket: <strong className="text-slate-700 dark:text-slate-300">{formatSubjectTitle(currentBankSubject.title)}</strong> (ID: {selectedBankSubjectId || subject.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseAddModal}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs font-medium">
              {/* Tipe Soal Terurut Proporsional */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.questionTypeLabel}
                </label>
                <select
                  value={modalType}
                  onChange={e => setModalType(e.target.value as QuestionType)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold cursor-pointer"
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
                  onClick={onCloseAddModal}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition cursor-pointer shadow-md shadow-violet-600/20"
                >
                  {t.saveQuestionBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. MODAL DETAIL NILAI SISWA (DOSSIER)                           */}
      {/* ============================================================== */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedResult.studentName}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Kelas: {selectedResult.className} • Selesai: {selectedResult.submittedAt}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Skor Akhir</span>
                <p className="text-3xl font-black text-violet-600 dark:text-violet-400">{selectedResult.score}%</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {(selectedResult.details || []).map((d, dIdx) => (
                <div
                  key={dIdx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-violet-600 dark:text-violet-400">Soal #{dIdx + 1} ({d.type})</span>
                    <span className={d.earnedPoints === d.maxPoints ? 'text-emerald-600 dark:text-emerald-400 font-bold' : d.earnedPoints > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'}>
                      Poin: {d.earnedPoints} / {d.maxPoints}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 pt-1">
                    <div>Jawaban Siswa: <strong className="text-slate-900 dark:text-slate-100">{JSON.stringify(d.studentAnswer)}</strong></div>
                    <div>Kunci: <strong className="text-emerald-600 dark:text-emerald-400">{JSON.stringify(d.correctAnswer)}</strong></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => onOpenCertificates?.(selectedResult)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Cetak Sertifikat Siswa Ini</span>
              </button>

              <button
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. MODAL BUAT JADWAL UJIAN BARU                                 */}
      {/* ============================================================== */}
      {isAddScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                      const vii = studentClasses.filter(c => c.startsWith('VII'));
                      setNewSubClass(vii.join(', ') || 'VII.1, VII.2, VII.3');
                    } else if (val === 'VIII_ALL') {
                      const viii = studentClasses.filter(c => c.startsWith('VIII'));
                      setNewSubClass(viii.join(', ') || 'VIII.1, VIII.2, VIII.3');
                    } else if (val === 'IX_ALL') {
                      const ix = studentClasses.filter(c => c.startsWith('IX'));
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
                      const vii = studentClasses.filter(c => c.startsWith('VII'));
                      setEditSubClass(vii.join(', ') || 'VII.1, VII.2, VII.3');
                    } else if (val === 'VIII_ALL') {
                      const viii = studentClasses.filter(c => c.startsWith('VIII'));
                      setEditSubClass(viii.join(', ') || 'VIII.1, VIII.2, VIII.3');
                    } else if (val === 'IX_ALL') {
                      const ix = studentClasses.filter(c => c.startsWith('IX'));
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
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
    </div>
  );
};
