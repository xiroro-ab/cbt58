export type QuestionType =
  | 'Pilihan Ganda'
  | 'Pilihan Ganda Kompleks'
  | 'Benar/Salah'
  | 'Menjodohkan'
  | 'Isian Singkat'
  | 'Esai';

export interface OptionItem {
  text: string;
  img?: string;
}

export interface MatchingPair {
  q: OptionItem;
  a: OptionItem;
}

export type QuestionOptions = OptionItem[] | MatchingPair[];

export type QuestionAnswer =
  | string // PG ("A"), Esai, Benar/Salah tunggal ("Benar")
  | string[] // PGK (["A", "C"]), Benar/Salah banyak (["Benar", "Salah"]), Isian Singkat (["jawaban 1", "jawaban 2"])
  | null;

export interface Question {
  id: string;
  subjectId: string;
  type: QuestionType;
  questionText: string;
  mediaUrl?: string;
  options: QuestionOptions;
  answer?: QuestionAnswer; // Jawaban benar (hanya ada di server/guru)
  orderIndex: number;
  createdAt?: number;
}

export type ScoringRules = Partial<Record<QuestionType, number>>;

export interface Subject {
  id: string;
  title: string;
  className: string;
  durationMinutes: number;
  violationLimit: number;
  scoringRules: ScoringRules;
  token: string;
  isActive: boolean;
  scheduleStart?: string;
}

export interface StudentAnswerItem {
  questionId: string;
  answer: QuestionAnswer;
  isDoubtful?: boolean;
}

export interface ExamSession {
  id: string;
  subjectId: string;
  studentId: string;
  studentName: string;
  className: string;
  startTime: number;
  lastHeartbeat: number;
  progressCount: number;
  violationCount: number;
  answers: StudentAnswerItem[];
  status: 'ongoing' | 'completed' | 'blocked';
}

export interface QuestionScoreDetail {
  questionId: string;
  type: QuestionType;
  maxPoints: number;
  earnedPoints: number;
  studentAnswer: QuestionAnswer;
  correctAnswer: QuestionAnswer;
}

export interface ExamResult {
  id: string;
  subjectId: string;
  subjectTitle: string;
  studentId: string;
  studentName: string;
  className: string;
  score: number; // 0 - 100
  totalEarned: number;
  totalMax: number;
  answers: StudentAnswerItem[];
  essayScores?: Record<string, number>;
  submittedAt: string;
  violationCount: number;
  details?: QuestionScoreDetail[];
}
