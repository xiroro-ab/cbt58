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
  School
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
  const [copiedTokenSubjectId, setCopiedTokenSubjectId] = useState<string | null>(null);

  // Form State Buat Jadwal Baru
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubClass, setNewSubClass] = useState('VII.1, VII.2, VII.3');
  const [newSubDuration, setNewSubDuration] = useState(60);
  const [newSubToken, setNewSubToken] = useState(() => 'SMP58' + Math.floor(100 + Math.random() * 900));
  const [newSubViolationLimit, setNewSubViolationLimit] = useState(3);
  const [newSubScoringRules, setNewSubScoringRules] = useState<ScoringRules>({
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
  const [editSubDuration, setEditSubDuration] = useState(60);
  const [editSubToken, setEditSubToken] = useState('');
  const [editSubViolationLimit, setEditSubViolationLimit] = useState(3);
  const [editSubScoringRules, setEditSubScoringRules] = useState<ScoringRules>({});

  // Form State untuk Tambah Soal
  const [modalType, setModalType] = useState<QuestionType>('Benar/Salah');
  const [modalText, setModalText] = useState('');
  const [modalMediaUrl, setModalMediaUrl] = useState('');

  // State Benar/Salah
  const [bsMode, setBsMode] = useState<'multiple' | 'single'>('multiple');
  const [bsStatements, setBsStatements] = useState<Array<{ text: string; answer: 'Benar' | 'Salah' }>>([
    { text: 'Planet Venus merupakan planet terpanas di tata surya.', answer: 'Benar' },
    { text: 'Bumi memiliki dua satelit alami permanen.', answer: 'Salah' },
    { text: 'Bulan tidak memiliki atmosfer.', answer: 'Benar' }
  ]);
  const [bsSingleAnswer, setBsSingleAnswer] = useState<'Benar' | 'Salah'>('Benar');

  // State PG / PGK
  const [pgOptions, setPgOptions] = useState<string[]>([
    'Venus',
    'Merkurius',
    'Mars',
    'Jupiter'
  ]);
  const [pgAnswer, setPgAnswer] = useState<string>('A');
  const [pgkAnswer, setPgkAnswer] = useState<string[]>(['A', 'C']);

  // State Isian / Esai
  const [shortAnswer, setShortAnswer] = useState('');
  const [essayKey, setEssayKey] = useState('');

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

  // Daftar mapel yang berhak diakses (Admin: SEMUA mapel; Guru Mapel: HANYA mapel miliknya)
  const accessibleSubjects = useMemo(() => {
    const all = allSubjects && allSubjects.length > 0 ? allSubjects : [subject];
    if (currentTeacher?.role === 'admin' || !currentTeacher) {
      return all;
    }

    if (currentTeacher.assignments && currentTeacher.assignments.length > 0) {
      const assignedMapelNames = currentTeacher.assignments.map(a => a.subject.toLowerCase());
      const filtered = all.filter(s => {
        const sLower = s.title.toLowerCase();
        return assignedMapelNames.some(name => sLower.includes(name) || name.includes(sLower));
      });
      return filtered.length > 0 ? filtered : all;
    }

    if (currentTeacher.subject) {
      const tSubjectLower = currentTeacher.subject.toLowerCase();
      const matched = all.filter(s => s.title.toLowerCase().includes(tSubjectLower));
      return matched.length > 0 ? matched : all;
    }

    return all;
  }, [allSubjects, subject, currentTeacher]);

  // Sinkronkan selectedBankSubjectId jika belum ada di accessibleSubjects
  useEffect(() => {
    if (accessibleSubjects.length > 0 && !accessibleSubjects.some(s => s.id === selectedBankSubjectId)) {
      setSelectedBankSubjectId(accessibleSubjects[0].id);
    }
  }, [accessibleSubjects, selectedBankSubjectId]);

  // Mapel Bank Soal yang sedang aktif dibuka
  const currentBankSubject = useMemo(() => {
    return (
      accessibleSubjects.find(s => s.id === selectedBankSubjectId) ||
      allSubjects?.find(s => s.id === selectedBankSubjectId) ||
      subject
    );
  }, [accessibleSubjects, allSubjects, selectedBankSubjectId, subject]);

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

  // Filter katalog card mapel berdasarkan pencarian & kategori
  const filteredCatalogSubjects = useMemo(() => {
    return accessibleSubjects.filter(s => {
      const matchesSearch =
        !searchQuery.trim() ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.token.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (bankCategoryFilter === 'ALL') return true;

      const t = s.title.toLowerCase();
      if (bankCategoryFilter === 'MIPA') return t.includes('ipa') || t.includes('matematika');
      if (bankCategoryFilter === 'TIK') return t.includes('informatika') || t.includes('tik');
      if (bankCategoryFilter === 'BAHASA') return t.includes('bahasa') || t.includes('indonesia') || t.includes('inggris');
      if (bankCategoryFilter === 'SOSIAL') return t.includes('ips') || t.includes('pancasila') || t.includes('ppkn');
      if (bankCategoryFilter === 'AGAMA') return t.includes('agama') || t.includes('pai');

      return true;
    });
  }, [accessibleSubjects, searchQuery, bankCategoryFilter]);

  // Soal aktif untuk metrik ringkas dashboard
  const activeQuestions = bankSubjectQuestions;

  // Helper tampilan nama mapel rapi tanpa prefix berlebih
  const formatSubjectTitle = (title: string) => {
    return title
      .replace(/^Asesmen Sumatif( Akhir)?( Tengah)? Semester( - )?/i, '')
      .replace(/^Asesmen Sumatif - /i, '')
      .trim();
  };

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
    setEditSubScoringRules(targetSub.scoringRules || subject.scoringRules);
    setIsEditScheduleModalOpen(true);
  };

  // Simpan Edit Jadwal
  const handleSaveEditSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleToEdit || !editSubTitle.trim() || !editSubToken.trim()) return;

    const updated: Subject = {
      ...scheduleToEdit,
      title: editSubTitle.trim(),
      className: editSubClass.trim() || 'Semua Kelas',
      durationMinutes: Number(editSubDuration) || 60,
      token: editSubToken.trim().toUpperCase(),
      violationLimit: Number(editSubViolationLimit) || 3,
      scoringRules: editSubScoringRules
    };

    onUpdateSubject(updated);
    setIsEditScheduleModalOpen(false);
    setScheduleToEdit(null);
  };

  // Buat Jadwal Ujian Baru
  const handleCreateNewSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTitle.trim() || !newSubToken.trim()) return;

    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      title: newSubTitle.trim(),
      className: newSubClass.trim() || 'Semua Kelas',
      durationMinutes: Number(newSubDuration) || 60,
      token: newSubToken.trim().toUpperCase(),
      violationLimit: Number(newSubViolationLimit) || 3,
      isActive: true,
      scoringRules: newSubScoringRules
    };

    if (onAddSubject) {
      onAddSubject(newSub);
    } else {
      onUpdateSubject(newSub);
    }

    setIsAddScheduleModalOpen(false);
    setNewSubTitle('');
    setNewSubToken('SMP58' + Math.floor(100 + Math.random() * 900));
  };

  // Konfirmasi Hapus Jadwal
  const handleConfirmDeleteSchedule = () => {
    if (!subjectToDelete) return;
    if (onDeleteSubject) {
      onDeleteSubject(subjectToDelete.id);
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
      finalOptions = pgOptions.map(t => ({ text: t }));
      finalAnswer = pgAnswer;
    } else if (modalType === 'Pilihan Ganda Kompleks') {
      finalOptions = pgOptions.map(t => ({ text: t }));
      finalAnswer = pgkAnswer;
    } else if (modalType === 'Benar/Salah') {
      if (bsMode === 'multiple') {
        finalOptions = bsStatements.map(s => ({ text: s.text }));
        finalAnswer = bsStatements.map(s => s.answer);
      } else {
        finalOptions = [];
        finalAnswer = bsSingleAnswer;
      }
    } else if (modalType === 'Isian Singkat') {
      finalOptions = [];
      finalAnswer = shortAnswer.split(/[;,]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    } else if (modalType === 'Esai') {
      finalOptions = [];
      finalAnswer = essayKey;
    }

    const targetSubId = selectedBankSubjectId || subject.id;
    const newQ: Question = {
      id: `q-${Date.now()}`,
      subjectId: targetSubId,
      type: modalType,
      questionText: modalText,
      mediaUrl: modalMediaUrl || undefined,
      options: finalOptions,
      answer: finalAnswer,
      orderIndex: bankSubjectQuestions.length + 1
    };

    onAddQuestion(newQ);
    onCloseAddModal();
    setModalText('');
    setModalMediaUrl('');
  };

  // Real Metric Calculations
  const avgScore = results.length > 0
    ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / results.length)
    : 87;

  const passRate = results.length > 0
    ? Math.round((results.filter(r => r.score >= 75).length / results.length) * 100)
    : 92;

  // Real Score Distribution Buckets
  const scoreBuckets = useMemo(() => {
    if (results.length === 0) {
      return [
        { label: 'IPA / Fisika', w1: '30%', w2: '20%', w3: '30%', w4: '20%' },
        { label: 'IPA / Biologi', w1: '40%', w2: '15%', w3: '25%', w4: '20%' },
        { label: 'Kimia Dasar', w1: '25%', w2: '35%', w3: '20%', w4: '20%' },
        { label: 'Tata Surya', w1: '35%', w2: '25%', w3: '20%', w4: '20%' }
      ];
    }
    const c1 = results.filter(r => r.score < 60).length;
    const c2 = results.filter(r => r.score >= 60 && r.score < 75).length;
    const c3 = results.filter(r => r.score >= 75 && r.score < 90).length;
    const c4 = results.filter(r => r.score >= 90).length;
    const total = results.length || 1;

    const p1 = `${Math.max(10, Math.round((c1 / total) * 100))}%`;
    const p2 = `${Math.max(10, Math.round((c2 / total) * 100))}%`;
    const p3 = `${Math.max(10, Math.round((c3 / total) * 100))}%`;
    const p4 = `${Math.max(10, Math.round((c4 / total) * 100))}%`;

    return [
      { label: subject.title, w1: p1, w2: p2, w3: p3, w4: p4 },
      { label: 'IPA Terpadu', w1: '25%', w2: '25%', w3: '30%', w4: '20%' },
      { label: 'Praktikum Sains', w1: '20%', w2: '30%', w3: '35%', w4: '15%' }
    ];
  }, [results, subject.title]);

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
      {/* 1. TAMPILAN DASHBOARD UTAMA (TABOR STUDY FORMAL SAAS)           */}
      {/* ============================================================== */}
      {(currentNav === 'dashboard' || currentNav === 'statistics') && (
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
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5" /> +4.56%
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                    ✓
                  </span>
                  <span>{t.metricGradingSub}</span>
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
                    className="text-violet-600 dark:text-violet-500"
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
                    {results.length} <span className="text-sm font-normal text-slate-500">Siswa</span>
                  </h3>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Rata-Rata: {avgScore}%
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* Mini Bar Chart Visual */}
              <div className="flex items-end gap-1.5 h-10 pt-4">
                {[40, 65, 30, 85, 45, 95, 60, 75, 40, 90, 50, 70, 80].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-t-md bg-violet-500/30 dark:bg-violet-500/20 hover:bg-violet-600 transition"
                  ></div>
                ))}
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
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5" /> 5 Tipe Soal Terkoneksi
                  </span>
                </div>

                {/* Candlestick / Wave visual */}
                <div className="flex items-center gap-1 h-8">
                  {[20, 45, 60, 30, 70, 50, 80, 40].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="w-1.5 rounded-full bg-teal-500"
                    ></div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 text-[11px] text-slate-400 dark:text-slate-500">
                <span className="w-5 h-5 rounded-md bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  ✓
                </span>
                <span>{t.metricQuestionsSub}</span>
              </div>
            </div>
          </div>

          {/* B. MIDDLE SECTION: 2 ANALYTICS CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Tren Penilaian & Kelulusan */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {t.chartAssessmentTitle}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t.chartAssessmentSub}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">Capaian KKM</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">Peserta Aktif</span>
                  </div>
                </div>
              </div>

              {/* Area Wave Line Representation */}
              <div className="pt-2">
                <div className="h-44 w-full relative flex items-end">
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-slate-400 w-full"></div>
                    <div className="border-b border-slate-400 w-full"></div>
                    <div className="border-b border-slate-400 w-full"></div>
                    <div className="border-b border-slate-400 w-full"></div>
                  </div>

                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,110 C40,115 80,95 120,100 C160,105 200,60 250,55 C300,50 340,90 380,105 C420,120 460,95 500,100 L500,150 L0,150 Z"
                      fill="url(#curveGradient)"
                    />
                    <path
                      d="M0,110 C40,115 80,95 120,100 C160,105 200,60 250,55 C300,50 340,90 380,105 C420,120 460,95 500,100"
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="3"
                    />
                    {[
                      [0, 110], [120, 100], [250, 55], [380, 105], [500, 100]
                    ].map(([cx, cy], idx) => (
                      <circle key={idx} cx={cx} cy={cy} r="4" fill="#ffffff" stroke="#7c3aed" strokeWidth="2.5" />
                    ))}
                  </svg>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {['Ujian 1', 'Ujian 2', 'UTS IPA', 'Kuis 1', 'PAS'].map(m => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 2: Distribusi Sebaran Nilai */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {t.chartDistributionTitle}
                </h4>
                <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <span className="text-slate-600 dark:text-slate-400">&gt; 90 (Sangat Baik)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                    <span className="text-slate-600 dark:text-slate-400">75 - 89 (Baik)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="text-slate-600 dark:text-slate-400">60 - 74 (Cukup)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="text-slate-600 dark:text-slate-400">&lt; 60 (Remedial)</span>
                  </div>
                </div>
              </div>

              {/* Segmented Progress Bars */}
              <div className="space-y-4 pt-1">
                {scoreBuckets.map((row, rIdx) => (
                  <div key={rIdx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{row.label}</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden gap-1 p-0.5">
                      <div style={{ width: row.w1 }} className="h-full rounded-full bg-violet-600"></div>
                      <div style={{ width: row.w2 }} className="h-full rounded-full bg-teal-500"></div>
                      <div style={{ width: row.w3 }} className="h-full rounded-full bg-amber-400"></div>
                      <div style={{ width: row.w4 }} className="h-full rounded-full bg-rose-500"></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-600 dark:text-slate-300">{t.chartPassMark}</span>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(n => (
                  <span key={n}>{n}</span>
                ))}
              </div>
            </div>
          </div>
        </>
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
                {/* Kategori Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  {[
                    { id: 'ALL', label: 'Semua Mapel' },
                    { id: 'MIPA', label: 'MIPA' },
                    { id: 'TIK', label: 'Teknologi & TIK' },
                    { id: 'BAHASA', label: 'Bahasa' },
                    { id: 'SOSIAL', label: 'Sosial & PPKn' },
                    { id: 'AGAMA', label: 'PAI & Budi Pekerti' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setBankCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        bankCategoryFilter === cat.id
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat.label}
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
                    Tidak ada paket mata pelajaran yang sesuai
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {currentTeacher?.role !== 'admin'
                      ? 'Anda hanya memiliki akses pada mata pelajaran yang ditugaskan kepada akun Anda.'
                      : 'Cobalah gunakan filter kategori lain atau buat paket jadwal mata pelajaran baru.'}
                  </p>
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

                        {/* Footer Card: Kelola Button */}
                        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${subItem.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${subItem.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            {subItem.isActive ? 'Ujian Aktif' : 'Draft'}
                          </span>

                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 group-hover:translate-x-1 transition-transform"
                          >
                            <span>Kelola Butir Soal</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
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

                <button
                  onClick={onOpenAddModal}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer flex-shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t.addQuestionBtn}</span>
                </button>
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
                                  className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                                    isKey
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-medium'
                                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs ${
                                    isKey
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {letter}
                                  </span>
                                  <span className="flex-1">{opt.text}</span>
                                  {isKey && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
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
                                  className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60"
                                >
                                  <span className="text-slate-700 dark:text-slate-300">{oIdx + 1}. {opt.text}</span>
                                  <span className={`font-bold ${ans === 'Benar' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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
                              <div key={pIdx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{pair.q?.text}</span>
                                <span className="text-violet-600 dark:text-violet-400 font-bold">➔ {pair.a?.text}</span>
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
      {/* 3. TAMPILAN PENGATURAN BOBOT                                    */}
      {/* ============================================================== */}
      {currentNav === 'scoring' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.navScoring}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Nilai ujian akhir (skor 0 - 100) dihitung secara proporsional sesuai bobot poin per tipe soal ini.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {Object.keys(subject.scoringRules).map(typeKey => {
              const currentWeight = subject.scoringRules[typeKey as QuestionType] || 1;
              return (
                <div key={typeKey} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{typeKey}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={currentWeight}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 1;
                        onUpdateSubject({
                          ...subject,
                          scoringRules: {
                            ...subject.scoringRules,
                            [typeKey]: val
                          }
                        });
                      }}
                      className="w-24 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-sm font-bold text-violet-600 dark:text-violet-400 text-center"
                    />
                    <span className="text-xs text-slate-500">Poin Maksimal</span>
                  </div>
                </div>
              );
            })}
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

                    {accessibleSubjects.length > 1 && (
                      <button
                        onClick={() => setSubjectToDelete(subItem)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer"
                        title="Hapus Jadwal Ujian"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Jadwal</span>
                      </button>
                    )}
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
      {/* 7. MODAL TAMBAH SOAL BARU (Benar/Salah Multi-Pernyataan)        */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.addQuestionTitle}</h3>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.questionTypeLabel}
                </label>
                <select
                  value={modalType}
                  onChange={e => setModalType(e.target.value as QuestionType)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="Benar/Salah">Benar/Salah (Banyak Pernyataan & 1 Pernyataan)</option>
                  <option value="Pilihan Ganda">Pilihan Ganda (Single Choice)</option>
                  <option value="Pilihan Ganda Kompleks">Pilihan Ganda Kompleks (Multi Choice)</option>
                  <option value="Isian Singkat">Isian Singkat</option>
                  <option value="Esai">Esai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.stimulusLabel}
                </label>
                <textarea
                  rows={3}
                  required
                  value={modalText}
                  onChange={e => setModalText(e.target.value)}
                  placeholder={t.stimulusPlaceholder}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* KHUSUS BENAR / SALAH */}
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
                      <span>{t.bsModeMultiple}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                      <input
                        type="radio"
                        checked={bsMode === 'single'}
                        onChange={() => setBsMode('single')}
                        className="accent-violet-600"
                      />
                      <span>{t.bsModeSingle}</span>
                    </label>
                  </div>

                  {bsMode === 'multiple' ? (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Tiap pernyataan memiliki pilihan Benar / Salah masing-masing:
                      </p>
                      {bsStatements.map((stmt, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <span className="font-bold text-violet-600">{sIdx + 1}.</span>
                          <input
                            type="text"
                            value={stmt.text}
                            onChange={e => {
                              const newArr = [...bsStatements];
                              newArr[sIdx].text = e.target.value;
                              setBsStatements(newArr);
                            }}
                            className="flex-1 bg-transparent border-none text-xs text-slate-900 dark:text-white focus:outline-none"
                            placeholder={`Tulis pernyataan #${sIdx + 1}`}
                          />
                          <select
                            value={stmt.answer}
                            onChange={e => {
                              const newArr = [...bsStatements];
                              newArr[sIdx].answer = e.target.value as 'Benar' | 'Salah';
                              setBsStatements(newArr);
                            }}
                            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs"
                          >
                            <option value="Benar">Benar</option>
                            <option value="Salah">Salah</option>
                          </select>
                          {bsStatements.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setBsStatements(prev => prev.filter((_, idx) => idx !== sIdx))}
                              className="text-rose-500 hover:text-rose-700 px-1"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setBsStatements(prev => [...prev, { text: '', answer: 'Benar' }])}
                        className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline"
                      >
                        {t.addStatementBtn}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        {t.singleAnswerKey}
                      </label>
                      <select
                        value={bsSingleAnswer}
                        onChange={e => setBsSingleAnswer(e.target.value as 'Benar' | 'Salah')}
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold"
                      >
                        <option value="Benar">Benar</option>
                        <option value="Salah">Salah</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* KHUSUS PILIHAN GANDA */}
              {modalType === 'Pilihan Ganda' && (
                <div className="space-y-3">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold">Opsi Pilihan Jawaban</label>
                  {pgOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 font-bold text-center text-slate-500">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const updated = [...pgOptions];
                          updated[idx] = e.target.value;
                          setPgOptions(updated);
                        }}
                        className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                  <div className="pt-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kunci Jawaban</label>
                    <select
                      value={pgAnswer}
                      onChange={e => setPgAnswer(e.target.value)}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-violet-600"
                    >
                      {pgOptions.map((_, idx) => (
                        <option key={idx} value={String.fromCharCode(65 + idx)}>
                          Opsi {String.fromCharCode(65 + idx)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* KHUSUS PILIHAN GANDA KOMPLEKS */}
              {modalType === 'Pilihan Ganda Kompleks' && (
                <div className="space-y-3">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                    Centang Opsi yang Menjadi Kunci Jawaban (&gt; 1):
                  </label>
                  {pgOptions.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const isChecked = pgkAnswer.includes(letter);
                    return (
                      <div key={idx} className="flex items-center gap-2">
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
                        />
                        <span className="w-5 font-bold text-slate-500">{letter}</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const updated = [...pgOptions];
                            updated[idx] = e.target.value;
                            setPgOptions(updated);
                          }}
                          className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* KHUSUS ISIAN SINGKAT */}
              {modalType === 'Isian Singkat' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Kunci Jawaban (Pisahkan dengan tanda koma jika ada alternatif ejaan)
                  </label>
                  <input
                    type="text"
                    value={shortAnswer}
                    onChange={e => setShortAnswer(e.target.value)}
                    placeholder="Contoh: karbondioksida, co2, karbon dioksida"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* KHUSUS ESAI */}
              {modalType === 'Esai' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Pedoman / Rubrik Penilaian Guru
                  </label>
                  <textarea
                    rows={2}
                    value={essayKey}
                    onChange={e => setEssayKey(e.target.value)}
                    placeholder="Tulis kata kunci utama yang wajib muncul dalam jawaban siswa..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onCloseAddModal}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Target Rombel / Kelas
                  </label>
                  <input
                    type="text"
                    required
                    value={newSubClass}
                    onChange={e => setNewSubClass(e.target.value)}
                    placeholder="Misal: VII.1, VII.2, VII.3"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

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
                    onChange={e => setNewSubDuration(parseInt(e.target.value) || 60)}
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
                    onChange={e => setNewSubViolationLimit(parseInt(e.target.value) || 3)}
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
                        value={newSubScoringRules[typeKey] || 1}
                        onChange={e => setNewSubScoringRules((prev: ScoringRules) => ({
                          ...prev,
                          [typeKey]: parseFloat(e.target.value) || 1
                        }))}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Target Rombel / Kelas
                  </label>
                  <input
                    type="text"
                    required
                    value={editSubClass}
                    onChange={e => setEditSubClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

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
                    onChange={e => setEditSubDuration(parseInt(e.target.value) || 60)}
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
                    onChange={e => setEditSubViolationLimit(parseInt(e.target.value) || 3)}
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
                        value={editSubScoringRules[typeKey] || 1}
                        onChange={e => setEditSubScoringRules((prev: ScoringRules) => ({
                          ...prev,
                          [typeKey]: parseFloat(e.target.value) || 1
                        }))}
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
                onClick={() => setSubjectToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
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
