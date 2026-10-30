import { Question, QuestionType } from '@/types/cbt';

/**
 * Mengacak butir-butir soal secara adil, dengan tetap menjaga urutan tipe soal:
 * 1. Pilihan Ganda (semua butir PG diacak di dalam kelompoknya)
 * 2. Pilihan Ganda Kompleks (semua butir PGK diacak di dalam kelompoknya)
 * 3. Benar/Salah (semua butir B/S diacak di dalam kelompoknya)
 * 4. Menjodohkan (semua butir Menjodohkan diacak di dalam kelompoknya)
 * 5. Isian Singkat (semua butir Isian diacak di dalam kelompoknya)
 * 6. Esai (semua butir Esai diacak di dalam kelompoknya)
 */
export function shuffleQuestionsGroupedByType(questions: Question[]): Question[] {
  if (!questions || questions.length <= 1) return questions;

  const typeOrder: QuestionType[] = [
    'Pilihan Ganda',
    'Pilihan Ganda Kompleks',
    'Benar/Salah',
    'Menjodohkan',
    'Isian Singkat',
    'Esai'
  ];

  // Kelompokkan soal berdasarkan tipenya
  const groups = new Map<string, Question[]>();
  typeOrder.forEach(t => groups.set(t, []));

  questions.forEach(q => {
    const list = groups.get(q.type);
    if (list) {
      list.push(q);
    } else {
      groups.set(q.type, [q]);
    }
  });

  // Algoritma Pengacakan Fisher-Yates
  const shuffle = <T>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const finalQuestions: Question[] = [];

  // Gabungkan kembali secara berurutan sesuai tipe, namun anggota tiap tipe diacak
  typeOrder.forEach(t => {
    const items = groups.get(t);
    if (items && items.length > 0) {
      finalQuestions.push(...shuffle(items));
    }
  });

  // Tipe tambahan jika ada di luar urutan baku
  groups.forEach((items, type) => {
    if (!typeOrder.includes(type as QuestionType) && items.length > 0) {
      finalQuestions.push(...shuffle(items));
    }
  });

  return finalQuestions;
}
