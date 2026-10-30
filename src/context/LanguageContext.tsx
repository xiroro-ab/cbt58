'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'id' | 'en';

export interface Translations {
  // Brand & General
  appName: string;
  appSubtitle: string;
  searchPlaceholder: string;
  loading: string;
  close: string;
  cancel: string;
  save: string;
  delete: string;
  detail: string;
  active: string;
  inactive: string;

  // Sidebar Groups
  mainGroup: string;
  managementGroup: string;
  systemGroup: string;

  // Nav Items
  navDashboard: string;
  navExams: string;
  navQuestions: string;
  navStudents: string;
  navResults: string;
  navStatistics: string;
  navScoring: string;
  navSettings: string;
  navHelp: string;

  // Navbar
  greeting: string;
  examDateInfo: string;
  addQuestionBtn: string;
  studentViewBtn: string;
  switchThemeLight: string;
  switchThemeDark: string;
  switchLanguage: string;
  notificationsTitle: string;
  messagesTitle: string;
  markAllRead: string;
  noNotifications: string;
  teachersRosterTitle: string;

  // Metrics
  metricGradingTitle: string;
  metricGradingSub: string;
  metricActiveStudentsTitle: string;
  metricActiveStudentsSub: string;
  metricQuestionsTitle: string;
  metricQuestionsSub: string;
  metricAvgScore: string;
  metricPassRate: string;

  // Charts
  chartAssessmentTitle: string;
  chartAssessmentSub: string;
  chartDistributionTitle: string;
  chartDistributionSub: string;
  chartPassMark: string;

  // Results Table
  tableTitle: string;
  tableSubtitle: string;
  sendCertificatesBtn: string;
  exportCsvBtn: string;
  colName: string;
  colScore: string;
  colReasoning: string;
  colTime: string;
  colAnalysis: string;
  colDate: string;
  colViolations: string;
  colAction: string;
  noResults: string;
  passedStatus: string;
  remedialStatus: string;

  // Question Form
  addQuestionTitle: string;
  questionTypeLabel: string;
  stimulusLabel: string;
  stimulusPlaceholder: string;
  bsModeMultiple: string;
  bsModeSingle: string;
  addStatementBtn: string;
  singleAnswerKey: string;
  saveQuestionBtn: string;

  // Student Screen
  studentLoginTitle: string;
  studentLoginSub: string;
  studentNameLabel: string;
  studentClassLabel: string;
  studentTokenLabel: string;
  startExamBtn: string;
  backToTeacherBtn: string;
  antiCheatWarning: string;
  timeRemaining: string;
  doubtfulCheckbox: string;
  prevQuestion: string;
  nextQuestion: string;
  finishExamBtn: string;
  confirmSubmitTitle: string;
  confirmSubmitDesc: string;
}

const dictionaries: Record<Language, Translations> = {
  id: {
    appName: 'Tabor Study',
    appSubtitle: 'CBT Assessment v2.0',
    searchPlaceholder: 'Cari menu, siswa, soal...',
    loading: 'Memuat data...',
    close: 'Tutup',
    cancel: 'Batal',
    save: 'Simpan',
    delete: 'Hapus',
    detail: 'Detail',
    active: 'Aktif',
    inactive: 'Nonaktif',

    mainGroup: 'Utama',
    managementGroup: 'Manajemen',
    systemGroup: 'Sistem',

    navDashboard: 'Dashboard',
    navExams: 'Jadwal Ujian',
    navQuestions: 'Bank Soal',
    navStudents: 'Daftar Siswa',
    navResults: 'Database Nilai',
    navStatistics: 'Statistik & Analisis',
    navScoring: 'Pengaturan Bobot',
    navSettings: 'Pengaturan',
    navHelp: 'Bantuan & Panduan',

    greeting: 'Selamat Datang, Bapak/Ibu Guru',
    examDateInfo: 'Tanggal Ujian: 30 Okt 2026 • SMP Negeri 58 Palembang',
    addQuestionBtn: 'Tambah Soal',
    studentViewBtn: 'Layar Siswa',
    switchThemeLight: 'Ganti ke Mode Terang',
    switchThemeDark: 'Ganti ke Mode Gelap',
    switchLanguage: 'Ganti Bahasa (English)',
    notificationsTitle: 'Notifikasi Aktivitas',
    messagesTitle: 'Pesan & Pengumuman Ujian',
    markAllRead: 'Tandai Semua Dibaca',
    noNotifications: 'Tidak ada notifikasi baru.',
    teachersRosterTitle: 'Daftar Guru & Pengawas Aktif',

    metricGradingTitle: 'Tingkat Kelulusan (KKM)',
    metricGradingSub: 'Target Kelulusan Sekolah: 75%',
    metricActiveStudentsTitle: 'Peserta Ujian Selesai',
    metricActiveStudentsSub: 'Rata-rata Skor Siswa',
    metricQuestionsTitle: 'Total Butir Soal',
    metricQuestionsSub: 'Distribusi Tipe Soal Lengkap',
    metricAvgScore: 'Rata-Rata Nilai',
    metricPassRate: 'Lulus KKM',

    chartAssessmentTitle: 'Grafik Tren Penilaian & Kelulusan',
    chartAssessmentSub: 'Rekapitulasi persentase capaian per mata pelajaran',
    chartDistributionTitle: 'Distribusi Sebaran Skor Siswa',
    chartDistributionSub: 'Berdasarkan interval nilai hasil ujian',
    chartPassMark: 'Batas Nilai:',

    tableTitle: 'Daftar Hasil Ujian Siswa',
    tableSubtitle: 'Rekam jejak nilai, waktu pengerjaan, dan riwayat anti-cheat',
    sendCertificatesBtn: 'Cetak / Kirim Sertifikat',
    exportCsvBtn: 'Ekspor Excel / CSV',
    colName: 'Nama Siswa',
    colScore: 'Skor Akhir',
    colReasoning: 'Capaian Soal',
    colTime: 'Waktu',
    colAnalysis: 'Visual Nilai',
    colDate: 'Waktu Selesai',
    colViolations: 'Pelanggaran',
    colAction: 'Aksi',
    noResults: 'Belum ada data nilai ujian siswa. Silakan klik tombol Layar Siswa untuk mencoba simulasi ujian.',
    passedStatus: 'LULUS (KKM)',
    remedialStatus: 'REMEDIAL',

    addQuestionTitle: 'Tambah Soal Baru',
    questionTypeLabel: 'Tipe Soal',
    stimulusLabel: 'Teks Soal / Stimulus',
    stimulusPlaceholder: 'Tulis stimulus atau narasi soal di sini...',
    bsModeMultiple: 'Banyak Pernyataan (> 1 Jawaban)',
    bsModeSingle: '1 Pernyataan Saja',
    addStatementBtn: '+ Tambah Pernyataan Baru',
    singleAnswerKey: 'Kunci Jawaban Benar/Salah',
    saveQuestionBtn: 'Simpan ke Bank Soal',

    studentLoginTitle: 'Ruang Ujian Siswa',
    studentLoginSub: 'Masukkan data diri dan token ujian yang diberikan guru pengawas',
    studentNameLabel: 'Nama Lengkap Siswa',
    studentClassLabel: 'Kelas',
    studentTokenLabel: 'Token Ujian',
    startExamBtn: 'Mulai Mengerjakan Ujian',
    backToTeacherBtn: 'Kembali ke Panel Guru',
    antiCheatWarning: 'Sistem Anti-Cheat aktif. Dilarang berpindah tab atau meminimalkan browser.',
    timeRemaining: 'Sisa Waktu',
    doubtfulCheckbox: 'Ragu-ragu',
    prevQuestion: 'Soal Sebelumnya',
    nextQuestion: 'Soal Berikutnya',
    finishExamBtn: 'Kumpulkan & Selesai',
    confirmSubmitTitle: 'Kirim Jawaban Ujian?',
    confirmSubmitDesc: 'Pastikan seluruh soal telah Anda jawab dengan teliti sebelum mengirimkan lembar jawaban.'
  },
  en: {
    appName: 'Tabor Study',
    appSubtitle: 'CBT Assessment v2.0',
    searchPlaceholder: 'Search menu, student, question...',
    loading: 'Loading data...',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    detail: 'Detail',
    active: 'Active',
    inactive: 'Inactive',

    mainGroup: 'Main',
    managementGroup: 'Management',
    systemGroup: 'System',

    navDashboard: 'Dashboard',
    navExams: 'Exam Schedule',
    navQuestions: 'Question Bank',
    navStudents: 'Student List',
    navResults: 'Score Database',
    navStatistics: 'Statistics & Analytics',
    navScoring: 'Scoring Rules',
    navSettings: 'Settings',
    navHelp: 'Help & Guide',

    greeting: 'Welcome, Teacher',
    examDateInfo: 'Exam Date: Oct 30, 2026 • SMP Negeri 58 Palembang',
    addQuestionBtn: 'Add Question',
    studentViewBtn: 'Student View',
    switchThemeLight: 'Switch to Light Mode',
    switchThemeDark: 'Switch to Dark Mode',
    switchLanguage: 'Switch Language (Bahasa Indonesia)',
    notificationsTitle: 'Activity Notifications',
    messagesTitle: 'Exam Messages & Announcements',
    markAllRead: 'Mark All as Read',
    noNotifications: 'No new notifications.',
    teachersRosterTitle: 'Active Teachers & Proctors',

    metricGradingTitle: 'Passing Rate (Passing Grade)',
    metricGradingSub: 'School Standard Target: 75%',
    metricActiveStudentsTitle: 'Completed Students',
    metricActiveStudentsSub: 'Average Student Score',
    metricQuestionsTitle: 'Total Questions',
    metricQuestionsSub: 'Comprehensive Question Breakdown',
    metricAvgScore: 'Average Score',
    metricPassRate: 'Passed Rate',

    chartAssessmentTitle: 'Assessment & Passing Trend',
    chartAssessmentSub: 'Overview of student passing rates across subjects',
    chartDistributionTitle: 'Student Score Distribution',
    chartDistributionSub: 'Based on test score intervals',
    chartPassMark: 'Pass Mark:',

    tableTitle: 'Browse Test Results',
    tableSubtitle: 'Student scores, duration, and anti-cheat tracking history',
    sendCertificatesBtn: 'Print / Send Certificates',
    exportCsvBtn: 'Export Excel / CSV',
    colName: 'Student Name',
    colScore: 'Total Score',
    colReasoning: 'Score Breakdown',
    colTime: 'Time',
    colAnalysis: 'Visual Score',
    colDate: 'Submission Date',
    colViolations: 'Violations',
    colAction: 'Action',
    noResults: 'No exam results yet. Click the Student View button above to test a simulation.',
    passedStatus: 'PASSED',
    remedialStatus: 'REMEDIAL',

    addQuestionTitle: 'Add New Question',
    questionTypeLabel: 'Question Type',
    stimulusLabel: 'Question Text / Stimulus',
    stimulusPlaceholder: 'Type question prompt or stimulus here...',
    bsModeMultiple: 'Multiple Statements (> 1 Answer)',
    bsModeSingle: 'Single Statement Only',
    addStatementBtn: '+ Add Statement',
    singleAnswerKey: 'Answer Key',
    saveQuestionBtn: 'Save to Question Bank',

    studentLoginTitle: 'Student Exam Room',
    studentLoginSub: 'Enter your student credentials and the exam token provided by proctor',
    studentNameLabel: 'Full Student Name',
    studentClassLabel: 'Class',
    studentTokenLabel: 'Exam Token',
    startExamBtn: 'Start Examination',
    backToTeacherBtn: 'Return to Teacher Panel',
    antiCheatWarning: 'Anti-Cheat system active. Switching tabs or leaving the page is prohibited.',
    timeRemaining: 'Time Left',
    doubtfulCheckbox: 'Flag Doubtful',
    prevQuestion: 'Previous',
    nextQuestion: 'Next',
    finishExamBtn: 'Submit & Finish',
    confirmSubmitTitle: 'Submit Exam Answers?',
    confirmSubmitDesc: 'Please confirm that you have answered all questions carefully before submission.'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('id');

  useEffect(() => {
    const saved = localStorage.getItem('cbt_lang') as Language;
    if (saved && (saved === 'id' || saved === 'en')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('cbt_lang', lang);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'id' ? 'en' : 'id';
    setLanguage(nextLang);
  };

  const t = dictionaries[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
