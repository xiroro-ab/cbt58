import { supabase } from './supabaseClient';
import { ExamSession } from '@/types/cbt';

export const LOCK_STATE_TITLE = '__CBT_LOCK_STATE__';

export type ProctorCommandAction = 'FORCE_FINISH' | 'RESET_VIOLATION' | 'RESET_EXAM';

const ACTIVE_WINDOW_MS = 120000;

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

  const payload: Record<string, unknown> = {
    subject_id: session.subjectId,
    student_name: session.studentName.trim(),
    class_name: session.className.trim(),
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

  const { error } = await supabase
    .from('exam_sessions')
    .upsert(payload, { onConflict: 'subject_id,student_name,class_name' });

  if (error) {
    console.error('Gagal simpan sesi ujian ke Supabase:', {
      code: error.code,
      message: error.message,
      hint: 'Pastikan supabase_monitoring_migration.sql sudah dijalankan.'
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

  const sinceEpoch = Date.now() - ACTIVE_WINDOW_MS;
  return data
    .filter((row: any) => row.status === 'blocked' || toEpoch(row.last_heartbeat, 0) >= sinceEpoch)
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
}

export interface StudentExamSessionLookup {
  available: boolean;
  session: {
    status: ExamSession['status'];
    startTime: number;
    lastHeartbeat: number;
    remainingSeconds: number;
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
      .select('status,start_time,last_heartbeat,remaining_seconds')
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
        remainingSeconds: Number(data.remaining_seconds) || 0
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
  let query = supabase
    .from('exam_sessions')
    .update({
      violation_count: 0,
      status: 'ongoing',
      is_focus: true,
      last_heartbeat: new Date().toISOString()
    })
    .eq('subject_id', subjectId)
    .ilike('student_name', studentName.trim());

  if (className?.trim()) {
    query = query.ilike('class_name', className.trim());
  }

  const { error } = await query;
  if (error) console.warn('Gagal reset sesi monitoring siswa:', error.message);
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
  let query = supabase
    .from('exam_sessions')
    .update({
      status: 'completed',
      is_focus: false,
      last_heartbeat: new Date().toISOString()
    })
    .eq('subject_id', subjectId)
    .ilike('student_name', studentName.trim());

  if (className?.trim()) {
    query = query.ilike('class_name', className.trim());
  }

  const { error } = await query;
  if (error) console.warn('Gagal menutup sesi monitoring siswa:', error.message);
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
  const cleanClass = (className || '').toLowerCase().trim();
  if (cleanClass) {
    const exact = rows.find(r => r.className === cleanClass);
    if (exact) return exact;
    if (rows.length === 1) return rows[0];
    return null;
  }
  return rows[0] || null;
}

export async function writeProctorCommand(
  subjectId: string,
  studentName: string,
  className: string | undefined,
  action: ProctorCommandAction,
  commandAt: number
): Promise<boolean> {
  try {
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
        commandAt
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
        commandAt
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
): Promise<{ action: ProctorCommandAction; commandAt: number } | null> {
  try {
    const rows = await findCommandRows(subjectId, studentName);
    const row = pickCommandRow(rows, className);
    if (!row) return null;

    const parsed = JSON.parse(row.message || '{}');
    if (!parsed.command || !parsed.commandAt) return null;
    if (!['FORCE_FINISH', 'RESET_VIOLATION', 'RESET_EXAM'].includes(parsed.command)) return null;

    return {
      action: parsed.command as ProctorCommandAction,
      commandAt: Number(parsed.commandAt) || 0
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
    const row = pickCommandRow(rows, className);
    if (!row) return true;

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(row.message || '{}');
    } catch {}
    delete parsed.command;
    delete parsed.commandAt;

    const { error } = await supabase
      .from('exam_notifications')
      .update({ message: JSON.stringify(parsed) })
      .eq('id', row.id);
    return !error;
  } catch {
    return false;
  }
}
