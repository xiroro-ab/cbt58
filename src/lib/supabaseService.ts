import { supabase } from './supabaseClient';
import { Subject, Question, ExamResult, ScoringRules, ExamNotification, ExamMessage, Student, Teacher } from '@/types/cbt';
import { initialSubject, sampleSubjects, sampleQuestions } from './mockData';
import { initialStudents } from './rosterStudents';
import { initialTeachers } from './rosterTeachers';
import { notifyResultChanged, subscribeToResultChanges, ResultChangePayload } from './liveMonitoringService';

/**
 * Mengambil seluruh daftar mata pelajaran dari Supabase (fallback ke sampleSubjects)
 */
export async function fetchAllSubjects(): Promise<Subject[]> {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('title', { ascending: true });

    if (error) {
      console.warn('Catatan fetchAllSubjects Supabase:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(d => ({
      id: d.id,
      title: d.title,
      className: d.class_target,
      durationMinutes: d.duration_minutes,
      violationLimit: d.violation_limit,
      token: d.token,
      isActive: d.is_active,
      scoringRules: d.scoring_rules || initialSubject.scoringRules
    }));
  } catch (err) {
    console.error('Error fetchAllSubjects:', err);
    return [];
  }
}

/**
 * Mencari mata pelajaran yang cocok dari Supabase berdasarkan ID, judul, atau kata kunci mapel guru.
 * Menghindari pembuatan ID buatan (sub-...) yang menyebabkan data hilang atau berkedip.
 */
export function findMatchingSubject(subjectsList: Subject[], targetName: string): Subject | undefined {
  if (!subjectsList || subjectsList.length === 0) return undefined;
  if (!targetName) return subjectsList.find(s => s.isActive) || subjectsList[0];

  const cleanTarget = targetName.toLowerCase().trim();

  // 1. Cocok ID eksak
  const exactId = subjectsList.find(s => s.id === targetName);
  if (exactId) return exactId;

  // 2. Cocok judul eksak
  const exactTitle = subjectsList.find(s => s.title.toLowerCase().trim() === cleanTarget);
  if (exactTitle) return exactTitle;

  // 3. Substring dua arah (misal "Informatika" di dalam "ASAS GANJIL INFORMATIKA KELAS 8")
  const substringMatch = subjectsList.find(
    s => s.title.toLowerCase().includes(cleanTarget) || cleanTarget.includes(s.title.toLowerCase())
  );
  if (substringMatch) return substringMatch;

  // 4. Pencocokan kata kunci signifikan (misal "Informatika & TIK" cocok dengan "ASAS GANJIL INFORMATIKA KELAS 8")
  const stopWords = new Set(['&', 'dan', 'ilmu', 'pengetahuan', 'alam', 'sosial', 'asesmen', 'sumatif', 'ujian', 'kelas', 'smp', 'smpn', '58']);
  const targetWords = cleanTarget
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  for (const sub of subjectsList) {
    const subWords = sub.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    const hasCommon = targetWords.some(tw => subWords.some(sw => sw.includes(tw) || tw.includes(sw)));
    if (hasCommon) return sub;
  }

  // 5. Jika hanya ada 1 mapel di database sekolah, gunakan mapel riil tersebut
  if (subjectsList.length === 1) {
    return subjectsList[0];
  }

  // 6. Fallback ke mapel aktif atau mapel pertama yang ada di Supabase
  return subjectsList.find(s => s.isActive) || subjectsList[0];
}

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
 * Mengambil daftar soal berdasarkan ID mata pelajaran (Real Data dengan fail-safe localStorage)
 */
export async function fetchQuestionsBySubject(subjectId: string): Promise<Question[]> {
  // 1. Fast-Path (Stale-While-Revalidate): Kembalikan cache lokal seketika jika ada agar login siswa instan
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`cbt_questions_${subjectId}`);
      if (stored) {
        const localQuestions = JSON.parse(stored);
        if (Array.isArray(localQuestions) && localQuestions.length > 0) {
          // Sinkronisasi pembaruan dari Supabase di latar belakang tanpa menunda UI
          (async () => {
            try {
              const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('subject_id', subjectId)
                .order('order_index', { ascending: true });

              if (!error && data && data.length > 0) {
                const parsed: Question[] = data.map(row => ({
                  id: row.id,
                  subjectId: row.subject_id,
                  type: row.type,
                  questionText: row.question_text,
                  mediaUrl: row.media_url,
                  options: row.options || [],
                  answer: row.answer,
                  orderIndex: row.order_index
                }));
                try {
                  localStorage.setItem(`cbt_questions_${subjectId}`, JSON.stringify(parsed));
                } catch {}
              }
            } catch {}
          })();

          return localQuestions;
        }
      }
    } catch {}
  }

  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('subject_id', subjectId)
      .order('order_index', { ascending: true });

    if (!error && data && data.length > 0) {
      const parsed: Question[] = data.map(row => ({
        id: row.id,
        subjectId: row.subject_id,
        type: row.type,
        questionText: row.question_text,
        mediaUrl: row.media_url,
        options: row.options || [],
        answer: row.answer,
        orderIndex: row.order_index
      }));
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`cbt_questions_${subjectId}`, JSON.stringify(parsed));
        } catch {}
      }
      return parsed;
    }

    // Jika Supabase belum memiliki soal untuk mapel ini atau sedang terhalang RLS, cek penyimpanan lokal
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`cbt_questions_${subjectId}`);
        if (stored) {
          const localQuestions = JSON.parse(stored);
          if (Array.isArray(localQuestions) && localQuestions.length > 0) {
            return localQuestions;
          }
        }
      } catch {}
    }

    // Mapel baru yang belum memiliki soal murni mengembalikan array kosong [] (Real Data)
    return [];
  } catch (err) {
    console.error('Error fetchQuestionsBySubject:', err);
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`cbt_questions_${subjectId}`);
        if (stored) {
          const localQuestions = JSON.parse(stored);
          if (Array.isArray(localQuestions)) return localQuestions;
        }
      } catch {}
    }
    return [];
  }
}

/**
 * Menyimpan soal baru ke Supabase & fail-safe localStorage
 */
export async function insertQuestion(q: Question): Promise<boolean> {
  // Simpan segera ke localStorage agar soal yang baru dibuat guru tidak pernah hilang saat refresh
  if (typeof window !== 'undefined' && q.subjectId) {
    try {
      const stored = localStorage.getItem(`cbt_questions_${q.subjectId}`);
      const list: Question[] = stored ? JSON.parse(stored) : [];
      const updated = [...list.filter(item => item.id !== q.id), q];
      localStorage.setItem(`cbt_questions_${q.subjectId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menyimpan backup soal ke localStorage:', e);
    }
  }

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
      console.warn('Catatan insertQuestion ke Supabase (menggunakan backup lokal):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception insertQuestion:', err);
    return false;
  }
}

/**
 * Memperbarui butir soal yang sudah ada di Supabase & fail-safe localStorage
 */
export async function updateQuestion(q: Question): Promise<boolean> {
  if (typeof window !== 'undefined' && q.subjectId) {
    try {
      const stored = localStorage.getItem(`cbt_questions_${q.subjectId}`);
      const list: Question[] = stored ? JSON.parse(stored) : [];
      const updated = list.map(item => item.id === q.id ? q : item);
      localStorage.setItem(`cbt_questions_${q.subjectId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal update backup soal di localStorage:', e);
    }
  }

  try {
    const { error } = await supabase.from('questions').update({
      type: q.type,
      question_text: q.questionText,
      media_url: q.mediaUrl || null,
      options: q.options,
      answer: q.answer,
      order_index: q.orderIndex
    }).eq('id', q.id);

    if (error) {
      console.warn('Catatan updateQuestion ke Supabase (menggunakan backup lokal):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updateQuestion:', err);
    return false;
  }
}

/**
 * Menghapus soal dari Supabase & fail-safe localStorage
 */
export async function removeQuestion(qId: string, subjectId?: string): Promise<boolean> {
  if (typeof window !== 'undefined' && subjectId) {
    try {
      const stored = localStorage.getItem(`cbt_questions_${subjectId}`);
      if (stored) {
        const list: Question[] = JSON.parse(stored);
        localStorage.setItem(`cbt_questions_${subjectId}`, JSON.stringify(list.filter(q => q.id !== qId)));
      }
    } catch {}
  }

  try {
    const { error } = await supabase.from('questions').delete().eq('id', qId);
    if (error) {
      console.warn('Error removeQuestion from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception removeQuestion:', err);
    return false;
  }
}

/**
 * Menyimpan hasil ujian siswa ke Supabase dan localStorage (delegasi ke saveOrUpdateExamResult untuk mencegah duplikasi)
 */
export async function saveExamResult(result: ExamResult): Promise<boolean> {
  return saveOrUpdateExamResult(result);
}

/**
 * Menyimpan hasil baru jika belum ada, atau mengupdate jika sudah ada di database
 */
export async function saveOrUpdateExamResult(result: ExamResult): Promise<boolean> {
  const cleanName = result.studentName.toLowerCase().trim();

  // Simpan ke localStorage terlebih dahulu sebagai fail-safe instan
  if (typeof window !== 'undefined' && result.subjectId) {
    try {
      localStorage.setItem(`cbt_submitted_${result.subjectId}_${cleanName}`, JSON.stringify({
        score: result.score,
        submittedAt: result.submittedAt || new Date().toLocaleString('id-ID')
      }));

      const stored = localStorage.getItem(`cbt_results_${result.subjectId}`);
      const list: ExamResult[] = stored ? JSON.parse(stored) : [];
      const updated = [
        result,
        ...list.filter(
          r => !(r.id === result.id || (r.studentName.toLowerCase().trim() === cleanName && r.subjectId === result.subjectId))
        )
      ];
      localStorage.setItem(`cbt_results_${result.subjectId}`, JSON.stringify(updated));
    } catch {}
  }

  try {
    let existingId: string | null = null;
    if (!result.id.startsWith('res-')) {
      const { data: byId } = await supabase.from('exam_results').select('id').eq('id', result.id).limit(1);
      if (byId && byId.length > 0) existingId = byId[0].id;
    }

    if (!existingId) {
      const { data: byName } = await supabase
        .from('exam_results')
        .select('id')
        .eq('subject_id', result.subjectId)
        .ilike('student_name', result.studentName.trim())
        .order('submitted_at', { ascending: false });
      if (byName && byName.length > 0) {
        existingId = byName[0].id;
        // Jika sebelumnya sempat ada baris ganda, bersihkan baris kedua dst secara otomatis
        if (byName.length > 1) {
          const duplicateIds = byName.slice(1).map(b => b.id);
          await supabase.from('exam_results').delete().in('id', duplicateIds);
        }
      }
    }

    if (existingId) {
      const { error } = await supabase.from('exam_results').update({
        score: result.score,
        total_earned: result.totalEarned,
        total_max: result.totalMax,
        answers: result.answers,
        violation_count: result.violationCount
      }).eq('id', existingId);
      if (!error) {
        notifyResultChanged({ action: 'UPDATE', subjectId: result.subjectId, result: { ...result, id: existingId } });
      }
      return !error;
    } else {
      const { data: insertedData, error } = await supabase.from('exam_results').insert({
        subject_id: result.subjectId,
        student_name: result.studentName,
        class_name: result.className,
        score: result.score,
        total_earned: result.totalEarned,
        total_max: result.totalMax,
        answers: result.answers,
        violation_count: result.violationCount
      }).select().single();
      if (!error) {
        notifyResultChanged({
          action: 'INSERT',
          subjectId: result.subjectId,
          result: insertedData ? { ...result, id: insertedData.id } : result
        });
      }
      return !error;
    }
  } catch (err) {
    console.error('Exception saveOrUpdateExamResult:', err);
    return false;
  }
}

/**
 * Mengecek apakah siswa sudah pernah mengumpulkan ujian tertentu (Anti Re-Login Mandiri & Realtime)
 * Memeriksa fail-safe localStorage perangkat dan query langsung ke Supabase Cloud
 */
export async function checkStudentExamSubmission(
  subjectId: string,
  studentName: string
): Promise<{ isSubmitted: boolean; score?: number; submittedAt?: string }> {
  if (!subjectId || !studentName) {
    return { isSubmitted: false };
  }

  const cleanName = studentName.toLowerCase().trim();

  // 1. PRIORITAS UTAMA: Periksa database Supabase Cloud (Single Source of Truth)
  try {
    const { data, error } = await supabase
      .from('exam_results')
      .select('id, score, submitted_at, student_name')
      .eq('subject_id', subjectId)
      .ilike('student_name', studentName.trim())
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (!error) {
      if (data && data.length > 0) {
        // Terbukti di database cloud siswa memang sudah mengumpulkan ujian
        const item = data[0];
        const submittedAtFormatted = item.submitted_at
          ? new Date(item.submitted_at).toLocaleString('id-ID')
          : 'Sesi Sebelumnya';

        // Perbarui flag di memori perangkat
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`cbt_submitted_${subjectId}_${cleanName}`, JSON.stringify({
              score: Number(item.score),
              submittedAt: submittedAtFormatted
            }));
          } catch {}
        }

        return {
          isSubmitted: true,
          score: Number(item.score),
          submittedAt: submittedAtFormatted
        };
      } else {
        // Di database Supabase TIDAK ADA hasil ujian final untuk siswa ini (belum mengumpulkan atau baru di-reset oleh guru)
        // HANYA bersihkan flag submitted lokal (jika pernah ada submit usang).
        // JANGAN PERNAH menghapus cbt_exam_state atau cbt_answers karena siswa mungkin sedang melanjutkan ujian aktif yang belum selesai!
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`cbt_submitted_${subjectId}_${cleanName}`);
          } catch {}
        }
        return { isSubmitted: false };
      }
    }
  } catch (err) {
    console.warn('Gagal cek status submit siswa ke Supabase, fallback ke local storage:', err);
  }

  // 2. Fallback HANYA jika Supabase offline / tidak dapat dihubungi
  if (typeof window !== 'undefined') {
    try {
      const flag = localStorage.getItem(`cbt_submitted_${subjectId}_${cleanName}`);
      if (flag) {
        const parsed = JSON.parse(flag);
        return {
          isSubmitted: true,
          score: parsed.score,
          submittedAt: parsed.submittedAt
        };
      }
    } catch {}
  }

  return { isSubmitted: false };
}

/**
 * Memperbarui nilai dan koreksi uraian hasil ujian siswa di Supabase & localStorage
 */
export async function updateExamResult(result: ExamResult): Promise<boolean> {
  return saveOrUpdateExamResult(result);
}

/**
 * Menghapus/mereset hasil ujian siswa agar siswa dapat login dan mengerjakan ulang
 */
export async function deleteExamResult(resultId: string, subjectId?: string, studentName?: string): Promise<boolean> {
  if (typeof window !== 'undefined' && subjectId) {
    try {
      const stored = localStorage.getItem(`cbt_results_${subjectId}`);
      if (stored) {
        const list: ExamResult[] = JSON.parse(stored);
        localStorage.setItem(
          `cbt_results_${subjectId}`,
          JSON.stringify(
            list.filter(r => {
              if (resultId && r.id === resultId) return false;
              if (studentName && r.studentName.toLowerCase().trim() === studentName.toLowerCase().trim()) return false;
              return true;
            })
          )
        );
      }
      if (studentName) {
        const cleanName = studentName.toLowerCase().trim();
        localStorage.removeItem(`cbt_answers_${studentName}_${subjectId}`);
        localStorage.removeItem(`cbt_blocked_${subjectId}_${cleanName}`);
        localStorage.removeItem(`cbt_exam_state_${subjectId}_${cleanName}`);
        localStorage.removeItem(`cbt_exam_questions_${subjectId}_${cleanName}`);
        localStorage.removeItem(`cbt_submitted_${subjectId}_${cleanName}`);
      }
    } catch {}
  }

  try {
    if (resultId && !resultId.startsWith('res-')) {
      await supabase.from('exam_results').delete().eq('id', resultId);
    }
    if (subjectId && studentName) {
      await supabase
        .from('exam_results')
        .delete()
        .eq('subject_id', subjectId)
        .ilike('student_name', studentName.trim());

      // Otomatis bersihkan notifikasi pelanggaran / autolock jika guru mereset hasil ujian siswa
      await clearStudentAutolockInSupabase(subjectId, studentName);
    }
    notifyResultChanged({
      action: 'DELETE',
      subjectId: subjectId || '',
      resultId,
      studentName
    });
    return true;
  } catch (err) {
    console.error('Exception deleteExamResult:', err);
    return false;
  }
}

/**
 * Memperbarui data mata pelajaran di Supabase
 */
export async function updateSubjectInSupabase(sub: Subject): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subjects')
      .update({
        title: sub.title,
        class_target: sub.className,
        duration_minutes: sub.durationMinutes,
        violation_limit: sub.violationLimit,
        token: sub.token,
        is_active: sub.isActive,
        scoring_rules: sub.scoringRules
      })
      .eq('id', sub.id);

    if (error) {
      console.warn('Gagal update subject di Supabase, fallback ke lokal:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updateSubjectInSupabase:', err);
    return false;
  }
}

/**
 * Memeriksa status aktif ujian secara langsung dan realtime dari database Supabase
 */
export async function checkSubjectIsActive(subjectId: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('is_active')
      .eq('id', subjectId)
      .maybeSingle();

    if (error || !data) return null;
    return Boolean(data.is_active);
  } catch {
    return null;
  }
}

/**
 * Menambahkan mata pelajaran / paket jadwal ujian baru ke Supabase
 */
export async function insertSubject(sub: Subject): Promise<Subject | null> {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sub.id);
    const payload: any = {
      title: sub.title,
      class_target: sub.className,
      duration_minutes: sub.durationMinutes,
      violation_limit: sub.violationLimit,
      token: sub.token,
      is_active: sub.isActive,
      scoring_rules: sub.scoringRules
    };
    if (isUUID) {
      payload.id = sub.id;
    }

    const { data, error } = await supabase.from('subjects').insert(payload).select().single();

    if (error) {
      console.warn('Gagal insert subject ke Supabase:', error.message);
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      className: data.class_target,
      durationMinutes: data.duration_minutes,
      violationLimit: data.violation_limit,
      token: data.token,
      isActive: data.is_active,
      scoringRules: data.scoring_rules || sub.scoringRules
    };
  } catch (err) {
    console.error('Exception insertSubject:', err);
    return null;
  }
}

/**
 * Menghapus mata pelajaran / paket jadwal ujian dari Supabase
 */
export async function deleteSubject(subId: string): Promise<boolean> {
  try {
    // Bersihkan data relasi terkait subject terlebih dahulu
    await supabase.from('questions').delete().eq('subject_id', subId);
    await supabase.from('exam_results').delete().eq('subject_id', subId);
    await supabase.from('exam_notifications').delete().eq('subject_id', subId);
    await supabase.from('exam_messages').delete().eq('subject_id', subId);

    const { error } = await supabase.from('subjects').delete().eq('id', subId);
    if (error) {
      console.warn('Gagal delete subject dari Supabase, fallback ke lokal:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception deleteSubject:', err);
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

/**
 * Mengupdate soal di Supabase
 */
export async function updateQuestionInSupabase(q: Question): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('questions')
      .update({
        type: q.type,
        question_text: q.questionText,
        media_url: q.mediaUrl || null,
        options: q.options,
        answer: q.answer,
        order_index: q.orderIndex
      })
      .eq('id', q.id);

    if (error) {
      console.error('Error updateQuestionInSupabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updateQuestionInSupabase:', err);
    return false;
  }
}

/**
 * Berlangganan (Realtime Subscription) hasil ujian dari Supabase & Realtime Broadcast
 * Mendukung event INSERT, UPDATE, dan DELETE secara instan tanpa perlu refresh manual.
 */
export function subscribeToExamResults(
  subjectId: string,
  onResultChange: (payload: ResultChangePayload) => void
) {
  // 1. Dengarkan Supabase Realtime Broadcast (sub-detik lintas perangkat guru & siswa)
  const unsubBroadcast = subscribeToResultChanges(changePayload => {
    if (!subjectId || !changePayload.subjectId || changePayload.subjectId === subjectId) {
      onResultChange(changePayload);
    }
  });

  // 2. Dengarkan Postgres Changes (Database replication fallback)
  let channel: any = null;
  try {
    const channelName = `realtime_exam_results_${subjectId || 'all'}_${Date.now()}`;
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_results',
          ...(subjectId ? { filter: `subject_id=eq.${subjectId}` } : {})
        },
        payload => {
          const eventType = payload.eventType;
          if (eventType === 'DELETE') {
            onResultChange({
              action: 'DELETE',
              subjectId,
              resultId: payload.old?.id
            });
            return;
          }
          const r = payload.new;
          if (r) {
            const mappedResult: ExamResult = {
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
              submittedAt: new Date(r.submitted_at || Date.now()).toLocaleString('id-ID'),
              violationCount: r.violation_count || 0
            };
            onResultChange({
              action: eventType === 'UPDATE' ? 'UPDATE' : 'INSERT',
              subjectId: r.subject_id,
              result: mappedResult
            });
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Realtime postgres_changes subscription fallback to broadcast:', err);
  }

  return () => {
    unsubBroadcast();
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }
  };
}

/**
 * Memeriksa apakah siswa sedang terkunci/diblokir oleh sistem anti-cheat (di database Supabase & memori sesi)
 */
export async function checkStudentLockStatus(
  subjectId: string,
  studentName: string,
  violationLimit: number = 3
): Promise<{ isBlocked: boolean; violationCount: number; reason?: string }> {
  const cleanName = studentName.toLowerCase().trim();

  // 1. PRIORITAS UTAMA: Periksa database Supabase Cloud (Single Source of Truth)
  try {
    // A. Satu query gabungan untuk seluruh notifikasi pelanggaran & autolock siswa ini (Lebih Cepat & Efisien)
    const { data: notifications, error } = await supabase
      .from('exam_notifications')
      .select('id, type, message, created_at')
      .eq('subject_id', subjectId)
      .ilike('student_name', studentName.trim())
      .in('type', ['violation', 'autolock'])
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (!error) {
      const notifList = notifications || [];
      const autolocks = notifList.filter(n => n.type === 'autolock');
      const cloudViolationCount = notifList.length;
      const isCloudBlocked = (autolocks.length > 0) || (cloudViolationCount >= violationLimit);

      // Baca rekaman lokal perangkat siswa
      let localViolationCount = 0;
      let localIsBlocked = false;
      let localReason = '';

      if (typeof window !== 'undefined') {
        try {
          const blockedFlag = localStorage.getItem(`cbt_blocked_${subjectId}_${cleanName}`);
          if (blockedFlag) {
            const parsed = JSON.parse(blockedFlag);
            if (parsed.isBlocked) {
              localIsBlocked = true;
              localViolationCount = parsed.violationCount || violationLimit;
            }
          }
          const stateKey = `cbt_exam_state_${subjectId}_${cleanName}`;
          const saved = localStorage.getItem(stateKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            localViolationCount = Math.max(localViolationCount, parsed.violationCount || 0);
            if (parsed.isLocked || localViolationCount >= violationLimit) {
              localIsBlocked = true;
              localReason = parsed.lastViolationReason || '';
            }
          }
        } catch {}
      }

      // Gunakan hitungan pelanggaran tertinggi agar pelanggaran siswa tidak hilang jika browser ditutup/kill task
      const finalViolationCount = Math.max(cloudViolationCount, localViolationCount);

      if (isCloudBlocked || localIsBlocked || finalViolationCount >= violationLimit) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`cbt_blocked_${subjectId}_${cleanName}`, JSON.stringify({
              isBlocked: true,
              violationCount: finalViolationCount,
              lockedAt: Date.now()
            }));
            const stateKey = `cbt_exam_state_${subjectId}_${cleanName}`;
            const saved = localStorage.getItem(stateKey);
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.isLocked = true;
              parsed.violationCount = finalViolationCount;
              localStorage.setItem(stateKey, JSON.stringify(parsed));
            }
          } catch {}
        }
        return {
          isBlocked: true,
          violationCount: finalViolationCount,
          reason: autolocks?.[0]?.message || localReason || `Terkunci karena telah melakukan ${finalViolationCount} kali pelanggaran anti-cheat.`
        };
      } else {
        // Siswa tidak terblokir, tapi JANGAN PERNAH mereset violationCount ke 0 jika siswa memang sudah punya pelanggaran!
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem(`cbt_blocked_${subjectId}_${cleanName}`);
            const stateKey = `cbt_exam_state_${subjectId}_${cleanName}`;
            const saved = localStorage.getItem(stateKey);
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.isLocked = false;
              parsed.violationCount = finalViolationCount;
              localStorage.setItem(stateKey, JSON.stringify(parsed));
            }
          } catch {}
        }
        return {
          isBlocked: false,
          violationCount: finalViolationCount
        };
      }
    }
  } catch (err) {
    console.warn('Gagal cek status lock siswa di Supabase, fallback ke local storage:', err);
  }

  // 2. Fallback hanya jika jaringan Supabase benar-benar tidak terjangkau (Offline)
  if (typeof window !== 'undefined') {
    try {
      const blockedFlag = localStorage.getItem(`cbt_blocked_${subjectId}_${cleanName}`);
      if (blockedFlag) {
        const parsed = JSON.parse(blockedFlag);
        if (parsed.isBlocked) {
          return {
            isBlocked: true,
            violationCount: parsed.violationCount || violationLimit,
            reason: 'Terkunci karena melampaui batas pelanggaran di perangkat ini.'
          };
        }
      }

      const examState = localStorage.getItem(`cbt_exam_state_${subjectId}_${cleanName}`);
      if (examState) {
        const parsed = JSON.parse(examState);
        if (parsed.isLocked || (parsed.violationCount && parsed.violationCount >= violationLimit)) {
          return {
            isBlocked: true,
            violationCount: parsed.violationCount,
            reason: parsed.lastViolationReason || 'Terkunci karena pelanggaran anti-cheat.'
          };
        }
      }
    } catch {}
  }

  return { isBlocked: false, violationCount: 0 };
}

/**
 * Membersihkan notifikasi autolock siswa di Supabase saat guru membuka kunci atau mereset ujian
 */
export async function clearStudentAutolockInSupabase(subjectId: string, studentName: string): Promise<boolean> {
  try {
    const cleanName = studentName.toLowerCase().trim();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cbt_blocked_${subjectId}_${cleanName}`);
        const stateKey = `cbt_exam_state_${subjectId}_${cleanName}`;
        const saved = localStorage.getItem(stateKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.violationCount = 0;
          parsed.isLocked = false;
          localStorage.setItem(stateKey, JSON.stringify(parsed));
        }
      } catch {}
    }

    // 1. Tandai semua notifikasi autolock dan violation siswa ini sebagai sudah dibaca
    await supabase
      .from('exam_notifications')
      .update({ is_read: true })
      .eq('subject_id', subjectId)
      .ilike('student_name', studentName.trim());

    // 2. Hapus entri notifikasi autolock agar bersih dari query lock
    await supabase
      .from('exam_notifications')
      .delete()
      .eq('subject_id', subjectId)
      .ilike('student_name', studentName.trim())
      .eq('type', 'autolock');

    return true;
  } catch (err) {
    console.warn('Exception clearStudentAutolockInSupabase:', err);
    return false;
  }
}

/**
 * Mengambil daftar notifikasi sistem dari Supabase
 */
export async function fetchNotifications(subjectId?: string): Promise<ExamNotification[]> {
  try {
    let query = supabase.from('exam_notifications').select('*').order('created_at', { ascending: false }).limit(30);
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    const { data, error } = await query;
    if (error || !data) {
      return [];
    }
    return data.map(n => ({
      id: n.id,
      subjectId: n.subject_id,
      studentName: n.student_name,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.is_read,
      createdAt: new Date(n.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }));
  } catch (err) {
    console.warn('Error fetchNotifications from Supabase:', err);
    return [];
  }
}

/**
 * Menyimpan notifikasi baru ke Supabase
 */
export async function insertNotification(notif: Partial<ExamNotification>): Promise<boolean> {
  try {
    const { error } = await supabase.from('exam_notifications').insert({
      subject_id: notif.subjectId || null,
      student_name: notif.studentName || null,
      type: notif.type || 'system',
      title: notif.title || 'Notifikasi',
      message: notif.message || '',
      is_read: false
    });
    if (error) {
      console.warn('Gagal insertNotification ke Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception insertNotification:', err);
    return false;
  }
}

/**
 * Menandai seluruh notifikasi telah dibaca di Supabase
 */
export async function markAllNotificationsAsRead(subjectId?: string): Promise<boolean> {
  try {
    let query = supabase.from('exam_notifications').update({ is_read: true });
    if (subjectId) {
      // Update notifikasi mapel ini atau notifikasi umum sistem
      query = query.or(`subject_id.eq.${subjectId},subject_id.is.null`);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { error } = await query;
    if (error) {
      console.warn('Gagal markAllNotificationsAsRead:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception markAllNotificationsAsRead:', err);
    return false;
  }
}

/**
 * Menandai satu notifikasi telah dibaca di Supabase
 */
export async function markNotificationAsRead(notifId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('exam_notifications')
      .update({ is_read: true })
      .eq('id', notifId);
    if (error) {
      console.warn('Gagal markNotificationAsRead:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception markNotificationAsRead:', err);
    return false;
  }
}

/**
 * Berlangganan (Realtime Subscription) notifikasi baru dari Supabase
 */
export function subscribeToNotifications(
  onNewNotif: (notif: ExamNotification) => void
) {
  try {
    const channel = supabase
      .channel('realtime_exam_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exam_notifications'
        },
        payload => {
          const n = payload.new;
          if (n) {
            onNewNotif({
              id: n.id,
              subjectId: n.subject_id,
              studentName: n.student_name,
              type: n.type,
              title: n.title,
              message: n.message,
              isRead: n.is_read,
              createdAt: new Date(n.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime notifications subscription not available:', err);
    return () => {};
  }
}

/**
 * Mengambil daftar pesan kendala & broadcast dari Supabase
 */
export async function fetchMessages(subjectId?: string): Promise<ExamMessage[]> {
  try {
    let query = supabase.from('exam_messages').select('*').order('created_at', { ascending: false }).limit(30);
    if (subjectId) {
      query = query.or(`subject_id.eq.${subjectId},target_type.eq.broadcast`);
    }
    const { data, error } = await query;
    if (error || !data) {
      return [];
    }
    return data.map(m => ({
      id: m.id,
      subjectId: m.subject_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      targetType: m.target_type,
      studentClass: m.student_class,
      questionNumber: m.question_number,
      title: m.title,
      body: m.body,
      status: m.status,
      createdAt: new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      createdAtTime: m.created_at ? new Date(m.created_at).getTime() : 0
    }));
  } catch (err) {
    console.warn('Error fetchMessages from Supabase:', err);
    return [];
  }
}

/**
 * Mengirim pesan baru (Lapor Kendala Siswa atau Broadcast Pengawas)
 */
export async function insertMessage(msg: Partial<ExamMessage>): Promise<boolean> {
  try {
    const { error } = await supabase.from('exam_messages').insert({
      subject_id: msg.subjectId || null,
      sender_name: msg.senderName || 'Anonim',
      sender_role: msg.senderRole || 'student',
      target_type: msg.targetType || 'proctor',
      student_class: msg.studentClass || null,
      question_number: msg.questionNumber || null,
      title: msg.title || 'Laporan Kendala',
      body: msg.body || '',
      status: msg.status || 'pending'
    });
    if (error) {
      console.warn('Gagal insertMessage ke Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception insertMessage:', err);
    return false;
  }
}

/**
 * Mengubah status pesan (contoh: dari pending menjadi resolved)
 */
export async function updateMessageStatus(
  msgId: string,
  status: 'pending' | 'resolved' | 'acknowledged'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('exam_messages')
      .update({ status })
      .eq('id', msgId);
    if (error) {
      console.warn('Gagal updateMessageStatus:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updateMessageStatus:', err);
    return false;
  }
}

/**
 * Berlangganan (Realtime Subscription) pesan baru dari Supabase
 */
export function subscribeToMessages(
  onNewMsg: (msg: ExamMessage) => void
) {
  try {
    const channel = supabase
      .channel('realtime_exam_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exam_messages'
        },
        payload => {
          const m = payload.new;
          if (m) {
            onNewMsg({
              id: m.id,
              subjectId: m.subject_id,
              senderName: m.sender_name,
              senderRole: m.sender_role,
              targetType: m.target_type,
              studentClass: m.student_class,
              questionNumber: m.question_number,
              title: m.title,
              body: m.body,
              status: m.status,
              createdAt: new Date(m.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime messages subscription not available:', err);
    return () => {};
  }
}

/**
 * Menghapus satu pesan dari Supabase
 */
export async function deleteMessageFromSupabase(msgId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('exam_messages').delete().eq('id', msgId);
    if (error) {
      console.warn('Gagal delete message dari Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception deleteMessageFromSupabase:', err);
    return false;
  }
}

/**
 * Menghapus seluruh pesan dari Supabase
 */
export async function clearAllMessagesFromSupabase(subjectId?: string): Promise<boolean> {
  try {
    let query = supabase.from('exam_messages').delete();
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { error } = await query;
    if (error) {
      console.warn('Gagal clear all messages dari Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception clearAllMessagesFromSupabase:', err);
    return false;
  }
}

/**
 * Menghapus satu notifikasi dari Supabase
 */
export async function deleteNotificationFromSupabase(notifId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('exam_notifications').delete().eq('id', notifId);
    if (error) {
      console.warn('Gagal delete notification dari Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception deleteNotificationFromSupabase:', err);
    return false;
  }
}

/**
 * Menghapus seluruh notifikasi dari Supabase
 */
export async function clearAllNotificationsFromSupabase(subjectId?: string): Promise<boolean> {
  try {
    let query = supabase.from('exam_notifications').delete();
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { error } = await query;
    if (error) {
      console.warn('Gagal clear all notifications dari Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception clearAllNotificationsFromSupabase:', err);
    return false;
  }
}

/**
 * Mengambil daftar seluruh siswa dari Supabase (fallback ke initialStudents 301 siswa)
 */
export async function fetchStudents(): Promise<Student[]> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return initialStudents;
    }

    return data.map(s => ({
      id: s.id,
      nisn: s.nisn,
      name: s.name,
      gender: s.gender || 'Laki-Laki',
      className: s.class_name,
      createdAt: s.created_at
    }));
  } catch (err) {
    console.warn('Error fetchStudents from Supabase, using initialStudents:', err);
    return initialStudents;
  }
}

/**
 * Menyimpan satu siswa baru ke Supabase
 */
export async function insertStudent(s: Student): Promise<boolean> {
  try {
    const { error } = await supabase.from('students').insert({
      nisn: s.nisn,
      name: s.name,
      gender: s.gender,
      class_name: s.className
    });
    if (error) {
      console.warn('Gagal insertStudent ke Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception insertStudent:', err);
    return false;
  }
}

/**
 * Menyimpan banyak siswa sekaligus (Import Excel / CSV) ke Supabase
 */
export async function bulkInsertStudents(studentsList: Student[]): Promise<boolean> {
  try {
    const rows = studentsList.map(s => ({
      nisn: s.nisn,
      name: s.name,
      gender: s.gender,
      class_name: s.className
    }));

    const { error } = await supabase.from('students').upsert(rows, { onConflict: 'nisn' });
    if (error) {
      console.warn('Gagal bulkInsertStudents ke Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception bulkInsertStudents:', err);
    return false;
  }
}

/**
 * Memperbarui data siswa di Supabase
 */
export async function updateStudentInSupabase(s: Student): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('students')
      .update({
        nisn: s.nisn,
        name: s.name,
        gender: s.gender,
        class_name: s.className
      })
      .eq('id', s.id);

    if (error) {
      console.warn('Gagal updateStudentInSupabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updateStudentInSupabase:', err);
    return false;
  }
}

/**
 * Menghapus satu siswa dari Supabase
 */
export async function removeStudentFromSupabase(studentId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error) {
      console.warn('Gagal removeStudentFromSupabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception removeStudentFromSupabase:', err);
    return false;
  }
}

/**
 * Menghapus banyak siswa sekaligus dari Supabase
 */
export async function bulkRemoveStudentsFromSupabase(studentIds: string[]): Promise<boolean> {
  try {
    const { error } = await supabase.from('students').delete().in('id', studentIds);
    if (error) {
      console.warn('Gagal bulkRemoveStudentsFromSupabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception bulkRemoveStudentsFromSupabase:', err);
    return false;
  }
}

/**
 * Mendaftarkan / Menyimpan satu guru baru ke Supabase
 */
export async function insertTeacher(t: Teacher): Promise<boolean> {
  try {
    const { error } = await supabase.from('teachers').insert({
      id: t.id,
      nip: t.nip,
      name: t.name,
      email: t.email,
      subject: t.subject,
      classes: t.classes || [],
      assignments: t.assignments || [],
      role: t.role || 'guru_mapel',
      pin: t.pin || '123456',
      avatar_color: t.avatarColor || 'bg-violet-600',
      status: t.status || 'Aktif Mengawas'
    });

    if (error) {
      console.warn('Gagal insertTeacher ke Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception insertTeacher:', err);
    return false;
  }
}

/**
 * Menggabungkan daftar guru dari Supabase dengan initialTeachers fallback.
 * Akun dari Supabase (termasuk PIN kustom dan mapel terbaru) diutamakan.
 */
export function mergeTeachers(supabaseTeachers: Teacher[], fallbackTeachers: Teacher[]): Teacher[] {
  const result: Teacher[] = [...supabaseTeachers];
  const seenIds = new Set(result.map(t => (t.id || '').toLowerCase().trim()));
  const seenNips = new Set(result.map(t => (t.nip || '').toLowerCase().trim()).filter(Boolean));
  const seenEmails = new Set(result.map(t => (t.email || '').toLowerCase().trim()).filter(Boolean));

  for (const t of fallbackTeachers) {
    const id = (t.id || '').toLowerCase().trim();
    const nip = (t.nip || '').toLowerCase().trim();
    const email = (t.email || '').toLowerCase().trim();

    const idSeen = id && seenIds.has(id);
    const nipSeen = nip && seenNips.has(nip);
    const emailSeen = email && seenEmails.has(email);

    if (!idSeen && !nipSeen && !emailSeen) {
      result.push(t);
      if (id) seenIds.add(id);
      if (nip) seenNips.add(nip);
      if (email) seenEmails.add(email);
    }
  }
  return result;
}

/**
 * Mengambil daftar 30 Guru & Pengawas dari Supabase (fallback ke initialTeachers)
 */
export async function fetchTeachers(): Promise<Teacher[]> {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return initialTeachers;
    }

    const supabaseTeachers: Teacher[] = data.map(t => ({
      id: t.id,
      nip: t.nip,
      name: t.name,
      email: t.email,
      subject: t.subject,
      classes: t.classes || [],
      assignments: t.assignments || [],
      role: t.role || 'guru_mapel',
      pin: t.pin || '123456',
      avatarColor: t.avatar_color || 'bg-violet-600',
      status: t.status || 'Standby',
      lastLogin: t.last_login
    }));

    return mergeTeachers(supabaseTeachers, initialTeachers);
  } catch (err) {
    console.warn('Error fetchTeachers from Supabase, using initialTeachers:', err);
    return initialTeachers;
  }
}

/**
 * Memperbarui status aktif mengawas guru di Supabase
 */
export async function updateTeacherStatusInSupabase(
  teacherId: string,
  status: 'Aktif Mengawas' | 'Standby' | 'Offline'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('teachers')
      .update({ status, last_login: new Date().toISOString() })
      .eq('id', teacherId);
    if (error) {
      console.warn('Gagal updateTeacherStatusInSupabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updateTeacherStatusInSupabase:', err);
    return false;
  }
}

