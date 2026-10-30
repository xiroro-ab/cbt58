'use client';

import React, { useState, useMemo } from 'react';
import { Student, ExamResult } from '@/types/cbt';
import { useLanguage } from '@/context/LanguageContext';
import * as XLSX from 'xlsx';
import {
  Users,
  PlusCircle,
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  FileText,
  Filter,
  Check,
  Award
} from 'lucide-react';

interface StudentManagementProps {
  students: Student[];
  results: ExamResult[];
  onAddStudent: (s: Student) => void;
  onUpdateStudent: (s: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onBulkInsertStudents: (studentsList: Student[]) => void;
  onBulkDeleteStudents: (studentIds: string[]) => void;
  onViewDossier: (result: ExamResult) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  results,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onBulkInsertStudents,
  onBulkDeleteStudents,
  onViewDossier
}) => {
  const { language, t } = useLanguage();

  // Tab State
  const [subTab, setSubTab] = useState<'roster' | 'participation'>('roster');

  // Filters & Search
  const [classFilter, setClassFilter] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form Inputs
  const [formNisn, setFormNisn] = useState('');
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'Laki-Laki' | 'Perempuan'>('Laki-Laki');
  const [formClass, setFormClass] = useState('VII.1');

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Student[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');

  // Daftar Kelas SMPN 58 Palembang
  const classList = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.className) set.add(s.className);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = classFilter === 'all' || s.className === classFilter;
      const matchSearch =
        !localSearch.trim() ||
        s.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        s.nisn.includes(localSearch);
      return matchClass && matchSearch;
    });
  }, [students, classFilter, localSearch]);

  // Checkbox Selection
  const isAllSelected = filteredStudents.length > 0 && selectedIds.length === filteredStudents.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormNisn('');
    setFormName('');
    setFormGender('Laki-Laki');
    setFormClass(classList[0] || 'VII.1');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setFormNisn(s.nisn);
    setFormName(s.name);
    setFormGender((s.gender as any) || 'Laki-Laki');
    setFormClass(s.className || 'VII.1');
    setIsFormModalOpen(true);
  };

  // Save Single Student Form
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNisn.trim() || !formName.trim()) return;

    if (editingStudent) {
      onUpdateStudent({
        ...editingStudent,
        nisn: formNisn.trim(),
        name: formName.trim(),
        gender: formGender,
        className: formClass
      });
    } else {
      onAddStudent({
        id: `std-${Date.now()}`,
        nisn: formNisn.trim(),
        name: formName.trim().toUpperCase(),
        gender: formGender,
        className: formClass
      });
    }

    setIsFormModalOpen(false);
  };

  // 1. UNDUH TEMPLATE EXCEL RESMI
  const handleDownloadTemplate = () => {
    const templateData = [
      { 'No': 1, 'NISN': '0124380120', 'Nama Siswa': 'ABDUL DZAKI', 'Jenis Kelamin': 'Laki-Laki', 'Kelas': 'IX.2' },
      { 'No': 2, 'NISN': '3143712335', 'Nama Siswa': 'ABIZAR ADHAM SYARIF', 'Jenis Kelamin': 'Laki-Laki', 'Kelas': 'VII.1' },
      { 'No': 3, 'NISN': '0121201788', 'Nama Siswa': 'ADELIA TRI ANUGRAH', 'Jenis Kelamin': 'Perempuan', 'Kelas': 'IX.3' },
      { 'No': 4, 'NISN': '0121932762', 'Nama Siswa': 'ADHIWA BINTANG FATULLAH', 'Jenis Kelamin': 'Laki-Laki', 'Kelas': 'IX.3' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roster_Siswa');
    XLSX.writeFile(workbook, 'Template_Import_Siswa_CBT_SMPN58.xlsx');
  };

  // 2. EKSPOR DATA SISWA (EXCEL)
  const handleExportStudents = () => {
    if (filteredStudents.length === 0) return;
    const exportData = filteredStudents.map((s, idx) => ({
      'No': idx + 1,
      'NISN': s.nisn,
      'Nama Siswa': s.name,
      'Jenis Kelamin': s.gender,
      'Kelas': s.className
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar_Siswa');
    XLSX.writeFile(workbook, `Data_Siswa_SMPN58_${classFilter !== 'all' ? classFilter : 'Semua_Kelas'}.xlsx`);
  };

  // 3. PARSE FILE EXCEL / CSV UNTUK IMPORT
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError('');

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length === 0) {
          setImportError('File kosong atau tidak memiliki data yang valid.');
          return;
        }

        const parsed: Student[] = rawJson
          .map((row, idx) => {
            const nisn = String(row['NISN'] || row['nisn'] || row['Nomor Induk'] || '').trim();
            const name = String(row['Nama Siswa'] || row['Nama'] || row['name'] || '').trim().toUpperCase();
            const gender = String(row['Jenis Kelamin'] || row['Gender'] || row['JK'] || 'Laki-Laki').trim();
            const className = String(row['Kelas'] || row['Class'] || 'VII.1').trim();

            if (!name) return null;
            return {
              id: `std-imp-${Date.now()}-${idx}`,
              nisn: nisn || `NISN-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
              name,
              gender: gender.toLowerCase().includes('perempuan') || gender.toLowerCase() === 'p' ? 'Perempuan' : 'Laki-Laki',
              className: className || 'VII.1'
            };
          })
          .filter(Boolean) as Student[];

        setImportPreview(parsed);
      } catch (err: any) {
        setImportError('Gagal membaca file Excel/CSV: ' + (err.message || 'Format tidak didukung'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 4. KONFIRMASI SIMPAN IMPORT
  const handleConfirmImport = () => {
    if (importPreview.length === 0) return;
    onBulkInsertStudents(importPreview);
    setIsImportModalOpen(false);
    setImportPreview([]);
    setImportFileName('');
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Manajemen Data Siswa (Roster Siswa)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold">
              {students.length} Siswa Terdaftar
            </span>
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Database siswa resmi SMPN 58 Palembang untuk login dan verifikasi pengerjaan ujian
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Download Template Excel Format Kolom Roster"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Unduh Template</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Upload className="w-4 h-4 text-violet-600" />
            <span>Import Excel / CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* 2. SUBTABS (ROSTER SISWA vs PARTISIPASI NILAI) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-semibold">
        <button
          onClick={() => setSubTab('roster')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            subTab === 'roster'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Siswa Terdaftar ({students.length})</span>
        </button>

        <button
          onClick={() => setSubTab('participation')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            subTab === 'participation'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Partisipasi & Nilai Ujian ({results.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* VIEW SUBTAB 1: ROSTER SISWA TERDAFTAR (FULL CRUD)              */}
      {/* ============================================================== */}
      {subTab === 'roster' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  placeholder="Cari nama atau NISN siswa..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Filter Kelas */}
              <select
                value={classFilter}
                onChange={e => setClassFilter(e.target.value)}
                className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="all">Semua Kelas ({classList.length} Kelas)</option>
                {classList.map(cls => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {selectedIds.length > 0 && (
                <button
                  onClick={() => onBulkDeleteStudents(selectedIds)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus {selectedIds.length} Siswa</span>
                </button>
              )}

              <button
                onClick={handleExportStudents}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Excel</span>
              </button>
            </div>
          </div>

          {/* Table Roster Siswa */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[11px] sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="rounded accent-violet-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 w-14">No</th>
                    <th className="py-3 px-4">NISN</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Jenis Kelamin</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Tidak ada siswa yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const isSelected = selectedIds.includes(s.id);
                      return (
                        <tr
                          key={s.id || idx}
                          className={`transition ${
                            isSelected
                              ? 'bg-violet-50/50 dark:bg-violet-950/30'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(s.id)}
                              className="rounded accent-violet-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {s.nisn}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-violet-600 text-white font-bold text-[11px] flex items-center justify-center">
                              {s.name.charAt(0)}
                            </div>
                            <span>{s.name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                s.gender.includes('Perempuan')
                                  ? 'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300'
                                  : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {s.gender}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-violet-600 dark:text-violet-400">
                            {s.className}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(s)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition"
                                title="Edit Siswa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteStudent(s.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Hapus Siswa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* ============================================================== */}
      {/* VIEW SUBTAB 2: PARTISIPASI & HASIL UJIAN SISWA                 */}
      {/* ============================================================== */}
      {subTab === 'participation' && (
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
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.score >= 75
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {r.score >= 75 ? t.passedStatus : t.remedialStatus}
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
                          onClick={() => onViewDossier(r)}
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
      )}

      {/* ============================================================== */}
      {/* MODAL 1: TAMBAH / EDIT SISWA MANUAL                            */}
      {/* ============================================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  NISN (Nomor Induk Siswa Nasional)
                </label>
                <input
                  type="text"
                  required
                  value={formNisn}
                  onChange={e => setFormNisn(e.target.value)}
                  placeholder="Contoh: 0124380120"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nama Lengkap Siswa
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value.toUpperCase())}
                  placeholder="Contoh: AHMAD FAUZAN"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formGender}
                    onChange={e => setFormGender(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Laki-Laki">Laki-Laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Kelas
                  </label>
                  <input
                    type="text"
                    required
                    value={formClass}
                    onChange={e => setFormClass(e.target.value.toUpperCase())}
                    placeholder="Contoh: IX.2"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-xs"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: IMPORT EXCEL / CSV DENGAN PREVIEW                     */}
      {/* ============================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Import Roster Siswa dari Excel / CSV
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pilih file .xlsx atau .csv sesuai format template
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload Area */}
            <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-2 bg-slate-50/50 dark:bg-slate-800/20">
              <FileSpreadsheet className="w-8 h-8 text-violet-600 mx-auto" />
              <div>
                <label className="text-xs font-bold text-violet-600 hover:underline cursor-pointer">
                  Klik di sini untuk memilih file Excel / CSV
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Mendukung file .xlsx (Excel) dan .csv dari Dapodik atau Roster Sekolah
                </p>
              </div>
              {importFileName && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-xs font-bold mt-2">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{importFileName} ({importPreview.length} Siswa Terdeteksi)</span>
                </div>
              )}
            </div>

            {importError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs text-center">
                {importError}
              </div>
            )}

            {/* Preview Parsed Rows */}
            {importPreview.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Preview 5 Data Siswa Pertama:
                </span>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">NISN</th>
                        <th className="py-2 px-3">Nama Siswa</th>
                        <th className="py-2 px-3">Jenis Kelamin</th>
                        <th className="py-2 px-3">Kelas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                      {importPreview.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          <td className="py-1.5 px-3 font-mono">{row.nisn}</td>
                          <td className="py-1.5 px-3 font-bold">{row.name}</td>
                          <td className="py-1.5 px-3">{row.gender}</td>
                          <td className="py-1.5 px-3 font-bold text-violet-600">{row.className}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview([]);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={importPreview.length === 0}
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-xs transition"
              >
                Simpan {importPreview.length} Siswa ke Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
