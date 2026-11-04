import { Question, QuestionType, OptionItem } from '@/types/cbt';
import { validateAndConvertRawQuestions } from './aiQuestionGenerator';

/**
 * Heuristic Client-Side Parser untuk mengekstrak butir soal dari teks naskah (Word/PDF/Notepad/Hasil AI)
 * Bekerja 100% instan dan offline tanpa memerlukan Kunci API AI.
 * Mendukung masukan berupa JSON murni dari Gemini Web / ChatGPT maupun teks naskah biasa.
 */
export function parseQuestionsFromRawText(
  rawText: string,
  targetSubjectId: string,
  startOrderIndex: number = 1
): Question[] {
  if (!rawText || !rawText.trim()) return [];

  const cleanInput = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // 1. DUKUNGAN LANGSUNG JSON: Jika teks berupa format JSON array dari Gemini Web atau ChatGPT
  const jsonCandidate = cleanInput.trim();
  let jsonParsed: any = null;

  if (jsonCandidate.startsWith('[') && jsonCandidate.endsWith(']')) {
    try {
      jsonParsed = JSON.parse(jsonCandidate);
    } catch {}
  }
  if (!jsonParsed) {
    // Cari blok JSON di dalam teks jika ada teks pengantar AI
    const jsonBlockMatch = cleanInput.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonBlockMatch) {
      try {
        jsonParsed = JSON.parse(jsonBlockMatch[0]);
      } catch {}
    }
  }

  if (Array.isArray(jsonParsed) && jsonParsed.length > 0) {
    try {
      const converted = validateAndConvertRawQuestions(jsonParsed, targetSubjectId, startOrderIndex);
      if (converted.length > 0) {
        return converted;
      }
    } catch {}
  }

  // 2. PARSER TEKS HEURISTIK UNTUK NASKAH BIASA
  // Pola penanda awal nomor soal: "1.", "1)", "Soal 1.", "No. 1:", "[1]", "1 "
  const questionSplitRegex = /(?:^|\n+)(?=(?:(?:no|soal|nomor)\.?\s*)?\d+[\.\)\]\:]\s+)/i;
  const rawBlocks = cleanInput.split(questionSplitRegex).map(b => b.trim()).filter(Boolean);

  const results: Question[] = [];

  rawBlocks.forEach((block, idx) => {
    // Abaikan blok jika terlalu pendek (misal hanya header kop surat sekolah)
    if (block.length < 8) return;

    // Bersihkan nomor soal di awal teks (contoh: "1. ", "Soal 1: ")
    const headerNumberRegex = /^(?:(?:no|soal|nomor)\.?\s*)?\d+[\.\)\]\:]\s*/i;
    let bodyWithoutNumber = block.replace(headerNumberRegex, '').trim();

    // Deteksi Tag Tipe Soal Eksplisit jika ada (contoh: "[Benar/Salah]", "[Pilihan Ganda]", "[PG]", "[Esai]")
    let explicitType: QuestionType | null = null;
    const typeTagMatch = bodyWithoutNumber.match(/^\[\s*(Pilihan Ganda Kompleks|Pilihan Ganda|PGK|PG|Benar\/Salah|Benar-Salah|B\/S|Menjodohkan|Isian Singkat|Isian|Esai|Uraian)\s*\]\s*/i);
    if (typeTagMatch) {
      const tagLower = typeTagMatch[1].toLowerCase().replace(/[\s\/-]/g, '');
      if (tagLower === 'pilihangandakompleks' || tagLower === 'pgk') {
        explicitType = 'Pilihan Ganda Kompleks';
      } else if (tagLower === 'pilihanganda' || tagLower === 'pg') {
        explicitType = 'Pilihan Ganda';
      } else if (tagLower === 'benarsalah' || tagLower === 'bs') {
        explicitType = 'Benar/Salah';
      } else if (tagLower === 'menjodohkan') {
        explicitType = 'Menjodohkan';
      } else if (tagLower === 'isiansingkat' || tagLower === 'isian') {
        explicitType = 'Isian Singkat';
      } else if (tagLower === 'esai' || tagLower === 'uraian') {
        explicitType = 'Esai';
      }
      bodyWithoutNumber = bodyWithoutNumber.replace(typeTagMatch[0], '').trim();
    }

    // Ekstrak Kunci Jawaban jika tertera di dalam teks (misal: "Kunci: A", "Kunci: Benar", "Jawaban: Salah")
    let detectedAnswer: string | null = null;
    let textToProcess = bodyWithoutNumber;

    const answerKeyRegex = /(?:kunci(?:\s+jawaban)?|jawaban|ans|key)\s*[:=]\s*([^\n\r]+)/i;
    const keyMatch = textToProcess.match(answerKeyRegex);
    if (keyMatch) {
      const rawAns = keyMatch[1].trim();
      const rawAnsUpper = rawAns.toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(rawAnsUpper)) {
        detectedAnswer = rawAnsUpper;
      } else if (rawAnsUpper.includes('BENAR')) {
        detectedAnswer = 'Benar';
      } else if (rawAnsUpper.includes('SALAH')) {
        detectedAnswer = 'Salah';
      } else {
        detectedAnswer = rawAns;
      }
      // Hapus baris kunci jawaban dari pertanyaan agar tidak bocor ke siswa
      textToProcess = textToProcess.replace(keyMatch[0], '').trim();
    }

    // Deteksi Opsi Pilihan (A, B, C, D, E)
    const optionRegex = /(?:^|\n)\s*(?:\(?([a-eA-E])\)?[.\:]\s+)([\s\S]*?)(?=(?:\n\s*\(?[a-eA-E]\)?[.\:]\s+)|$)/g;
    const optionMatches = Array.from(textToProcess.matchAll(optionRegex));

    // KASUS A: Memiliki Opsi (A, B, C, D)
    if (optionMatches.length >= 2) {
      const firstOptionIndex = optionMatches[0].index ?? textToProcess.length;
      const questionText = textToProcess.substring(0, firstOptionIndex).trim();

      const options: OptionItem[] = [];
      optionMatches.forEach(om => {
        const optLetter = om[1].toUpperCase();
        let optText = om[2].trim().replace(/\n+/g, ' ').trim();
        options.push({ text: optText });

        // Cek jika ada tanda bold / asterisk di sekitar kunci misal: "*A. Pilihan*"
        if (!detectedAnswer && om[0].includes('*')) {
          detectedAnswer = optLetter;
        }
      });

      // KHUSUS: Jika opsinya hanya "Benar" dan "Salah" (atau A. Benar, B. Salah)
      const isTrueFalseOptions =
        options.length === 2 &&
        options.some(o => o.text.trim().toLowerCase() === 'benar') &&
        options.some(o => o.text.trim().toLowerCase() === 'salah');

      if (isTrueFalseOptions || explicitType === 'Benar/Salah') {
        let finalBSAnswer = 'Benar';
        if (detectedAnswer === 'B' || detectedAnswer === 'Salah' || (detectedAnswer && detectedAnswer.toLowerCase().includes('salah'))) {
          finalBSAnswer = 'Salah';
        } else if (detectedAnswer === 'A' || detectedAnswer === 'Benar' || (detectedAnswer && detectedAnswer.toLowerCase().includes('benar'))) {
          finalBSAnswer = 'Benar';
        }

        results.push({
          id: `q-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          subjectId: targetSubjectId,
          type: 'Benar/Salah',
          questionText: questionText || 'Tentukan apakah pernyataan berikut Benar atau Salah',
          options: [], // Options kosong agar QuestionRenderer merender tombol radio Benar/Salah tunggal
          answer: finalBSAnswer,
          orderIndex: startOrderIndex + results.length,
          createdAt: Date.now()
        });
        return;
      }

      // Jika ada beberapa huruf pada kunci jawaban (misal "A, C" atau "A dan B") atau explicitType PGK
      const isMultiChoice =
        explicitType === 'Pilihan Ganda Kompleks' ||
        (detectedAnswer && /[A-E]\s*[,dan&]\s*[A-E]/i.test(detectedAnswer));

      if (isMultiChoice) {
        let pgkAnswers = ['A'];
        if (detectedAnswer) {
          const matchedLetters = detectedAnswer.match(/[A-E]/gi);
          if (matchedLetters && matchedLetters.length > 0) {
            pgkAnswers = Array.from(new Set(matchedLetters.map(l => l.toUpperCase())));
          }
        }
        results.push({
          id: `q-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          subjectId: targetSubjectId,
          type: 'Pilihan Ganda Kompleks',
          questionText: questionText || 'Pilihlah jawaban yang benar (bisa lebih dari satu)',
          options,
          answer: pgkAnswers,
          orderIndex: startOrderIndex + results.length,
          createdAt: Date.now()
        });
        return;
      }

      // Default: Pilihan Ganda Biasa
      if (!detectedAnswer || !['A', 'B', 'C', 'D', 'E'].includes(detectedAnswer)) {
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

    // KASUS B: Deteksi Tipe Benar / Salah Tanpa Opsi A-B Terpisah
    const isExplicitBS = explicitType === 'Benar/Salah';
    const hasBSKeyword = /\b(benar\s*(?:atau|\/)\s*salah|b\s*\/\s*s)\b/i.test(textToProcess);
    const hasBSAnswer = detectedAnswer === 'Benar' || detectedAnswer === 'Salah';

    if (isExplicitBS || hasBSKeyword || hasBSAnswer) {
      // Bersihkan penanda [B/S] dari pertanyaan
      const qText = textToProcess
        .replace(/\[\s*B\s*\/\s*S\s*\]/gi, '')
        .replace(/\(\s*Benar\s*\/\s*Salah\s*\)/gi, '')
        .trim();

      const finalBSAnswer = (detectedAnswer && detectedAnswer.toLowerCase().includes('salah')) ? 'Salah' : 'Benar';

      results.push({
        id: `q-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        subjectId: targetSubjectId,
        type: 'Benar/Salah',
        questionText: qText || 'Tentukan kebenaran dari pernyataan berikut:',
        options: [], // Tetap kosong agar menjadi tipe Benar/Salah tunggal
        answer: finalBSAnswer,
        orderIndex: startOrderIndex + results.length,
        createdAt: Date.now()
      });
      return;
    }

    // KASUS C: Tipe Isian Singkat
    if (explicitType === 'Isian Singkat') {
      results.push({
        id: `q-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        subjectId: targetSubjectId,
        type: 'Isian Singkat',
        questionText: textToProcess,
        options: [],
        answer: detectedAnswer || '',
        orderIndex: startOrderIndex + results.length,
        createdAt: Date.now()
      });
      return;
    }

    // KASUS D: Default Tipe Esai
    results.push({
      id: `q-import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      subjectId: targetSubjectId,
      type: explicitType || 'Esai',
      questionText: textToProcess,
      options: [],
      answer: detectedAnswer || '',
      orderIndex: startOrderIndex + results.length,
      createdAt: Date.now()
    });
  });

  return results;
}
