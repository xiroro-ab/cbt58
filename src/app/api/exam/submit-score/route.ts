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
      violationCount = 0,
      preserveTimestamp = false,
      essayScores = {}
    } = body;

    if (!subjectId || !studentName?.trim()) {
      return NextResponse.json(
        { error: 'Data identitas siswa dan ID mapel wajib disertakan.' },
        { status: 400 }
      );
    }

    const cleanName = studentName.trim();
    const cleanClass = (className || '').trim();

    // Cek apakah sudah ada baris di exam_results untuk siswa & mapel ini
    let existingQuery = supabase
      .from('exam_results')
      .select('id, answers, submitted_at, violation_count')
      .eq('subject_id', subjectId)
      .ilike('student_name', cleanName);

    if (cleanClass) {
      existingQuery = existingQuery.ilike('class_name', cleanClass);
    }

    let { data: existing } = await existingQuery.order('submitted_at', { ascending: false });
    if ((!existing || existing.length === 0) && cleanClass) {
      const fbExisting = await supabase
        .from('exam_results')
        .select('id, answers, submitted_at, violation_count')
        .eq('subject_id', subjectId)
        .ilike('student_name', cleanName)
        .order('submitted_at', { ascending: false });
      existing = fbExisting.data;
    }

    const hasAnsweredItem = (arr: any) =>
      Array.isArray(arr) && arr.some(a => a && a.answer !== null && a.answer !== '' && !(Array.isArray(a.answer) && a.answer.length === 0));

    let finalAnswers = Array.isArray(answers) ? answers : [];

    // Jika payload jawaban kosong, coba ambil cadangan dari exam_sessions atau exam_results yang sudah ada
    if (!hasAnsweredItem(finalAnswers)) {
      const { data: sessRows } = await supabase
        .from('exam_sessions')
        .select('answers')
        .eq('subject_id', subjectId)
        .ilike('student_name', cleanName)
        .order('last_heartbeat', { ascending: false })
        .limit(3);

      const sessWithAns = sessRows?.find(r => hasAnsweredItem(r.answers));
      if (sessWithAns && Array.isArray(sessWithAns.answers)) {
        finalAnswers = sessWithAns.answers;
      } else if (existing && existing.length > 0 && hasAnsweredItem(existing[0].answers)) {
        finalAnswers = existing[0].answers;
      }
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
    const evaluation = evaluateFullExam(officialQuestions, finalAnswers, scoringRules, essayScores);

    const nowIso = new Date().toISOString();
    const existingRow = existing && existing.length > 0 ? existing[0] : null;
    const effectiveSubmittedIso = (preserveTimestamp && existingRow?.submitted_at) ? existingRow.submitted_at : nowIso;
    const effectiveLocalStr = new Date(effectiveSubmittedIso).toLocaleString('id-ID');
    const effectiveViolation = preserveTimestamp && typeof existingRow?.violation_count === 'number'
      ? existingRow.violation_count
      : Math.max(Number(violationCount) || 0, Number(existingRow?.violation_count) || 0);

    const resultPayload: ExamResult = {
      id: existingRow?.id || `res-${Date.now()}`,
      subjectId,
      subjectTitle: subData?.title || '',
      studentId: existingRow?.id || `std-${Date.now()}`,
      studentName: cleanName,
      className: cleanClass,
      score: evaluation.finalScore,
      totalEarned: evaluation.totalEarned,
      totalMax: evaluation.totalMax,
      answers: finalAnswers,
      submittedAt: effectiveLocalStr,
      violationCount: effectiveViolation,
      details: evaluation.details
    };

    // 4. Simpan atau perbarui di database Supabase (exam_results)
    if (existingRow) {
      await supabase
        .from('exam_results')
        .update({
          score: evaluation.finalScore,
          total_earned: evaluation.totalEarned,
          total_max: evaluation.totalMax,
          answers: finalAnswers,
          ...(preserveTimestamp ? {} : { submitted_at: nowIso }),
          violation_count: effectiveViolation
        })
        .eq('id', existingRow.id);
      if (existing && existing.length > 1) {
        const dupIds = existing.slice(1).map((r: any) => r.id);
        await supabase.from('exam_results').delete().in('id', dupIds);
      }
      resultPayload.id = existingRow.id;
    } else {
      const { data: inserted } = await supabase
        .from('exam_results')
        .insert({
          subject_id: subjectId,
          student_name: cleanName,
          class_name: cleanClass,
          score: evaluation.finalScore,
          total_earned: evaluation.totalEarned,
          total_max: evaluation.totalMax,
          answers: finalAnswers,
          submitted_at: nowIso,
          violation_count: effectiveViolation
        })
        .select('id')
        .single();

      if (inserted?.id) {
        resultPayload.id = inserted.id;
        resultPayload.studentId = inserted.id;
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
