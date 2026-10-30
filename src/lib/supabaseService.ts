import { supabase } from './supabaseClient';
import { Subject, Question, ExamResult, ScoringRules } from '@/types/cbt';
import { initialSubject, sampleQuestions } from './mockData';

/**
 * Mengambil data mata pelajaran aktif dari Supabase
 */
export async function fetchActiveSubject(): Promise<Subject> {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn('Gagal memuat subject dari Supabase atau belum ada data, menggunakan data lokal:', error?.message);
      return initialSubject;
    }

    return {
      id: data.id,
      title: data.title,
      className: data.class_target,
      durationMinutes: data.duration_minutes,
      violationLimit: data.violation_limit,
      token: data.token,
      isActive: data.is_active,
      scoringRules: data.scoring_rules || initialSubject.scoringRules
    };
  } catch (err) {
    console.error('Error fetchActiveSubject:', err);
    return initialSubject;
  }
}

/**
 * Mengambil daftar soal berdasarkan ID mata pelajaran
 */
export async function fetchQuestionsBySubject(subjectId: string): Promise<Question[]> {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', subjectId)
      .order('order_index', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Gagal memuat soal dari Supabase atau tabel masih kosong, menggunakan sample questions:', error?.message);
      return sampleQuestions;
    }

    return data.map(row => ({
      id: row.id,
      subjectId: row.subject_id,
      type: row.type,
      questionText: row.question_text,
      mediaUrl: row.media_url,
      options: row.options || [],
      answer: row.answer,
      orderIndex: row.order_index
    }));
  } catch (err) {
    console.error('Error fetchQuestionsBySubject:', err);
    return sampleQuestions;
  }
}

/**
 * Menyimpan soal baru ke Supabase
 */
export async function insertQuestion(q: Question): Promise<boolean> {
  try {
    const { error } = await supabase.from('questions').insert({
      subject_id: q.subjectId,
      type: q.type,
      question_text: q.questionText,
      media_url: q.mediaUrl || null,
      options: q.options,
      answer: q.answer,
      order_index: q.orderIndex
    });

    if (error) {
      console.error('Error insertQuestion to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception insertQuestion:', err);
    return false;
  }
}

/**
 * Menghapus soal dari Supabase
 */
export async function removeQuestion(qId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('questions').delete().eq('id', qId);
    if (error) {
      console.error('Error removeQuestion from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception removeQuestion:', err);
    return false;
  }
}

/**
 * Menyimpan hasil ujian siswa ke Supabase
 */
export async function saveExamResult(result: ExamResult): Promise<boolean> {
  try {
    const { error } = await supabase.from('exam_results').insert({
      subject_id: result.subjectId,
      student_name: result.studentName,
      class_name: result.className,
      score: result.score,
      total_earned: result.totalEarned,
      total_max: result.totalMax,
      answers: result.answers,
      violation_count: result.violationCount
    });

    if (error) {
      console.error('Error saveExamResult to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception saveExamResult:', err);
    return false;
  }
}

/**
 * Mengambil daftar hasil ujian siswa dari Supabase
 */
export async function fetchExamResults(subjectId: string): Promise<ExamResult[]> {
  try {
    const { data, error } = await supabase
      .from('exam_results')
      .select('*')
      .eq('subject_id', subjectId)
      .order('submitted_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(r => ({
      id: r.id,
      subjectId: r.subject_id,
      subjectTitle: '',
      studentId: r.id,
      studentName: r.student_name,
      className: r.class_name,
      score: Number(r.score),
      totalEarned: Number(r.total_earned || 0),
      totalMax: Number(r.total_max || 0),
      answers: r.answers || [],
      submittedAt: new Date(r.submitted_at).toLocaleString('id-ID'),
      violationCount: r.violation_count || 0
    }));
  } catch (err) {
    console.error('Exception fetchExamResults:', err);
    return [];
  }
}
