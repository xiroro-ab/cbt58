'use client';

import React, { useState, useEffect } from 'react';
import { initialSubject, sampleQuestions } from '@/lib/mockData';
import { Subject, Question, ExamResult } from '@/types/cbt';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';
import { ExamScreen } from '@/components/exam/ExamScreen';
import {
  fetchActiveSubject,
  fetchQuestionsBySubject,
  insertQuestion,
  removeQuestion,
  saveExamResult,
  fetchExamResults
} from '@/lib/supabaseService';
import { GraduationCap, LayoutDashboard, Sparkles, UserCircle } from 'lucide-react';

export default function Home() {
  const [viewMode, setViewMode] = useState<'teacher' | 'student_login' | 'student_exam'>('teacher');
  const [subject, setSubject] = useState<Subject>(initialSubject);
  const [questions, setQuestions] = useState<Question[]>(sampleQuestions);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [studentName, setStudentName] = useState('Ahmad Fauzan');
  const [inputToken, setInputToken] = useState('IPA2026');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load data dari Supabase saat aplikasi dibuka
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const sub = await fetchActiveSubject();
        setSubject(sub);
        if (sub.token) setInputToken(sub.token);

        const qList = await fetchQuestionsBySubject(sub.id);
        setQuestions(qList);

        const resList = await fetchExamResults(sub.id);
        if (resList.length > 0) setResults(resList);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddQuestion = async (newQ: Question) => {
    setQuestions(prev => [...prev, newQ]);
    await insertQuestion(newQ);
  };

  const handleDeleteQuestion = async (qId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== qId));
    await removeQuestion(qId);
  };

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken.trim().toUpperCase() !== subject.token.toUpperCase()) {
      setLoginError('Token ujian salah! Silakan tanyakan token kepada guru pengawas.');
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
      studentId: `std-${Date.now()}`,
      studentName: resultData.studentName,
      className: resultData.className,
      score: resultData.score,
      totalEarned: resultData.totalEarned,
      totalMax: resultData.totalMax,
      answers: resultData.answers,
      submittedAt: resultData.submittedAt,
      violationCount: resultData.violationCount,
      details: resultData.details
    };

    setResults(prev => [newResult, ...prev]);
    await saveExamResult(newResult);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* GLOBAL NAVBAR (Hanya muncul jika bukan sedang di tengah pengerjaan ujian siswa) */}
      {viewMode !== 'student_exam' && (
        <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-pink-500 text-white shadow-lg shadow-fuchsia-600/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base text-zinc-100 flex items-center gap-2">
                <span>CBT Next Modern</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                  TypeScript + Supabase
                </span>
              </h1>
              <p className="text-[11px] text-zinc-400">Sistem Ujian Sekolah Cepat & Anti-Cheat</p>
            </div>
          </div>

          {/* Switcher Mode (Guru vs Siswa) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold">
            <button
              onClick={() => setViewMode('teacher')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'teacher'
                  ? 'bg-fuchsia-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Panel Guru</span>
            </button>
            <button
              onClick={() => setViewMode('student_login')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'student_login'
                  ? 'bg-fuchsia-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UserCircle className="w-3.5 h-3.5" />
              <span>Layar Siswa</span>
            </button>
          </div>
        </header>
      )}

      {/* CONTENT SWITCHER */}
      <main className="flex-1 flex flex-col">
        {/* 1. DASHBOARD GURU */}
        {viewMode === 'teacher' && (
          <TeacherDashboard
            subject={subject}
            questions={questions}
            results={results}
            onUpdateSubject={setSubject}
            onAddQuestion={handleAddQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onStartStudentExam={() => setViewMode('student_login')}
          />
        )}

        {/* 2. LAYAR LOGIN SISWA */}
        {viewMode === 'student_login' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-2xl bg-fuchsia-500/10 text-fuchsia-400 mb-2 border border-fuchsia-500/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-zinc-100">Mulai Mengerjakan Ujian</h2>
                <p className="text-xs text-zinc-400">{subject.title}</p>
              </div>

              <form onSubmit={handleStartExam} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Kelas</label>
                  <input
                    type="text"
                    disabled
                    value={subject.className}
                    className="w-full p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 text-zinc-400 font-semibold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Token Ujian</label>
                  <input
                    type="text"
                    required
                    value={inputToken}
                    onChange={e => setInputToken(e.target.value.toUpperCase())}
                    placeholder="Masukkan token dari guru..."
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 uppercase tracking-widest font-mono text-center font-bold focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                {loginError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 text-center font-medium">
                    {loginError}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-fuchsia-600/25 transition active:scale-[0.99]"
                  >
                    Masuk ke Ruang Ujian
                  </button>
                </div>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setViewMode('teacher')}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                >
                  ← Kembali ke Panel Guru
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. LAYAR PENGERJAAN UJIAN SISWA (FULLSCREEN / ANTI-CHEAT) */}
        {viewMode === 'student_exam' && (
          <ExamScreen
            subject={subject}
            questions={questions}
            studentName={studentName}
            onFinishExam={handleFinishExam}
            onExit={() => setViewMode('teacher')}
          />
        )}
      </main>
    </div>
  );
}
