import { Teacher } from '@/types/cbt';

/**
 * Daftar Akun Resmi Dewan Guru & Administrator SMPN 58 Palembang
 * Data riil bersumber dan tersinkronisasi langsung dengan tabel `teachers` di Supabase Cloud.
 */
export const initialTeachers: Teacher[] = [
  {
    id: 'admin-super',
    nip: 'admin',
    name: 'Administrator CBT & Proktor Utama',
    email: 'admin@smpn58.sch.id',
    subject: 'Semua Mata Pelajaran',
    classes: ['Semua Kelas'],
    role: 'admin',
    pin: 'admin123',
    avatarColor: 'bg-violet-900',
    status: 'Aktif Mengawas'
  },
  {
    id: 'pengawas-utama',
    nip: 'pengawas',
    name: 'Pengawas Ruang / Laboratorium CBT',
    email: 'pengawas@smpn58.sch.id',
    subject: 'Pengawasan Ujian Terpadu',
    classes: ['Semua Kelas'],
    role: 'pengawas',
    pin: 'pengawas123',
    avatarColor: 'bg-amber-700',
    status: 'Aktif Mengawas'
  },
  {
    id: 'tea-1793370367297',
    nip: '199611142024211010',
    name: 'Aris Bermansyah, S.Kom',
    email: 'aris.bermansyah14@gmail.com',
    subject: 'Informatika & TIK',
    classes: ['VIII.1', 'VIII.2', 'VIII.3', 'IX.1', 'IX.2', 'IX.3', 'IX.4'],
    assignments: [
      {
        id: 'asg-1',
        subject: 'Informatika & TIK',
        classes: ['VIII.1', 'VIII.2', 'VIII.3', 'IX.1', 'IX.2', 'IX.3', 'IX.4']
      }
    ],
    role: 'guru_mapel',
    pin: 'palembang58',
    avatarColor: 'bg-violet-600',
    status: 'Aktif Mengawas'
  }
];
