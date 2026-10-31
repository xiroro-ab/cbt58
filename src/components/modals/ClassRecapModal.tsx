'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ExamResult, Subject, Student, SchoolSettings, Teacher } from '@/types/cbt';
import { resolveStudentSingleClass, isClassInGrade } from '@/lib/rosterStudents';
import { TTESignatureSeal } from '@/components/common/TTESignatureSeal';
import { 
  Printer, 
  X, 
  FileSpreadsheet, 
  Download, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  Calendar,
  Sparkles
} from 'lucide-react';

interface ClassRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ExamResult[];
  allSubjects?: Subject[];
  students?: Student[];
  schoolSettings?: SchoolSettings;
  currentTeacher?: Teacher | null;
  initialClass?: string;
  initialSubjectId?: string;
}

// Helper mengecek apakah suatu rombel (misal 'VIII.1') termasuk dalam sasaran rombel mapel ini
const isClassMatchSubject = (className: string, subjectClassStr?: string) => {
  if (!subjectClassStr || subjectClassStr.trim() === 'Semua Kelas') return true;
  const parts = subjectClassStr.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return true;
  
  if (parts.some(p => p.toLowerCase() === className.toLowerCase())) return true;
  
  return parts.some(p => {
    const pUpper = p.toUpperCase();
    if ((pUpper.includes('VII') && !pUpper.includes('VIII')) || pUpper.includes('7')) {
      return isClassInGrade(className, 'VII');
    }
    if (pUpper.includes('VIII') || pUpper.includes('8')) {
      return isClassInGrade(className, 'VIII');
    }
    if (pUpper.includes('IX') || pUpper.includes('9')) {
      return isClassInGrade(className, 'IX');
    }
    return false;
  });
};

export const ClassRecapModal: React.FC<ClassRecapModalProps> = ({
  isOpen,
  onClose,
  results,
  allSubjects = [],
  students = [],
  schoolSettings,
  currentTeacher,
  initialClass = '',
  initialSubjectId = ''
}) => {
  // Mapel Terpilih (Sesuai role akun login guru)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialSubjectId && allSubjects.some(s => s.id === initialSubjectId)) {
      return initialSubjectId;
    }
    return allSubjects[0]?.id || '';
  });

  const activeSubject = useMemo(() => {
    return allSubjects.find(s => s.id === selectedSubjectId) || allSubjects[0] || {
      id: 'sub-default',
      title: 'Asesmen Sumatif Tengah Semester',
      className: 'Semua Kelas',
      durationMinutes: 60,
      violationLimit: 3,
      token: 'CBT2026',
      isActive: true,
      scoringRules: { 'Pilihan Ganda': 1, 'Pilihan Ganda Kompleks': 2, 'Benar/Salah': 2, 'Menjodohkan': 2, 'Isian Singkat': 2, 'Esai': 4 }
    };
  }, [allSubjects, selectedSubjectId]);

  // Daftar Seluruh Rombel Sekolah (Diurutkan dari VII.1 sampai IX.4)
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.className) set.add(s.className.trim());
    });
    results.forEach(r => {
      const cls = resolveStudentSingleClass(r.studentName, r.className, students);
      if (cls && cls !== 'Umum') set.add(cls.trim());
    });
    const list = Array.from(set);
    return list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [students, results]);

  // Pemisahan Rombel: Sasaran Mapel Terpilih vs Rombel Lainnya
  const { targetClasses, otherClasses } = useMemo(() => {
    if (!activeSubject?.className || activeSubject.className.trim() === 'Semua Kelas') {
      return { targetClasses: availableClasses, otherClasses: [] };
    }
    const target: string[] = [];
    const other: string[] = [];
    availableClasses.forEach(cls => {
      if (isClassMatchSubject(cls, activeSubject.className)) {
        target.push(cls);
      } else {
        other.push(cls);
      }
    });
    return {
      targetClasses: target.length > 0 ? target : availableClasses,
      otherClasses: target.length > 0 ? other : []
    };
  }, [availableClasses, activeSubject]);

  // State Pilihan Rombel Kelas & TTE
  const [selectedClass, setSelectedClass] = useState<string>('VII.1');
  const [showTTE, setShowTTE] = useState<boolean>(true);

  // Inisialisasi Pilihan Mapel Saat Modal Terbuka
  useEffect(() => {
    if (initialSubjectId && allSubjects.some(s => s.id === initialSubjectId)) {
      setSelectedSubjectId(initialSubjectId);
    } else if (allSubjects.length > 0 && !allSubjects.some(s => s.id === selectedSubjectId)) {
      setSelectedSubjectId(allSubjects[0].id);
    }
  }, [isOpen, initialSubjectId, allSubjects]);

  // Otomatis memilih rombel sasaran yang valid saat mapel dipilih / modal dibuka
  useEffect(() => {
    if (initialClass && targetClasses.includes(initialClass)) {
      setSelectedClass(initialClass);
    } else if (targetClasses.length > 0 && !targetClasses.includes(selectedClass)) {
      setSelectedClass(targetClasses[0]);
    } else if (availableClasses.length > 0 && !availableClasses.includes(selectedClass)) {
      setSelectedClass(availableClasses[0]);
    }
  }, [isOpen, initialClass, targetClasses, availableClasses]);

  if (!isOpen) return null;

  // Resolusi Identitas Sekolah & Kop Surat Resmi
  const effectiveSettings: SchoolSettings = {
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
    teacherName: currentTeacher?.name || schoolSettings?.teacherName || 'Hendra Wijaya, S.Pd',
    teacherNip: currentTeacher?.nip || schoolSettings?.teacherNip || '19870420 201201 1 004',
    city: schoolSettings?.city || 'Palembang',
    enableTTE: schoolSettings?.enableTTE !== false,
    tteType: schoolSettings?.tteType || 'qrcode',
    isolateTeacherDossier: schoolSettings?.isolateTeacherDossier !== false
  };

  // Kumpulan Seluruh Siswa di Rombel Kelas Terpilih Beserta Status Hasil Ujiannya
  const classRosterWithResults = useMemo(() => {
    if (!selectedClass) return [];

    // 1. Ambil seluruh siswa resmi dari roster kelas ini
    const rosterInClass = (students || [])
      .filter(s => resolveStudentSingleClass(s.name, s.className, students) === selectedClass)
      .sort((a, b) => a.name.localeCompare(b.name));

    // 2. Petakan hasil ujian untuk setiap siswa (Ketat terisolasi per mapel)
    const rows = rosterInClass.map(std => {
      const stdNameLower = std.name.toLowerCase().trim();
      const r = results.find(item => {
        if (!item || !item.studentName) return false;
        const nameMatch = item.studentName.toLowerCase().trim() === stdNameLower;
        const subMatch = item.subjectId === activeSubject.id;
        return nameMatch && subMatch;
      });

      const score = r ? Number(r.score || 0) : null;
      const isPassed = score !== null && score >= 75;
      const totalEarned = r ? Number(r.totalEarned || 0) : null;
      const totalMax = r ? Number(r.totalMax || 0) : null;
      const submittedAt = r ? (r.submittedAt || '-') : null;

      let predicate = '-';
      if (score !== null) {
        if (score >= 90) predicate = 'A';
        else if (score >= 75) predicate = 'B';
        else if (score >= 60) predicate = 'C';
        else predicate = 'D';
      }

      return {
        nisn: std.nisn || '-',
        name: std.name,
        gender: std.gender || 'Laki-Laki',
        className: selectedClass,
        hasTaken: r !== undefined,
        score,
        totalEarned,
        totalMax,
        predicate,
        isPassed,
        submittedAt
      };
    });

    // 3. Tambahkan siswa dari daftar results yang memiliki kelas sama tapi mungkin belum ada di roster
    results.forEach(r => {
      if (!r || !r.studentName) return;
      const resolvedCls = resolveStudentSingleClass(r.studentName, r.className, students);
      if (resolvedCls === selectedClass) {
        const alreadyExists = rows.some(item => item.name.toLowerCase().trim() === r.studentName.toLowerCase().trim());
        if (!alreadyExists && r.subjectId === activeSubject.id) {
          const score = Number(r.score || 0);
          rows.push({
            nisn: '-',
            name: r.studentName,
            gender: 'Laki-Laki',
            className: selectedClass,
            hasTaken: true,
            score,
            totalEarned: Number(r.totalEarned || 0),
            totalMax: Number(r.totalMax || 0),
            predicate: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D',
            isPassed: score >= 75,
            submittedAt: r.submittedAt || '-'
          });
        }
      }
    });

    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedClass, activeSubject.id, students, results]);

  // Statistik Kelas Rombel Terpilih
  const classStats = useMemo(() => {
    const totalStudents = classRosterWithResults.length;
    const takenList = classRosterWithResults.filter(s => s.hasTaken && s.score !== null);
    const takenCount = takenList.length;
    const notTakenCount = totalStudents - takenCount;

    const scores = takenList.map(s => s.score as number);
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
    const passedCount = takenList.filter(s => s.isPassed).length;
    const remedialCount = takenCount - passedCount;
    const passedPct = takenCount > 0 ? Math.round((passedCount / takenCount) * 100) : 0;

    return {
      totalStudents,
      takenCount,
      notTakenCount,
      highest,
      lowest,
      avg,
      passedCount,
      remedialCount,
      passedPct
    };
  }, [classRosterWithResults]);

  // Handler Print Khusus (Menghilangkan Background Dark Mode Saat Cetak Kertas)
  const handlePrint = () => {
    const htmlEl = document.documentElement;
    const isDark = htmlEl.classList.contains('dark');
    if (isDark) htmlEl.classList.remove('dark');

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

  // Ekspor Rekapan Kelas Terpilih ke File CSV
  const handleExportCSV = () => {
    const headers = ['No', 'NISN', 'Nama Siswa', 'Jenis Kelamin', 'Kelas', 'Poin Diperoleh', 'Poin Maksimal', 'Nilai Akhir', 'Predikat', 'Status KKM', 'Waktu Selesai'];
    const rows = classRosterWithResults.map((s, idx) => [
      idx + 1,
      `'${s.nisn}`,
      `"${s.name}"`,
      s.gender,
      s.className,
      s.totalEarned !== null ? s.totalEarned : '-',
      s.totalMax !== null ? s.totalMax : '-',
      s.score !== null ? s.score : 'BELUM UJIAN',
      s.predicate,
      s.hasTaken ? (s.isPassed ? 'TUNTAS' : 'REMEDIAL') : 'BELUM MENGERJAKAN',
      s.submittedAt ? `"${s.submittedAt}"` : '-'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Nilai_${activeSubject.title.replace(/\s+/g, '_')}_Kelas_${selectedClass}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full print:m-0 print:rounded-none">
        
        {/* ============================================================== */}
        {/* TOOLBAR KONTROL DIALOG (HIDDEN SAAT PRINT KERTAS / PDF)        */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-t-3xl print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                <span>Cetak Rekap Nilai Siswa Per Kelas</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Leger Rombel
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Laporan daftar kumpulan nilai per rombel siap tanda tangan Kepala Sekolah & Guru Pengampu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Pemilih Rombel Kelas */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs shadow-2xs">
              <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
              >
                {otherClasses.length === 0 ? (
                  targetClasses.map(cls => (
                    <option key={cls} value={cls}>Rombel Kelas {cls}</option>
                  ))
                ) : (
                  <>
                    <optgroup label={`Sasaran Mapel (${activeSubject.className})`}>
                      {targetClasses.map(cls => (
                        <option key={cls} value={cls}>Rombel Kelas {cls}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Rombel Lainnya">
                      {otherClasses.map(cls => (
                        <option key={cls} value={cls}>Rombel Kelas {cls}</option>
                      ))}
                    </optgroup>
                  </>
                )}
              </select>
            </div>

            {/* Pemilih Paket Mata Pelajaran (Khusus Mapel Milik Guru Ini) */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs shadow-2xs max-w-[200px] sm:max-w-[260px]">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer truncate [color-scheme:light] dark:[color-scheme:dark]"
              >
                {allSubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.className})
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Ekspor CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
              title="Unduh data leger kelas ini ke file Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            {/* Tombol Cetak / PDF */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap Kelas (PDF)</span>
            </button>

            {/* Tombol Tutup Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* AREA LEMBAR CETAK DOKUMEN (PRINTABLE SHEET BERSTANDAR DINAS)   */}
        {/* ============================================================== */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950/60 print:overflow-visible print:p-0 print:bg-white">
          <div className="bg-white text-slate-950 p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 font-serif space-y-5 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:max-w-none print:rounded-none">
            
            {/* 1. KOP SURAT RESMI INSTANSI DENGAN DUAL LOGO */}
            <div className="pb-3 border-b-4 border-double border-slate-900 text-slate-900">
              <div className="flex items-center justify-between gap-4">
                {/* Logo Dinas Kiri */}
                <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                  <img
                    src={effectiveSettings.logoLeft || '/logo-dinas.png'}
                    alt="Logo Dinas"
                    className="max-h-18 sm:max-h-20 max-w-full object-contain"
                  />
                </div>

                {/* Teks Kop Tengah */}
                <div className="flex-1 text-center font-serif leading-tight space-y-0.5">
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-slate-800 font-sans">
                    {effectiveSettings.institution1 || 'PEMERINTAH KOTA PALEMBANG'}
                  </h3>
                  <h2 className="text-sm sm:text-base font-bold tracking-wider uppercase text-slate-900 font-sans">
                    {effectiveSettings.institution2 || 'DINAS PENDIDIKAN'}
                  </h2>
                  <h1 className="text-lg sm:text-2xl font-black tracking-wide uppercase text-slate-950 font-sans">
                    {effectiveSettings.schoolName || 'SMP NEGERI 58 PALEMBANG'}
                  </h1>
                  {effectiveSettings.schoolAddress && (
                    <p className="text-[10px] sm:text-[11px] text-slate-600 leading-snug font-sans">
                      {effectiveSettings.schoolAddress}
                    </p>
                  )}
                  {effectiveSettings.schoolContact && (
                    <p className="text-[10px] text-slate-500 leading-snug font-sans">
                      {effectiveSettings.schoolContact}
                    </p>
                  )}
                </div>

                {/* Logo Sekolah Kanan */}
                <div className="w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center shrink-0">
                  <img
                    src={effectiveSettings.logoRight || '/logo-sekolah.png'}
                    alt="Logo Sekolah"
                    className="max-h-18 sm:max-h-20 max-w-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* 2. JUDUL DOKUMEN & IDENTITAS KELAS */}
            <div className="text-center space-y-1 pt-1 font-sans">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider underline">
                REKAPITULASI HASIL ASESMEN SUMATIF SISWA PER KELAS
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Tahun Pelajaran 2026/2027 • Berbasis Komputer & Android (CBT)
              </p>
            </div>

            {/* 3. ATRIBUT IDENTITAS UJIAN & KELAS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs font-sans">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Mata Pelajaran:</span>
                <strong className="text-slate-900 font-bold block truncate">{activeSubject.title}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Rombel Kelas:</span>
                <strong className="text-slate-900 font-bold block">Kelas {selectedClass}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Standar KKM:</span>
                <strong className="text-slate-900 font-bold block">75 (Tujuh Puluh Lima)</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Guru Pengampu:</span>
                <strong className="text-slate-900 font-bold block truncate">{effectiveSettings.teacherName}</strong>
              </div>
            </div>

            {/* 4. RINGKASAN REKAPITULASI KELAS (SUMMARY STATS) */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-sans print:grid-cols-6">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Siswa Rombel</span>
                <strong className="text-sm font-black text-slate-900">{classStats.totalStudents}</strong>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                <span className="text-[10px] text-emerald-700 block">Sudah Ujian</span>
                <strong className="text-sm font-black text-emerald-800">{classStats.takenCount}</strong>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <span className="text-[10px] text-amber-700 block">Belum Ujian</span>
                <strong className="text-sm font-black text-amber-800">{classStats.notTakenCount}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Rata-rata Nilai</span>
                <strong className="text-sm font-black text-violet-700">{classStats.avg}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Tertinggi / Terendah</span>
                <strong className="text-xs font-bold text-slate-800">{classStats.highest} / {classStats.lowest}</strong>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                <span className="text-[10px] text-emerald-700 block">Ketuntasan KKM</span>
                <strong className="text-sm font-black text-emerald-800">{classStats.passedPct}%</strong>
              </div>
            </div>

            {/* 5. TABEL DAFTAR KUMPULAN NILAI SISWA */}
            <div className="overflow-x-auto font-sans pt-1">
              <table className="w-full text-left border-collapse text-[11px] border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-100 text-slate-950 font-black text-center border-b-2 border-slate-900">
                    <th className="py-2 px-2 border-r border-slate-900 w-9">No</th>
                    <th className="py-2 px-2.5 border-r border-slate-900 w-24">NISN</th>
                    <th className="py-2 px-3 border-r border-slate-900 text-left">Nama Lengkap Siswa</th>
                    <th className="py-2 px-2 border-r border-slate-900 w-12">L/P</th>
                    <th className="py-2 px-2 border-r border-slate-900 w-20">Poin</th>
                    <th className="py-2 px-2.5 border-r border-slate-900 w-20">Nilai Akhir</th>
                    <th className="py-2 px-2 border-r border-slate-900 w-14">Predikat</th>
                    <th className="py-2 px-2.5 border-r border-slate-900 w-24">Status KKM</th>
                    <th className="py-2 px-2.5 w-28 text-center">Waktu Selesai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {classRosterWithResults.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-medium italic">
                        Tidak ada data siswa untuk rombel kelas {selectedClass}.
                      </td>
                    </tr>
                  ) : (
                    classRosterWithResults.map((s, idx) => {
                      const isLaki = s.gender.toLowerCase().includes('laki');
                      return (
                        <tr key={`${s.nisn}-${idx}`} className="border-b border-slate-300 text-center hover:bg-slate-50">
                          <td className="py-1.5 px-2 border-r border-slate-900 font-bold">{idx + 1}</td>
                          <td className="py-1.5 px-2.5 border-r border-slate-900 font-mono text-[10px] text-slate-700">{s.nisn}</td>
                          <td className="py-1.5 px-3 border-r border-slate-900 text-left font-bold uppercase text-slate-900">{s.name}</td>
                          <td className="py-1.5 px-2 border-r border-slate-900 text-[10px] font-semibold">{isLaki ? 'L' : 'P'}</td>
                          <td className="py-1.5 px-2 border-r border-slate-900 font-mono text-[10px]">
                            {s.totalEarned !== null ? `${s.totalEarned} / ${s.totalMax || 100}` : '-'}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-900 font-black text-xs">
                            {s.score !== null ? (
                              <span className={s.isPassed ? 'text-slate-950 font-black' : 'text-rose-700 font-black'}>
                                {s.score}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-900 font-bold">
                            {s.predicate}
                          </td>
                          <td className="py-1.5 px-2.5 border-r border-slate-900 font-bold text-[10px]">
                            {s.hasTaken ? (
                              s.isPassed ? (
                                <span className="text-emerald-700 font-bold">TUNTAS</span>
                              ) : (
                                <span className="text-rose-700 font-bold">REMEDIAL</span>
                              )
                            ) : (
                              <span className="text-amber-700 font-medium italic">Belum Ujian</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 text-[10px] text-slate-600 font-mono">
                            {s.submittedAt ? s.submittedAt.split(',')[0] : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 6. PENGESAHAN TANDA TANGAN RESMI (KEPALA SEKOLAH & GURU PENGAMPU) */}
            <div className="pt-6 font-sans text-xs break-inside-avoid">
              <div className="grid grid-cols-2 gap-8 items-end text-center">
                {/* Sisi Kiri: Mengetahui Kepala Sekolah */}
                <div className="flex flex-col items-center justify-between min-h-[140px] space-y-2">
                  <div>
                    <p className="text-[11px] text-slate-600">Mengetahui,</p>
                    <p className="font-bold text-slate-900 uppercase">Kepala Satuan Pendidikan</p>
                  </div>

                  <div className="py-1">
                    {effectiveSettings.enableTTE && showTTE ? (
                      <TTESignatureSeal
                        settings={effectiveSettings}
                        documentId={`LEGER-${selectedClass}-${activeSubject.token}`}
                        signerName={effectiveSettings.principalName}
                        signerTitle="Kepala Sekolah SMPN 58"
                        signerNip={effectiveSettings.principalNip}
                        signDate={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        className="scale-85"
                      />
                    ) : (
                      <div className="h-14" />
                    )}
                  </div>

                  <div>
                    <strong className="underline font-bold text-slate-900 block leading-tight text-xs uppercase">
                      {effectiveSettings.principalName}
                    </strong>
                    <span className="text-[10px] text-slate-600 font-mono block">
                      NIP. {effectiveSettings.principalNip}
                    </span>
                  </div>
                </div>

                {/* Sisi Kanan: Guru Mata Pelajaran / Wali Kelas */}
                <div className="flex flex-col items-center justify-between min-h-[140px] space-y-2">
                  <div>
                    <p className="text-[11px] text-slate-600">
                      {effectiveSettings.city}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="font-bold text-slate-900 uppercase">Guru Pengampu / Wali Kelas</p>
                  </div>

                  <div className="py-1">
                    {effectiveSettings.enableTTE && showTTE ? (
                      <TTESignatureSeal
                        settings={effectiveSettings}
                        documentId={`LEGER-GURU-${selectedClass}-${activeSubject.token}`}
                        signerName={effectiveSettings.teacherName}
                        signerTitle="Guru Pengampu / Proktor"
                        signerNip={effectiveSettings.teacherNip}
                        signDate={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        className="scale-85"
                      />
                    ) : (
                      <div className="h-14" />
                    )}
                  </div>

                  <div>
                    <strong className="underline font-bold text-slate-900 block leading-tight text-xs uppercase">
                      {effectiveSettings.teacherName}
                    </strong>
                    <span className="text-[10px] text-slate-600 font-mono block">
                      NIP. {effectiveSettings.teacherNip}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catatan Kaki Otentikasi Digital */}
              <div className="mt-6 pt-2 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-500 font-sans">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Dokumen Rekapitulasi Nilai Asesmen Sumatif Sah dicetak otomatis dari Server CBT {effectiveSettings.schoolName}
                </span>
                <span className="font-mono">
                  Dicetak: {new Date().toLocaleString('id-ID')}
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
