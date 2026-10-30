import { Subject, Question } from '@/types/cbt';

export const initialSubject: Subject = {
  id: 'sub-001',
  title: 'Asesmen Sumatif - Ilmu Pengetahuan Alam (IPA)',
  className: 'VII.1, VII.2, VII.3',
  durationMinutes: 45,
  violationLimit: 3,
  token: 'IPA2026',
  isActive: true,
  scoringRules: {
    'Pilihan Ganda': 1,
    'Pilihan Ganda Kompleks': 2,
    'Benar/Salah': 2,
    'Menjodohkan': 2,
    'Isian Singkat': 2,
    'Esai': 4
  }
};

export const sampleSubjects: Subject[] = [
  initialSubject,
  {
    id: 'sub-inf-01',
    title: 'Asesmen Sumatif - Informatika & TIK',
    className: 'IX.1, IX.2, IX.3, IX.4',
    durationMinutes: 60,
    violationLimit: 3,
    token: 'TIK2026',
    isActive: true,
    scoringRules: {
      'Pilihan Ganda': 1,
      'Pilihan Ganda Kompleks': 2,
      'Benar/Salah': 2,
      'Menjodohkan': 2,
      'Isian Singkat': 2,
      'Esai': 4
    }
  },
  {
    id: 'sub-mtk-01',
    title: 'Asesmen Sumatif - Matematika',
    className: 'VII.1, VII.2, VII.3, IX.1',
    durationMinutes: 60,
    violationLimit: 3,
    token: 'MTK2026',
    isActive: true,
    scoringRules: {
      'Pilihan Ganda': 2,
      'Pilihan Ganda Kompleks': 3,
      'Benar/Salah': 2,
      'Menjodohkan': 2,
      'Isian Singkat': 3,
      'Esai': 5
    }
  }
];

export const sampleQuestions: Question[] = [
  // ==========================================
  // SOAL MAPEL 1: ILMU PENGETAHUAN ALAM (IPA)
  // ==========================================
  // 1. Pilihan Ganda
  {
    id: 'q-1',
    subjectId: 'sub-001',
    type: 'Pilihan Ganda',
    questionText: 'Organel sel yang berfungsi sebagai tempat berlangsungnya respirasi sel dan menghasilkan energi (ATP) adalah...',
    options: [
      { text: 'Ribosom' },
      { text: 'Mitokondria' },
      { text: 'Badan Golgi' },
      { text: 'Retikulum Endoplasma' }
    ],
    answer: 'B',
    orderIndex: 1
  },

  // 2. Benar / Salah (Format Baru: Banyak Pernyataan)
  {
    id: 'q-2',
    subjectId: 'sub-001',
    type: 'Benar/Salah',
    questionText: 'Perhatikan pernyataan mengenai tata surya berikut. Tentukan apakah masing-masing pernyataan Benar atau Salah!',
    options: [
      { text: 'Planet Venus merupakan planet terpanas di tata surya karena efek rumah kaca atmosfernya yang pekat.' },
      { text: 'Bumi merupakan satu-satunya planet yang memiliki medan magnetik kuat.' },
      { text: 'Bulan tidak memiliki atmosfer sehingga tidak terjadi perubahan cuaca atau angin.' },
      { text: 'Matahari berotasi mengelilingi pusat Galaksi Bima Sakti.' }
    ],
    answer: ['Benar', 'Salah', 'Benar', 'Benar'],
    orderIndex: 2
  },

  // 3. Pilihan Ganda Kompleks
  {
    id: 'q-3',
    subjectId: 'sub-001',
    type: 'Pilihan Ganda Kompleks',
    questionText: 'Manakah di antara peristiwa berikut yang merupakan contoh perubahan kimia? (Pilihlah satu atau lebih jawaban)',
    options: [
      { text: 'Besi mengalami perkaratan' },
      { text: 'Es batu mencair menjadi air' },
      { text: 'Kertas dibakar menjadi abu' },
      { text: 'Gula larut dalam segelas teh' }
    ],
    answer: ['A', 'C'],
    orderIndex: 3
  },

  // 4. Menjodohkan
  {
    id: 'q-4',
    subjectId: 'sub-001',
    type: 'Menjodohkan',
    questionText: 'Pasangkanlah besaran pokok fisika di sebelah kiri dengan satuan internasionalnya (SI) di sebelah kanan!',
    options: [
      { q: { text: 'Panjang' }, a: { text: 'Meter' } },
      { q: { text: 'Massa' }, a: { text: 'Kilogram' } },
      { q: { text: 'Waktu' }, a: { text: 'Sekon' } },
      { q: { text: 'Suhu' }, a: { text: 'Kelvin' } }
    ],
    answer: 'Otomatis',
    orderIndex: 4
  },

  // 5. Isian Singkat
  {
    id: 'q-5',
    subjectId: 'sub-001',
    type: 'Isian Singkat',
    questionText: 'Satuan standar gaya dalam Sistem Internasional (SI) yang dinamai menurut fisikawan Inggris terkenal adalah...',
    options: [],
    answer: ['newton', 'n'],
    orderIndex: 5
  },

  // 6. Esai
  {
    id: 'q-6',
    subjectId: 'sub-001',
    type: 'Esai',
    questionText: 'Jelaskan mengapa fotosintesis pada tumbuhan sangat penting bagi kelangsungan hidup seluruh makhluk hidup di bumi!',
    options: [],
    answer: 'Menghasilkan oksigen untuk respirasi makhluk hidup dan menghasilkan glukosa/energi sebagai produsen primer rantai makanan.',
    orderIndex: 6
  },

  // ==========================================
  // SOAL MAPEL 2: INFORMATIKA & TIK (sub-inf-01)
  // ==========================================
  {
    id: 'q-inf-1',
    subjectId: 'sub-inf-01',
    type: 'Pilihan Ganda',
    questionText: 'Komponen perangkat keras (hardware) komputer yang berfungsi sebagai unit pemrosesan utama dan sering disebut sebagai "otak" komputer adalah...',
    options: [
      { text: 'Random Access Memory (RAM)' },
      { text: 'Central Processing Unit (CPU)' },
      { text: 'Hard Disk Drive (HDD)' },
      { text: 'Power Supply Unit (PSU)' }
    ],
    answer: 'B',
    orderIndex: 1
  },
  {
    id: 'q-inf-2',
    subjectId: 'sub-inf-01',
    type: 'Benar/Salah',
    questionText: 'Perhatikan pernyataan tentang jaringan komputer dan internet berikut. Tentukan apakah masing-masing pernyataan Benar atau Salah!',
    options: [
      { text: 'Alamat IPv4 terdiri atas 32 bit yang dipisahkan menjadi 4 oktet desimal.' },
      { text: 'Topologi Star memerlukan perangkat Switch atau Hub sebagai konsentrator pusat.' },
      { text: 'HTML merupakan bahasa pemrograman berorientasi objek untuk melatih kecerdasan buatan.' },
      { text: 'Protokol HTTPS menggunakan enkripsi SSL/TLS sehingga transmisi data lebih aman daripada HTTP.' }
    ],
    answer: ['Benar', 'Benar', 'Salah', 'Benar'],
    orderIndex: 2
  },
  {
    id: 'q-inf-3',
    subjectId: 'sub-inf-01',
    type: 'Pilihan Ganda Kompleks',
    questionText: 'Manakah di antara sistem operasi berikut yang bersifat Open Source (sumber terbuka) dan bebas dikembangkan? (Pilihlah satu atau lebih jawaban)',
    options: [
      { text: 'Linux Ubuntu' },
      { text: 'Microsoft Windows 11' },
      { text: 'Debian GNU/Linux' },
      { text: 'Apple macOS' }
    ],
    answer: ['A', 'C'],
    orderIndex: 3
  },
  {
    id: 'q-inf-4',
    subjectId: 'sub-inf-01',
    type: 'Menjodohkan',
    questionText: 'Pasangkanlah ekstensi file di sebelah kiri dengan format data yang tepat di sebelah kanan!',
    options: [
      { q: { text: '.docx' }, a: { text: 'Dokumen Pengolah Kata' } },
      { q: { text: '.mp4' }, a: { text: 'Video Digital' } },
      { q: { text: '.py' }, a: { text: 'Skrip Kode Python' } },
      { q: { text: '.png' }, a: { text: 'Gambar Grafis Portabel' } }
    ],
    answer: 'Otomatis',
    orderIndex: 4
  },
  {
    id: 'q-inf-5',
    subjectId: 'sub-inf-01',
    type: 'Isian Singkat',
    questionText: 'Jaringan komputer global terdesentralisasi yang saling terhubung menggunakan standar protokol komunikasi TCP/IP disebut...',
    options: [],
    answer: ['internet', 'the internet'],
    orderIndex: 5
  },
  {
    id: 'q-inf-6',
    subjectId: 'sub-inf-01',
    type: 'Esai',
    questionText: 'Jelaskan perbedaan mendasar antara perangkat masukan (Input Device) dan perangkat keluaran (Output Device) beserta masing-masing 2 contoh konkretnya!',
    options: [],
    answer: 'Input Device berfungsi memasukkan data/perintah ke komputer (contoh: Keyboard, Mouse, Mikrofon), sedangkan Output Device menyajikan hasil pemrosesan informasi kepada pengguna (contoh: Monitor, Printer, Speaker).',
    orderIndex: 6
  }
];
