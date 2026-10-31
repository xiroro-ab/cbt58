'use client';

import React, { useState, useEffect } from 'react';
import { ExamResult, Subject, Student } from '@/types/cbt';
import { resolveStudentSingleClass } from '@/lib/rosterStudents';
import { extractSubjectAndGrade } from '@/lib/aiQuestionGenerator';
import { useLanguage } from '@/context/LanguageContext';
import { Award, Printer, X, CheckCircle, ShieldCheck } from 'lucide-react';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ExamResult[];
  selectedStudentResult?: ExamResult | null;
  allSubjects?: Subject[];
  students?: Student[];
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  results,
  selectedStudentResult,
  allSubjects = [],
  students = []
}) => {
  const { language, t } = useLanguage();
  const [activeStudentId, setActiveStudentId] = useState<string>(
    selectedStudentResult ? selectedStudentResult.id : results[0]?.id || ''
  );

  // Sinkronkan activeStudentId setiap kali siswa yang diklik berganti atau modal dibuka
  useEffect(() => {
    if (selectedStudentResult?.id) {
      setActiveStudentId(selectedStudentResult.id);
    } else if (results.length > 0 && !results.some(r => r.id === activeStudentId)) {
      setActiveStudentId(results[0].id);
    }
  }, [selectedStudentResult, isOpen]);

  if (!isOpen) return null;

  const currentResult = results.find(r => r.id === activeStudentId) || selectedStudentResult || results[0];

  const handlePrint = () => {
    window.print();
  };

  const getPredicate = (score: number) => {
    if (score >= 90) return { label: 'SANGAT BAIK (A)', color: 'text-emerald-600' };
    if (score >= 75) return { label: 'BAIK (B)', color: 'text-indigo-600' };
    if (score >= 60) return { label: 'CUKUP (C)', color: 'text-amber-600' };
    return { label: 'PERLU BIMBINGAN (D)', color: 'text-rose-600' };
  };

  const pred = currentResult ? getPredicate(currentResult.score) : { label: 'BAIK', color: 'text-indigo-600' };

  // Resolusi Identitas Siswa & Mata Pelajaran Akurat
  const matchedSubject = (allSubjects || []).find(s => s.id === currentResult?.subjectId);
  const rawSubjectTitle = currentResult?.subjectTitle || matchedSubject?.title || 'Mata Pelajaran Ujian';
  const cleanSubject = extractSubjectAndGrade(rawSubjectTitle, currentResult?.className).cleanSubject || rawSubjectTitle;

  const matchedStudent = (students || []).find(
    s => s.name.toLowerCase().trim() === currentResult?.studentName?.toLowerCase().trim()
  );
  const nisn = matchedStudent?.nisn || '-';
  const cleanClass = resolveStudentSingleClass(currentResult?.studentName, currentResult?.className, students);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                {language === 'id' ? 'Cetak Sertifikat & SKL Ujian Siswa' : 'Print Student Exam Certificates'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'id' ? 'Pilih siswa untuk menampilkan dan mencetak sertifikat resmi' : 'Select student to preview and print certificate'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {results.length > 1 && (
              <select
                value={activeStudentId}
                onChange={e => setActiveStudentId(e.target.value)}
                className="text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100 font-semibold cursor-pointer max-w-xs"
              >
                {results.map(r => {
                  const sub = (allSubjects || []).find(s => s.id === r.subjectId)?.title || r.subjectTitle;
                  const cls = resolveStudentSingleClass(r.studentName, r.className, students);
                  return (
                    <option key={r.id} value={r.id}>
                      {r.studentName} ({cls} • {r.score}%{sub ? ` • ${sub}` : ''})
                    </option>
                  );
                })}
              </select>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'id' ? 'Cetak / PDF' : 'Print / PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Sheet Area (Formatted for Print) */}
        <div className="p-6 sm:p-12 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950/50 print:bg-white print:p-8">
          {!currentResult ? (
            <div className="text-center py-12 text-slate-400">
              {language === 'id' ? 'Belum ada data nilai siswa untuk dicetak.' : 'No student results available to print.'}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-white border-8 border-double border-slate-300 rounded-3xl p-8 sm:p-12 text-slate-900 shadow-md relative print:shadow-none print:border-4">
              {/* Kop Surat Resmi */}
              <div className="text-center pb-6 border-b-2 border-slate-900 space-y-1">
                <p className="text-xs tracking-widest font-bold uppercase text-slate-600">
                  PEMERINTAH KOTA PALEMBANG • DINAS PENDIDIKAN
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide">
                  SMP NEGERI 58 PALEMBANG
                </h2>
                <p className="text-[11px] text-slate-500">
                  Jl. Pangeran Ratu, Jakabaring, Kec. Seberang Ulu I, Kota Palembang, Sumatera Selatan • Telepon: (0711) 351234
                </p>
              </div>

              {/* Judul Piagam */}
              <div className="text-center py-8 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-violet-600">
                  Computer-Based Test (CBT) Assessment
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                  SURAT HASIL KELULUSAN UJIAN
                </h1>
                <p className="text-xs text-slate-500 font-mono">
                  Nomor: 421.3/CBT-58/{new Date().getFullYear()}/{currentResult.id.slice(0, 6)}
                </p>
              </div>

              {/* Pernyataan Kelulusan */}
              <div className="text-center space-y-4 max-w-lg mx-auto py-2">
                <p className="text-sm text-slate-600">
                  Kepala SMP Negeri 58 Palembang menerangkan bahwa:
                </p>
                <div className="py-2 border-b-2 border-violet-600 inline-block px-8">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
                    {currentResult.studentName}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 pt-1">
                  NISN: <strong className="font-mono text-slate-900 font-bold">{nisn}</strong> • Rombel: <strong className="text-slate-900 font-bold">{cleanClass}</strong>
                </p>
                <p className="text-sm text-slate-700 leading-relaxed pt-2">
                  Telah mengikuti dan menyelesaikan Ujian Penilaian Berbasis Komputer (CBT) mata pelajaran{' '}
                  <strong className="text-slate-900 font-bold underline">{cleanSubject}</strong>
                  {rawSubjectTitle && rawSubjectTitle.toLowerCase() !== cleanSubject.toLowerCase() && (
                    <span className="text-xs text-slate-500 block mt-0.5 font-sans">({rawSubjectTitle})</span>
                  )}{' '}
                  dengan perolehan hasil sebagai berikut:
                </p>
              </div>

              {/* Kotak Nilai Besar */}
              <div className="my-6 max-w-xs mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <span className="text-xs text-slate-500 uppercase font-semibold">Skor Akhir Siswa</span>
                <div className="text-4xl sm:text-5xl font-black text-violet-700">
                  {currentResult.score}%
                </div>
                <div className={`text-xs font-bold ${pred.color}`}>
                  PREDIKAT: {pred.label}
                </div>
              </div>

              {/* Tanda Tangan & QR Validasi */}
              <div className="pt-8 flex items-end justify-between text-xs">
                {/* QR Code Mockup */}
                <div className="space-y-1 text-center">
                  <div className="w-20 h-20 bg-slate-100 border border-slate-300 rounded-xl flex items-center justify-center p-2 mx-auto">
                    <ShieldCheck className="w-10 h-10 text-emerald-600" />
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">Digital Verified</span>
                </div>

                {/* Tanda Tangan */}
                <div className="text-right space-y-1">
                  <p className="text-slate-500">Palembang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-semibold text-slate-800">Kepala Sekolah SMPN 58,</p>
                  <div className="h-14 flex items-center justify-end">
                    <span className="font-serif italic text-slate-400 text-lg">Hj. Rohana, S.Pd., M.Si.</span>
                  </div>
                  <p className="font-bold text-slate-900 underline">Hj. Rohana, S.Pd., M.Si.</p>
                  <p className="text-[10px] text-slate-500 font-mono">NIP. 19680512 199412 2 001</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
