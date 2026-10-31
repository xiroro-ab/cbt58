import { Question, QuestionType, OptionItem, MatchingPair } from '@/types/cbt';

export type StandardPresetType = 'AKM' | 'PISA' | 'TKA' | 'UH' | 'CUSTOM';

export interface QuestionCounts {
  pg: number;
  pgk: number;
  bs: number;
  jodoh: number;
  isian: number;
  esai: number;
}

export interface PresetConfig {
  id: StandardPresetType;
  title: string;
  badge: string;
  description: string;
  targetFocus: string;
  defaultCounts: QuestionCounts;
  defaultDifficulty: 'Campuran' | 'Mudah' | 'Sedang' | 'Sukar (HOTS)';
}

export const PRESET_STANDARDS: PresetConfig[] = [
  {
    id: 'AKM',
    title: 'Standar AKM Kemendikbud',
    badge: 'Literasi & Numerasi',
    description: 'Mengedepankan stimulus teks bacaan informasional / data kontekstual kehidupan nyata yang menguji daya nalar kritis siswa.',
    targetFocus: 'Stimulus kontekstual, penalaran data & bacaan, literasi & numerasi',
    defaultCounts: { pg: 2, pgk: 3, bs: 3, jodoh: 2, isian: 0, esai: 0 },
    defaultDifficulty: 'Campuran'
  },
  {
    id: 'PISA',
    title: 'Standar PISA (OECD)',
    badge: 'HOTS & Real-World',
    description: 'Menitikberatkan pada Higher Order Thinking Skills (HOTS), pemecahan masalah dunia nyata, logika ilmiah, dan argumen.',
    targetFocus: 'Pemecahan masalah empiris, analisis multi-sudut pandang, telaah kritis',
    defaultCounts: { pg: 2, pgk: 3, bs: 2, jodoh: 2, isian: 0, esai: 1 },
    defaultDifficulty: 'Sukar (HOTS)'
  },
  {
    id: 'TKA',
    title: 'Standar TKA / ASAS Semester',
    badge: 'Kurikulum Merdeka',
    description: 'Komposisi komprehensif menguji penguasaan materi pembelajaran kurikulum sekolah, teori konsep, dan prosedur aplikasi.',
    targetFocus: 'Penguasaan konsep esensial, teori dasar hingga terapan, asesmen sumatif',
    defaultCounts: { pg: 8, pgk: 3, bs: 2, jodoh: 1, isian: 1, esai: 0 },
    defaultDifficulty: 'Campuran'
  },
  {
    id: 'UH',
    title: 'Ulangan Harian Cepat',
    badge: 'Formatif Cepat',
    description: 'Paket ringkas 5 butir soal untuk kuis harian atau pemetaan pemahaman awal materi pelajaran.',
    targetFocus: 'Cek pemahaman inti per KD/Tujuan Pembelajaran secara cepat',
    defaultCounts: { pg: 3, pgk: 1, bs: 1, jodoh: 0, isian: 0, esai: 0 },
    defaultDifficulty: 'Sedang'
  },
  {
    id: 'CUSTOM',
    title: 'Kustom Komposisi Mandiri',
    badge: 'Fleksibel',
    description: 'Tentukan sendiri jumlah butir soal untuk setiap tipe soal sesuai kebutuhan lembar asesmen Anda.',
    targetFocus: 'Konfigurasi jumlah soal bebas sesuai kebutuhan spesifik guru',
    defaultCounts: { pg: 5, pgk: 2, bs: 2, jodoh: 1, isian: 0, esai: 0 },
    defaultDifficulty: 'Campuran'
  }
];

export const TOPIC_RECOMMENDATIONS: Record<string, string[]> = {
  matematika: [
    'Teorema Pythagoras & Segitiga',
    'Sistem Persamaan Linear Dua Variabel (SPLDV)',
    'Relasi dan Fungsi',
    'Statistika: Rata-rata, Median, Modus & Diagram',
    'Peluang & Frekuensi Harapan',
    'Bangun Ruang Sisi Datar (Kubus, Balok, Prisma)'
  ],
  ipa: [
    'Sistem Peredaran Darah Manusia',
    'Tekanan Zat Padat, Cair, dan Gas (Hukum Pascal & Archimedes)',
    'Sistem Pernapasan dan Ekskresi',
    'Getaran, Gelombang, dan Bunyi',
    'Cahaya dan Alat Optik',
    'Zat Aditif dan Zat Adiktif'
  ],
  'bahasa indonesia': [
    'Teks Eksplanasi: Pola Sebab-Akibat Fenomena Alam',
    'Teks Ulasan Novel dan Karya Seni',
    'Teks Puisi: Majas, Rima, dan Makna Konotatif',
    'Teks Persuasi dan Ajakan Positif',
    'Teks Drama: Unsur Intrinsik & Dialog',
    'Teks Laporan Hasil Observasi (LHO)'
  ],
  'bahasa inggris': [
    'Recount Text: Personal Experiences & Historical Events',
    'Descriptive Text: People, Places & Animals',
    'Notice, Warning & Caution Signs',
    'Simple Past Tense vs Present Perfect Tense',
    'Asking and Giving Opinions & Agreement',
    'Procedure Text: Recipes & Manuals'
  ],
  ips: [
    'Keunggulan dan Keterbatasan Antarruang dalam Perekonomian',
    'Mobilitas Sosial dan Keragaman Etnis Indonesia',
    'Pengaruh Interaksi Sosial terhadap Kehidupan Sosial & Kebangsaan',
    'Latar Belakang Penjajahan & Dinamika Pergerakan Nasional',
    'Perdagangan Antardaerah dan Perdagangan Internasional'
  ],
  ppkn: [
    'Pancasila Sebagai Dasar Negara dan Pandangan Hidup',
    'Kedudukan UUD NRI Tahun 1945 dalam Sistem Hukum Nasional',
    'Tata Urutan Peraturan Perundang-undangan di Indonesia',
    'Semangat dan Komitmen Sumpah Pemuda Tahun 1928',
    'Bhinneka Tunggal Ika dan Pencegahan Konflik Sosial'
  ],
  informatika: [
    'Berpikir Komputasional: Algoritma, Pola, dan Abstraksi',
    'Teknologi Informasi & Komunikasi: Perangkat Lunak Pengolah Data',
    'Sistem Komputer: Interaksi Hardware, Software, dan Brainware',
    'Jaringan Komputer dan Internet: Topologi & Enkripsi',
    'Dampak Sosial Informatika: Jejak Digital & Keamanan Siber'
  ],
  pai: [
    'Iman Kepada Kitab-Kitab Allah SWT',
    'Perilaku Rendah Hati, Hemat, dan Sederhana',
    'Tata Cara Sujud Syukur, Sujud Sahwi, dan Sujud Tilawah',
    'Sejarah Peradaban Islam Daulah Abbasiyah',
    'Makanan dan Minuman yang Halal serta Bergizi'
  ],
  pjok: [
    'Teknik Dasar Permainan Bola Besar (Sepak Bola, Bola Voli, Bola Basket)',
    'Teknik Dasar Permainan Bola Kecil (Bulu Tangkis & Kasti)',
    'Kebugaran Jasmani: Komponen Kelincahan dan Daya Tahan',
    'Senam Lantai: Roll Depan, Roll Belakang, dan Sikap Lilin',
    'Pola Hidup Sehat & Pencegahan Bahaya Narkoba'
  ]
};

export function getRecommendedTopics(subjectTitle: string): string[] {
  const normalized = subjectTitle.toLowerCase();
  for (const [key, topics] of Object.entries(TOPIC_RECOMMENDATIONS)) {
    if (normalized.includes(key)) {
      return topics;
    }
  }
  return [
    'Pemahaman Konsep Inti Pembelajaran',
    'Aplikasi & Studi Kasus Kehidupan Nyata',
    'Analisis Masalah Kontekstual',
    'Refleksi & Pemecahan Masalah Kritis'
  ];
}

export interface PromptBuildParams {
  subjectTitle: string;
  className: string;
  topic: string;
  difficulty: string;
  standardPreset: StandardPresetType;
  counts: QuestionCounts;
  customInstructions?: string;
}

export function buildAiQuestionPrompt(params: PromptBuildParams): string {
  const {
    subjectTitle,
    className,
    topic,
    difficulty,
    standardPreset,
    counts,
    customInstructions
  } = params;

  const totalCount =
    (counts.pg || 0) +
    (counts.pgk || 0) +
    (counts.bs || 0) +
    (counts.jodoh || 0) +
    (counts.isian || 0) +
    (counts.esai || 0);

  let standardDescription = 'Standar Kurikulum Merdeka SMP Indonesia';
  if (standardPreset === 'AKM') {
    standardDescription = 'Asesmen Kompetensi Minimum (AKM) Kemendikbudristek: Mengutamakan stimulus teks bacaan informasional atau data tabel/grafik kontekstual dunia nyata (literasi & numerasi), lalu menguji nalar kritis siswa.';
  } else if (standardPreset === 'PISA') {
    standardDescription = 'Standar PISA (OECD): Mengedepankan soal penalaran tingkat tinggi (Higher Order Thinking Skills - HOTS), studi kasus empiris masalah kehidupan sehari-hari, dan kemampuan analisis ilmiah.';
  } else if (standardPreset === 'TKA') {
    standardDescription = 'Tes Kemampuan Akademik (TKA) / Penilaian Akhir Semester (ASAS): Menguji penguasaan konsep esensial, pemahaman prosedur, dan aplikasi materi kurikulum sekolah secara berjenjang.';
  }

  return `Anda adalah Pakar Asesmen Pendidikan Nasional dan Pembuat Soal Ujian Berbasis Komputer (CBT) SMP Indonesia yang menguasai standar Kurikulum Merdeka, AKM (Kemendikbud), PISA (OECD), dan TKA.

TUGAS UTAMA:
Buatkan ${totalCount} butir soal ujian berkualitas tinggi dengan spesifikasi berikut:
- Mata Pelajaran: ${subjectTitle}
- Jenjang / Target Rombel: ${className}
- Topik / Materi Pembelajaran: ${topic}
- Tingkat Kesulitan: ${difficulty}
- Standar Kurikulum: ${standardPreset} (${standardDescription})
${customInstructions ? `- Catatan Khusus Guru: ${customInstructions}` : ''}

KOMPOSISI SOAL YANG WAJIB DIBUAT (TOTAL: ${totalCount} BUTIR):
- Pilihan Ganda (PG): ${counts.pg || 0} butir
- Pilihan Ganda Kompleks (PGK): ${counts.pgk || 0} butir
- Benar / Salah (BS): ${counts.bs || 0} butir
- Menjodohkan (Jodoh): ${counts.jodoh || 0} butir
- Isian Singkat: ${counts.isian || 0} butir
- Esai: ${counts.esai || 0} butir

ATURAN STRUKTUR JSON (PENTING! KEMBALIKAN HANYA ARRAY JSON VALID TANPA MARKDOWN / TEKS LAIN):
Setiap butir soal dalam array JSON harus memiliki format persis seperti spesifikasi di bawah ini:

1. Tipe "Pilihan Ganda":
{
  "type": "Pilihan Ganda",
  "questionText": "Teks pertanyaan atau stimulus...",
  "options": [
    { "text": "Pilihan A" },
    { "text": "Pilihan B" },
    { "text": "Pilihan C" },
    { "text": "Pilihan D" }
  ],
  "answer": "A"
}
Catatan: answer bernilai huruf tunggal "A", "B", "C", atau "D".

2. Tipe "Pilihan Ganda Kompleks":
{
  "type": "Pilihan Ganda Kompleks",
  "questionText": "Teks stimulus dan pertanyaan dengan instruksi jelas (misal: 'Pilihlah dua atau tiga pernyataan yang benar berikut:')...",
  "options": [
    { "text": "Pernyataan / Pilihan 1" },
    { "text": "Pernyataan / Pilihan 2" },
    { "text": "Pernyataan / Pilihan 3" },
    { "text": "Pernyataan / Pilihan 4" }
  ],
  "answer": ["A", "C"]
}
Catatan: answer bernilai array huruf kapital opsi yang benar, misal ["A", "C"] atau ["B", "C", "D"].

3. Tipe "Benar/Salah":
{
  "type": "Benar/Salah",
  "questionText": "Teks stimulus konteks / bacaan pengantar...",
  "options": [
    { "text": "Pernyataan 1" },
    { "text": "Pernyataan 2" },
    { "text": "Pernyataan 3" }
  ],
  "answer": ["Benar", "Salah", "Benar"]
}
Catatan: options adalah array berisi 3-4 pernyataan, dan answer adalah array string bernilai "Benar" atau "Salah" dengan panjang yang persis sama dengan jumlah pernyataan di options.

4. Tipe "Menjodohkan":
{
  "type": "Menjodohkan",
  "questionText": "Petunjuk menjodohkan konsep di kolom kiri dengan pasangan di kolom kanan...",
  "options": [
    { "q": { "text": "Premis / Soal 1" }, "a": { "text": "Pasangan Kanan 1" } },
    { "q": { "text": "Premis / Soal 2" }, "a": { "text": "Pasangan Kanan 2" } },
    { "q": { "text": "Premis / Soal 3" }, "a": { "text": "Pasangan Kanan 3" } }
  ],
  "answer": null
}
Catatan: options adalah array 3-4 pasang objek { q: { text: "..." }, a: { text: "..." } }, dan answer bernilai null.

5. Tipe "Isian Singkat":
{
  "type": "Isian Singkat",
  "questionText": "Pertanyaan dengan jawaban kata atau istilah kunci yang presisi...",
  "options": [],
  "answer": ["Jawaban Utama", "variasi huruf kecil / sinonim singkat"]
}
Catatan: options selalu array kosong [], answer adalah array kata kunci yang valid.

6. Tipe "Esai":
{
  "type": "Esai",
  "questionText": "Pertanyaan uraian atau telaah mendalam yang menguji argumen siswa...",
  "options": [],
  "answer": "Rubrik penilaian dan poin-poin kunci jawaban..."
}
Catatan: options selalu array kosong [], answer adalah string panduan koreksi guru.

PEDOMAN KUALITAS SOAL:
1. Pastikan setiap butir soal bermutu tinggi, bebas dari bias, dan kalimatnya lugas sesuai tingkat SMP.
2. Untuk standar AKM dan PISA, WAJIB sertakan stimulus bacaan/skenario nyata yang menarik dan mendidik sebelum mengajukan pertanyaan.
3. Kunci jawaban harus diverifikasi akurat secara keilmuan.
4. Kembalikan HANYA JSON array: [ { ... }, { ... } ] tanpa pembungkus markdown block apapun.`;
}

/**
 * Validasi dan konversi raw output AI menjadi array Question CBT yang siap disimpan
 */
export function validateAndConvertRawQuestions(
  rawList: any[],
  targetSubjectId: string,
  startOrderIndex: number = 1
): Question[] {
  if (!Array.isArray(rawList)) return [];

  const validTypes: QuestionType[] = [
    'Pilihan Ganda',
    'Pilihan Ganda Kompleks',
    'Benar/Salah',
    'Menjodohkan',
    'Isian Singkat',
    'Esai'
  ];

  const results: Question[] = [];

  rawList.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') return;

    // Tentukan type yang valid
    let qType: QuestionType = 'Pilihan Ganda';
    const rawType = String(raw.type || '').trim().toLowerCase();

    if (rawType.includes('kompleks') || rawType === 'pgk') {
      qType = 'Pilihan Ganda Kompleks';
    } else if (rawType.includes('benar') || rawType.includes('salah') || rawType === 'bs') {
      qType = 'Benar/Salah';
    } else if (rawType.includes('jodoh') || rawType.includes('matching')) {
      qType = 'Menjodohkan';
    } else if (rawType.includes('isian') || rawType.includes('singkat') || rawType === 'short') {
      qType = 'Isian Singkat';
    } else if (rawType.includes('esai') || rawType.includes('essay') || rawType.includes('uraian')) {
      qType = 'Esai';
    } else if (validTypes.includes(raw.type as QuestionType)) {
      qType = raw.type as QuestionType;
    }

    const questionText = String(raw.questionText || raw.text || raw.question || 'Pertanyaan tidak memiliki teks.').trim();

    // Sanitasi Options & Answer
    let finalOptions: any = [];
    let finalAnswer: any = null;

    if (qType === 'Pilihan Ganda') {
      if (Array.isArray(raw.options) && raw.options.length > 0) {
        finalOptions = raw.options.map((opt: any) => ({
          text: typeof opt === 'string' ? opt : String(opt?.text || '')
        }));
      } else {
        finalOptions = [
          { text: 'Pilihan A' },
          { text: 'Pilihan B' },
          { text: 'Pilihan C' },
          { text: 'Pilihan D' }
        ];
      }
      finalAnswer = String(raw.answer || 'A').toUpperCase().trim().charAt(0) || 'A';
    } else if (qType === 'Pilihan Ganda Kompleks') {
      if (Array.isArray(raw.options) && raw.options.length > 0) {
        finalOptions = raw.options.map((opt: any) => ({
          text: typeof opt === 'string' ? opt : String(opt?.text || '')
        }));
      } else {
        finalOptions = [
          { text: 'Pernyataan 1' },
          { text: 'Pernyataan 2' },
          { text: 'Pernyataan 3' },
          { text: 'Pernyataan 4' }
        ];
      }
      if (Array.isArray(raw.answer)) {
        finalAnswer = raw.answer.map((a: any) => String(a).toUpperCase().trim());
      } else if (typeof raw.answer === 'string') {
        finalAnswer = raw.answer.split(',').map((s: string) => s.trim().toUpperCase());
      } else {
        finalAnswer = ['A', 'B'];
      }
    } else if (qType === 'Benar/Salah') {
      if (Array.isArray(raw.options) && raw.options.length > 0) {
        finalOptions = raw.options.map((opt: any) => ({
          text: typeof opt === 'string' ? opt : String(opt?.text || '')
        }));
      } else {
        finalOptions = [
          { text: 'Pernyataan 1' },
          { text: 'Pernyataan 2' },
          { text: 'Pernyataan 3' }
        ];
      }
      if (Array.isArray(raw.answer)) {
        finalAnswer = raw.answer.map((a: any) => (String(a).toLowerCase().includes('benar') ? 'Benar' : 'Salah'));
      } else {
        finalAnswer = finalOptions.map(() => 'Benar');
      }
    } else if (qType === 'Menjodohkan') {
      if (Array.isArray(raw.options) && raw.options.length > 0) {
        finalOptions = raw.options.map((pair: any) => {
          const qText = pair?.q?.text || (typeof pair?.q === 'string' ? pair.q : 'Premis');
          const aText = pair?.a?.text || (typeof pair?.a === 'string' ? pair.a : 'Jawaban');
          return {
            q: { text: String(qText) },
            a: { text: String(aText) }
          };
        });
      } else {
        finalOptions = [
          { q: { text: 'Premis A' }, a: { text: 'Pasangan A' } },
          { q: { text: 'Premis B' }, a: { text: 'Pasangan B' } }
        ];
      }
      finalAnswer = null;
    } else if (qType === 'Isian Singkat') {
      finalOptions = [];
      if (Array.isArray(raw.answer)) {
        finalAnswer = raw.answer.map((a: any) => String(a).trim());
      } else if (typeof raw.answer === 'string') {
        finalAnswer = [raw.answer.trim()];
      } else {
        finalAnswer = ['Jawaban'];
      }
    } else if (qType === 'Esai') {
      finalOptions = [];
      finalAnswer = typeof raw.answer === 'string' ? raw.answer.trim() : 'Rubrik penilaian';
    }

    const uniqueId = `q-ai-${Date.now()}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`;

    results.push({
      id: uniqueId,
      subjectId: targetSubjectId,
      type: qType,
      questionText,
      options: finalOptions,
      answer: finalAnswer,
      orderIndex: startOrderIndex + idx,
      createdAt: Date.now()
    });
  });

  return results;
}
