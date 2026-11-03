import { Question, QuestionType, OptionItem } from '@/types/cbt';

/**
 * Heuristic Client-Side Parser untuk mengekstrak butir soal dari teks naskah (Word/PDF/Notepad)
 * Bekerja 100% instan dan offline tanpa memerlukan Kunci API AI.
 */
export function parseQuestionsFromRawText(
  rawText: string,
  targetSubjectId: string,
  startOrderIndex: number = 1
): Question[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalisasi teks
  const cleanInput = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // Pola penanda awal nomor soal: "1.", "1)", "Soal 1.", "No. 1:", "[1]"
  const questionSplitRegex = /(?:^|\n+)(?=(?:(?:no|soal)\.?\s*)?\d+[\.\)\]\:]\s+)/i;
  const rawBlocks = cleanInput.split(questionSplitRegex).map(b => b.trim()).filter(Boolean);

  const results: Question[] = [];

  rawBlocks.forEach((block, idx) => {
    // Abaikan blok jika terlalu pendek (misal hanya header kop surat)
    if (block.length < 10) return;

    // Bersihkan nomor soal di awal teks (contoh: "1. ", "Soal 1: ")
    const headerNumberRegex = /^(?:(?:no|soal)\.?\s*)?\d+[\.\)\]\:]\s*/i;
    const bodyWithoutNumber = block.replace(headerNumberRegex, '').trim();

    // 1. Ekstrak Kunci Jawaban jika tertera di dalam teks (misal: "Kunci: A", "Kunci Jawaban: B", "Jawaban : C")
    let detectedAnswer: string | null = null;
    let textToProcess = bodyWithoutNumber;

    const answerKeyRegex = /(?:kunci(?:\s+jawaban)?|jawaban|ans|key)\s*[:=]\s*([a-eA-E]|\bbenar\b|\bsalah\b|[^\n\r]+)/i;
    const keyMatch = textToProcess.match(answerKeyRegex);
    if (keyMatch) {
      const rawAns = keyMatch[1].trim().toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(rawAns)) {
        detectedAnswer = rawAns;
      } else if (rawAns === 'BENAR' || rawAns === 'SALAH') {
        detectedAnswer = rawAns.charAt(0) + rawAns.slice(1).toLowerCase();
      } else {
        detectedAnswer = keyMatch[1].trim();
      }
      // Hapus baris kunci jawaban dari badan teks pertanyaan agar tidak bocor
      textToProcess = textToProcess.replace(keyMatch[0], '').trim();
    }

    // 2. Deteksi Opsi Pilihan Ganda (A, B, C, D, E)
    // Pola opsi: "A. ", "a) ", "(A) ", "\nA. "
    const optionRegex = /(?:^|\n)\s*(?:\(?([a-eA-E])\)?[.\:]\s+)([\s\S]*?)(?=(?:\n\s*\(?[a-eA-E]\)?[.\:]\s+)|$)/g;
    const optionMatches = Array.from(textToProcess.matchAll(optionRegex));

    if (optionMatches.length >= 2) {
      // Tipe: Pilihan Ganda
      // Teks pertanyaan adalah bagian sebelum opsi pertama muncul
      const firstOptionIndex = optionMatches[0].index ?? textToProcess.length;
      const questionText = textToProcess.substring(0, firstOptionIndex).trim();

      const options: OptionItem[] = [];
      optionMatches.forEach(om => {
        const optLetter = om[1].toUpperCase();
        let optText = om[2].trim();
        // Bersihkan spasi ganda atau trailing newlines
        optText = optText.replace(/\n+/g, ' ').trim();
        options.push({ text: optText });

        // Cek jika ada tanda bold / asterisk / bintang di sekitar kunci misal: "*A. Pilihan*"
        if (!detectedAnswer && om[0].includes('*')) {
          detectedAnswer = optLetter;
        }
      });

      // Default kunci jawaban ke opsi A jika belum terdeteksi agar tidak null
      if (!detectedAnswer) {
        detectedAnswer = 'A';
      }

      results.push({
        id: `q-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        subjectId: targetSubjectId,
        type: 'Pilihan Ganda',
        questionText: questionText || 'Pertanyaan Pilihan Ganda',
        options,
        answer: detectedAnswer,
        orderIndex: startOrderIndex + results.length,
        createdAt: Date.now()
      });
      return;
    }

    // 3. Deteksi Tipe Benar / Salah
    const isTrueFalse = /\b(benar|salah)\b/i.test(textToProcess) && (textToProcess.includes('Benar / Salah') || textToProcess.includes('B - S') || textToProcess.includes('[B/S]'));
    if (isTrueFalse) {
      const qText = textToProcess.replace(/\[\s*B\s*\/\s*S\s*\]/gi, '').trim();
      results.push({
        id: `q-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        subjectId: targetSubjectId,
        type: 'Benar/Salah',
        questionText: qText,
        options: [{ text: 'Benar' }, { text: 'Salah' }],
        answer: detectedAnswer === 'Salah' ? 'Salah' : 'Benar',
        orderIndex: startOrderIndex + results.length,
        createdAt: Date.now()
      });
      return;
    }

    // 4. Default: Tipe Esai / Isian
    results.push({
      id: `q-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      subjectId: targetSubjectId,
      type: 'Esai',
      questionText: textToProcess,
      options: [],
      answer: detectedAnswer || '',
      orderIndex: startOrderIndex + results.length,
      createdAt: Date.now()
    });
  });

  return results;
}
