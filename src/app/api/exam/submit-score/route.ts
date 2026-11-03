import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { evaluateFullExam } from '@/lib/scoringEngine';
import { Question, ExamResult, ScoringRules } from '@/types/cbt';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subjectId,
      studentName,
      className = '',
      answers = [],
      violationCount = 0
    } = body;

    if (!subjectId || !studentName?.trim()) {
      return NextResponse.json(
        { error: 'Data identitas siswa dan ID mapel wajib disertakan.' },
        { status: 400 }
      );
    }

    // 1. Ambil data mata pelajaran resmi & aturan penilaian dari Supabase
    const { data: subData } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();

    const scoringRules: ScoringRules = subData?.scoring_rules || {
      'Pilihan Ganda': 1,
      'Pilihan Ganda Kompleks': 2,
      'Benar/Salah': 1,
      'Menjodohkan': 2,
      'Isian Singkat': 2,
      'Esai': 5
    };

    // 2. Ambil butir soal resmi berserta KUNCI JAWABAN murni dari database (Server-Side Only)
    const { data: qData, error: qError } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', subjectId);

    if (qError || !qData || qData.length === 0) {
      return NextResponse.json(
        { error: 'Soal ujian tidak ditemukan di server.' },
        { status: 404 }
      );
    }

    const officialQuestions: Question[] = qData.map(row => ({
      id: row.id,
      subjectId: row.subject_id,
      type: row.type,
      questionText: row.question_text,
      mediaUrl: row.media_url,
      options: row.options || [],
      answer: row.answer,
      orderIndex: row.order_index
    }));

    // 3. Evaluasi nilai murni di sisi server (Mencegah manipulasi nilai dari DevTools browser siswa)
    const evaluation = evaluateFullExam(officialQuestions, answers, scoringRules);

    const nowIso = new Date().toISOString();
    const nowLocalStr = new Date().toLocaleString('id-ID');

    const resultPayload: ExamResult = {
      id: `res-${Date.now()}`,
      subjectId,
      subjectTitle: subData?.title || '',
      studentId: `std-${Date.now()}`,
      studentName: studentName.trim(),
      className: className || '',
      score: evaluation.finalScore,
      totalEarned: evaluation.totalEarned,
      totalMax: evaluation.totalMax,
      answers,
      submittedAt: nowLocalStr,
      violationCount: violationCount || 0,
      details: evaluation.details
    };

    // 4. Simpan atau perbarui di database Supabase (exam_results)
    const cleanName = studentName.trim().toLowerCase();
    const { data: existing } = await supabase
      .from('exam_results')
      .select('id')
      .eq('subject_id', subjectId)
      .ilike('student_name', cleanName)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('exam_results')
        .update({
          score: evaluation.finalScore,
          total_earned: evaluation.totalEarned,
          total_max: evaluation.totalMax,
          answers,
          submitted_at: nowIso,
          violation_count: violationCount || 0
        })
        .eq('id', existing[0].id);
      resultPayload.id = existing[0].id;
    } else {
      const { data: inserted } = await supabase
        .from('exam_results')
        .insert({
          subject_id: subjectId,
          student_name: studentName.trim(),
          class_name: className || '',
          score: evaluation.finalScore,
          total_earned: evaluation.totalEarned,
          total_max: evaluation.totalMax,
          answers,
          submitted_at: nowIso,
          violation_count: violationCount || 0
        })
        .select('id')
        .single();

      if (inserted?.id) {
        resultPayload.id = inserted.id;
      }
    }

    return NextResponse.json({
      success: true,
      evaluation,
      result: resultPayload
    });
  } catch (err: any) {
    console.error('Server side submit exam error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memproses penilaian ujian di server.' },
      { status: 500 }
    );
  }
}
