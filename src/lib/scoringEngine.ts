import {
  Question,
  QuestionAnswer,
  ScoringRules,
  StudentAnswerItem,
  QuestionScoreDetail
} from '@/types/cbt';

const cleanStr = (val: unknown): string =>
  val ? String(val).toLowerCase().trim().replace(/\s+/g, ' ') : '';

/**
 * Menghitung skor per butir soal berdasarkan bobot yang ditentukan
 */
export function calculateSingleQuestionScore(
  question: Question,
  userAnswer: QuestionAnswer,
  maxPoints: number
): number {
  if (userAnswer === null || userAnswer === undefined) return 0;
  const correctAnswer = question.answer;
  if (correctAnswer === null || correctAnswer === undefined) return 0;

  try {
    switch (question.type) {
      // 1. Pilihan Ganda Biasa (Mutlak)
      case 'Pilihan Ganda': {
        return cleanStr(userAnswer) === cleanStr(correctAnswer) ? maxPoints : 0;
      }

      // 2. Benar/Salah (Multi-pernyataan proporsional ATAU Tunggal)
      case 'Benar/Salah': {
        let correctArr: string[] | null = null;
        if (Array.isArray(correctAnswer)) {
          correctArr = correctAnswer;
        } else if (typeof correctAnswer === 'object' && correctAnswer !== null) {
          correctArr = Object.values(correctAnswer);
        }

        // A. Banyak Pernyataan (Proporsional)
        if (correctArr && correctArr.length > 0) {
          const totalItems = correctArr.length;
          let correctCount = 0;
          const userArr = Array.isArray(userAnswer)
            ? userAnswer
            : typeof userAnswer === 'object' && userAnswer !== null
            ? Object.values(userAnswer)
            : [];

          correctArr.forEach((kunci, idx) => {
            const uVal = userArr[idx];
            if (uVal && cleanStr(uVal) === cleanStr(kunci)) {
              correctCount++;
            }
          });

          return (correctCount / totalItems) * maxPoints;
        }

        // B. 1 Pernyataan Tunggal (Klasik)
        return cleanStr(userAnswer) === cleanStr(correctAnswer) ? maxPoints : 0;
      }

      // 3. Pilihan Ganda Kompleks (Sistem Bobot Berkurang/Denda Adil)
      case 'Pilihan Ganda Kompleks': {
        const correctArr = Array.isArray(correctAnswer)
          ? correctAnswer.map(cleanStr)
          : [cleanStr(correctAnswer)];

        const userArr = Array.isArray(userAnswer)
          ? userAnswer.map(cleanStr)
          : [cleanStr(userAnswer)];

        if (correctArr.length === 0) return 0;

        const correctSet = new Set(correctArr);
        const pointsPerItem = maxPoints / correctSet.size;
        let currentScore = 0;

        userArr.forEach(ans => {
          if (correctSet.has(ans)) {
            currentScore += pointsPerItem; // Opsi tepat (+ poin)
          } else {
            currentScore -= pointsPerItem; // Opsi salah (- denda)
          }
        });

        // Skor tidak boleh minus dan tidak boleh melebihi bobot maksimal soal
        return Math.max(0, Math.min(currentScore, maxPoints));
      }

      // 4. Menjodohkan (Proporsional jumlah pasangan yang benar)
      case 'Menjodohkan': {
        if (!Array.isArray(userAnswer) || !Array.isArray(question.options)) return 0;
        const pairs = question.options as Array<{ q?: { text: string }; a?: { text: string } }>;
        const validOptions = pairs.filter(p => p && p.q && p.a);
        if (validOptions.length === 0) return 0;

        let matchedPairs = 0;
        userAnswer.forEach((ans: any) => {
          const letter = ans?.questionItem;
          if (letter && typeof letter === 'string') {
            const index = letter.charCodeAt(0) - 65;
            const target = validOptions[index];
            if (target && target.a) {
              if (cleanStr(ans?.answerItem) === cleanStr(target.a.text)) {
                matchedPairs++;
              }
            }
          }
        });

        return (matchedPairs / validOptions.length) * maxPoints;
      }

      // 5. Isian Singkat (Cocok dengan salah satu variasi kunci)
      case 'Isian Singkat': {
        const userText = cleanStr(userAnswer);
        if (Array.isArray(correctAnswer)) {
          const matched = correctAnswer.some(ans => cleanStr(ans) === userText);
          return matched ? maxPoints : 0;
        }
        return cleanStr(correctAnswer) === userText ? maxPoints : 0;
      }

      // 6. Esai (Dinilai manual)
      case 'Esai':
        return 0;

      default:
        return 0;
    }
  } catch (err) {
    console.error('Error calculating score for QID:', question.id, err);
    return 0;
  }
}

/**
 * Evaluasi total nilai ujian lengkap beserta rincian per butir soal
 */
export function evaluateFullExam(
  questions: Question[],
  studentAnswers: StudentAnswerItem[],
  scoringRules: ScoringRules,
  essayScores: Record<string, number> = {}
): {
  totalEarned: number;
  totalMax: number;
  finalScore: number;
  details: QuestionScoreDetail[];
} {
  const answerMap = new Map<string, QuestionAnswer>();
  studentAnswers.forEach(ans => answerMap.set(ans.questionId, ans.answer));

  let totalEarned = 0;
  let totalMax = 0;
  const details: QuestionScoreDetail[] = [];

  questions.forEach(q => {
    const maxPoints = scoringRules[q.type] || 1;
    totalMax += maxPoints;

    let earned = 0;
    const studentAns = answerMap.get(q.id) ?? null;

    if (q.type === 'Esai') {
      earned = Math.min(essayScores[q.id] || 0, maxPoints);
    } else {
      earned = calculateSingleQuestionScore(q, studentAns, maxPoints);
    }

    totalEarned += earned;
    details.push({
      questionId: q.id,
      type: q.type,
      maxPoints,
      earnedPoints: earned,
      studentAnswer: studentAns,
      correctAnswer: q.answer ?? null
    });
  });

  const finalScore = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  return {
    totalEarned: Math.round(totalEarned * 100) / 100,
    totalMax,
    finalScore: Math.round(finalScore * 10) / 10,
    details
  };
}
