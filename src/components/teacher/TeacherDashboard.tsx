'use client';

import React, { useState } from 'react';
import { Subject, Question, QuestionType, ExamResult } from '@/types/cbt';
import { NavItem } from '../layout/Sidebar';
import {
  TrendingUp,
  Award,
  Users,
  BookOpen,
  Calendar,
  Send,
  MoreVertical,
  Edit2,
  Trash2,
  PlusCircle,
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
  Play
} from 'lucide-react';

interface TeacherDashboardProps {
  currentNav: NavItem;
  subject: Subject;
  questions: Question[];
  results: ExamResult[];
  onUpdateSubject: (updatedSubject: Subject) => void;
  onAddQuestion: (newQuestion: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  onOpenAddModal: () => void;
  onStartStudentExam?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentNav,
  subject,
  questions,
  results,
  onUpdateSubject,
  onAddQuestion,
  onDeleteQuestion,
  isAddModalOpen,
  onCloseAddModal,
  onOpenAddModal,
  onStartStudentExam
}) => {
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

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
  const [pgOptions, setPgOptions] = useState<string[]>(['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D']);
  const [pgAnswer, setPgAnswer] = useState<string>('A');
  const [pgkAnswer, setPgkAnswer] = useState<string[]>(['A', 'C']);

  // State Isian / Esai
  const [shortAnswer, setShortAnswer] = useState('');
  const [essayKey, setEssayKey] = useState('');

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

    const newQ: Question = {
      id: `q-${Date.now()}`,
      subjectId: subject.id,
      type: modalType,
      questionText: modalText,
      mediaUrl: modalMediaUrl || undefined,
      options: finalOptions,
      answer: finalAnswer,
      orderIndex: questions.length + 1
    };

    onAddQuestion(newQ);
    onCloseAddModal();
    setModalText('');
    setModalMediaUrl('');
  };

  // Hitung persentase kelulusan rata-rata (misal KKM = 75)
  const avgScore = results.length > 0
    ? Math.round(results.reduce((acc, curr) => acc + curr.score, 0) / results.length)
    : 87;

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full transition-colors">
      {/* ============================================================== */}
      {/* 1. TAMPILAN DASHBOARD UTAMA (PERSIS SEPERTI GAMBAR TABOR STUDY)  */}
      {/* ============================================================== */}
      {(currentNav === 'dashboard' || currentNav === 'statistics') && (
        <>
          {/* A. TOP 3 METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Need to grade / Progress */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex items-center justify-between">
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block">
                  Need to grade / Kelulusan
                </span>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {avgScore}% <span className="text-sm font-normal text-slate-500">Grade</span>
                  </h3>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5" /> +4.56%
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                    ✓
                  </span>
                  <span>yearly student exam test online system</span>
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
                    strokeDasharray={`${avgScore}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute font-bold text-sm text-slate-900 dark:text-white">
                  {avgScore}%
                </div>
              </div>
            </div>

            {/* Card 2: New Active student */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block mb-1">
                    New Active student
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {results.length > 0 ? results.length * 28 + 24 : 536}
                  </h3>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5" /> +6.354%
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
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

            {/* Card 3: Questions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block mb-1">
                    Questions
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {questions.length}
                  </h3>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5" /> +2.56%
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
                  ?
                </span>
                <span>yearly student exam test online system monthly time remaining</span>
              </div>
            </div>
          </div>

          {/* B. MIDDLE SECTION: 2 ANALYTICS CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart Left: Exam Taken Times */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Exam Taken Times</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Taken records of last Years</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">Active Exams</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">Active Exam Takers</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Monthly
                  </span>
                </div>
              </div>

              {/* Area Wave Line Representation */}
              <div className="pt-2">
                <div className="h-44 w-full relative flex items-end">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="border-b border-slate-400 w-full"></div>
                    <div className="border-b border-slate-400 w-full"></div>
                    <div className="border-b border-slate-400 w-full"></div>
                    <div className="border-b border-slate-400 w-full"></div>
                  </div>

                  {/* SVG Smooth Curve Area */}
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
                    {/* Data Points */}
                    {[
                      [0, 110], [120, 100], [250, 55], [380, 105], [500, 100]
                    ].map(([cx, cy], idx) => (
                      <circle key={idx} cx={cx} cy={cy} r="4" fill="#ffffff" stroke="#7c3aed" strokeWidth="2.5" />
                    ))}
                  </svg>
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart Right: Average Results For Test Questions */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Average Results For Test Questions
                </h4>
                <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span>
                    <span className="text-slate-600 dark:text-slate-400">Easy questions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                    <span className="text-slate-600 dark:text-slate-400">Medium questions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="text-slate-600 dark:text-slate-400">Difficult questions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                    <span className="text-slate-600 dark:text-slate-400">Hard</span>
                  </div>
                </div>
              </div>

              {/* Segmented Horizontal Progress Bars */}
              <div className="space-y-4 pt-1">
                {[
                  { label: 'IPA / Fisika', w1: '28%', w2: '20%', w3: '32%', w4: '20%' },
                  { label: 'IPA / Biologi', w1: '40%', w2: '15%', w3: '25%', w4: '20%' },
                  { label: 'Kimia Dasar', w1: '20%', w2: '35%', w3: '20%', w4: '25%' },
                  { label: 'Tata Surya', w1: '30%', w2: '25%', w3: '25%', w4: '20%' }
                ].map((row, rIdx) => (
                  <div key={rIdx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{row.label}</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden gap-1 p-0.5">
                      <div style={{ width: row.w1 }} className="h-full rounded-full bg-violet-600"></div>
                      <div style={{ width: row.w2 }} className="h-full rounded-full bg-teal-500"></div>
                      <div style={{ width: row.w3 }} className="h-full rounded-full bg-amber-400"></div>
                      <div style={{ width: row.w4 }} className="h-full rounded-full bg-orange-500"></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Pass Mark:</span>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(n => (
                  <span key={n}>{n}</span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* C. BOTTOM TABLE: BROWSE TEST RESULTS (SEPERTI PADA GAMBAR TABOR STUDY) */}
      {(currentNav === 'dashboard' || currentNav === 'results') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Browse test results
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500">Hasil dan rekam jejak ujian siswa terkini</p>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <Send className="w-3.5 h-3.5" />
                <span>Send certificates</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input type="checkbox" className="rounded accent-violet-600" />
                  </th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Total score</th>
                  <th className="py-3 px-4">Score Reasoning</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Score Analysis</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Pelanggaran</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Belum ada data nilai ujian siswa. Silakan klik tombol <strong>Layar Siswa</strong> di pojok kanan atas untuk mencoba simulasi ujian.
                    </td>
                  </tr>
                ) : (
                  results.map((r, i) => {
                    const scoreColor = r.score >= 75
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';

                    return (
                      <tr key={r.id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <input type="checkbox" className="rounded accent-violet-600" />
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
                            {r.score >= 50 ? '50% (1/2)' : '0% (0/2)'}
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
                          <button
                            onClick={() => setSelectedResult(r)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
                          >
                            Detail
                          </button>
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Bank Soal Ujian</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Kelola soal untuk {subject.title}</p>
            </div>
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tambah Soal</span>
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-violet-600 dark:text-violet-400 text-sm">#{idx + 1}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                      {q.type}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteQuestion(q.id)}
                    className="text-slate-400 hover:text-rose-500 p-1.5 transition"
                    title="Hapus Soal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-slate-800 dark:text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">
                  {q.questionText}
                </p>

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
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. TAMPILAN PENGATURAN BOBOT                                    */}
      {/* ============================================================== */}
      {currentNav === 'scoring' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Pengaturan Bobot Poin</h3>
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
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Jadwal & Konfigurasi Ujian</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Atur durasi, token pengawas, dan jadwal rilis soal</p>
            </div>
            {onStartStudentExam && (
              <button
                onClick={onStartStudentExam}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulasi Layar Siswa</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Info Utama */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{subject.title}</h4>
                  <p className="text-xs text-slate-400">Kelas: {subject.className}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Jumlah Soal</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{questions.length} Butir Soal</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Status Ujian</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Aktif & Siap Dikerjakan
                  </span>
                </div>
              </div>
            </div>

            {/* Card Edit Token & Durasi */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-violet-600" />
                <span>Pengaturan Token & Waktu</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Token Ujian (Rilis ke Siswa)
                  </label>
                  <input
                    type="text"
                    value={subject.token}
                    onChange={e => onUpdateSubject({ ...subject, token: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase tracking-widest font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Durasi Pengerjaan (Menit)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={subject.durationMinutes}
                    onChange={e => onUpdateSubject({ ...subject, durationMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. TAMPILAN DAFTAR SISWA & PARTISIPASI                        */}
      {/* ============================================================== */}
      {currentNav === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Daftar Siswa & Partisipasi</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Monitoring kehadiran dan status pengerjaan siswa</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-800 font-semibold">
              Total Mengumpulkan: {results.length} Siswa
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Nilai Akhir</th>
                    <th className="py-3 px-4">Status Kelulusan</th>
                    <th className="py-3 px-4">Waktu Selesai</th>
                    <th className="py-3 px-4">Pelanggaran</th>
                    <th className="py-3 px-4 text-center">Lembar Jawaban</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {results.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Belum ada siswa yang menyelesaikan ujian.
                      </td>
                    </tr>
                  ) : (
                    results.map((r, i) => (
                      <tr key={r.id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-600 text-white font-bold text-[10px] flex items-center justify-center">
                            {r.studentName.charAt(0)}
                          </div>
                          <span>{r.studentName}</span>
                        </td>
                        <td className="py-3 px-4">{r.className}</td>
                        <td className="py-3 px-4 font-bold text-violet-600 dark:text-violet-400">{r.score}%</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.score >= 75 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}`}>
                            {r.score >= 75 ? 'LULUS (KKM)' : 'REMEDIAL'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{r.submittedAt}</td>
                        <td className="py-3 px-4">
                          {r.violationCount > 0 ? (
                            <span className="text-rose-600 font-bold">{r.violationCount}x</span>
                          ) : (
                            <span className="text-emerald-600 font-semibold">Tertib (0)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedResult(r)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-violet-600 hover:text-white transition"
                          >
                            Dossier
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. TAMPILAN SETTINGS / SUPABASE INTEGRASI                      */}
      {/* ============================================================== */}
      {currentNav === 'settings' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Pengaturan Sistem & Database Supabase</h3>
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
      {/* 7. MODAL TAMBAH SOAL BARU (Mendukung Benar/Salah Multi-Pernyataan) */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Soal Baru</h3>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipe Soal
                </label>
                <select
                  value={modalType}
                  onChange={e => setModalType(e.target.value as QuestionType)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                >
                  <option value="Benar/Salah">Benar/Salah (Banyak Pernyataan & 1 Pernyataan)</option>
                  <option value="Pilihan Ganda">Pilihan Ganda</option>
                  <option value="Pilihan Ganda Kompleks">Pilihan Ganda Kompleks</option>
                  <option value="Isian Singkat">Isian Singkat</option>
                  <option value="Esai">Esai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Teks Soal / Stimulus
                </label>
                <textarea
                  rows={3}
                  required
                  value={modalText}
                  onChange={e => setModalText(e.target.value)}
                  placeholder="Ketik pengantar atau teks soal..."
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
                    <div className="space-y-2">
                      <label className="block font-semibold text-slate-600 dark:text-slate-400">
                        Daftar Pernyataan & Kunci
                      </label>
                      {bsStatements.map((stmt, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <span className="w-5 font-bold text-violet-600 dark:text-violet-400">{sIdx + 1}.</span>
                          <input
                            type="text"
                            value={stmt.text}
                            onChange={e => {
                              const next = [...bsStatements];
                              next[sIdx].text = e.target.value;
                              setBsStatements(next);
                            }}
                            className="flex-1 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                          <select
                            value={stmt.answer}
                            onChange={e => {
                              const next = [...bsStatements];
                              next[sIdx].answer = e.target.value as 'Benar' | 'Salah';
                              setBsStatements(next);
                            }}
                            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600 dark:text-emerald-400"
                          >
                            <option value="Benar">Benar</option>
                            <option value="Salah">Salah</option>
                          </select>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setBsStatements([...bsStatements, { text: '', answer: 'Benar' }])
                        }
                        className="text-xs text-violet-600 dark:text-violet-400 hover:underline pt-1 block"
                      >
                        + Tambah Baris Pernyataan
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-2">Jawaban Benar</label>
                      <div className="flex gap-4 font-semibold">
                        <label className="flex items-center gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400">
                          <input
                            type="radio"
                            checked={bsSingleAnswer === 'Benar'}
                            onChange={() => setBsSingleAnswer('Benar')}
                            className="accent-violet-600"
                          />
                          <span>Benar</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-rose-600 dark:text-rose-400">
                          <input
                            type="radio"
                            checked={bsSingleAnswer === 'Salah'}
                            onChange={() => setBsSingleAnswer('Salah')}
                            className="accent-violet-600"
                          />
                          <span>Salah</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* KHUSUS PILIHAN GANDA */}
              {modalType === 'Pilihan Ganda' && (
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-600 dark:text-slate-400">Opsi Jawaban & Kunci</label>
                  {pgOptions.map((optText, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    return (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="pg-kunci"
                          checked={pgAnswer === letter}
                          onChange={() => setPgAnswer(letter)}
                          className="accent-violet-600 h-4 w-4"
                        />
                        <span className="font-bold text-violet-600 dark:text-violet-400 w-4">{letter}</span>
                        <input
                          type="text"
                          value={optText}
                          onChange={e => {
                            const next = [...pgOptions];
                            next[oIdx] = e.target.value;
                            setPgOptions(next);
                          }}
                          className="flex-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* KHUSUS ISIAN SINGKAT */}
              {modalType === 'Isian Singkat' && (
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Variasi Kunci Jawaban (Pisahkan tanda koma atau titik koma)
                  </label>
                  <input
                    type="text"
                    value={shortAnswer}
                    onChange={e => setShortAnswer(e.target.value)}
                    placeholder="Contoh: newton; n; sir isaac newton"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onCloseAddModal}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition"
                >
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL DETAIL NILAI SISWA (DOSSIER)                           */}
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

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
