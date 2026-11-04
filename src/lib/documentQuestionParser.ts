import { Question, QuestionType, OptionItem } from '@/types/cbt';
import { validateAndConvertRawQuestions, normalizeBSAnswer } from './aiQuestionGenerator';

/**
 * Heuristic Client-Side Parser untuk mengekstrak butir soal dari teks naskah (Word/PDF/Notepad/Hasil AI)
 * Bekerja 100% instan dan offline di peramban tanpa memerlukan Kunci API AI atau kuota internet.
 * Mendukung masukan berupa JSON murni dari Gemini Web / ChatGPT maupun teks naskah ujian sekolah biasa,
 * termasuk tabel Benar/Salah multi-pernyataan (seperti soal Asesmen Bagian C).
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
  // Deteksi pemisah butir soal:
  // - Nomor diikuti titik, kurung, titik dua, tab, atau berada di baris sendiri
  const questionSplitRegex = /(?:^|\n+)(?=(?:(?:no|soal|nomor)\.?\s*)?\d+(?:[\.\)\]\:\t]|\s*\n|\s+(?=[a-z\(\[\"\'\-\*A-Z]))(?!\/|\-)\s*)/i;
  const rawBlocks = cleanInput.split(questionSplitRegex).map(b => b.trim()).filter(Boolean);

  const results: Question[] = [];
  let currentSectionType: QuestionType | null = null;

  for (let bIdx = 0; bIdx < rawBlocks.length; bIdx++) {
    const block = rawBlocks[bIdx];
    if (block.length < 4) continue;

    // Periksa apakah ini baris Header Bagian / Bab (misal: "BAGIAN C: PILIHAN BENAR / SALAH (BOBOT 35%)...")
    const isSectionHeader =
      /^(?:bagian|bab|part|romawi)\s+[a-z0-9ivx]+\s*[:\.\-]/i.test(block) ||
      /^(?:pilihan\s+ganda\s+kompleks|pilihan\s+ganda|benar\s*[\/-]?\s*salah|menjodohkan|isian\s+singkat|esai|uraian)/i.test(block);

    if (isSectionHeader && !/^\d+[\.\)\]\:\t\s]/.test(block)) {
      const lower = block.toLowerCase();
      if (lower.includes('benar') && lower.includes('salah')) {
        currentSectionType = 'Benar/Salah';
      } else if (lower.includes('kompleks') || lower.includes('pgk')) {
        currentSectionType = 'Pilihan Ganda Kompleks';
      } else if (lower.includes('jodoh')) {
        currentSectionType = 'Menjodohkan';
      } else if (lower.includes('isian')) {
        currentSectionType = 'Isian Singkat';
      } else if (lower.includes('esai') || lower.includes('uraian')) {
        currentSectionType = 'Esai';
      } else if (lower.includes('pilihan ganda') || lower.includes('pg')) {
        currentSectionType = 'Pilihan Ganda';
      }
      continue;
    }

    // Nomor soal di awal teks (contoh "18. ", "18\t", "18\n", "No. 18:")
    const headerNumberRegex = /^(?:(?:no|soal|nomor)\.?\s*)?(\d+)[\.\)\]\:\t\s]*/i;
    const numberMatch = block.match(headerNumberRegex);
    let bodyWithoutNumber = block.replace(headerNumberRegex, '').trim();

    if (!bodyWithoutNumber && !numberMatch) continue;

    // Cek apakah ada penanda section baru yang terselip di dalam blok
    const sectionInBlock = bodyWithoutNumber.match(/(?:bagian|bab|romawi)\s+[a-z0-9ivx]+\s*[:\.\-][^\n]*/i);
    if (sectionInBlock) {
      const secLower = sectionInBlock[0].toLowerCase();
      if (secLower.includes('benar') && secLower.includes('salah')) currentSectionType = 'Benar/Salah';
      else if (secLower.includes('kompleks') || secLower.includes('pgk')) currentSectionType = 'Pilihan Ganda Kompleks';
      else if (secLower.includes('jodoh')) currentSectionType = 'Menjodohkan';
      else if (secLower.includes('isian')) currentSectionType = 'Isian Singkat';
      else if (secLower.includes('esai') || secLower.includes('uraian')) currentSectionType = 'Esai';
      else if (secLower.includes('pilihan ganda')) currentSectionType = 'Pilihan Ganda';
      bodyWithoutNumber = bodyWithoutNumber.replace(sectionInBlock[0], '').trim();
    }

    // Deteksi Tag Tipe Soal Eksplisit jika ada (contoh: "[Benar/Salah]", "[PGK]", dll)
    let explicitType: QuestionType | null = currentSectionType;
    const typeTagMatch = bodyWithoutNumber.match(/^\[\s*(Pilihan Ganda Kompleks|Pilihan Ganda|PGK|PG|Benar\/Salah|Benar-Salah|B\/S|Menjodohkan|Isian Singkat|Isian|Esai|Uraian)\s*\]\s*/i);
    if (typeTagMatch) {
      const tagLower = typeTagMatch[1].toLowerCase().replace(/[\s\/-]/g, '');
      if (tagLower === 'pilihangandakompleks' || tagLower === 'pgk') explicitType = 'Pilihan Ganda Kompleks';
      else if (tagLower === 'pilihanganda' || tagLower === 'pg') explicitType = 'Pilihan Ganda';
      else if (tagLower === 'benarsalah' || tagLower === 'bs') explicitType = 'Benar/Salah';
      else if (tagLower === 'menjodohkan') explicitType = 'Menjodohkan';
      else if (tagLower === 'isiansingkat' || tagLower === 'isian') explicitType = 'Isian Singkat';
      else if (tagLower === 'esai' || tagLower === 'uraian') explicitType = 'Esai';
      bodyWithoutNumber = bodyWithoutNumber.replace(typeTagMatch[0], '').trim();
    }

    // Ekstrak Kunci Jawaban global jika ada (contoh: "Kunci: A", "Kunci: Benar", "Jawaban: a. S, b. B")
    let detectedKeyText: string | null = null;
    let textToProcess = bodyWithoutNumber;
    const answerKeyRegex = /(?:kunci(?:\s+jawaban)?|jawaban(?:\s*\(b\s*\/\s*s\))?|ans|key)\s*[:=]\s*([^\n\r]+)/i;
    const keyMatch = textToProcess.match(answerKeyRegex);
    if (keyMatch) {
      detectedKeyText = keyMatch[1].trim();
      textToProcess = textToProcess.replace(keyMatch[0], '').trim();
    }

    // =========================================================================
    // KASUS 1: DETEKSI & PARSING KHUSUS TIPE BENAR / SALAH (MULTI & TUNGGAL)
    // =========================================================================
    const isBSCandidate =
      explicitType === 'Benar/Salah' ||
      /\b(benar\s*(?:atau|\/)\s*salah|b\s*\/\s*s)\b/i.test(block) ||
      /\b(?:jawaban\s*\(b\s*\/\s*s\))\b/i.test(block) ||
      /\[\s*[BSbs]\s*\]/.test(block) ||
      (detectedKeyText && (detectedKeyText.toLowerCase().includes('benar') || detectedKeyText.toLowerCase().includes('salah')));

    if (isBSCandidate) {
      // Bersihkan baris header tabel jika ikut tercopy dari Word/PDF: e.g. "Pernyataan Soal Asesmen\tJawaban (B / S)"
      textToProcess = textToProcess
        .replace(/^(?:no\s*)?pernyataan(?:\s+soal)?(?:\s+asesmen)?[\t\s]+jawaban[^\n]*\n?/im, '')
        .trim();

      const lines = textToProcess.split('\n').map(l => l.trim()).filter(Boolean);

      // Regex untuk mendeteksi baris slot jawaban kotak kosong / isi (contoh: "a. [ ]", "b. [S]", "a. [B / S]")
      const answerSlotRegex = /^([a-hA-H]|\d+)[\.\)\]\:\s]*\[\s*([BSbs]?|benar|salah|\s*)\s*\]\s*$/i;
      // Regex untuk mendeteksi baris pernyataan (contoh: "a. Dalam masyarakat...", "1. ", "- ", "* ")
      const statementLineRegex = /^(?:([a-hA-H]|\d+)[\.\)\]\:]\s+|-|\*|\u2022)\s*(.*)/;

      const slotAnswers: Record<string, 'Benar' | 'Salah'> = {};
      const statementItems: Array<{ label: string; text: string }> = [];
      let preamble = '';

      for (const line of lines) {
        // Cek apakah line adalah slot jawaban terpisah dari tabel naskah
        const slotMatch = line.match(answerSlotRegex);
        if (slotMatch) {
          const letter = slotMatch[1].toLowerCase();
          const val = slotMatch[2].trim();
          slotAnswers[letter] = val ? normalizeBSAnswer(val) : 'Benar';
          continue;
        }

        // Abaikan line jika murni label header jawaban
        if (/^(?:jawaban|kunci)\s*[:=]/i.test(line)) {
          continue;
        }

        const stmtMatch = line.match(statementLineRegex);
        if (stmtMatch) {
          let stmtText = stmtMatch[2] ? stmtMatch[2].trim() : line;
          const label = stmtMatch[1] ? stmtMatch[1].toLowerCase() : String.fromCharCode(97 + statementItems.length);

          // Cek jika ada inline answer di akhir kalimat pernyataan: e.g. "... [S]" atau "... (Salah)"
          const inlineAnsMatch = stmtText.match(/[\(\[]\s*([BSbs]|benar|salah)\s*[\)\]]\s*$/i);
          if (inlineAnsMatch) {
            slotAnswers[label] = normalizeBSAnswer(inlineAnsMatch[1]);
            stmtText = stmtText.replace(/[\(\[]\s*([BSbs]|benar|salah)\s*[\)\]]\s*$/i, '').trim();
          }

          // Bersihkan juga jika ada tanda kotak kosong [ ] di akhir baris
          stmtText = stmtText.replace(/\[\s*\]\s*$/, '').trim();

          statementItems.push({
            label,
            text: stmtText
          });
        } else {
          // Jika belum ada statements, ini adalah teks stimulus / pengantar soal
          if (statementItems.length === 0) {
            preamble = preamble ? `${preamble}\n${line}` : line;
          } else {
            // Sambungan baris dari butir pernyataan sebelumnya
            const last = statementItems[statementItems.length - 1];
            last.text += ` ${line}`;
          }
        }
      }

      // SUB-KASUS A: Benar / Salah Majemuk (Multi-Pernyataan / Tabel)
      if (statementItems.length >= 2) {
        // Cek jika opsinya hanya radio dummy "Benar" dan "Salah"
        const isRadioOnly =
          statementItems.length === 2 &&
          statementItems.some(s => s.text.toLowerCase() === 'benar') &&
          statementItems.some(s => s.text.toLowerCase() === 'salah');

        if (!isRadioOnly) {
          const finalOptions: OptionItem[] = statementItems.map(s => ({ text: s.text }));

          let finalAnswers: string[] = [];
          if (detectedKeyText) {
            const letterMatches = Array.from(detectedKeyText.matchAll(/([a-hA-H]|\d+)[\.\:\=\)]\s*([BSbs]|benar|salah)/gi));
            if (letterMatches.length > 0) {
              letterMatches.forEach(lm => {
                const l = lm[1].toLowerCase();
                slotAnswers[l] = normalizeBSAnswer(lm[2]);
              });
            } else if (detectedKeyText.includes(',') || detectedKeyText.includes(';')) {
              const parts = detectedKeyText.split(/[,;]+/).map(p => p.trim());
              finalAnswers = parts.map(normalizeBSAnswer);
            }
          }

          if (finalAnswers.length === 0) {
            finalAnswers = statementItems.map((s, sIdx) => {
              if (slotAnswers[s.label]) return slotAnswers[s.label];
              const letter = String.fromCharCode(97 + sIdx);
              if (slotAnswers[letter]) return slotAnswers[letter];
              return 'Benar';
            });
          }

          results.push({
            id: `q-import-${Date.now()}-${bIdx}-${Math.random().toString(36).substr(2, 4)}`,
            subjectId: targetSubjectId,
            type: 'Benar/Salah',
            questionText: preamble.trim() || 'Tentukan status Benar atau Salah pada setiap pernyataan berikut:',
            options: finalOptions,
            answer: finalAnswers,
            orderIndex: startOrderIndex + results.length,
            createdAt: Date.now()
          });
          continue;
        }
      }

      // SUB-KASUS B: Benar / Salah Tunggal (1 Pernyataan Saja)
      let singleAnswer: 'Benar' | 'Salah' = 'Benar';
      if (detectedKeyText) {
        singleAnswer = normalizeBSAnswer(detectedKeyText);
      } else if (Object.keys(slotAnswers).length > 0) {
        singleAnswer = Object.values(slotAnswers)[0];
      }

      const singleQuestionText =
        preamble.trim() || (statementItems.length === 1 ? statementItems[0].text : textToProcess);

      results.push({
        id: `q-import-${Date.now()}-${bIdx}-${Math.random().toString(36).substr(2, 4)}`,
        subjectId: targetSubjectId,
        type: 'Benar/Salah',
        questionText: singleQuestionText.replace(/\[\s*B\s*\/\s*S\s*\]/gi, '').trim(),
        options: [],
        answer: singleAnswer,
        orderIndex: startOrderIndex + results.length,
        createdAt: Date.now()
      });
      continue;
    }

    // =========================================================================
    // KASUS 2: PILIHAN GANDA (PG) / PILIHAN GANDA KOMPLEKS (PGK)
    // =========================================================================
    const optionRegex = /(?:^|\n)\s*(?:\(?([a-eA-E])\)?[.\:]\s+)([\s\S]*?)(?=(?:\n\s*\(?[a-eA-E]\)?[.\:]\s+)|$)/g;
    const optionMatches = Array.from(textToProcess.matchAll(optionRegex));

    if (optionMatches.length >= 2) {
      const firstOptionIndex = optionMatches[0].index ?? textToProcess.length;
      const questionText = textToProcess.substring(0, firstOptionIndex).trim();

      const options: OptionItem[] = [];
      let detectedOptionAnswer: string | null = null;

      optionMatches.forEach(om => {
        const optLetter = om[1].toUpperCase();
        const optText = om[2].trim().replace(/\n+/g, ' ').trim();
        options.push({ text: optText });

        if (!detectedKeyText && om[0].includes('*')) {
          detectedOptionAnswer = optLetter;
        }
      });

      const effectiveKey = detectedKeyText || detectedOptionAnswer || 'A';

      // Cek jika opsi bertuliskan 'Benar' dan 'Salah'
      const isTrueFalseOptions =
        options.length === 2 &&
        options.some(o => o.text.trim().toLowerCase() === 'benar') &&
        options.some(o => o.text.trim().toLowerCase() === 'salah');

      if (isTrueFalseOptions || explicitType === 'Benar/Salah') {
        const finalAns =
          effectiveKey.toUpperCase() === 'B' || effectiveKey.toLowerCase().includes('salah') ? 'Salah' : 'Benar';

        results.push({
          id: `q-import-${Date.now()}-${bIdx}-${Math.random().toString(36).substr(2, 4)}`,
          subjectId: targetSubjectId,
          type: 'Benar/Salah',
          questionText: questionText || 'Tentukan apakah pernyataan berikut Benar atau Salah',
          options: [],
          answer: finalAns,
          orderIndex: startOrderIndex + results.length,
          createdAt: Date.now()
        });
        continue;
      }

      // Cek apakah tipe Pilihan Ganda Kompleks
      const isMultiChoice =
        explicitType === 'Pilihan Ganda Kompleks' ||
        /[A-E]\s*[,dan&]\s*[A-E]/i.test(effectiveKey);

      if (isMultiChoice) {
        const matchedLetters = effectiveKey.match(/[A-E]/gi);
        const pgkAnswers = matchedLetters ? Array.from(new Set(matchedLetters.map(l => l.toUpperCase()))) : ['A'];

        results.push({
          id: `q-import-${Date.now()}-${bIdx}-${Math.random().toString(36).substr(2, 4)}`,
          subjectId: targetSubjectId,
          type: 'Pilihan Ganda Kompleks',
          questionText: questionText || 'Pilihlah jawaban yang benar (bisa lebih dari satu)',
          options,
          answer: pgkAnswers,
          orderIndex: startOrderIndex + results.length,
          createdAt: Date.now()
        });
        continue;
      }

      // Default: Pilihan Ganda Biasa
      const cleanPgKey = effectiveKey.toUpperCase().match(/[A-E]/)?.[0] || 'A';

      results.push({
        id: `q-import-${Date.now()}-${bIdx}-${Math.random().toString(36).substr(2, 4)}`,
        subjectId: targetSubjectId,
        type: 'Pilihan Ganda',
        questionText: questionText || 'Pertanyaan Pilihan Ganda',
        options,
        answer: cleanPgKey,
        orderIndex: startOrderIndex + results.length,
        createdAt: Date.now()
      });
      continue;
    }

    // =========================================================================
    // KASUS 3: ISIAN SINGKAT / ESAI
    // =========================================================================
    results.push({
      id: `q-import-${Date.now()}-${bIdx}-${Math.random().toString(36).substr(2, 4)}`,
      subjectId: targetSubjectId,
      type: explicitType || 'Esai',
      questionText: textToProcess,
      options: [],
      answer: detectedKeyText || '',
      orderIndex: startOrderIndex + results.length,
      createdAt: Date.now()
    });
  }

  return results;
}
