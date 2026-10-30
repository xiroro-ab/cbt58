import { Subject, Question } from '@/types/cbt';

export const initialSubject: Subject = {
  id: 'sub-001',
  title: 'Asesmen Sumatif Tengah Semester - IPA Terpadu',
  className: 'IX-A',
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

export const sampleQuestions: Question[] = [
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
  }
];
