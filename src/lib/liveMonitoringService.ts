import { ExamSession } from '@/types/cbt';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const SESSIONS_STORAGE_KEY = 'cbt_live_sessions';
const COMMAND_STORAGE_KEY = 'cbt_teacher_command';
const CHANNEL_NAME = 'cbt_live_monitoring_channel';

export type ProctorActionType = 'FORCE_FINISH' | 'RESET_VIOLATION' | 'RESET_EXAM';

export interface ProctorCommand {
  action: ProctorActionType;
  studentName: string;
  subjectId: string;
  timestamp: number;
}

// Set of listeners for live sessions updates (Teacher View)
const liveSessionListeners = new Set<(sessions: ExamSession[]) => void>();

// Set of listeners for proctor commands (Student View)
const studentCommandListeners = new Set<(cmd: ProctorCommand) => void>();

// Singleton BroadcastChannel untuk sinkronisasi antar-tab dalam browser yang sama
let sharedBc: BroadcastChannel | null = null;
function getSharedBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!('BroadcastChannel' in window)) return null;
  if (!sharedBc) {
    try {
      sharedBc = new BroadcastChannel(CHANNEL_NAME);
      sharedBc.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === 'SESSION_UPDATE' || event.data?.type === 'SESSION_REMOVED') {
          const sessions = getStoredSessions();
          liveSessionListeners.forEach(fn => {
            try { fn(sessions); } catch {}
          });
        } else if (event.data?.type === 'PROCTOR_COMMAND' && event.data.command) {
          studentCommandListeners.forEach(fn => {
            try { fn(event.data.command); } catch {}
          });
        }
      });
    } catch {
      sharedBc = null;
    }
  }
  return sharedBc;
}

// Singleton Supabase Realtime Channel untuk sinkronisasi lintas perangkat (HP siswa <-> Laptop pengawas)
let sharedSupaChannel: any = null;
function initSupabaseChannel() {
  if (!isSupabaseConfigured || typeof window === 'undefined') return null;
  if (!sharedSupaChannel) {
    try {
      sharedSupaChannel = supabase.channel('cbt_live_room', {
        config: { broadcast: { self: true } }
      });

      // Pasang listeners broadcast sebelum memanggil .subscribe()
      sharedSupaChannel
        .on('broadcast', { event: 'session_heartbeat' }, (payload: any) => {
          const session: ExamSession = payload.payload;
          if (session) {
            const current = getStoredSessions();
            const updated = [
              session,
              ...current.filter(s => !(s.studentName.toLowerCase().trim() === session.studentName.toLowerCase().trim() && s.subjectId === session.subjectId))
            ];
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
            liveSessionListeners.forEach(fn => {
              try { fn(updated); } catch {}
            });
          }
        })
        .on('broadcast', { event: 'session_removed' }, (payload: any) => {
          const { studentName, subjectId } = payload.payload || {};
          if (studentName) {
            const current = getStoredSessions();
            const filtered = current.filter(
              s => !(s.studentName.toLowerCase().trim() === studentName.toLowerCase().trim() && s.subjectId === subjectId)
            );
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtered));
            liveSessionListeners.forEach(fn => {
              try { fn(filtered); } catch {}
            });
          }
        })
        .on('broadcast', { event: 'proctor_command' }, (payload: any) => {
          const cmd: ProctorCommand = payload.payload;
          if (cmd) {
            studentCommandListeners.forEach(fn => {
              try { fn(cmd); } catch {}
            });
          }
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            // Channel aktif terhubung
          }
        });
    } catch (e) {
      console.warn('Gagal inisialisasi Realtime Channel Supabase:', e);
    }
  }
  return sharedSupaChannel;
}

// Inisialisasi awal channel di environment browser
if (typeof window !== 'undefined') {
  getSharedBroadcastChannel();
  initSupabaseChannel();

  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === SESSIONS_STORAGE_KEY) {
      const sessions = getStoredSessions();
      liveSessionListeners.forEach(fn => {
        try { fn(sessions); } catch {}
      });
    } else if (e.key === COMMAND_STORAGE_KEY && e.newValue) {
      try {
        const cmd: ProctorCommand = JSON.parse(e.newValue);
        studentCommandListeners.forEach(fn => {
          try { fn(cmd); } catch {}
        });
      } catch {}
    }
  });
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
    // Bersihkan sesi usang (tidak ada heartbeat > 120 detik)
    const active = list.filter(s => (now - s.lastHeartbeat) < 120000);
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

  // 1. Simpan ke localStorage lokal
  let updated: ExamSession[] = [];
  try {
    const current = getStoredSessions();
    updated = [
      session,
      ...current.filter(s => !(s.studentName.toLowerCase().trim() === session.studentName.toLowerCase().trim() && s.subjectId === session.subjectId))
    ];
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Gagal simpan sesi live lokal:', e);
  }

  // Notifikasi listeners di tab aktif seketika
  liveSessionListeners.forEach(fn => {
    try { fn(updated); } catch {}
  });

  // 2. Siarkan via BroadcastChannel lokal (antar-tab browser sama)
  const bc = getSharedBroadcastChannel();
  if (bc) {
    try {
      bc.postMessage({ type: 'SESSION_UPDATE', session });
    } catch {}
  }

  // 3. Siarkan via Supabase Realtime untuk dilihat komputer pengawas di jaringan lain
  const supa = initSupabaseChannel();
  if (supa) {
    try {
      supa.send({
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
    const filtered = current.filter(
      s => !(s.studentName.toLowerCase().trim() === studentName.toLowerCase().trim() && s.subjectId === subjectId)
    );
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filtered));

    // Notifikasi listeners lokal
    liveSessionListeners.forEach(fn => {
      try { fn(filtered); } catch {}
    });

    const bc = getSharedBroadcastChannel();
    if (bc) {
      bc.postMessage({ type: 'SESSION_REMOVED', studentName, subjectId });
    }

    const supa = initSupabaseChannel();
    if (supa) {
      supa.send({
        type: 'broadcast',
        event: 'session_removed',
        payload: { studentName, subjectId }
      });
    }
  } catch {}
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
  const bc = getSharedBroadcastChannel();
  if (bc) {
    try {
      bc.postMessage({ type: 'PROCTOR_COMMAND', command: payload });
    } catch {}
  }

  // 3. Update sesi lokal seketika
  if (cmd.action === 'RESET_VIOLATION') {
    const current = getStoredSessions();
    const updated = current.map(s => {
      if (s.studentName.toLowerCase().trim() === cmd.studentName.toLowerCase().trim() && s.subjectId === cmd.subjectId) {
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
    liveSessionListeners.forEach(fn => {
      try { fn(updated); } catch {}
    });
  } else if (cmd.action === 'FORCE_FINISH' || cmd.action === 'RESET_EXAM') {
    removeStudentSession(cmd.studentName, cmd.subjectId);
  }

  // 4. Siarkan via Supabase Realtime
  const supa = initSupabaseChannel();
  if (supa) {
    try {
      supa.send({
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

  const cleanName = studentName.toLowerCase().trim();

  const commandHandler = (cmd: ProctorCommand) => {
    if (!cmd) return;
    if (
      cmd.studentName.toLowerCase().trim() === cleanName &&
      cmd.subjectId === subjectId
    ) {
      onCommand(cmd);
    }
  };

  studentCommandListeners.add(commandHandler);

  return () => {
    studentCommandListeners.delete(commandHandler);
  };
}

/**
 * Pengawas mendengarkan seluruh pembaruan sesi siswa secara realtime
 */
export function subscribeToLiveSessions(
  onUpdate: (sessions: ExamSession[]) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Daftarkan listener
  liveSessionListeners.add(onUpdate);

  // Panggil pertama kali dari sesi yang tersimpan
  onUpdate(getStoredSessions());

  // Interval polling tiap 2 detik untuk menyegarkan sisa waktu dan memfilter sesi timeout
  const intervalId = setInterval(() => {
    onUpdate(getStoredSessions());
  }, 2000);

  return () => {
    liveSessionListeners.delete(onUpdate);
    clearInterval(intervalId);
  };
}
