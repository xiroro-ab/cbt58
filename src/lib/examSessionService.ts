import { supabase } from './supabaseClient';
import { ExamSession } from '@/types/cbt';

export const LOCK_STATE_TITLE = '__CBT_LOCK_STATE__';

export type ProctorCommandAction = 'FORCE_FINISH' | 'RESET_VIOLATION' | 'RESET_EXAM';

// Jendela waktu aktif 30 menit mencegah sesi siswa gugur hanya karena selisih jam perangkat (clock skew)
const ACTIVE_WINDOW_MS = 1800000;

const SESSION_COLUMNS =
  'id,subject_id,student_name,class_name,start_time,last_heartbeat,progress_count,total_questions,remaining_seconds,violation_count,status,is_focus';

function toEpoch(value: unknown, fallback = Date.now()): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

export async function upsertExamSession(
  session: ExamSession,
  includeAnswers: boolean
): Promise<boolean> {
  if (!session?.studentName || !session.subjectId || !session.className) return false;

  const cleanName = session.studentName.trim();
  const cleanClass = session.className.trim();

  const payload: Record<string, unknown> = {
    subject_id: session.subjectId,
    student_name: cleanName,
    class_name: cleanClass,
    start_time: new Date(session.startTime).toISOString(),
    last_heartbeat: new Date(session.lastHeartbeat).toISOString(),
    progress_count: session.progressCount || 0,
    total_questions: session.totalQuestions || 0,
    remaining_seconds: session.remainingSeconds || 0,
    violation_count: session.violationCount || 0,
    status: session.status || 'ongoing',
    is_focus: session.isFocus !== false
  };

  if (includeAnswers) {
    payload.answers = session.answers || [];
  }

  // Proteksi 1: Jika siswa sudah memiliki nilai akhir di exam_results (diselesaikan paksa oleh guru atau submit mandiri),
  // TOLAK KERAS semua heartbeat baru agar sesi ujian tidak pernah hidup kembali!
  try {
    const { data: alreadySubmitted } = await supabase
      .from('exam_results')
      .select('id')
      .eq('subject_id', session.subjectId)
      .ilike('student_name', cleanName)
      .limit(1)
      .maybeSingle();

    if (alreadySubmitted) {
      // Bersihkan sesi aktif siswa yang sudah selesai agar database tetap bersih
      await supabase
        .from('exam_sessions')
        .delete()
        .eq('subject_id', session.subjectId)
        .ilike('student_name', cleanName);
      return true;
    }
  } catch {}

  // Proteksi 2: Jika pengawas telah menyelesaikan ujian siswa ('completed'),
  // jangan biarkan heartbeat siswa menimpa status completed kembali menjadi ongoing.
  if (session.status !== 'completed') {
    try {
      const { data: existing } = await supabase
        .from('exam_sessions')
        .select('status')
        .eq('subject_id', session.subjectId)
        .ilike('student_name', cleanName)
        .limit(1)
        .maybeSingle();

      if (existing && existing.status === 'completed') {
        return true;
      }
    } catch {}
  }

  let { error } = await supabase
    .from('exam_sessions')
    .upsert(payload, { onConflict: 'subject_id,student_name,class_name' });

  // Resilient Fallback: Jika Postgres trigger mencari kolom updated_at pada operasi update
  if (error && error.message && error.message.includes('updated_at')) {
    try {
      await supabase
        .from('exam_sessions')
        .delete()
        .eq('subject_id', session.subjectId)
        .eq('student_name', session.studentName.trim())
        .eq('class_name', session.className.trim());
      const insertRes = await supabase.from('exam_sessions').insert(payload);
      error = insertRes.error;
    } catch {}
  }

  if (error) {
    console.error('Gagal simpan sesi ujian ke Supabase:', {
      code: error.code,
      message: error.message,
      hint: 'Pastikan supabase_fix_exam_sessions.sql sudah dijalankan di Supabase SQL Editor.'
    });
    return false;
  }
  return true;
}

export async function fetchActiveExamSessions(subjectId?: string): Promise<ExamSession[]> {
  let query = supabase
    .from('exam_sessions')
    .select(SESSION_COLUMNS)
    .in('status', ['ongoing', 'blocked'])
    .order('last_heartbeat', { ascending: false })
    .limit(500);

  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }

  const { data, error } = await query;
  if (error || !data) {
    if (error) console.warn('Gagal ambil sesi ujian aktif:', error.message);
    return [];
  }

  // FILTER OTORITATIF HASIL UJIAN (EXAM_RESULTS):
  // Siswa yang nilainya sudah tersimpan (baik submit mandiri maupun simpan paksa oleh guru)
  // TIDAK BOLEH PERNAH muncul lagi di Live Monitoring!
  const submittedSet = new Set<string>();
  try {
    let resQuery = supabase
      .from('exam_results')
      .select('student_name, class_name');
    if (subjectId) {
      resQuery = resQuery.eq('subject_id', subjectId);
    }
    const { data: resData } = await resQuery;
    if (resData) {
      resData.forEach((r: any) => {
        const name = (r.student_name || '').toLowerCase().trim();
        const cls = (r.class_name || '').toLowerCase().trim();
        if (name) {
          submittedSet.add(name);
          if (cls) submittedSet.add(`${name}|${cls}`);
        }
      });
    }
  } catch {}

  const sinceEpoch = Date.now() - ACTIVE_WINDOW_MS;
  const activeSessions: ExamSession[] = data
    .filter((row: any) => {
      const name = (row.student_name || '').toLowerCase().trim();
      const cls = (row.class_name || '').toLowerCase().trim();
      if (submittedSet.has(name) || (cls && submittedSet.has(`${name}|${cls}`))) {
        // Hapus sesi basi ini dari exam_sessions agar database tetap bersih
        void supabase.from('exam_sessions').delete().eq('id', row.id);
        return false;
      }
      return row.status === 'blocked' || toEpoch(row.last_heartbeat, 0) >= sinceEpoch;
    })
    .map((row: any) => ({
      id: row.id,
      subjectId: row.subject_id,
      studentId: row.student_name,
      studentName: row.student_name,
      className: row.class_name,
      startTime: toEpoch(row.start_time),
      lastHeartbeat: toEpoch(row.last_heartbeat),
      progressCount: Number(row.progress_count) || 0,
      violationCount: Number(row.violation_count) || 0,
      answers: [],
      status: row.status === 'blocked' ? 'blocked' : row.status === 'completed' ? 'completed' : 'ongoing',
      totalQuestions: Number(row.total_questions) || 0,
      remainingSeconds: Number(row.remaining_seconds) || 0,
      isFocus: row.is_focus !== false
    }));

  // SINKRONISASI OTORITATIF STATUS TERKUNCI (ANTI-CHEAT):
  // Baca juga status autolock dari exam_notifications. Jika ada siswa yang terkunci (locked: true)
  // namun sesi di exam_sessions terputus/kedaluwarsa karena HP siswa tertutup, pastikan siswa
  // TERSEBUT TETAP MUNCUL di daftar monitoring pengawas dengan status 'blocked' dan tombol 'Buka Kunci'.
  try {
    let lockQuery = supabase
      .from('exam_notifications')
      .select('id,subject_id,student_name,message,created_at')
      .eq('title', LOCK_STATE_TITLE);
    if (subjectId) {
      lockQuery = lockQuery.eq('subject_id', subjectId);
    }
    const { data: lockRows } = await lockQuery;
    if (lockRows && lockRows.length > 0) {
      for (const row of lockRows) {
        try {
          const parsed = JSON.parse(row.message || '{}');
          if (parsed.locked) {
            const cleanName = (row.student_name || '').toLowerCase().trim();
            const cleanClass = (parsed.className || '').toLowerCase().trim();
            if (submittedSet.has(cleanName) || (cleanClass && submittedSet.has(`${cleanName}|${cleanClass}`))) {
              continue;
            }
            const existingIdx = activeSessions.findIndex(
              s => s.subjectId === row.subject_id && s.studentName.toLowerCase().trim() === cleanName
            );
            if (existingIdx >= 0) {
              activeSessions[existingIdx].status = 'blocked';
              activeSessions[existingIdx].violationCount = Math.max(
                activeSessions[existingIdx].violationCount,
                Number(parsed.count) || 3
              );
            } else {
              activeSessions.push({
                id: row.id,
                subjectId: row.subject_id,
                studentId: row.student_name,
                studentName: row.student_name,
                className: parsed.className || '',
                startTime: toEpoch(row.created_at),
                lastHeartbeat: toEpoch(row.created_at),
                progressCount: 0,
                violationCount: Number(parsed.count) || 3,
                answers: [],
                status: 'blocked',
                totalQuestions: 0,
                remainingSeconds: 0,
                isFocus: false
              });
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Gagal membaca sinkronisasi notifikasi kunci:', err);
  }

  return activeSessions;
}

export interface StudentExamSessionLookup {
  available: boolean;
  session: {
    status: ExamSession['status'];
    startTime: number;
    lastHeartbeat: number;
    remainingSeconds: number;
    answers?: ExamSession['answers'];
  } | null;
}

/**
 * Membaca sesi ujian siswa secara otoritatif sebelum memutuskan apakah
 * state localStorage boleh dipakai untuk melanjutkan ujian.
 * `available` membedakan "tidak ada sesi" dari "database gagal dibaca".
 */
export async function lookupStudentExamSession(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<StudentExamSessionLookup> {
  try {
    let query = supabase
      .from('exam_sessions')
      .select('status,start_time,last_heartbeat,remaining_seconds,answers')
      .eq('subject_id', subjectId)
      .ilike('student_name', studentName.trim());

    if (className?.trim()) {
      query = query.ilike('class_name', className.trim());
    }

    const { data, error } = await query
      .order('last_heartbeat', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Gagal membaca sesi ujian siswa:', error.message);
      return { available: false, session: null };
    }

    if (!data) return { available: true, session: null };

    return {
      available: true,
      session: {
        status: data.status as ExamSession['status'],
        startTime: toEpoch(data.start_time, 0),
        lastHeartbeat: toEpoch(data.last_heartbeat, 0),
        remainingSeconds: Number(data.remaining_seconds) || 0,
        answers: Array.isArray(data.answers) ? data.answers : []
      }
    };
  } catch (err) {
    console.warn('Exception membaca sesi ujian siswa:', err);
    return { available: false, session: null };
  }
}

export async function fetchExamSessionAnswers(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<ExamSession['answers']> {
  let query = supabase
    .from('exam_sessions')
    .select('answers')
    .eq('subject_id', subjectId)
    .ilike('student_name', studentName.trim());

  if (className?.trim()) {
    query = query.ilike('class_name', className.trim());
  }

  const { data, error } = await query
    .order('last_heartbeat', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return [];
  return Array.isArray(data.answers) ? data.answers : [];
}

export async function deleteExamSession(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<boolean> {
  let query = supabase
    .from('exam_sessions')
    .delete()
    .eq('subject_id', subjectId)
    .ilike('student_name', studentName.trim());

  if (className?.trim()) {
    query = query.ilike('class_name', className.trim());
  }

  const { error } = await query;
  return !error;
}

/**
 * Mengembalikan sesi monitoring yang sedang diblokir menjadi sesi berjalan.
 * Status ini diubah di server supaya layar guru tidak menunggu heartbeat siswa
 * berikutnya untuk berhenti menampilkan status "DISKUALIFIKASI".
 */
export async function resetExamSession(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<boolean> {
  const cleanName = studentName.trim();
  const cleanClass = className?.trim();

  let query = supabase
    .from('exam_sessions')
    .update({
      violation_count: 0,
      status: 'ongoing',
      is_focus: true,
      last_heartbeat: new Date().toISOString()
    })
    .eq('subject_id', subjectId)
    .ilike('student_name', cleanName);

  if (cleanClass) {
    query = query.ilike('class_name', cleanClass);
  }

  let { error } = await query;

  // Resilient Fallback: jika trigger updated_at error, baca row lalu delete & insert ulang
  if (error && error.message && error.message.includes('updated_at')) {
    try {
      let getQuery = supabase
        .from('exam_sessions')
        .select('*')
        .eq('subject_id', subjectId)
        .ilike('student_name', cleanName);
      if (cleanClass) getQuery = getQuery.ilike('class_name', cleanClass);
      const { data: existing } = await getQuery.maybeSingle();

      if (existing) {
        await supabase.from('exam_sessions').delete().eq('id', existing.id);
        const { id, ...toInsert } = existing;
        toInsert.violation_count = 0;
        toInsert.status = 'ongoing';
        toInsert.is_focus = true;
        toInsert.last_heartbeat = new Date().toISOString();
        const insertRes = await supabase.from('exam_sessions').insert(toInsert);
        error = insertRes.error;
      }
    } catch {}
  }

  if (error) console.warn('Gagal reset sesi monitoring siswa:', error.message);
  return !error;
}

/**
 * Membuka kunci seluruh sesi monitoring yang diblokir untuk suatu mata pelajaran (mass reset).
 */
export async function resetAllExamSessions(subjectId: string): Promise<boolean> {
  let { error } = await supabase
    .from('exam_sessions')
    .update({
      violation_count: 0,
      status: 'ongoing',
      is_focus: true,
      last_heartbeat: new Date().toISOString()
    })
    .eq('subject_id', subjectId)
    .eq('status', 'blocked');

  if (error && error.message && error.message.includes('updated_at')) {
    try {
      const { data: blockedList } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('status', 'blocked');

      if (blockedList && blockedList.length > 0) {
        const ids = blockedList.map(r => r.id);
        await supabase.from('exam_sessions').delete().in('id', ids);
        const toInsert = blockedList.map(r => {
          const { id, ...rest } = r;
          return {
            ...rest,
            violation_count: 0,
            status: 'ongoing' as const,
            is_focus: true,
            last_heartbeat: new Date().toISOString()
          };
        });
        const insertRes = await supabase.from('exam_sessions').insert(toInsert);
        error = insertRes.error;
      }
    } catch {}
  }

  if (error) console.warn('Gagal reset semua sesi monitoring terkunci:', error.message);
  return !error;
}

/**
 * Menutup sesi monitoring tanpa menghapusnya. Status final ini dipakai untuk
 * aksi "Simpan Paksa" agar polling guru tidak membaca sesi lama sebagai aktif.
 */
export async function completeExamSession(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<boolean> {
  const cleanName = studentName.trim();
  const cleanClass = className?.trim();

  // Selesaikan sesi aktif dengan menghapusnya dari exam_sessions.
  // Keberadaan nilai di exam_results menjadi bukti otoritatif tunggal bahwa ujian siswa sudah selesai.
  let query = supabase
    .from('exam_sessions')
    .delete()
    .eq('subject_id', subjectId)
    .ilike('student_name', cleanName);

  if (cleanClass) {
    query = query.ilike('class_name', cleanClass);
  }

  const { error } = await query;
  if (error) console.warn('Gagal menghapus sesi aktif ujian siswa:', error.message);
  return !error;
}

type CommandRow = { id: string; message: string; className: string };

async function findCommandRows(
  subjectId: string,
  studentName: string
): Promise<CommandRow[]> {
  const { data, error } = await supabase
    .from('exam_notifications')
    .select('id,message')
    .eq('subject_id', subjectId)
    .ilike('student_name', studentName.trim())
    .eq('title', LOCK_STATE_TITLE)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => {
    let className = '';
    try {
      className = (JSON.parse(row.message || '{}').className || '').toLowerCase().trim();
    } catch {}
    return { id: row.id, message: row.message || '{}', className };
  });
}

function pickCommandRow(rows: CommandRow[], className?: string): CommandRow | null {
  if (!rows || rows.length === 0) return null;
  const cleanClass = (className || '').toLowerCase().trim();
  if (cleanClass) {
    const exact = rows.find(r => r.className === cleanClass);
    if (exact) return exact;
  }
  // Prioritaskan row yang memiliki command aktif
  const withCommand = rows.find(r => {
    try {
      const p = JSON.parse(r.message || '{}');
      return Boolean(p.command);
    } catch {
      return false;
    }
  });
  if (withCommand) return withCommand;
  return rows[0] || null;
}

export async function writeProctorCommand(
  subjectId: string,
  studentName: string,
  className: string | undefined,
  action: ProctorCommandAction,
  commandAt: number,
  commandId?: string
): Promise<boolean> {
  try {
    const cmdId = commandId || `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const rows = await findCommandRows(subjectId, studentName);
    const row = pickCommandRow(rows, className);
    const isReset = action === 'RESET_VIOLATION' || action === 'RESET_EXAM';

    if (row) {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(row.message || '{}');
      } catch {}
      const message = JSON.stringify({
        ...parsed,
        ...(isReset ? { count: 0, locked: false } : {}),
        ...(isReset ? { stateAt: commandAt } : {}),
        command: action,
        commandAt,
        commandId: cmdId
      });
      const { error } = await supabase
        .from('exam_notifications')
        .update({ message })
        .eq('id', row.id);
      return !error;
    }

    const { error } = await supabase.from('exam_notifications').insert({
      subject_id: subjectId,
      student_name: studentName.trim(),
      type: 'system',
      title: LOCK_STATE_TITLE,
      message: JSON.stringify({
        count: 0,
        locked: false,
        className: (className || '').trim(),
        ...(isReset ? { stateAt: commandAt } : {}),
        command: action,
        commandAt,
        commandId: cmdId
      }),
      is_read: false
    });
    return !error;
  } catch (err) {
    console.warn('Gagal kirim perintah pengawas ke database:', err);
    return false;
  }
}

export async function readProctorCommand(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<{ id: string; action: ProctorCommandAction; commandAt: number } | null> {
  try {
    const rows = await findCommandRows(subjectId, studentName);
    const row = pickCommandRow(rows, className);
    if (!row) return null;

    const parsed = JSON.parse(row.message || '{}');
    if (!parsed.command) return null;
    if (!['FORCE_FINISH', 'RESET_VIOLATION', 'RESET_EXAM'].includes(parsed.command)) return null;

    return {
      id: String(parsed.commandId || `cmd_${parsed.commandAt || Date.now()}`),
      action: parsed.command as ProctorCommandAction,
      commandAt: Number(parsed.commandAt) || Date.now()
    };
  } catch {
    return null;
  }
}

export async function clearProctorCommand(
  subjectId: string,
  studentName: string,
  className?: string
): Promise<boolean> {
  try {
    const rows = await findCommandRows(subjectId, studentName);
    const cleanClass = (className || '').toLowerCase().trim();
    const targetRows = cleanClass
      ? rows.filter(r => !r.className || r.className === cleanClass)
      : rows;

    if (targetRows.length === 0) return true;

    await Promise.all(targetRows.map(async (row) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(row.message || '{}');
      } catch {}
      delete parsed.command;
      delete parsed.commandAt;
      delete parsed.commandId;

      await supabase
        .from('exam_notifications')
        .update({ message: JSON.stringify(parsed) })
        .eq('id', row.id);
    }));

    return true;
  } catch {
    return false;
  }
}
