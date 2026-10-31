'use client';

import React, { useState, useEffect } from 'react';
import { ExamResult, Subject, Student, SchoolSettings, Teacher } from '@/types/cbt';
import { resolveStudentSingleClass } from '@/lib/rosterStudents';
import { extractSubjectAndGrade } from '@/lib/aiQuestionGenerator';
import { useLanguage } from '@/context/LanguageContext';
import { TTESignatureSeal } from '@/components/common/TTESignatureSeal';
import { Award, Printer, X, ShieldCheck } from 'lucide-react';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ExamResult[];
  selectedStudentResult?: ExamResult | null;
  allSubjects?: Subject[];
  students?: Student[];
  schoolSettings?: SchoolSettings;
  currentTeacher?: Teacher | null;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  results,
  selectedStudentResult,
  allSubjects = [],
  students = [],
  schoolSettings,
  currentTeacher
}) => {
  const { language } = useLanguage();
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

  const principalName = schoolSettings?.principalName || 'Hj. Rohana, S.Pd., M.Si.';
  const principalNip = schoolSettings?.principalNip || '19680512 199412 2 001';
  const principalTitle = schoolSettings?.principalTitle || `Kepala ${schoolSettings?.schoolName?.replace('SMP NEGERI ', 'SMPN ') || 'SMPN 58 Palembang'}`;
  const schoolName = schoolSettings?.schoolName || 'SMP NEGERI 58 PALEMBANG';
  const city = schoolSettings?.city || 'Palembang';
  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:z-auto print:block">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
        {/* Modal Controls (Hidden in Print) - 100% RESPONSIVE FOR MOBILE & PC */}
        <div className="p-3 sm:p-5 border-b border-slate-100 dark:border-slate-800 space-y-2.5 print:hidden">
          {/* Top Row: Title & Action Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold shrink-0">
                <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-base truncate">
                  {language === 'id' ? 'Cetak Sertifikat & SKL Ujian Siswa' : 'Print Student Exam Certificates'}
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block truncate">
                  {language === 'id' ? 'Pilih siswa untuk menampilkan dan mencetak sertifikat resmi' : 'Select student to preview and print certificate'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{language === 'id' ? 'Cetak / PDF' : 'Print / PDF'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Bottom Row: Full Width Student Selector (Super friendly on Mobile & PC) */}
          {results.length > 1 && (
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0 hidden md:inline">
                Pilih Siswa:
              </span>
              <select
                value={activeStudentId}
                onChange={e => setActiveStudentId(e.target.value)}
                className="text-xs p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 [color-scheme:light] dark:[color-scheme:dark] [&>option]:bg-white [&>option]:text-slate-900 [&>option]:dark:bg-slate-900 [&>option]:dark:text-slate-100 font-semibold cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {results.map(r => {
                  const sub = (allSubjects || []).find(s => s.id === r.subjectId)?.title || r.subjectTitle;
                  const cls = resolveStudentSingleClass(r.studentName, r.className, students);
                  return (
                    <option key={r.id} value={r.id}>
                      {r.studentName} ({cls} • Skor {r.score}%{sub ? ` • ${sub}` : ''})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Certificate Sheet Area (Formatted for Print) */}
        <div className="p-3 sm:p-6 md:p-10 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-950/50 print:bg-white print:p-4 print:overflow-visible">
          {!currentResult ? (
            <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
              {language === 'id' ? 'Belum ada data nilai siswa untuk dicetak.' : 'No student results available to print.'}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-white border-4 sm:border-8 border-double border-slate-300 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 text-slate-900 shadow-md relative print:shadow-none print:border-4 print:max-w-none print:p-6">
              {/* Kop Surat Resmi Dual Logo */}
              <div className="border-b-2 sm:border-b-4 border-double border-slate-900 pb-3 sm:pb-4 mb-3 sm:mb-5 text-center">
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={schoolSettings?.logoLeft || '/logo-dinas.png'}
                      alt="Logo Dinas"
                      className="max-h-14 sm:max-h-16 max-w-14 sm:max-w-16 object-contain"
                    />
                  </div>

                  <div className="flex-1 space-y-0.5 sm:space-y-1">
                    <p className="text-[9px] sm:text-xs tracking-widest font-bold uppercase text-slate-700 leading-tight">
                      {schoolSettings?.institution1 || 'PEMERINTAH KOTA PALEMBANG'}
                    </p>
                    <p className="text-[9px] sm:text-xs tracking-widest font-bold uppercase text-slate-700 leading-tight">
                      {schoolSettings?.institution2 || 'DINAS PENDIDIKAN'}
                    </p>
                    <h2 className="text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-wide uppercase leading-tight">
                      {schoolName}
                    </h2>
                    <p className="text-[8px] sm:text-[10px] text-slate-600 leading-tight">
                      {schoolSettings?.schoolAddress || 'Jln. Komering II, Kelurahan Demang Lebar Daun, Kecamatan Ilir Barat I, Kota Palembang, Sumatera Selatan 30151'}
                    </p>
                    {schoolSettings?.schoolContact && (
                      <p className="text-[7.5px] sm:text-[9px] text-slate-500 font-mono">
                        {schoolSettings.schoolContact}
                      </p>
                    )}
                  </div>

                  <div className="w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={schoolSettings?.logoRight || '/logo-sekolah.png'}
                      alt="Logo Sekolah"
                      className="max-h-14 sm:max-h-16 max-w-14 sm:max-w-16 object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Judul Piagam */}
              <div className="text-center py-5 sm:py-7 space-y-1 sm:space-y-2">
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-violet-600">
                  Computer-Based Test (CBT) Assessment
                </span>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight">
                  SURAT HASIL KELULUSAN UJIAN
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-mono">
                  Nomor: 421.3/CBT-58/{new Date().getFullYear()}/{currentResult.id.slice(0, 6)}
                </p>
              </div>

              {/* Pernyataan Kelulusan */}
              <div className="text-center space-y-3 sm:space-y-4 max-w-lg mx-auto py-1 sm:py-2">
                <p className="text-xs sm:text-sm text-slate-600">
                  Kepala {schoolName} menerangkan bahwa:
                </p>
                <div className="py-1.5 sm:py-2 border-b-2 border-violet-600 inline-block px-4 sm:px-8 max-w-full">
                  <h3 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-slate-900 font-serif break-words">
                    {currentResult.studentName}
                  </h3>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 pt-0.5">
                  NISN: <strong className="font-mono text-slate-900 font-bold">{nisn}</strong> • Rombel: <strong className="text-slate-900 font-bold">{cleanClass}</strong>
                </p>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pt-1 sm:pt-2">
                  Telah mengikuti dan menyelesaikan Ujian Penilaian Berbasis Komputer (CBT) mata pelajaran{' '}
                  <strong className="text-slate-900 font-bold underline">{cleanSubject}</strong>
                  {rawSubjectTitle && rawSubjectTitle.toLowerCase() !== cleanSubject.toLowerCase() && (
                    <span className="text-[10px] sm:text-xs text-slate-500 block mt-0.5 font-sans">({rawSubjectTitle})</span>
                  )}{' '}
                  dengan perolehan hasil sebagai berikut:
                </p>
              </div>

              {/* Kotak Nilai Besar */}
              <div className="my-4 sm:my-6 max-w-xs mx-auto p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-0.5 sm:space-y-1">
                <span className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold">Skor Akhir Siswa</span>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-violet-700">
                  {currentResult.score}%
                </div>
                <div className={`text-[11px] sm:text-xs font-bold ${pred.color}`}>
                  PREDIKAT: {pred.label}
                </div>
              </div>

              {/* Tanda Tangan Tunggal Kepala Sekolah & TTE Validasi Resmi */}
              <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 text-xs font-sans print:break-inside-avoid">
                {/* Bagian Kiri: Verifikasi Keaslian Digital */}
                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-700 font-bold text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Dokumen Resmi Terverifikasi</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-mono">
                    ID Sertifikat: CBT58-{currentResult.id.slice(0, 10).toUpperCase()}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-400">
                    Diterbitkan otomatis dari Server CBT {schoolName}
                  </p>
                  <p className="text-[8.5px] sm:text-[9.5px] text-slate-400">
                    Keaslian pengesahan dapat divalidasi melalui stempel TTE resmi.
                  </p>
                </div>

                {/* Bagian Kanan: Pejabat Kepala Sekolah (Dibaca 100% dari Pengaturan Sistem) */}
                <div className="text-center sm:text-right min-h-[160px] flex flex-col items-center sm:items-end justify-between">
                  <div>
                    <p className="text-[11px] sm:text-xs text-slate-600 font-sans">
                      {city}, {todayStr}
                    </p>
                    <p className="font-bold text-slate-900 uppercase font-sans tracking-wide text-xs sm:text-sm mt-0.5">
                      {principalTitle}
                    </p>
                  </div>

                  <div className="py-2 flex items-center justify-center min-h-[85px]">
                    {schoolSettings?.enableTTE !== false ? (
                      <TTESignatureSeal
                        settings={schoolSettings}
                        documentId={`SKL-${currentResult.id}`}
                        signerName={principalName}
                        signerTitle={principalTitle}
                        signerNip={principalNip}
                        signDate={todayStr}
                        sealOnly={true}
                        className="scale-95"
                      />
                    ) : (
                      <div className="h-16" />
                    )}
                  </div>

                  <div className="text-center sm:text-right">
                    <strong className="underline font-bold text-slate-900 block leading-tight text-xs sm:text-sm font-sans">
                      {principalName}
                    </strong>
                    <span className="text-[10px] sm:text-xs text-slate-600 font-mono block mt-0.5">
                      NIP. {principalNip}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catatan Kaki Otentikasi Digital */}
              <div className="mt-6 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[9px] sm:text-[10px] text-slate-500 font-sans gap-2 print:border-slate-300">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dokumen Resmi Terverifikasi TTE Elektronik Server CBT {schoolName}</span>
                </div>
                <div className="font-mono text-[8.5px] sm:text-[9px] text-slate-400">
                  ID: CBT58-{currentResult.id.slice(0, 10).toUpperCase()} • Dicetak: {todayStr}
                </div>
              </div>

              {/* Print Sheet Styling */}
              <style>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 8mm;
                  }
                  body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
