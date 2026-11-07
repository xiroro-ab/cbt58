import { supabase } from './supabaseClient';
import { Subject, Question, ExamResult, ScoringRules, ExamNotification, ExamMessage, Student, Teacher, TeacherAssignment, SchoolSettings, StudentAnswerItem } from '@/types/cbt';
import { initialSubject, sampleSubjects, sampleQuestions } from './mockData';
import { initialStudents } from './rosterStudents';
import { initialTeachers } from './rosterTeachers';
import {
  notifyResultChanged,
  subscribeToResultChanges,
  ResultChangePayload,
  broadcastTeacherStatus,
  subscribeToTeacherStatus,
  TeacherStatusPayload
} from './liveMonitoringService';
import { LOCK_STATE_TITLE, deleteExamSession } from './examSessionService';

export { subscribeToTeacherStatus };
export type { TeacherStatusPayload };

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
      scoringRules: d.scoring_rules || initialSubject.scoringRules,
      examDate: d.scoring_rules?._examDate || (d.created_at ? d.created_at.split('T')[0] : '')
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
      scoringRules: data.scoring_rules || initialSubject.scoringRules,
      examDate: data.scoring_rules?._examDate || (data.created_at ? data.created_at.split('T')[0] : '')
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

              if (!error && data) {
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
                  if (parsed.length === 0) {
                    localStorage.removeItem(`cbt_questions_${subjectId}`);
                  } else {
                    localStorage.setItem(`cbt_questions_${subjectId}`, JSON.stringify(parsed));
                  }
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

    if (!error && data) {
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
          if (parsed.length === 0) {
            localStorage.removeItem(`cbt_questions_${subjectId}`);
          } else {
            localStorage.setItem(`cbt_questions_${subjectId}`, JSON.stringify(parsed));
          }
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
/**
 * Mengambil seluruh butir soal dari semua mata pelajaran (dengan fallback localStorage lintas mapel)
 */
export async function fetchAllQuestions(): Promise<Question[]> {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('order_index', { ascending: true });

    if (!error && data) {
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
        if (parsed.length === 0) {
          // Bersihkan seluruh cache soal lokal jika database Supabase kosong
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('cbt_questions_')) keysToRemove.push(k);
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        } else {
          const bySubject: Record<string, Question[]> = {};
          parsed.forEach(q => {
            if (q.subjectId) {
              if (!bySubject[q.subjectId]) bySubject[q.subjectId] = [];
              bySubject[q.subjectId].push(q);
            }
          });
          const validKeys = new Set(Object.keys(bySubject).map(sId => 'cbt_questions_' + sId));
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('cbt_questions_') && !validKeys.has(k)) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));

          Object.entries(bySubject).forEach(([sId, qList]) => {
            try {
              localStorage.setItem('cbt_questions_' + sId, JSON.stringify(qList));
            } catch {}
          });
        }
      }

      return parsed;
    }
  } catch (err) {
    console.error('Error fetchAllQuestions:', err);
  }

  // Fallback: Gabungkan semua soal dari localStorage dengan prefix cbt_questions_
  if (typeof window !== 'undefined') {
    try {
      const all: Question[] = [];
      const seenIds = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cbt_questions_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const list = JSON.parse(stored);
            if (Array.isArray(list)) {
              list.forEach((item: Question) => {
                if (item && item.id && !seenIds.has(item.id)) {
                  seenIds.add(item.id);
                  all.push(item);
                }
              });
            }
          }
        }
      }
      if (all.length > 0) return all;
    } catch {}
  }

  return [];
}

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
      options: q.options || [],
      answer: q.answer !== undefined && q.answer !== null ? q.answer : '',
      order_index: q.orderIndex || 1
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
      options: q.options || [],
      answer: q.answer !== undefined && q.answer !== null ? q.answer : '',
      order_index: q.orderIndex || 1
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
      let byNameQuery = supabase
        .from('exam_results')
        .select('id, class_name')
        .eq('subject_id', result.subjectId)
        .ilike('student_name', result.studentName.trim());

      if (result.className && result.className.trim()) {
        byNameQuery = byNameQuery.ilike('class_name', result.className.trim());
      }

      const { data: byName } = await byNameQuery.order('submitted_at', { ascending: false });
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
  studentName: string,
  className?: string
): Promise<{ isSubmitted: boolean; score?: number; totalEarned?: number; totalMax?: number; submittedAt?: string }> {
  if (!subjectId || !studentName) {
    return { isSubmitted: false };
  }

  const cleanName = studentName.toLowerCase().trim();
  const cleanClass = (className || '').toLowerCase().trim();

  // 1. PRIORITAS UTAMA: Periksa database Supabase Cloud (Single Source of Truth)
  try {
    let query = supabase
      .from('exam_results')
      .select('id, score, total_earned, total_max, submitted_at, student_name, class_name')
      .eq('subject_id', subjectId)
      .ilike('student_name', studentName.trim());

    if (cleanClass) {
      query = query.ilike('class_name', cleanClass);
    }

    let { data, error } = await query
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (!error && (!data || data.length === 0) && cleanClass) {
      try {
        const fallbackRes = await supabase
          .from('exam_results')
          .select('id, score, total_earned, total_max, submitted_at, student_name, class_name')
          .eq('subject_id', subjectId)
          .ilike('student_name', studentName.trim())
          .order('submitted_at', { ascending: false })
          .limit(1);
        if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
          data = fallbackRes.data;
        }
      } catch {}
    }

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
            if (cleanClass) {
              localStorage.setItem(`cbt_submitted_${subjectId}_${cleanClass}_${cleanName}`, JSON.stringify({
                score: Number(item.score),
                submittedAt: submittedAtFormatted
              }));
            }
            localStorage.setItem(`cbt_submitted_${subjectId}_${cleanName}`, JSON.stringify({
              score: Number(item.score),
              submittedAt: submittedAtFormatted
            }));
          } catch {}
        }

        return {
          isSubmitted: true,
          score: Number(item.score),
          totalEarned: Number(item.total_earned) || 0,
          totalMax: Number(item.total_max) || 0,
          submittedAt: submittedAtFormatted
        };
      } else {
        // Di database Supabase TIDAK ADA hasil ujian final untuk siswa ini (belum mengumpulkan atau baru di-reset oleh guru)
        if (typeof window !== 'undefined') {
          try {
            if (cleanClass) {
              localStorage.removeItem(`cbt_submitted_${subjectId}_${cleanClass}_${cleanName}`);
            }
            localStorage.removeItem(`cbt_submitted_${subjectId}_${cleanName}`);
          } catch {}
        }
        return { isSubmitted: false };
      }
    }
  } catch (err) {
    console.warn('Gagal cek status submit siswa ke Supabase, fallback ke local storage:', err);
  }

  // 2. Fail-safe Lokal Perangkat Siswa
  if (typeof window !== 'undefined') {
    try {
      if (cleanClass) {
        const rawClass = localStorage.getItem(`cbt_submitted_${subjectId}_${cleanClass}_${cleanName}`);
        if (rawClass) {
          const parsed = JSON.parse(rawClass);
          return {
            isSubmitted: true,
            score: parsed?.score,
            submittedAt: parsed?.submittedAt || 'Sesi Sebelumnya'
          };
        }
      }
      const raw = localStorage.getItem(`cbt_submitted_${subjectId}_${cleanName}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          isSubmitted: true,
          score: parsed?.score,
          submittedAt: parsed?.submittedAt || 'Sesi Sebelumnya'
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
export async function deleteExamResult(
  resultId: string,
  subjectId?: string,
  studentName?: string,
  className?: string
): Promise<boolean> {
  const cleanName = (studentName || '').toLowerCase().trim();
  const cleanClass = (className || '').toLowerCase().trim();

  // 1. PEMBERSIHAN MENYELURUH DI LOCALSTORAGE
  if (typeof window !== 'undefined') {
    try {
      // A. Bersihkan dari SEMUA key cbt_results_* tanpa kecuali (mencegah data lama muncul kembali saat login admin)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cbt_results_')) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const list: ExamResult[] = JSON.parse(stored);
              if (Array.isArray(list)) {
                const filtered = list.filter(r => {
                  if (resultId && r.id === resultId) return false;
                  if (cleanName && r.studentName && r.studentName.toLowerCase().trim() === cleanName) {
                    if (!subjectId || !r.subjectId || r.subjectId === subjectId) {
                      return false;
                    }
                  }
                  return true;
                });
                localStorage.setItem(key, JSON.stringify(filtered));
              }
            }
          } catch {}
        }
      }

      // B. Bersihkan seluruh token pengerjaan, kunci autolock, dan sesi aktif siswa tersebut
      if (cleanName) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('cbt_submitted_') ||
            key.startsWith('cbt_blocked_') ||
            key.startsWith('cbt_exam_state_') ||
            key.startsWith('cbt_exam_questions_') ||
            key.startsWith('cbt_answers_')
          )) {
            if (key.toLowerCase().includes(cleanName)) {
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach(k => {
          try {
            localStorage.removeItem(k);
          } catch {}
        });
      }
    } catch (lsErr) {
      console.warn('Error clearing localStorage in deleteExamResult:', lsErr);
    }
  }

  // 2. PEMBERSIHAN DI SUPABASE CLOUD
  try {
    // Hapus langsung berdasarkan ID jika ID adalah valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resultId);
    if (isUuid) {
      await supabase.from('exam_results').delete().eq('id', resultId);
    }

    // Hapus juga berdasarkan nama siswa & mapel
    if (cleanName) {
      let delQuery = supabase
        .from('exam_results')
        .delete()
        .ilike('student_name', studentName!.trim());

      if (subjectId) {
        delQuery = delQuery.eq('subject_id', subjectId);
      }
      if (cleanClass) {
        delQuery = delQuery.ilike('class_name', className!.trim());
      }

      await delQuery;

      // Otomatis bersihkan notifikasi pelanggaran / autolock jika guru mereset hasil ujian siswa
      await clearStudentAutolockInSupabase(subjectId || '', studentName!, className || undefined);

      // Hasil ujian dan sesi monitoring adalah satu percobaan ujian.
      // Menghapus nilai tanpa menghapus sesi membuat guru tetap melihat siswa
      // "Mengerjakan" dan heartbeat lama dapat menghidupkan baris sesi kembali.
      const sessionDeleted = await deleteExamSession(subjectId || '', studentName!, className || undefined);
      if (!sessionDeleted) return false;
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
    const rulesWithMeta = {
      ...(sub.scoringRules || {}),
      ...(sub.examDate ? { _examDate: sub.examDate } : {})
    };
    const { error } = await supabase
      .from('subjects')
      .update({
        title: sub.title,
        class_target: sub.className,
        duration_minutes: sub.durationMinutes,
        violation_limit: sub.violationLimit,
        token: sub.token,
        is_active: sub.isActive,
        scoring_rules: rulesWithMeta
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
    const rulesWithMeta = {
      ...(sub.scoringRules || {}),
      ...(sub.examDate ? { _examDate: sub.examDate } : {})
    };
    const payload: any = {
      title: sub.title,
      class_target: sub.className,
      duration_minutes: sub.durationMinutes,
      violation_limit: sub.violationLimit,
      token: sub.token,
      is_active: sub.isActive,
      scoring_rules: rulesWithMeta
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
      scoringRules: data.scoring_rules || sub.scoringRules,
      examDate: data.scoring_rules?._examDate || sub.examDate || ''
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
/**
 * Mengambil seluruh hasil ujian siswa dari semua mata pelajaran (dengan fail-safe localStorage lintas mapel)
 */
export async function fetchAllExamResults(): Promise<ExamResult[]> {
  try {
    let subjectMap = new Map<string, string>();
    try {
      const { data: subs } = await supabase.from('subjects').select('id, title');
      if (subs) {
        subs.forEach(s => subjectMap.set(s.id, s.title));
      }
    } catch {}

    const { data, error } = await supabase
      .from('exam_results')
      .select('id,subject_id,student_name,class_name,score,total_earned,total_max,submitted_at,violation_count')
      .order('submitted_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      if (data.length === 0) {
        // Jika Supabase kosong (karena telah dihapus / belum ada nilai),
        // sinkronkan juga cache lokal cbt_results_ agar tidak memunculkan data yang sudah dihapus
        if (typeof window !== 'undefined') {
          try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith('cbt_results_')) {
                keysToRemove.push(k);
              }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
          } catch {}
        }
        return [];
      }

      const parsed: ExamResult[] = data.map(r => ({
        id: r.id,
        subjectId: r.subject_id,
        subjectTitle: subjectMap.get(r.subject_id) || '',
        studentId: r.id,
        studentName: r.student_name,
        className: r.class_name,
        score: Number(r.score),
        totalEarned: Number(r.total_earned || 0),
        totalMax: Number(r.total_max || 0),
        // Jawaban tidak diikutkan di polling daftar nilai (hemat egress).
        // Dossier memanggil fetchExamResultAnswers saat dibuka.
        answers: [],
        submittedAt: new Date(r.submitted_at).toLocaleString('id-ID'),
        violationCount: r.violation_count || 0
      }));

      // Cache per mapel ke localStorage
      if (typeof window !== 'undefined') {
        const bySubject: Record<string, ExamResult[]> = {};
        parsed.forEach(res => {
          if (res.subjectId) {
            if (!bySubject[res.subjectId]) bySubject[res.subjectId] = [];
            bySubject[res.subjectId].push(res);
          }
        });
        Object.entries(bySubject).forEach(([sId, rList]) => {
          try {
            localStorage.setItem('cbt_results_' + sId, JSON.stringify(rList));
          } catch {}
        });
      }

      return parsed;
    }
  } catch (err) {
    console.error('Exception fetchAllExamResults:', err);
  }

  // Fallback: Gabungkan semua hasil ujian dari localStorage yang diawali 'cbt_results_'
  if (typeof window !== 'undefined') {
    try {
      const all: ExamResult[] = [];
      const seenKeys = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cbt_results_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const list = JSON.parse(stored);
            if (Array.isArray(list)) {
              list.forEach((item: ExamResult) => {
                if (item && item.id) {
                  const dedupKey = `${item.subjectId}_${(item.studentName || '').toLowerCase().trim()}`;
                  if (!seenKeys.has(dedupKey)) {
                    seenKeys.add(dedupKey);
                    all.push(item);
                  }
                }
              });
            }
          }
        }
      }
      if (all.length > 0) return all;
    } catch {}
  }

  return [];
}

/**
 * Mengambil daftar hasil ujian siswa berdasarkan ID mapel (dengan fallback fetchAll jika subjectId kosong)
 */
export async function fetchExamResults(subjectId?: string): Promise<ExamResult[]> {
  if (!subjectId) {
    return fetchAllExamResults();
  }

  try {
    const { data, error } = await supabase
      .from('exam_results')
      .select('id,subject_id,student_name,class_name,score,total_earned,total_max,submitted_at,violation_count')
      .eq('subject_id', subjectId)
      .order('submitted_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      if (data.length === 0) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('cbt_results_' + subjectId);
          } catch {}
        }
        return [];
      }

      const parsed: ExamResult[] = data.map(r => ({
        id: r.id,
        subjectId: r.subject_id,
        subjectTitle: '',
        studentId: r.id,
        studentName: r.student_name,
        className: r.class_name,
        score: Number(r.score),
        totalEarned: Number(r.total_earned || 0),
        totalMax: Number(r.total_max || 0),
        answers: [],
        submittedAt: new Date(r.submitted_at).toLocaleString('id-ID'),
        violationCount: r.violation_count || 0
      }));

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cbt_results_' + subjectId, JSON.stringify(parsed));
        } catch {}
      }
      return parsed;
    }

    // Fail-safe jika Supabase kosong/error: baca dari localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cbt_results_' + subjectId);
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) return list;
        }
      } catch {}
    }

    return [];
  } catch (err) {
    console.error('Exception fetchExamResults:', err);
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cbt_results_' + subjectId);
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) return list;
        }
      } catch {}
    }
    return [];
  }
}

/**
 * Mengambil jawaban satu hasil ujian saat dossier dibuka (on-demand, bukan saat polling).
 */
export async function fetchExamResultAnswers(resultId: string): Promise<StudentAnswerItem[]> {
  try {
    const { data, error } = await supabase
      .from('exam_results')
      .select('answers')
      .eq('id', resultId)
      .maybeSingle();
    if (error || !data) return [];
    return Array.isArray(data.answers) ? data.answers : [];
  } catch {
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
        options: q.options || [],
        answer: q.answer !== undefined && q.answer !== null ? q.answer : '',
        order_index: q.orderIndex || 1
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
 * SUMBER KEBENARAN TUNGGAL status anti-cheat siswa.
 * Satu baris per siswa+mapel disimpan di exam_notifications dengan title penanda.
 * Baris ini menyimpan { count, locked }. Notifikasi violation/autolock hanyalah log
 * untuk guru dan TIDAK BOLEH menentukan lock (karena is_read juga dipakai UI notifikasi).
 */
type LockStateRow = { id: string; count: number; locked: boolean; className: string; message: string };
const lockStateWriteChains = new Map<string, Promise<boolean>>();

function lockStateKey(subjectId: string, studentName: string, className?: string): string {
  return `${subjectId}|${(className || '').toLowerCase().trim()}|${studentName.toLowerCase().trim()}`;
}

async function findLockStateRow(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<LockStateRow | null> {
  const cleanClass = (className || '').toLowerCase().trim();
  const { data, error } = await supabase
    .from('exam_notifications')
    .select('id, message')
    .eq('subject_id', subjectId)
    .ilike('student_name', studentName.trim())
    .eq('title', LOCK_STATE_TITLE)
    .order('created_at', { ascending: false });
  if (error || !data || data.length === 0) return null;

  const rows: LockStateRow[] = data.map(r => {
    let count = 0;
    let locked = false;
    let rowClass = '';
    try {
      const parsed = JSON.parse(r.message || '{}');
      count = Number(parsed.count) || 0;
      locked = Boolean(parsed.locked);
      rowClass = (parsed.className || '').toLowerCase().trim();
    } catch {}
    return { id: r.id as string, count, locked, className: rowClass, message: r.message || '{}' };
  });

  if (cleanClass) {
    const exact = rows.find(r => r.className === cleanClass);
    if (exact) return exact;
    // Toleransi data lama: jika hanya ada satu baris untuk nama ini, pakai baris itu
    if (rows.length === 1) return rows[0];
    return null;
  }
  return rows[0];
}

async function readLockState(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<{ count: number; locked: boolean } | null> {
  try {
    const row = await findLockStateRow(subjectId, studentName, className);
    return row ? { count: row.count, locked: row.locked } : { count: 0, locked: false };
  } catch {
    return null;
  }
}

export async function getStudentLockState(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<{ count: number; locked: boolean }> {
  return (await readLockState(subjectId, studentName, className)) || { count: 0, locked: false };
}

async function persistStudentLockState(
  subjectId: string,
  studentName: string,
  className: string | undefined,
  count: number,
  locked: boolean,
  stateAt: number
): Promise<boolean> {
  try {
    const row = await findLockStateRow(subjectId, studentName, className);
    let previous: Record<string, unknown> = {};
    if (row) {
      try {
        previous = JSON.parse(row.message || '{}');
      } catch {}
    }
    // Jangan biarkan request pelanggaran lama menimpa reset guru yang lebih baru.
    const previousStateAt = Number(previous.stateAt || previous.commandAt || 0);
    if (previousStateAt > stateAt) return true;
    // Pertahankan field lain (mis. perintah pengawas) saat counter berubah.
    const message = JSON.stringify({
      ...previous,
      count,
      locked,
      className: (className || row?.className || '').trim(),
      stateAt
    });
    if (row) {
      const { error } = await supabase
        .from('exam_notifications')
        .update({ message })
        .eq('id', row.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('exam_notifications').insert({
        subject_id: subjectId,
        student_name: studentName.trim(),
        type: 'system',
        title: LOCK_STATE_TITLE,
        message,
        is_read: false
      });
      if (error) throw error;
    }
    return true;
  } catch (err) {
    console.warn('Gagal simpan status anti-cheat siswa:', err);
    return false;
  }
}

export function saveStudentLockState(
  subjectId: string,
  studentName: string,
  className: string | undefined,
  count: number,
  locked: boolean
): Promise<boolean> {
  const key = lockStateKey(subjectId, studentName, className);
  const stateAt = Date.now();
  const previous = lockStateWriteChains.get(key) || Promise.resolve(true);
  const next = previous
    .catch(() => false)
    .then(() => persistStudentLockState(subjectId, studentName, className, count, locked, stateAt));
  lockStateWriteChains.set(key, next);
  void next.finally(() => {
    if (lockStateWriteChains.get(key) === next) lockStateWriteChains.delete(key);
  });
  return next;
}

export async function resetStudentLockState(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<boolean> {
  try {
    const row = await findLockStateRow(subjectId, studentName, className);
    if (row) {
      let previous: Record<string, unknown> = {};
      try {
        previous = JSON.parse(row.message || '{}');
      } catch {}
      const { error: updateError } = await supabase
        .from('exam_notifications')
        .update({
          message: JSON.stringify({
            ...previous,
            count: 0,
            locked: false,
            className: (row.className || className || '').trim(),
            stateAt: Date.now()
          }),
          is_read: true
        })
        .eq('id', row.id);
      if (updateError) throw updateError;
    }
    // Bersihkan log pelanggaran siswa (kelas ini saja jika kelas diketahui)
    let delQuery = supabase
      .from('exam_notifications')
      .delete()
      .eq('subject_id', subjectId)
      .ilike('student_name', studentName.trim())
      .in('type', ['violation', 'autolock']);
    if (className && className.trim()) {
      delQuery = delQuery.ilike('message', `%(${className.trim()})%`);
    }
    const { error: deleteError } = await delQuery;
    if (deleteError) throw deleteError;
    return true;
  } catch (err) {
    console.warn('Gagal reset status anti-cheat siswa:', err);
    return false;
  }
}

/**
 * Memeriksa apakah siswa sedang terkunci/diblokir oleh sistem anti-cheat.
 */
export async function checkStudentLockStatus(
  subjectId: string,
  studentName: string,
  violationLimit: number = 3,
  className?: string
): Promise<{ isBlocked: boolean; violationCount: number; reason?: string }> {
  const cleanName = studentName.toLowerCase().trim();
  const cleanClass = (className || '').toLowerCase().trim();

  const state = await readLockState(subjectId, studentName, className);

  if (state) {
    if (typeof window !== 'undefined') {
      try {
        const classBlockedKey = cleanClass ? `cbt_blocked_${subjectId}_${cleanClass}_${cleanName}` : null;
        if (state.locked) {
          const payloadStr = JSON.stringify({
            isBlocked: true,
            violationCount: state.count,
            lockedAt: Date.now()
          });
          if (classBlockedKey) localStorage.setItem(classBlockedKey, payloadStr);
          localStorage.setItem(`cbt_blocked_${subjectId}_${cleanName}`, payloadStr);
        } else {
          if (classBlockedKey) localStorage.removeItem(classBlockedKey);
          localStorage.removeItem(`cbt_blocked_${subjectId}_${cleanName}`);
        }
      } catch {}
    }

    return {
      isBlocked: state.locked,
      violationCount: state.count,
      reason: state.locked
        ? `Terkunci karena telah melakukan ${state.count} dari batas ${violationLimit} kali pelanggaran anti-cheat.`
        : undefined
    };
  }

  // Fallback jika database tidak dapat dihubungi
  if (typeof window !== 'undefined') {
    try {
      const classBlockedKey = cleanClass ? `cbt_blocked_${subjectId}_${cleanClass}_${cleanName}` : null;
      const blockedFlag = (classBlockedKey && localStorage.getItem(classBlockedKey)) || localStorage.getItem(`cbt_blocked_${subjectId}_${cleanName}`);
      if (blockedFlag) {
        const parsed = JSON.parse(blockedFlag);
        if (parsed.isBlocked) {
          return {
            isBlocked: true,
            violationCount: parsed.violationCount || violationLimit,
            reason: 'Terkunci karena batas pelanggaran anti-cheat.'
          };
        }
      }
    } catch {}
  }

  return { isBlocked: false, violationCount: 0 };
}

/**
 * Memverifikasi dan mengambil data mata pelajaran berdasarkan token resmi ujian
 */
export async function fetchSubjectByToken(token: string): Promise<Subject | null> {
  const clean = token.trim().toUpperCase();
  if (!clean) return null;

  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .ilike('token', clean)
      .limit(1);

    if (!error && data && data.length > 0) {
      const d = data[0];
      return {
        id: d.id,
        title: d.title,
        className: d.class_name,
        durationMinutes: d.duration_minutes,
        violationLimit: d.violation_limit,
        scoringRules: d.scoring_rules || {},
        token: d.token,
        isActive: d.is_active,
        scheduleStart: d.schedule_start,
        examDate: d.exam_date
      };
    }
  } catch (err) {
    console.error('Error fetchSubjectByToken:', err);
  }

  return null;
}

/**
 * Membuka kunci siswa: reset status anti-cheat resmi ke 0 & hapus log pelanggaran.
 */
export async function clearStudentAutolockInSupabase(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<boolean> {
  const cleanName = studentName.toLowerCase().trim();
  const cleanClass = (className || '').toLowerCase().trim();
  if (typeof window !== 'undefined') {
    try {
      if (cleanClass) {
        localStorage.removeItem(`cbt_blocked_${subjectId}_${cleanClass}_${cleanName}`);
        const classStateKey = `cbt_exam_state_${subjectId}_${cleanClass}_${cleanName}`;
        const classSaved = localStorage.getItem(classStateKey);
        if (classSaved) {
          const parsed = JSON.parse(classSaved);
          parsed.violationCount = 0;
          parsed.isLocked = false;
          localStorage.setItem(classStateKey, JSON.stringify(parsed));
        }
      }
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

  return resetStudentLockState(subjectId, studentName, className);
}

/**
 * Membuka kunci SEMUA siswa pada satu mata pelajaran (cleanup massal).
 */
export async function clearAllLockedStudents(subjectId: string): Promise<{ success: boolean; count: number }> {
  try {
    // 1. Reset semua baris status anti-cheat mapel ini ke 0 / tidak terkunci.
    // Update per baris agar className (isolasi rombel) dan perintah pengawas tidak hilang.
    const { data: stateRows, error: stateError } = await supabase
      .from('exam_notifications')
      .select('id,message')
      .eq('subject_id', subjectId)
      .eq('title', LOCK_STATE_TITLE);
    if (stateError) throw stateError;

    await Promise.all((stateRows || []).map(async row => {
      let previous: Record<string, unknown> = {};
      try {
        previous = JSON.parse(row.message || '{}');
      } catch {}
      const { error } = await supabase
        .from('exam_notifications')
        .update({
          message: JSON.stringify({ ...previous, count: 0, locked: false, stateAt: Date.now() }),
          is_read: true
        })
        .eq('id', row.id);
      if (error) throw error;
    }));

    // 2. Hapus log pelanggaran (bukan lagi sumber lock, hanya bersih-bersih)
    const { data, error } = await supabase
      .from('exam_notifications')
      .delete()
      .eq('subject_id', subjectId)
      .in('type', ['violation', 'autolock'])
      .select('id');

    if (error) throw error;

    // 3. Bersihkan localStorage guru untuk mata pelajaran ini
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes(`cbt_blocked_${subjectId}`) || key.includes(`cbt_exam_state_${subjectId}`)) {
            const saved = localStorage.getItem(key);
            if (saved && key.includes('cbt_exam_state')) {
              try {
                const parsed = JSON.parse(saved);
                parsed.violationCount = 0;
                parsed.isLocked = false;
                localStorage.setItem(key, JSON.stringify(parsed));
              } catch {}
            } else if (key.includes('cbt_blocked')) {
              localStorage.removeItem(key);
            }
          }
        });
      } catch {}
    }

    return { success: true, count: data?.length || 0 };
  } catch (err) {
    console.warn('Exception clearAllLockedStudents:', err);
    return { success: false, count: 0 };
  }
}

/**
 * Mengambil daftar notifikasi sistem dari Supabase
 */
export async function fetchNotifications(subjectId?: string): Promise<ExamNotification[]> {
  try {
    let query = supabase
      .from('exam_notifications')
      .select('*')
      .neq('title', LOCK_STATE_TITLE)
      .order('created_at', { ascending: false })
      .limit(30);
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    const { data, error } = await query;
    if (error || !data) {
      return [];
    }
    return data
      .filter(n => n.title !== LOCK_STATE_TITLE)
      .map(n => ({
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
          if (n && n.title !== LOCK_STATE_TITLE) {
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
    // Jangan hapus baris status anti-cheat: menghapusnya = membuka kunci semua siswa.
    let query = supabase
      .from('exam_notifications')
      .delete()
      .neq('title', LOCK_STATE_TITLE);
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
    const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
    const { error } = await supabase.from('students').insert({
      ...(s.id ? { id: s.id } : (fallbackId ? { id: fallbackId } : {})),
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
    const rows = studentsList.map(s => {
      const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
      return {
        ...(s.id ? { id: s.id } : (fallbackId ? { id: fallbackId } : {})),
        nisn: s.nisn,
        name: s.name,
        gender: s.gender,
        class_name: s.className
      };
    });

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
      status: t.status || 'Offline'
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
 * Mengambil katalog foto profil seluruh guru dari Cloud Supabase
 */
export async function fetchTeacherPhotosFromSupabase(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('assignments')
      .eq('id', '__cbt_teacher_photos__')
      .maybeSingle();

    if (!error && data?.assignments && typeof data.assignments === 'object') {
      return data.assignments as Record<string, string>;
    }
    return {};
  } catch (err) {
    console.warn('fetchTeacherPhotosFromSupabase error:', err);
    return {};
  }
}

/**
 * Mengambil daftar Akun Guru & Pengawas Resmi dari Supabase (fallback ke initialTeachers)
 */
export async function fetchTeachers(includePhotos: boolean = true): Promise<Teacher[]> {
  try {
    // Ambil data guru dan katalog foto dari Supabase Cloud secara paralel.
    // Halaman siswa memanggil dengan includePhotos=false agar tidak mengunduh katalog foto.
    const [teachersRes, photosMap] = await Promise.all([
      supabase
        .from('teachers')
        .select('*')
        .neq('id', '__cbt_school_settings__')
        .neq('id', '__cbt_teacher_photos__')
        .order('name', { ascending: true }),
      includePhotos ? fetchTeacherPhotosFromSupabase() : Promise.resolve({} as Record<string, string>)
    ]);

    const { data, error } = teachersRes;

    if (!error && data && data.length > 0) {
      const supabaseTeachers: Teacher[] = data
        .filter(t => t.id !== '__cbt_school_settings__' && t.id !== '__cbt_teacher_photos__' && t.nip !== 'CFG-SCHOOL-SETTINGS' && t.nip !== 'CFG-TEACHER-PHOTOS' && !t.id?.match(/^tea-\d{2}$/))
        .map(t => {
          const cloudPhoto = photosMap[t.id] || (t.nip ? photosMap[t.nip] : '') || '';
          const localPhoto = typeof window !== 'undefined' ? localStorage.getItem(`cbt_teacher_${t.id}_photo`) || '' : '';
          const photo = cloudPhoto || localPhoto || t.photo_url || t.avatar_url || '';

          // Sinkronisasi ke cache lokal perangkat
          if (cloudPhoto && typeof window !== 'undefined') {
            try {
              localStorage.setItem(`cbt_teacher_${t.id}_photo`, cloudPhoto);
              if (t.nip) localStorage.setItem(`cbt_teacher_${t.nip}_photo`, cloudPhoto);
            } catch {}
          }

          return {
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
            photoUrl: photo,
            avatar: photo,
            status: t.status || 'Standby',
            lastLogin: t.last_login
          };
        });

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('cbt_cached_teachers', JSON.stringify(supabaseTeachers));
        } catch {}
      }

      return supabaseTeachers;
    }

    return initialTeachers;
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
  const nowIso = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('teachers')
      .update({ status, last_login: nowIso })
      .eq('id', teacherId);
    if (error) {
      console.warn('Gagal updateTeacherStatusInSupabase:', error.message);
      return false;
    }
    // Siarkan status ke seluruh dewan guru secara instan via Realtime Broadcast
    broadcastTeacherStatus(teacherId, status, nowIso);
    return true;
  } catch (err) {
    console.error('Exception updateTeacherStatusInSupabase:', err);
    return false;
  }
}

/**
 * Upload foto guru ke Supabase Storage. Database hanya menyimpan URL publik,
 * sehingga QR code di perangkat mana pun hanya mengunduh satu foto.
 * Jika bucket belum dibuat, kembalikan null agar pemanggil memakai base64 lama (tidak error).
 */
export async function uploadTeacherPhotoToStorage(
  teacherId: string,
  dataUrl: string
): Promise<string | null> {
  try {
    if (!dataUrl.startsWith('data:')) return dataUrl;
    const blob = await (await fetch(dataUrl)).blob();
    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const safeId = teacherId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `${safeId}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('teacher-photos')
      .upload(path, blob, { upsert: false, contentType: blob.type || 'image/jpeg' });

    if (error) {
      console.warn('Gagal upload foto guru ke Storage:', error.message);
      return null;
    }

    return supabase.storage.from('teacher-photos').getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.warn('Exception upload foto guru ke Storage:', err);
    return null;
  }
}

/**
 * Memperbarui foto profil guru di Supabase Cloud (pada row __cbt_teacher_photos__).
 * Foto base64 diunggah ke Storage lebih dulu; URL disimpan ke database.
 */
export async function updateTeacherPhotoInSupabase(
  teacherId: string, 
  photoUrl: string, 
  teacherNip?: string
): Promise<string> {
  try {
    // 1. Upload ke Storage jika masih berupa data URL base64.
    const storedPhoto = photoUrl ? (await uploadTeacherPhotoToStorage(teacherId, photoUrl)) || photoUrl : '';

    // 2. Ambil map foto yang ada di __cbt_teacher_photos__
    const { data } = await supabase
      .from('teachers')
      .select('assignments')
      .eq('id', '__cbt_teacher_photos__')
      .maybeSingle();

    const photosMap: Record<string, string> = (data?.assignments && typeof data.assignments === 'object')
      ? { ...(data.assignments as Record<string, string>) }
      : {};

    if (storedPhoto) {
      photosMap[teacherId] = storedPhoto;
      if (teacherNip) {
        photosMap[teacherNip] = storedPhoto;
      }
    } else {
      delete photosMap[teacherId];
      if (teacherNip) {
        delete photosMap[teacherNip];
      }
    }

    // 3. Simpan kembali ke Cloud Database Supabase
    const { error } = await supabase
      .from('teachers')
      .upsert({
        id: '__cbt_teacher_photos__',
        nip: 'CFG-TEACHER-PHOTOS',
        name: 'Katalog Foto Guru',
        email: 'photos@system.cbt',
        subject: 'Photos',
        role: 'admin',
        assignments: photosMap
      }, { onConflict: 'id' });

    if (error) {
      console.warn('updateTeacherPhotoInSupabase error:', error.message);
      return storedPhoto;
    }

    // Simpan URL (bukan base64) ke cache perangkat saat ini
    if (typeof window !== 'undefined') {
      try {
        if (storedPhoto) {
          localStorage.setItem(`cbt_teacher_${teacherId}_photo`, storedPhoto);
          if (teacherNip) localStorage.setItem(`cbt_teacher_${teacherNip}_photo`, storedPhoto);
        } else {
          localStorage.removeItem(`cbt_teacher_${teacherId}_photo`);
          if (teacherNip) localStorage.removeItem(`cbt_teacher_${teacherNip}_photo`);
        }
      } catch {}
    }

    return storedPhoto;
  } catch (err) {
    console.warn('updateTeacherPhotoInSupabase exception:', err);
    return photoUrl;
  }
}

/**
 * Memperbarui data penugasan mengajar guru (mapel & rombel kelas) di Cloud Supabase
 */
export async function updateTeacherAssignmentsInSupabase(
  teacherId: string,
  assignments: TeacherAssignment[],
  primarySubject: string,
  primaryClasses: string[]
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('teachers')
      .update({
        assignments: assignments || [],
        subject: primarySubject || (assignments[0]?.subject || ''),
        classes: primaryClasses || (assignments[0]?.classes || [])
      })
      .eq('id', teacherId);

    if (error) {
      console.warn('Gagal updateTeacherAssignmentsInSupabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updateTeacherAssignmentsInSupabase:', err);
    return false;
  }
}

/**
 * Pengaturan Default Sekolah Resmi (Kop Surat, Pejabat & TTE)
 */
export const defaultSchoolSettings: SchoolSettings = {
  institution1: 'PEMERINTAH KOTA PALEMBANG',
  institution2: 'DINAS PENDIDIKAN',
  schoolName: 'SMP NEGERI 58 PALEMBANG',
  schoolAddress: 'Jln. Komering II, Kelurahan Demang Lebar Daun, Kecamatan Ilir Barat I, Kota Palembang, Sumatera Selatan 30151',
  schoolContact: 'Website: https://smpn58.vercel.app/',
  logoLeft: '/logo-dinas.png',
  logoRight: '/logo-sekolah.png',
  principalName: 'Hj. Rohana, S.Pd., M.Si.',
  principalNip: '19680512 199412 2 001',
  principalTitle: 'Kepala SMPN 58 Palembang',
  principalPhoto: '',
  teacherName: 'Aris Bermansyah, S.Kom',
  teacherNip: '199611142024211010',
  city: 'Palembang',
  enableTTE: true,
  tteType: 'qrcode',
  isolateTeacherDossier: true,
  teacherRegistrationPasscode: 'GURU58',
  examExitPassword: 'palembang58'
};

/**
 * Mengambil Pengaturan Satuan Pendidikan, Kop Surat & Pejabat dari Database Supabase
 * Menggabungkan tabel `school_settings` dan row `__cbt_school_settings__` di tabel `teachers`.
 */
export async function fetchSchoolSettingsFromSupabase(): Promise<SchoolSettings | null> {
  try {
    const [directRes, teacherCfgRes] = await Promise.all([
      (async () => {
        try {
          return await supabase.from('school_settings').select('*').eq('id', 'default').maybeSingle();
        } catch {
          return { data: null, error: null };
        }
      })(),
      (async () => {
        try {
          return await supabase.from('teachers').select('assignments').eq('id', '__cbt_school_settings__').maybeSingle();
        } catch {
          return { data: null, error: null };
        }
      })()
    ]);

    const directData = directRes?.data;
    const teacherAssignments = (teacherCfgRes?.data?.assignments && typeof teacherCfgRes.data.assignments === 'object')
      ? (teacherCfgRes.data.assignments as Record<string, any>)
      : null;

    if (!directData && !teacherAssignments) {
      return null;
    }

    // Ambil passcode dari config guru (JSONB persisten), atau directData jika ada, atau default
    const resolvedPasscode =
      teacherAssignments?.teacherRegistrationPasscode ||
      directData?.teacher_registration_passcode ||
      directData?.teacherRegistrationPasscode ||
      defaultSchoolSettings.teacherRegistrationPasscode;

    const resolvedExitPassword =
      teacherAssignments?.examExitPassword ||
      directData?.exam_exit_password ||
      directData?.examExitPassword ||
      defaultSchoolSettings.examExitPassword ||
      'palembang58';

    if (directData) {
      return {
        institution1: directData.institution1 || teacherAssignments?.institution1 || defaultSchoolSettings.institution1,
        institution2: directData.institution2 || teacherAssignments?.institution2 || defaultSchoolSettings.institution2,
        schoolName: directData.school_name || teacherAssignments?.schoolName || defaultSchoolSettings.schoolName,
        schoolAddress: directData.school_address || teacherAssignments?.schoolAddress || defaultSchoolSettings.schoolAddress,
        schoolContact: directData.school_contact || teacherAssignments?.schoolContact || defaultSchoolSettings.schoolContact,
        logoLeft: directData.logo_left || teacherAssignments?.logoLeft || defaultSchoolSettings.logoLeft,
        logoRight: directData.logo_right || teacherAssignments?.logoRight || defaultSchoolSettings.logoRight,
        principalName: directData.principal_name || teacherAssignments?.principalName || defaultSchoolSettings.principalName,
        principalNip: directData.principal_nip || teacherAssignments?.principalNip || defaultSchoolSettings.principalNip,
        principalTitle: teacherAssignments?.principalTitle || defaultSchoolSettings.principalTitle,
        principalPhoto: directData.principal_photo || teacherAssignments?.principalPhoto || '',
        teacherName: directData.teacher_name || teacherAssignments?.teacherName || defaultSchoolSettings.teacherName,
        teacherNip: directData.teacher_nip || teacherAssignments?.teacherNip || defaultSchoolSettings.teacherNip,
        city: directData.city || teacherAssignments?.city || defaultSchoolSettings.city,
        enableTTE: directData.enable_tte !== undefined ? directData.enable_tte !== false : (teacherAssignments?.enableTTE !== false),
        tteType: (directData.tte_type === 'barcode' || teacherAssignments?.tteType === 'barcode') ? 'barcode' : 'qrcode',
        isolateTeacherDossier: directData.isolate_teacher_dossier !== undefined ? directData.isolate_teacher_dossier !== false : (teacherAssignments?.isolateTeacherDossier !== false),
        teacherRegistrationPasscode: resolvedPasscode,
        examExitPassword: resolvedExitPassword
      };
    }

    if (teacherAssignments) {
      return {
        ...defaultSchoolSettings,
        ...teacherAssignments,
        teacherRegistrationPasscode: resolvedPasscode,
        examExitPassword: resolvedExitPassword,
        logoLeft: teacherAssignments.logoLeft || defaultSchoolSettings.logoLeft,
        logoRight: teacherAssignments.logoRight || defaultSchoolSettings.logoRight
      };
    }

    return null;
  } catch (err) {
    console.warn('Gagal fetchSchoolSettingsFromSupabase:', err);
    return null;
  }
}

/**
 * Menyimpan Pengaturan Satuan Pendidikan, Kop Surat & Pejabat ke Database Supabase
 * Tersimpan secara permanen ke Supabase Cloud, tersinkronisasi ke seluruh akun guru & proktor.
 */
export async function saveSchoolSettingsToSupabase(settings: SchoolSettings): Promise<{ success: boolean; error?: string }> {
  let savedToDirect = false;

  // 1. Coba simpan ke tabel school_settings (hanya kolom-kolom yang valid di skema tabel)
  try {
    const directPayload: Record<string, any> = {
      id: 'default',
      institution1: settings.institution1 || defaultSchoolSettings.institution1,
      institution2: settings.institution2 || defaultSchoolSettings.institution2,
      school_name: settings.schoolName || defaultSchoolSettings.schoolName,
      school_address: settings.schoolAddress || defaultSchoolSettings.schoolAddress,
      school_contact: settings.schoolContact || defaultSchoolSettings.schoolContact,
      logo_left: settings.logoLeft || defaultSchoolSettings.logoLeft,
      logo_right: settings.logoRight || defaultSchoolSettings.logoRight,
      principal_name: settings.principalName || defaultSchoolSettings.principalName,
      principal_nip: settings.principalNip || defaultSchoolSettings.principalNip,
      principal_photo: settings.principalPhoto || '',
      teacher_name: settings.teacherName || defaultSchoolSettings.teacherName,
      teacher_nip: settings.teacherNip || defaultSchoolSettings.teacherNip,
      city: settings.city || defaultSchoolSettings.city,
      enable_tte: settings.enableTTE !== false,
      tte_type: settings.tteType || 'qrcode',
      isolate_teacher_dossier: settings.isolateTeacherDossier !== false,
      updated_at: new Date().toISOString()
    };

    const { error: directError } = await supabase
      .from('school_settings')
      .upsert(directPayload, { onConflict: 'id' });

    if (!directError) {
      savedToDirect = true;
    } else {
      console.warn('Peringatan upsert school_settings:', directError.message);
    }
  } catch (e: any) {
    // school_settings mungkin belum dibuat atau ada kendala koneksi
  }

  // 2. Selalu simpan seluruh data (termasuk teacherRegistrationPasscode) ke row config di tabel teachers
  try {
    const { error: teacherError } = await supabase
      .from('teachers')
      .upsert({
        id: '__cbt_school_settings__',
        nip: 'CFG-SCHOOL-SETTINGS',
        name: 'Sistem Pengaturan Sekolah',
        email: 'school-settings@system.cbt',
        subject: 'CBT Config',
        classes: [],
        assignments: settings,
        role: 'admin',
        pin: 'SYSTEM',
        avatar_color: 'bg-slate-900',
        status: 'System',
        last_login: new Date().toISOString()
      }, { onConflict: 'id' });

    if (!teacherError) {
      return { success: true };
    } else {
      console.warn('Gagal simpan ke fallback config row:', teacherError.message);
      if (savedToDirect) return { success: true };
      return { success: false, error: teacherError.message };
    }
  } catch (err: any) {
    console.error('Exception saveSchoolSettingsToSupabase:', err);
    if (savedToDirect) return { success: true };
    return { success: false, error: err?.message || 'Database connection error' };
  }
}

