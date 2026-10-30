import { ExamSession } from '@/types/cbt';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const SESSIONS_STORAGE_KEY = 'cbt_live_sessions';
const COMMAND_STORAGE_KEY = 'cbt_teacher_command';
const CHANNEL_NAME = 'cbt_live_monitoring_channel';

// Helper BroadcastChannel
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      return new BroadcastChannel(CHANNEL_NAME);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Mengambil seluruh sesi ujian siswa yang sedang aktif dari memori lokal (fail-safe)
 */
export function getStoredSessions(): ExamSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const list: ExamSession[] = JSON.parse(raw);
    const now = Date.now();
    // Bersihkan sesi usang (tidak ada heartbeat > 60 detik)
    const active = list.filter(s => (now - s.lastHeartbeat) < 60000);
    if (active.length !== list.length) {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(active));
    }
    return active;
  } catch {
    return [];
  }
}

/**
 * Siswa melaporkan progres, status fokus, dan sisa waktu secara berkala (Heartbeat)
 */
export function reportStudentSession(session: ExamSession) {
  if (typeof window === 'undefined') return;

  try {
    const current = getStoredSessions();
    const updated = [
      session,
      ...current.filter(s => !(s.studentName === session.studentName && s.subjectId === session.subjectId))
    ];
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));

    // Siarkan via BroadcastChannel untuk sinkronisasi seketika antar-tab browser
    const bc = getBroadcastChannel();
    if (bc) {
      bc.postMessage({ type: 'SESSION_UPDATE', session });
      bc.close();
    }
  } catch (e) {
    console.warn('Gagal simpan sesi live lokal:', e);
  }

  // Jika Supabase aktif, kirim siaran Realtime channel
  if (isSupabaseConfigured) {
    try {
      const channel = supabase.channel('cbt_live_room');
      channel.send({
        type: 'broadcast',
        event: 'session_heartbeat',
        payload: session
      });
    } catch {}
  }
}

/**
 * Menghapus sesi aktif ketika siswa telah menyelesaikan ujian secara mandiri
 */
export function removeStudentSession(studentName: string, subjectId: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredSessions();
    const filtered = current.filter(s => !(s.studentName === studentName && s.subjectId === subjectId));
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtered));

    const bc = getBroadcastChannel();
    if (bc) {
      bc.postMessage({ type: 'SESSION_REMOVED', studentName, subjectId });
      bc.close();
    }
  } catch {}
}

export type ProctorActionType = 'FORCE_FINISH' | 'RESET_VIOLATION' | 'RESET_EXAM';

export interface ProctorCommand {
  action: ProctorActionType;
  studentName: string;
  subjectId: string;
  timestamp: number;
}

/**
 * Pengawas / Guru mengirim instruksi kontrol ke siswa tertentu
 */
export function sendProctorCommand(cmd: { action: ProctorActionType; studentName: string; subjectId: string }) {
  if (typeof window === 'undefined') return;

  const payload: ProctorCommand = {
    ...cmd,
    timestamp: Date.now()
  };

  // 1. Simpan ke localStorage dengan timestamp acak agar memicu storage event di tab siswa
  try {
    localStorage.setItem(COMMAND_STORAGE_KEY, JSON.stringify(payload));
  } catch {}

  // 2. Siarkan via BroadcastChannel
  try {
    const bc = getBroadcastChannel();
    if (bc) {
      bc.postMessage({ type: 'PROCTOR_COMMAND', command: payload });
      bc.close();
    }
  } catch {}

  // 3. Update sesi lokal seketika
  if (cmd.action === 'RESET_VIOLATION') {
    const current = getStoredSessions();
    const updated = current.map(s => {
      if (s.studentName === cmd.studentName && s.subjectId === cmd.subjectId) {
        return {
          ...s,
          violationCount: 0,
          status: 'ongoing' as const,
          isFocus: true,
          lastHeartbeat: Date.now()
        };
      }
      return s;
    });
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
  } else if (cmd.action === 'FORCE_FINISH' || cmd.action === 'RESET_EXAM') {
    removeStudentSession(cmd.studentName, cmd.subjectId);
  }

  // 4. Siarkan via Supabase Realtime jika terkonfigurasi
  if (isSupabaseConfigured) {
    try {
      const channel = supabase.channel('cbt_live_room');
      channel.send({
        type: 'broadcast',
        event: 'proctor_command',
        payload
      });
    } catch {}
  }
}

/**
 * Siswa mendengarkan instruksi dari Pengawas (Paksa Selesai / Buka Kunci)
 */
export function subscribeToStudentCommands(
  studentName: string,
  subjectId: string,
  onCommand: (cmd: ProctorCommand) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Listener A: BroadcastChannel
  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data?.type === 'PROCTOR_COMMAND') {
          const cmd: ProctorCommand = event.data.command;
          if (
            cmd.studentName.toLowerCase().trim() === studentName.toLowerCase().trim() &&
            cmd.subjectId === subjectId
          ) {
            onCommand(cmd);
          }
        }
      };
    } catch {}
  }

  // Listener B: Storage Event (Lintas window/tab)
  const handleStorage = (event: StorageEvent) => {
    if (event.key === COMMAND_STORAGE_KEY && event.newValue) {
      try {
        const cmd: ProctorCommand = JSON.parse(event.newValue);
        if (
          cmd.studentName.toLowerCase().trim() === studentName.toLowerCase().trim() &&
          cmd.subjectId === subjectId
        ) {
          onCommand(cmd);
        }
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorage);

  // Listener C: Supabase Broadcast
  let supaChannel: any = null;
  if (isSupabaseConfigured) {
    try {
      supaChannel = supabase.channel(`student_cmd_${subjectId}`)
        .on('broadcast', { event: 'proctor_command' }, (payload: any) => {
          const cmd: ProctorCommand = payload.payload;
          if (
            cmd &&
            cmd.studentName.toLowerCase().trim() === studentName.toLowerCase().trim() &&
            cmd.subjectId === subjectId
          ) {
            onCommand(cmd);
          }
        })
        .subscribe();
    } catch {}
  }

  return () => {
    if (bc) bc.close();
    window.removeEventListener('storage', handleStorage);
    if (supaChannel) supabase.removeChannel(supaChannel);
  };
}

/**
 * Pengawas mendengarkan seluruh pembaruan sesi siswa secara realtime
 */
export function subscribeToLiveSessions(
  onUpdate: (sessions: ExamSession[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const broadcastAll = () => {
    onUpdate(getStoredSessions());
  };

  // Panggil pertama kali
  broadcastAll();

  // Polling interval tiap 3 detik untuk refresh sisa waktu & membersihkan sesi usang
  const intervalId = setInterval(broadcastAll, 3000);

  // Listener A: BroadcastChannel
  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = () => {
        broadcastAll();
      };
    } catch {}
  }

  // Listener B: Storage Event
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SESSIONS_STORAGE_KEY) {
      broadcastAll();
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    clearInterval(intervalId);
    if (bc) bc.close();
    window.removeEventListener('storage', handleStorage);
  };
}
