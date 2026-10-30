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

export interface Student {
  id: string;
  nisn: string;
  name: string;
  gender: string;
  className: string;
  createdAt?: string;
}

export type TeacherRole = 'admin' | 'guru_mapel' | 'pengawas';

export interface Teacher {
  id: string;
  nip: string;
  name: string;
  email: string;
  subject: string;
  classes: string[];
  role: TeacherRole;
  pin: string;
  avatarColor?: string;
  status?: 'Aktif Mengawas' | 'Standby' | 'Offline';
  lastLogin?: string;
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

export interface ExamNotification {
  id: string;
  subjectId?: string;
  studentName?: string;
  type: 'submission' | 'violation' | 'autolock' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ExamMessage {
  id: string;
  subjectId?: string;
  senderName: string;
  senderRole: 'student' | 'teacher' | 'admin';
  targetType: 'broadcast' | 'proctor' | 'student';
  studentClass?: string;
  questionNumber?: number;
  title?: string;
  body: string;
  status: 'pending' | 'resolved' | 'acknowledged';
  createdAt: string;
}
