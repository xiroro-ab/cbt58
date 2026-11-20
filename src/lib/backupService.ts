import { Question, Subject, QuestionType } from '@/types/cbt';

export interface CbtQuestionsBackup {
  app: string;
  version: string;
  type: string;
  exportedAt: string;
  subjectTitle: string;
  className: string;
  totalQuestions: number;
  questions: Question[];
}

/**
 * Membuat data backup soal dalam format JSON
 */
export function createQuestionsBackup(subject: Subject, questions: Question[]): string {
  const payload: CbtQuestionsBackup = {
    app: 'CBT_SMPN58',
    version: '1.0',
    type: 'CBT_QUESTIONS_BACKUP',
    exportedAt: new Date().toISOString(),
    subjectTitle: subject.title,
    className: subject.className,
    totalQuestions: questions.length,
    questions: questions.map((q, idx) => ({
      ...q,
      orderIndex: idx + 1
    }))
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Mengunduh file backup butir soal (.json) ke perangkat pengguna
 */
export function downloadQuestionsBackup(subject: Subject, questions: Question[]): void {
  const jsonContent = createQuestionsBackup(subject, questions);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const safeTitle = (subject.title || 'Soal')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30);
  const safeClass = (subject.className || 'Kelas')
    .replace(/[^a-zA-Z0-9]/g, '_');
  const safeDate = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `Backup_Soal_${safeTitle}_${safeClass}_${safeDate}.json`;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Mem-parsing file backup (.json) menjadi array Question CBT yang valid
 * Mendukung format objek backup CBT maupun array mentah Question[]
 */
export function parseQuestionsBackup(
  jsonText: string,
  targetSubjectId: string,
  startOrderIndex: number = 1
): Question[] {
  if (!jsonText || typeof jsonText !== 'string') return [];

  let rawList: any[] = [];
  try {
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.questions)) {
        rawList = parsed.questions;
      } else if (Array.isArray(parsed.items)) {
        rawList = parsed.items;
      } else if (Array.isArray(parsed.data)) {
        rawList = parsed.data;
      }
    }
  } catch {
    throw new Error('Format file bukan format JSON yang valid.');
  }

  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error('File backup tidak memiliki butir soal yang dapat dibaca.');
  }

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
    if (validTypes.includes(raw.type as QuestionType)) {
      qType = raw.type as QuestionType;
    } else {
      const lower = String(raw.type || '').toLowerCase();
      if (lower.includes('kompleks') || lower === 'pgk') qType = 'Pilihan Ganda Kompleks';
      else if (lower.includes('benar') || lower.includes('salah') || lower === 'bs') qType = 'Benar/Salah';
      else if (lower.includes('jodoh') || lower.includes('matching')) qType = 'Menjodohkan';
      else if (lower.includes('isian') || lower.includes('singkat')) qType = 'Isian Singkat';
      else if (lower.includes('esai') || lower.includes('essay')) qType = 'Esai';
    }

    const questionText = String(raw.questionText || raw.text || raw.question || '').trim();
    if (!questionText) return;

    // Normalisasi options (menjaga struktur teks, gambar, atau pasangan menjodohkan)
    let options: any = [];
    if (Array.isArray(raw.options)) {
      options = raw.options;
    } else if (qType === 'Menjodohkan') {
      if (Array.isArray(raw.pairs)) options = raw.pairs;
      else if (Array.isArray(raw.matchingPairs)) options = raw.matchingPairs;
    }

    // Normalisasi answer
    let answer: any = null;
    if (raw.answer !== undefined) {
      answer = raw.answer;
    }

    results.push({
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${idx}`,
      subjectId: targetSubjectId,
      type: qType,
      questionText,
      mediaUrl: typeof raw.mediaUrl === 'string' ? raw.mediaUrl : '',
      options,
      answer,
      cognitiveLevel: raw.cognitiveLevel || 'C2',
      orderIndex: startOrderIndex + idx,
      createdAt: Date.now()
    });
  });

  return results;
}
