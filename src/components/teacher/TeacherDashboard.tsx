'use client';

import React, { useState } from 'react';
import { Subject, Question, QuestionType, ExamResult } from '@/types/cbt';
import {
  BookOpen,
  PlusCircle,
  Settings,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Users,
  ShieldAlert,
  Award
} from 'lucide-react';

interface TeacherDashboardProps {
  subject: Subject;
  questions: Question[];
  results: ExamResult[];
  onUpdateSubject: (updatedSubject: Subject) => void;
  onAddQuestion: (newQuestion: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
  onStartStudentExam: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  subject,
  questions,
  results,
  onUpdateSubject,
  onAddQuestion,
  onDeleteQuestion,
  onStartStudentExam
}) => {
  const [activeTab, setActiveTab] = useState<'questions' | 'scoring' | 'results'>('questions');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  // Form State untuk Tambah Soal
  const [modalType, setModalType] = useState<QuestionType>('Pilihan Ganda');
  const [modalText, setModalText] = useState('');
  const [modalMediaUrl, setModalMediaUrl] = useState('');

  // State untuk Benar/Salah
  const [bsMode, setBsMode] = useState<'multiple' | 'single'>('multiple');
  const [bsStatements, setBsStatements] = useState<Array<{ text: string; answer: 'Benar' | 'Salah' }>>([
    { text: 'Pernyataan pertama...', answer: 'Benar' },
    { text: 'Pernyataan kedua...', answer: 'Salah' }
  ]);
  const [bsSingleAnswer, setBsSingleAnswer] = useState<'Benar' | 'Salah'>('Benar');

  // State untuk PG / PGK
  const [pgOptions, setPgOptions] = useState<string[]>(['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D']);
  const [pgAnswer, setPgAnswer] = useState<string>('A');
  const [pgkAnswer, setPgkAnswer] = useState<string[]>(['A']);

  // State untuk Isian Singkat & Esai
  const [shortAnswer, setShortAnswer] = useState('');
  const [essayKey, setEssayKey] = useState('');

  const handleSaveNewQuestion = (e: React.FormEvent) => {
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
    setShowAddModal(false);
    // Reset form
    setModalText('');
    setModalMediaUrl('');
  };

  return (
    <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
      {/* 1. HERO BANNER MAPEL */}
      <div className="bg-gradient-to-r from-fuchsia-950/40 via-zinc-900 to-zinc-900 border border-fuchsia-500/20 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
              Kelas {subject.className}
            </span>
            <span className="text-xs text-zinc-400">Token Ujian: <strong className="text-fuchsia-400">{subject.token}</strong></span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-100">{subject.title}</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Durasi: {subject.durationMinutes} Menit | Batas Pelanggaran: {subject.violationLimit} Kali
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold text-sm transition shadow-lg shadow-fuchsia-600/25"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Soal</span>
          </button>
          <button
            onClick={onStartStudentExam}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-600/25"
          >
            <Eye className="w-4 h-4" />
            <span>Simulasi Ujian Siswa</span>
          </button>
        </div>
      </div>

      {/* 2. TABS NAVIGASI */}
      <div className="flex border-b border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'questions'
              ? 'border-fuchsia-500 text-fuchsia-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Bank Soal ({questions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('scoring')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'scoring'
              ? 'border-fuchsia-500 text-fuchsia-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Pengaturan Bobot Poin</span>
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'results'
              ? 'border-fuchsia-500 text-fuchsia-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Hasil Ujian ({results.length})</span>
        </button>
      </div>

      {/* 3. TAB 1: BANK SOAL */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/80 transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-fuchsia-400 text-sm">#{idx + 1}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700">
                    {q.type}
                  </span>
                </div>
                <button
                  onClick={() => onDeleteQuestion(q.id)}
                  className="text-zinc-500 hover:text-rose-400 p-1.5 transition"
                  title="Hapus Soal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-zinc-100 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {q.questionText}
              </p>

              {/* Rincian Opsi Soal */}
              {q.type === 'Benar/Salah' && Array.isArray(q.options) && q.options.length > 0 && (
                <div className="space-y-1.5 pl-2 border-l-2 border-fuchsia-500/30 text-xs">
                  {(q.options as any[]).map((opt, oIdx) => {
                    const ans = Array.isArray(q.answer) ? q.answer[oIdx] : '-';
                    return (
                      <div key={oIdx} className="flex items-center justify-between py-1 px-2.5 rounded bg-zinc-950/60">
                        <span className="text-zinc-300">{oIdx + 1}. {opt.text}</span>
                        <span className={`font-bold ${ans === 'Benar' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ans}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Kunci Jawaban */}
              <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-800/60 flex items-center gap-2">
                <strong className="text-emerald-400">Kunci Jawaban:</strong>
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
      )}

      {/* 4. TAB 2: PENGATURAN BOBOT NILAI */}
      {activeTab === 'scoring' && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100">Bobot Nilai per Tipe Soal</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Nilai akhir dihitung otomatis secara proporsional sesuai perbandingan bobot ini.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {Object.keys(subject.scoringRules).map(typeKey => {
              const currentWeight = subject.scoringRules[typeKey as QuestionType] || 1;
              return (
                <div key={typeKey} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 block">{typeKey}</label>
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
                      className="w-24 p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm font-bold text-fuchsia-400 text-center"
                    />
                    <span className="text-xs text-zinc-400">Poin Maksimal</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. TAB 3: HASIL UJIAN SISWA */}
      {activeTab === 'results' && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-100">Daftar Nilai Siswa</h3>
            <span className="text-xs text-zinc-400">{results.length} Siswa Telah Mengerjakan</span>
          </div>

          {results.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Belum ada data nilai ujian. Klik tombol <strong>Simulasi Ujian Siswa</strong> untuk mencoba mengerjakan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase">
                  <tr>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Skor Akhir</th>
                    <th className="py-3 px-4">Pelanggaran</th>
                    <th className="py-3 px-4">Waktu Selesai</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {results.map(r => (
                    <tr key={r.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3 px-4 font-semibold text-zinc-100">{r.studentName}</td>
                      <td className="py-3 px-4 text-zinc-400">{r.className}</td>
                      <td className="py-3 px-4 font-bold text-fuchsia-400 text-base">{r.score}</td>
                      <td className="py-3 px-4">
                        {r.violationCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            <ShieldAlert className="w-3 h-3" />
                            {r.violationCount} kali
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-400">{r.submittedAt}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedResult(r)}
                          className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
                        >
                          Lihat Rincian
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL TAMBAH SOAL BARU */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-100">Tambah Soal Baru</h3>

            <form onSubmit={handleSaveNewQuestion} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Tipe Soal</label>
                <select
                  value={modalType}
                  onChange={e => setModalType(e.target.value as QuestionType)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 font-medium"
                >
                  <option value="Pilihan Ganda">Pilihan Ganda</option>
                  <option value="Benar/Salah">Benar/Salah (Mendukung Banyak Pernyataan)</option>
                  <option value="Pilihan Ganda Kompleks">Pilihan Ganda Kompleks</option>
                  <option value="Isian Singkat">Isian Singkat</option>
                  <option value="Esai">Esai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Teks Soal / Stimulus</label>
                <textarea
                  rows={3}
                  required
                  value={modalText}
                  onChange={e => setModalText(e.target.value)}
                  placeholder="Ketik teks soal Anda di sini..."
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200"
                />
              </div>

              {/* TAMPILAN KHUSUS BENAR / SALAH */}
              {modalType === 'Benar/Salah' && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-fuchsia-500/30 space-y-4">
                  <div className="flex gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={bsMode === 'multiple'}
                        onChange={() => setBsMode('multiple')}
                        className="accent-fuchsia-500"
                      />
                      <span>Banyak Pernyataan (Lebih dari 1 Jawaban)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={bsMode === 'single'}
                        onChange={() => setBsMode('single')}
                        className="accent-fuchsia-500"
                      />
                      <span>1 Pernyataan Saja</span>
                    </label>
                  </div>

                  {bsMode === 'multiple' ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-zinc-400">
                        Daftar Pernyataan & Kunci
                      </label>
                      {bsStatements.map((stmt, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <span className="w-5 text-xs font-bold text-fuchsia-400">{sIdx + 1}.</span>
                          <input
                            type="text"
                            value={stmt.text}
                            onChange={e => {
                              const next = [...bsStatements];
                              next[sIdx].text = e.target.value;
                              setBsStatements(next);
                            }}
                            className="flex-1 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                          />
                          <select
                            value={stmt.answer}
                            onChange={e => {
                              const next = [...bsStatements];
                              next[sIdx].answer = e.target.value as 'Benar' | 'Salah';
                              setBsStatements(next);
                            }}
                            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-emerald-400"
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
                        className="text-xs text-fuchsia-400 hover:underline pt-1 block"
                      >
                        + Tambah Baris Pernyataan
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-2">Jawaban Benar</label>
                      <div className="flex gap-4 text-xs font-semibold">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={bsSingleAnswer === 'Benar'}
                            onChange={() => setBsSingleAnswer('Benar')}
                            className="accent-fuchsia-500"
                          />
                          <span className="text-emerald-400">Benar</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={bsSingleAnswer === 'Salah'}
                            onChange={() => setBsSingleAnswer('Salah')}
                            className="accent-fuchsia-500"
                          />
                          <span className="text-rose-400">Salah</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAMPILAN KHUSUS PILIHAN GANDA */}
              {modalType === 'Pilihan Ganda' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-zinc-400">Opsi Jawaban & Kunci</label>
                  {pgOptions.map((optText, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    return (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="pg-kunci"
                          checked={pgAnswer === letter}
                          onChange={() => setPgAnswer(letter)}
                          className="accent-fuchsia-500 h-4 w-4"
                        />
                        <span className="font-bold text-fuchsia-400 w-4">{letter}</span>
                        <input
                          type="text"
                          value={optText}
                          onChange={e => {
                            const next = [...pgOptions];
                            next[oIdx] = e.target.value;
                            setPgOptions(next);
                          }}
                          className="flex-1 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAMPILAN KHUSUS ISIAN SINGKAT */}
              {modalType === 'Isian Singkat' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Variasi Kunci Jawaban Benar (Pisahkan koma atau titik koma)
                  </label>
                  <input
                    type="text"
                    value={shortAnswer}
                    onChange={e => setShortAnswer(e.target.value)}
                    placeholder="Contoh: newton; n; sir isaac newton"
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold text-xs transition"
                >
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL DETAIL NILAI SISWA */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-zinc-100">{selectedResult.studentName}</h3>
                <p className="text-xs text-zinc-400">Kelas: {selectedResult.className} | Waktu: {selectedResult.submittedAt}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400">Skor Akhir</span>
                <p className="text-2xl font-black text-fuchsia-400">{selectedResult.score}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {(selectedResult.details || []).map((d, dIdx) => (
                <div key={dIdx} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-fuchsia-400">Soal #{dIdx + 1} ({d.type})</span>
                    <span className={d.earnedPoints === d.maxPoints ? 'text-emerald-400' : d.earnedPoints > 0 ? 'text-amber-400' : 'text-rose-400'}>
                      Poin: {d.earnedPoints} / {d.maxPoints}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-zinc-400">
                    <div>Jawaban Siswa: <strong className="text-zinc-200">{JSON.stringify(d.studentAnswer)}</strong></div>
                    <div>Kunci Jawaban: <strong className="text-emerald-400">{JSON.stringify(d.correctAnswer)}</strong></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
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
