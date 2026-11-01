import { Subject, Question } from '@/types/cbt';

export const initialSubject: Subject = {
  id: 'sub-001',
  title: 'Asesmen Sumatif - Ilmu Pengetahuan Alam (IPA)',
  className: 'VII.1, VII.2, VII.3',
  durationMinutes: 45,
  violationLimit: 3,
  token: 'IPA2026',
  isActive: true,
  examDate: '2026-11-01',
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
  },
  {
    id: 'sub-bin-01',
    title: 'Asesmen Sumatif - Bahasa Indonesia',
    className: 'VIII.1, VIII.2, VIII.3',
    durationMinutes: 60,
    violationLimit: 3,
    token: 'BIN2026',
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
    id: 'sub-big-01',
    title: 'Asesmen Sumatif - Bahasa Inggris',
    className: 'IX.1, IX.2, IX.3',
    durationMinutes: 60,
    violationLimit: 3,
    token: 'BIG2026',
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
    id: 'sub-ips-01',
    title: 'Asesmen Sumatif - Ilmu Pengetahuan Sosial (IPS)',
    className: 'VIII.1, VIII.2, VIII.3, VIII.4',
    durationMinutes: 60,
    violationLimit: 3,
    token: 'IPS2026',
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
    id: 'sub-ppk-01',
    title: 'Asesmen Sumatif - Pendidikan Pancasila (PPKn)',
    className: 'VII.1, VII.2, VII.3',
    durationMinutes: 45,
    violationLimit: 3,
    token: 'PPKN26',
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
    id: 'sub-pai-01',
    title: 'Asesmen Sumatif - Pendidikan Agama Islam (PAI)',
    className: 'VII.1, VII.2, VIII.1, IX.1',
    durationMinutes: 45,
    violationLimit: 3,
    token: 'PAI2026',
    isActive: true,
    scoringRules: {
      'Pilihan Ganda': 1,
      'Pilihan Ganda Kompleks': 2,
      'Benar/Salah': 2,
      'Menjodohkan': 2,
      'Isian Singkat': 2,
      'Esai': 4
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
  },

  // ==========================================
  // SOAL MAPEL 3: MATEMATIKA (sub-mtk-01)
  // ==========================================
  {
    id: 'q-mtk-1',
    subjectId: 'sub-mtk-01',
    type: 'Pilihan Ganda',
    questionText: 'Hasil perhitungan dari (-12) + 20 × (-4) : (-2) adalah...',
    options: [
      { text: '28' },
      { text: '24' },
      { text: '-52' },
      { text: '-28' }
    ],
    answer: 'A',
    orderIndex: 1
  },
  {
    id: 'q-mtk-2',
    subjectId: 'sub-mtk-01',
    type: 'Benar/Salah',
    questionText: 'Perhatikan pernyataan tentang konsep aljabar dan bilangan berikut. Tentukan Benar atau Salah!',
    options: [
      { text: 'Pada bentuk aljabar 3x² - 5x + 7, koefisien dari x adalah -5.' },
      { text: 'FPB dari bilangan 24 dan 36 adalah 18.' },
      { text: 'Bilangan 2 adalah satu-satunya bilangan genap yang sekaligus merupakan bilangan prima.' },
      { text: 'Hasil dari 5² × 5³ sama dengan 5⁶.' }
    ],
    answer: ['Benar', 'Salah', 'Benar', 'Salah'],
    orderIndex: 2
  },
  {
    id: 'q-mtk-3',
    subjectId: 'sub-mtk-01',
    type: 'Pilihan Ganda Kompleks',
    questionText: 'Pilihlah bilangan di bawah ini yang merupakan bilangan prima ganjil kurang dari 20! (Pilihlah satu atau lebih)',
    options: [
      { text: '7' },
      { text: '13' },
      { text: '15' },
      { text: '19' }
    ],
    answer: ['A', 'B', 'D'],
    orderIndex: 3
  },
  {
    id: 'q-mtk-4',
    subjectId: 'sub-mtk-01',
    type: 'Menjodohkan',
    questionText: 'Pasangkanlah bangun datar di sebelah kiri dengan rumus keliling yang tepat di sebelah kanan!',
    options: [
      { q: { text: 'Persegi (sisi s)' }, a: { text: '4 × s' } },
      { q: { text: 'Persegi Panjang (p, l)' }, a: { text: '2 × (p + l)' } },
      { q: { text: 'Segitiga Sama Sisi (s)' }, a: { text: '3 × s' } },
      { q: { text: 'Lingkaran (jari-jari r)' }, a: { text: '2 × π × r' } }
    ],
    answer: 'Otomatis',
    orderIndex: 4
  },
  {
    id: 'q-mtk-5',
    subjectId: 'sub-mtk-01',
    type: 'Isian Singkat',
    questionText: 'Jika nilai persamaan 4x - 8 = 16, berapakah nilai dari x?',
    options: [],
    answer: ['6'],
    orderIndex: 5
  },

  // ==========================================
  // SOAL MAPEL 4: BAHASA INDONESIA (sub-bin-01)
  // ==========================================
  {
    id: 'q-bin-1',
    subjectId: 'sub-bin-01',
    type: 'Pilihan Ganda',
    questionText: 'Bagian teks laporan hasil observasi (LHO) yang berisi pembuka atau pengantar tentang hal yang akan dilaporkan disebut...',
    options: [
      { text: 'Deskripsi Bagian' },
      { text: 'Pernyataan Umum (Definisi Umum)' },
      { text: 'Deskripsi Manfaat' },
      { text: 'Simpulan Penutup' }
    ],
    answer: 'B',
    orderIndex: 1
  },
  {
    id: 'q-bin-2',
    subjectId: 'sub-bin-01',
    type: 'Benar/Salah',
    questionText: 'Perhatikan kaidah kebahasaan dan struktur teks berita berikut!',
    options: [
      { text: 'Unsur ADIKSIMBA (5W + 1H) merupakan komponen pokok dalam penulisan teks berita.' },
      { text: 'Konjungsi temporal digunakan untuk menyatakan hubungan sebab-akibat langsung.' },
      { text: 'Kepala berita (Lead) memuat informasi paling krusial dalam struktur piramida terbalik.' }
    ],
    answer: ['Benar', 'Salah', 'Benar'],
    orderIndex: 2
  },

  // ==========================================
  // SOAL MAPEL 5: ILMU PENGETAHUAN SOSIAL (sub-ips-01)
  // ==========================================
  {
    id: 'q-ips-1',
    subjectId: 'sub-ips-01',
    type: 'Pilihan Ganda',
    questionText: 'Secara astronomis, wilayah Indonesia terletak di antara...',
    options: [
      { text: '6° LU - 11° LS dan 95° BT - 141° BT' },
      { text: '11° LU - 6° LS dan 90° BT - 140° BT' },
      { text: '6° LU - 11° LS dan 90° BT - 135° BT' },
      { text: '10° LU - 15° LS dan 95° BT - 145° BT' }
    ],
    answer: 'A',
    orderIndex: 1
  },
  {
    id: 'q-ips-2',
    subjectId: 'sub-ips-01',
    type: 'Benar/Salah',
    questionText: 'Perhatikan pernyataan tentang interaksi antarruang dan dinamika kependudukan berikut!',
    options: [
      { text: 'Indonesia beriklim tropis karena dilalui oleh garis khatulistiwa (ekuator).' },
      { text: 'Letak geologis Indonesia di antara tiga lempeng besar menyebabkan banyak gunung api aktif.' },
      { text: 'Perpindahan penduduk dari desa ke kota dinamakan transmigrasi.' }
    ],
    answer: ['Benar', 'Benar', 'Salah'],
    orderIndex: 2
  }
];
