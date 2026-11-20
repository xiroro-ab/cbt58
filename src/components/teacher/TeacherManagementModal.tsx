'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  X,
  Edit2,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Shield,
  ShieldCheck,
  BookOpen,
  UserCheck,
  Save,
  AlertTriangle
} from 'lucide-react';
import { Teacher, TeacherRole, Subject, AVAILABLE_SUBJECTS } from '@/types/cbt';

interface TeacherManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  currentTeacher: Teacher | null;
  allSubjects?: Subject[];
  onUpdateTeacher?: (t: Teacher) => void;
  onAddTeacher?: (t: Teacher) => Promise<boolean> | void;
  onDeleteTeacher?: (teacherId: string) => Promise<boolean> | void;
}

const CLASS_OPTIONS = [
  'VII.1', 'VII.2', 'VII.3', 'VII.4', 'VII.5', 'VII.6', 'VII.7', 'VII.8', 'VII.9',
  'VIII.1', 'VIII.2', 'VIII.3', 'VIII.4', 'VIII.5', 'VIII.6', 'VIII.7', 'VIII.8', 'VIII.9',
  'IX.1', 'IX.2', 'IX.3', 'IX.4', 'IX.5', 'IX.6', 'IX.7', 'IX.8', 'IX.9'
];

export const TeacherManagementModal: React.FC<TeacherManagementModalProps> = ({
  isOpen,
  onClose,
  teachers,
  currentTeacher,
  allSubjects = [],
  onUpdateTeacher,
  onAddTeacher,
  onDeleteTeacher
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'guru_mapel' | 'pengawas'>('all');
  const [showPinIds, setShowPinIds] = useState<Record<string, boolean>>({});

  // Internal list of teachers for instant, reactive UI updates
  const [teachersList, setTeachersList] = useState<Teacher[]>(teachers || []);

  React.useEffect(() => {
    setTeachersList(teachers || []);
  }, [teachers]);

  // Sub-modal state for Edit / Add
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<TeacherRole>('guru_mapel');
  const [formSubject, setFormSubject] = useState(AVAILABLE_SUBJECTS[0] || 'Informatika & TIK');
  const [formClasses, setFormClasses] = useState<string[]>(['VII.1', 'VII.2']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return (teachersList || []).filter(t => {
      // Exclude internal configuration pseudo-rows
      if (t.id === '__cbt_school_settings__' || t.id === '__cbt_teacher_photos__' || t.nip?.startsWith('CFG-')) {
        return false;
      }
      if (roleFilter !== 'all' && t.role !== roleFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchName = (t.name || '').toLowerCase().includes(q);
      const matchNip = (t.nip || '').toLowerCase().includes(q);
      const matchEmail = (t.email || '').toLowerCase().includes(q);
      const matchSubject = (t.subject || '').toLowerCase().includes(q);
      return matchName || matchNip || matchEmail || matchSubject;
    });
  }, [teachersList, roleFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const valid = (teachersList || []).filter(t => !t.id?.startsWith('__cbt_'));
    return {
      all: valid.length,
      admin: valid.filter(t => t.role === 'admin').length,
      guru_mapel: valid.filter(t => t.role === 'guru_mapel').length,
      pengawas: valid.filter(t => t.role === 'pengawas').length
    };
  }, [teachersList]);

  if (!isOpen) return null;

  const toggleShowPin = (id: string) => {
    setShowPinIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormName('');
    setFormNip('');
    setFormEmail('');
    setFormPin('palembang58');
    setFormRole('guru_mapel');
    setFormSubject(AVAILABLE_SUBJECTS[0] || 'Informatika & TIK');
    setFormClasses(['VII.1', 'VII.2']);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormName(t.name || '');
    setFormNip(t.nip || '');
    setFormEmail(t.email || '');
    setFormPin(t.pin || 'palembang58');
    setFormRole(t.role || 'guru_mapel');
    setFormSubject(t.subject || AVAILABLE_SUBJECTS[0]);
    setFormClasses(t.classes && t.classes.length > 0 ? [...t.classes] : ['VII.1']);
    setIsFormModalOpen(true);
  };

  const toggleClassSelect = (cls: string) => {
    setFormClasses(prev =>
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingTeacher) {
      // UPDATE EXISTING TEACHER
      const updated: Teacher = {
        ...editingTeacher,
        name: formName.trim(),
        nip: formNip.trim() || '-',
        email: formEmail.trim().toLowerCase(),
        pin: formPin.trim() || 'palembang58',
        role: formRole,
        subject: formSubject,
        classes: formClasses.length > 0 ? formClasses : ['Semua Kelas'],
        assignments: editingTeacher.assignments && editingTeacher.assignments.length > 0
          ? editingTeacher.assignments.map((asg, idx) => idx === 0 ? { ...asg, subject: formSubject, classes: formClasses } : asg)
          : [{ id: 'asg-1', subject: formSubject, classes: formClasses }]
      };

      // 1. Update internal list secara instan
      setTeachersList(prev => prev.map(t => (t.id === updated.id || (editingTeacher.nip && t.nip === editingTeacher.nip)) ? updated : t));

      // 2. Kirim update ke parent & Cloud
      onUpdateTeacher?.(updated);
      showToast(`Data NIP & profil guru "${updated.name}" berhasil diperbarui.`);
      setIsFormModalOpen(false);
    } else {
      // ADD NEW TEACHER
      const newId = `tea-${Date.now()}`;
      const newTeacher: Teacher = {
        id: newId,
        name: formName.trim(),
        nip: formNip.trim() || '-',
        email: formEmail.trim().toLowerCase() || `guru${Date.now()}@smpn58.sch.id`,
        pin: formPin.trim() || 'palembang58',
        role: formRole,
        subject: formSubject,
        classes: formClasses.length > 0 ? formClasses : ['Semua Kelas'],
        assignments: [{ id: 'asg-1', subject: formSubject, classes: formClasses }],
        avatarColor: 'bg-violet-600',
        status: 'Offline'
      };

      setTeachersList(prev => [...prev, newTeacher]);
      await onAddTeacher?.(newTeacher);
      showToast(`Akun guru baru "${newTeacher.name}" berhasil dibuat.`);
      setIsFormModalOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!teacherToDelete) return;
    if (currentTeacher?.id === teacherToDelete.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang login!');
      setTeacherToDelete(null);
      return;
    }

    setTeachersList(prev => prev.filter(t => t.id !== teacherToDelete.id));
    await onDeleteTeacher?.(teacherToDelete.id);
    showToast(`Akun "${teacherToDelete.name}" telah berhasil dihapus.`);
    setTeacherToDelete(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:hidden animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 1. MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate">
                  Manajemen Akun Dewan Guru & Pengawas
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  {counts.all} Guru Terdaftar
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  Mode Administrator
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                Kelola data NIP, hak akses login, reset PIN, penugasan mata pelajaran, dan akun guru SMPN 58 Palembang
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NOTIFICATION TOAST */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 flex items-center gap-2 animate-in slide-in-from-top-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 2. TOOLBAR (SEARCH, ROLE FILTER & TOMBOL TAMBAH) */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama guru, NIP, email, atau mapel..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Role Filter Chips & Tambah Button */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semua ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('admin')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleFilter === 'admin'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Admin ({counts.admin})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('guru_mapel')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleFilter === 'guru_mapel'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Guru ({counts.guru_mapel})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('pengawas')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  roleFilter === 'pengawas'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pengawas ({counts.pengawas})
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Tambah Guru Baru</span>
            </button>
          </div>
        </div>

        {/* 3. TABLE GURU */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[11px] sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Guru &amp; NIP</th>
                    <th className="py-3 px-4">Email / Login</th>
                    <th className="py-3 px-4">Hak Akses (Role)</th>
                    <th className="py-3 px-4">Mata Pelajaran &amp; Kelas</th>
                    <th className="py-3 px-4 text-center">PIN Login</th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Tidak ada akun guru yang sesuai dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((t, idx) => {
                      const isMe = currentTeacher?.id === t.id;
                      const isPinVisible = showPinIds[t.id];

                      return (
                        <tr
                          key={t.id || idx}
                          className={`transition ${
                            isMe
                              ? 'bg-violet-50/40 dark:bg-violet-950/20'
                              : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                {t.photoUrl ? (
                                  <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-violet-600 dark:text-violet-400">{t.name.charAt(0)}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                  <span>{t.name}</span>
                                  {isMe && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                                      Akun Anda
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                  NIP: <strong className="text-slate-600 dark:text-slate-300">{t.nip || '-'}</strong>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                            {t.email || '-'}
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                t.role === 'admin'
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                                  : t.role === 'pengawas'
                                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                                  : 'bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-900/60'
                              }`}
                            >
                              {t.role === 'admin' && <Shield className="w-3 h-3" />}
                              {t.role === 'pengawas' && <UserCheck className="w-3 h-3" />}
                              {t.role === 'guru_mapel' && <BookOpen className="w-3 h-3" />}
                              <span>
                                {t.role === 'admin' ? 'Admin' : t.role === 'pengawas' ? 'Pengawas' : 'Guru Mapel'}
                              </span>
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={t.subject}>
                              {t.subject || '-'}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]" title={(t.classes || []).join(', ')}>
                              {t.classes && t.classes.length > 0 ? t.classes.join(', ') : 'Semua Rombel'}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 font-mono px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                              <span>{isPinVisible ? t.pin || 'palembang58' : '••••••'}</span>
                              <button
                                type="button"
                                onClick={() => toggleShowPin(t.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                title={isPinVisible ? 'Sembunyikan PIN' : 'Lihat PIN Login'}
                              >
                                {isPinVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(t)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                title="Edit profil, NIP, & hak akses guru ini"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                              </button>

                              <button
                                type="button"
                                disabled={isMe}
                                onClick={() => setTeacherToDelete(t)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title={isMe ? 'Tidak bisa menghapus akun yang sedang login' : 'Hapus akun guru ini'}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
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

        {/* 4. MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
          <p className="text-[11px] text-slate-400">
            Perubahan akun guru otomatis tersinkronisasi ke seluruh perangkat &amp; database cloud Supabase.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SUB-MODAL: FORM EDIT / TAMBAH AKUN GURU                      */}
      {/* ============================================================ */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold">
                  {editingTeacher ? (
                    <Edit2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  ) : (
                    <PlusCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    {editingTeacher ? 'Edit Akun Guru & NIP' : 'Tambah Akun Guru Baru'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {editingTeacher ? `Mengedit data akun ${editingTeacher.name}` : 'Daftarkan pengajar resmi baru ke sistem CBT'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-3.5 text-xs">
              {/* Nama Guru */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Nama Lengkap &amp; Gelar Guru:
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Misal: Aris Bermansyah, S.Kom"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* NIP & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    NIP Guru (atau tanda -):
                  </label>
                  <input
                    type="text"
                    required
                    value={formNip}
                    onChange={e => setFormNip(e.target.value)}
                    placeholder="199611142024211010"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Email (Akun Login):
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="aris.bermansyah@smpn58.sch.id"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* PIN Login & Hak Akses (Role) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span>Password / PIN Login:</span>
                    <button
                      type="button"
                      onClick={() => setFormPin('palembang58')}
                      className="text-violet-600 dark:text-violet-400 font-bold text-[10px] hover:underline"
                    >
                      Reset Default
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPin}
                    onChange={e => setFormPin(e.target.value)}
                    placeholder="palembang58"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Hak Akses (Role):
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as TeacherRole)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="guru_mapel">Guru Mata Pelajaran</option>
                    <option value="admin">Administrator Penuh (Superadmin)</option>
                    <option value="pengawas">Pengawas Ruang Ujian</option>
                  </select>
                </div>
              </div>

              {/* Mata Pelajaran Utama */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Mata Pelajaran Utama:
                </label>
                <select
                  value={formSubject}
                  onChange={e => setFormSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {AVAILABLE_SUBJECTS.map((sub: string) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Rombel / Kelas yang Diampu */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                  <span>Rombel Kelas yang Diampu:</span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">
                    {formClasses.length} Kelas Dipilih
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                  {CLASS_OPTIONS.map(cls => {
                    const isSelected = formClasses.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => toggleClassSelect(cls)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${
                          isSelected
                            ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition cursor-pointer"
                >
                  <Save className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span>{editingTeacher ? 'Simpan Perubahan' : 'Daftarkan Guru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-MODAL: KONFIRMASI HAPUS AKUN GURU                        */}
      {/* ============================================================ */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center mx-auto text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Hapus Akun Guru Ini?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Apakah Anda yakin ingin menghapus akun dewan guru <strong>{teacherToDelete.name}</strong> (NIP: {teacherToDelete.nip})? Akses login akun ini akan dicabut permanen dari server.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTeacherToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-xs transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Ya, Hapus Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
