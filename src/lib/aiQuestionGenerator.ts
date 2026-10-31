import { Question, QuestionType } from '@/types/cbt';

export type StandardBadge = 'AKM' | 'PISA' | 'TKA' | 'HARIAN';

export interface StandardOption {
  id: StandardBadge;
  label: string;
  sublabel: string;
  badge: string;
  description: string;
  focusGuideline: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    activeBg: string;
    activeBorder: string;
  };
}

export const STANDARDS_OPTIONS: StandardOption[] = [
  {
    id: 'AKM',
    label: 'Standar AKM (Kemendikbud)',
    sublabel: 'Literasi & Numerasi Berbasis Stimulus',
    badge: 'Literasi & Numerasi',
    description: 'Menyajikan stimulus teks bacaan informasional, infografis/tabel kontekstual kehidupan nyata yang menguji daya nalar kritis siswa.',
    focusGuideline: 'WAJIB sertakan stimulus bacaan naratif/informasional atau data tabel kontekstual kehidupan nyata sebelum pertanyaan. Uji daya literasi dan numerasi kritis.',
    colorScheme: {
      bg: 'bg-violet-50/50 dark:bg-violet-950/20',
      border: 'border-violet-200 dark:border-violet-800',
      text: 'text-violet-700 dark:text-violet-300',
      activeBg: 'bg-violet-100/90 dark:bg-violet-950/70',
      activeBorder: 'border-violet-500'
    }
  },
  {
    id: 'PISA',
    label: 'Standar PISA (OECD)',
    sublabel: 'HOTS & Pemecahan Masalah Nyata',
    badge: 'HOTS & Problem Solving',
    description: 'Menekankan penalaran tingkat tinggi (Higher Order Thinking Skills), pemecahan masalah fenomena empiris, berpikir logis, dan argumentasi ilmiah.',
    focusGuideline: 'WAJIB tekankan Higher Order Thinking Skills (HOTS level C4-C6), analisis masalah empiris dunia nyata, perumusan hipotesis, dan telaah argumentasi berbasis bukti.',
    colorScheme: {
      bg: 'bg-fuchsia-50/50 dark:bg-fuchsia-950/20',
      border: 'border-fuchsia-200 dark:border-fuchsia-800',
      text: 'text-fuchsia-700 dark:text-fuchsia-300',
      activeBg: 'bg-fuchsia-100/90 dark:bg-fuchsia-950/70',
      activeBorder: 'border-fuchsia-500'
    }
  },
  {
    id: 'TKA',
    label: 'Standar TKA / ASAS Semester',
    sublabel: 'Penguasaan Konsep Teori & Kurikulum',
    badge: 'Konsep Kurikulum',
    description: 'Menitikberatkan pada penguasaan materi kurikulum sekolah secara komprehensif, konsep esensial, rumus, dan prosedur aplikasi berjenjang.',
    focusGuideline: 'Uji penguasaan konsep esensial kurikulum, pemahaman teori dasar hingga lanjut, ketepatan rumus/kaidah, dan aplikasi materi pelajaran secara terstruktur.',
    colorScheme: {
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      activeBg: 'bg-blue-100/90 dark:bg-blue-950/70',
      activeBorder: 'border-blue-500'
    }
  },
  {
    id: 'HARIAN',
    label: 'Standar Soal Harian (Formatif)',
    sublabel: 'Pemahaman Konsep Langsung (TP/KD)',
    badge: 'Formatif Cepat',
    description: 'Fokus pada pengujian langsung indikator ketercapaian tujuan pembelajaran (TP/KD) secara lugas untuk asesmen harian.',
    focusGuideline: 'Fokus pada uji pemahaman langsung tujuan pembelajaran harian (TP/KD) dengan bahasa yang lugas, mudah dipahami siswa, dan tepat sasaran.',
    colorScheme: {
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      activeBg: 'bg-emerald-100/90 dark:bg-emerald-950/70',
      activeBorder: 'border-emerald-500'
    }
  }
];

export interface GeminiModelOption {
  id: string;
  name: string;
  tag: string;
  description: string;
}

export const GEMINI_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    tag: 'Rekomendasi Utama (Cepat & Cerdas)',
    description: 'Model standar paling seimbang, respon sangat cepat dengan pemahaman struktur CBT yang presisi.'
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    tag: 'Penalaran HOTS Mendalam',
    description: 'Daya analisis kognitif tinggi, sangat cocok untuk stimulus bacaan panjang AKM dan studi kasus PISA.'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash (Generasi Baru)',
    tag: 'Teknologi Mutakhir',
    description: 'Generasi terbaru dengan pemrosesan ultra-cepat dan kemampuan instruksi multi-standar yang tajam.'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash Lite',
    tag: 'Hemat Kuota & Ringan',
    description: 'Model ringan dan hemat kuota token, cocok untuk pembuatan soal ringkas atau koneksi internet lambat.'
  }
];

export interface QuestionCounts {
  pg: number;
  pgk: number;
  bs: number;
  jodoh: number;
  isian: number;
  esai: number;
}

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
  selectedStandards: StandardBadge[];
  counts: QuestionCounts;
  customInstructions?: string;
  model?: string;
}

export function buildAiQuestionPrompt(params: PromptBuildParams): string {
  const {
    subjectTitle,
    className,
    topic,
    difficulty,
    selectedStandards = ['AKM', 'TKA'],
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

  // Analisis kedalaman berdasarkan standar yang dicentang guru
  const activeStandards = STANDARDS_OPTIONS.filter(s => selectedStandards.includes(s.id));
  const standardNames = activeStandards.map(s => s.label).join(' + ') || 'Kurikulum Merdeka Umum';

  const depthGuidelines = activeStandards
    .map((s, idx) => `${idx + 1}. [${s.label}]: ${s.focusGuideline}`)
    .join('\n');

  return `Anda adalah Pakar Asesmen Pendidikan Nasional dan Pembuat Soal Ujian Berbasis Komputer (CBT) SMP Indonesia yang menguasai kedalaman Kurikulum Merdeka, Standar AKM (Kemendikbud), Standar PISA (OECD), Standar TKA (Akademik/ASAS), dan Soal Harian Formatif.

TUGAS UTAMA:
Buatkan ${totalCount} butir soal ujian dengan komposisi tipe dan tingkat kedalaman yang diminta oleh Guru:
- Mata Pelajaran: ${subjectTitle}
- Jenjang / Target Rombel: ${className}
- Topik / Materi Pokok: ${topic}
- Tingkat Kesulitan Kognitif: ${difficulty}
- Standar Kedalaman Soal yang Dipilih Guru: ${standardNames}
${customInstructions ? `- Catatan Khusus Guru: ${customInstructions}` : ''}

PEDOMAN KEDALAMAN KARAKTERISTIK SOAL (WAJIB DIIKUTI SECARA PROPORSIONAL):
${depthGuidelines || 'Gunakan standar asesmen sekolah umum dengan stimulus kontekstual yang jelas.'}
${activeStandards.length > 1 ? `Catatan Integrasi: Karena guru memilih lebih dari satu standar (${standardNames}), kombinasikan kedalaman dan gaya standar-standar tersebut ke dalam butir-butir soal secara proporsional dan harmonis.` : ''}

KOMPOSISI TIPE SOAL YANG WAJIB DIBUAT (TOTAL: ${totalCount} BUTIR):
- Pilihan Ganda (PG): ${counts.pg || 0} butir
- Pilihan Ganda Kompleks (PGK): ${counts.pgk || 0} butir
- Benar / Salah (BS): ${counts.bs || 0} butir
- Menjodohkan (Jodoh): ${counts.jodoh || 0} butir
- Isian Singkat: ${counts.isian || 0} butir
- Esai: ${counts.esai || 0} butir

ATURAN STRUKTUR JSON (PENTING! KEMBALIKAN HANYA ARRAY JSON VALID TANPA MARKDOWN / TEKS LAIN):
Setiap butir soal dalam array JSON harus memiliki format persis:

1. Tipe "Pilihan Ganda":
{
  "type": "Pilihan Ganda",
  "questionText": "Teks stimulus kontekstual / pertanyaan...",
  "options": [
    { "text": "Pilihan A" },
    { "text": "Pilihan B" },
    { "text": "Pilihan C" },
    { "text": "Pilihan D" }
  ],
  "answer": "A"
}
Catatan: answer bernilai huruf kapital tunggal "A", "B", "C", atau "D".

2. Tipe "Pilihan Ganda Kompleks":
{
  "type": "Pilihan Ganda Kompleks",
  "questionText": "Teks stimulus dan instruksi memilih opsi yang tepat (misal: 'Pilihlah dua atau tiga pernyataan yang sesuai:')...",
  "options": [
    { "text": "Pernyataan / Pilihan 1" },
    { "text": "Pernyataan / Pilihan 2" },
    { "text": "Pernyataan / Pilihan 3" },
    { "text": "Pernyataan / Pilihan 4" }
  ],
  "answer": ["A", "C"]
}
Catatan: answer bernilai array huruf kapital opsi benar, misal ["A", "C"] atau ["B", "C", "D"].

3. Tipe "Benar/Salah":
{
  "type": "Benar/Salah",
  "questionText": "Teks stimulus konteks / data...",
  "options": [
    { "text": "Pernyataan 1" },
    { "text": "Pernyataan 2" },
    { "text": "Pernyataan 3" }
  ],
  "answer": ["Benar", "Salah", "Benar"]
}
Catatan: options adalah array berisi pernyataan, answer adalah array string bernilai "Benar" atau "Salah" dengan jumlah yang sama persis dengan opsi pernyataan.

4. Tipe "Menjodohkan":
{
  "type": "Menjodohkan",
  "questionText": "Petunjuk menjodohkan premis di kolom kiri dengan pasangan di kolom kanan...",
  "options": [
    { "q": { "text": "Premis Kiri 1" }, "a": { "text": "Pasangan Kanan 1" } },
    { "q": { "text": "Premis Kiri 2" }, "a": { "text": "Pasangan Kanan 2" } },
    { "q": { "text": "Premis Kiri 3" }, "a": { "text": "Pasangan Kanan 3" } }
  ],
  "answer": null
}
Catatan: options adalah array objek { q: { text: "..." }, a: { text: "..." } }, answer bernilai null.

5. Tipe "Isian Singkat":
{
  "type": "Isian Singkat",
  "questionText": "Pertanyaan dengan jawaban kata kunci atau istilah tepat...",
  "options": [],
  "answer": ["Jawaban Utama", "sinonim / variasi huruf kecil"]
}
Catatan: options selalu array kosong [], answer adalah array kata kunci.

6. Tipe "Esai":
{
  "type": "Esai",
  "questionText": "Pertanyaan uraian atau telaah analitis mendalam...",
  "options": [],
  "answer": "Rubrik penilaian dan poin-poin kunci jawaban guru..."
}
Catatan: options selalu array kosong [], answer adalah string rubrik penilaian.

KUALITAS AKADEMIK:
1. Pastikan butir soal bebas dari kekeliruan konsep keilmuan.
2. Jika standar AKM atau PISA dicentang guru, WAJIB sertakan stimulus dunia nyata (studi kasus, kutipan bacaan, fenomena sains/sosial) yang mendalam.
3. Kunci jawaban harus diverifikasi akurat.
4. Kembalikan HANYA JSON array: [ { ... }, { ... } ] tanpa pembungkus teks di luar JSON.`;
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
