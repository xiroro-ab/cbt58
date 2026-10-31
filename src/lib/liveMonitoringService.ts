import { ExamSession, ExamResult } from '@/types/cbt';
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

export type ResultChangeAction = 'INSERT' | 'UPDATE' | 'DELETE';
export interface ResultChangePayload {
  action: ResultChangeAction;
  subjectId: string;
  result?: ExamResult;
  resultId?: string;
  studentName?: string;
}

// Set of listeners for live sessions updates (Teacher View)
const liveSessionListeners = new Set<(sessions: ExamSession[]) => void>();

// Set of listeners for proctor commands (Student View)
const studentCommandListeners = new Set<(cmd: ProctorCommand) => void>();

// Set of listeners for exam results changes (Teacher Dashboard & Database Nilai)
const resultChangeListeners = new Set<(payload: ResultChangePayload) => void>();

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
        } else if (event.data?.type === 'RESULT_CHANGE' && event.data.payload) {
          resultChangeListeners.forEach(fn => {
            try { fn(event.data.payload); } catch {}
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
          if (session && session.studentName) {
            const cleanName = session.studentName.toLowerCase().trim();
            const current = getStoredSessions();
            const updated = [
              session,
              ...current.filter(s => s.studentName.toLowerCase().trim() !== cleanName)
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
            const cleanName = studentName.toLowerCase().trim();
            const current = getStoredSessions();
            const filtered = current.filter(
              s => s.studentName.toLowerCase().trim() !== cleanName
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
        .on('broadcast', { event: 'result_change' }, (payload: any) => {
          const changePayload: ResultChangePayload = payload.payload;
          if (changePayload) {
            resultChangeListeners.forEach(fn => {
              try { fn(changePayload); } catch {}
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

    // Deduplikasi ketat per nama siswa: simpan yang paling mutakhir detak jantungnya
    const dedupedMap = new Map<string, ExamSession>();
    for (const s of list) {
      if (!s || !s.studentName) continue;
      const key = s.studentName.toLowerCase().trim();
      const existing = dedupedMap.get(key);
      if (!existing || s.lastHeartbeat > existing.lastHeartbeat) {
        dedupedMap.set(key, s);
      }
    }
    const dedupedList = Array.from(dedupedMap.values());

    // Jika siswa tidak mengirim detak jantung (heartbeat) lebih dari 3.5 detik (misal aplikasi diminimalkan / di layar utama HP),
    // otomatis tandai isFocus = false agar pengawas langsung tahu siswa sedang di luar aplikasi
    const marked = dedupedList.map(s => {
      if (s.status === 'ongoing' && (now - s.lastHeartbeat) > 3500 && s.isFocus) {
        return { ...s, isFocus: false };
      }
      return s;
    });

    // Bersihkan sesi usang (tidak ada heartbeat > 120 detik, KECUALI yang statusnya blocked/terkunci)
    const active = marked.filter(s => s.status === 'blocked' || (now - s.lastHeartbeat) < 120000);
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
  if (typeof window === 'undefined' || !session || !session.studentName) return;

  const cleanName = session.studentName.toLowerCase().trim();

  // 1. Simpan ke localStorage lokal dengan deduplikasi ketat per nama siswa
  let updated: ExamSession[] = [];
  try {
    const current = getStoredSessions();
    updated = [
      session,
      ...current.filter(s => s.studentName.toLowerCase().trim() !== cleanName)
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
 * Menghapus sesi aktif ketika siswa telah menyelesaikan ujian secara mandiri atau dipaksa selesai
 */
export function removeStudentSession(studentName: string, subjectId?: string) {
  if (typeof window === 'undefined' || !studentName) return;
  try {
    const cleanName = studentName.toLowerCase().trim();
    const current = getStoredSessions();
    const filtered = current.filter(
      s => s.studentName.toLowerCase().trim() !== cleanName
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
    const cleanName = cmd.studentName.toLowerCase().trim();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cbt_blocked_${cmd.subjectId}_${cleanName}`);
        const stateKey = `cbt_exam_state_${cmd.subjectId}_${cleanName}`;
        const saved = localStorage.getItem(stateKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.violationCount = 0;
          parsed.isLocked = false;
          localStorage.setItem(stateKey, JSON.stringify(parsed));
        }
      } catch {}
    }

    const current = getStoredSessions();
    const updated = current.map(s => {
      if (s.studentName.toLowerCase().trim() === cleanName && s.subjectId === cmd.subjectId) {
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
  } else if (cmd.action === 'RESET_EXAM') {
    const cleanName = cmd.studentName.toLowerCase().trim();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cbt_blocked_${cmd.subjectId}_${cleanName}`);
        localStorage.removeItem(`cbt_exam_state_${cmd.subjectId}_${cleanName}`);
        localStorage.removeItem(`cbt_answers_${cmd.studentName}_${cmd.subjectId}`);
        localStorage.removeItem(`cbt_submitted_${cmd.subjectId}_${cleanName}`);
      } catch {}
    }
    removeStudentSession(cmd.studentName, cmd.subjectId);
  } else if (cmd.action === 'FORCE_FINISH') {
    const cleanName = cmd.studentName.toLowerCase().trim();
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`cbt_blocked_${cmd.subjectId}_${cleanName}`);
        localStorage.removeItem(`cbt_exam_state_${cmd.subjectId}_${cleanName}`);
      } catch {}
    }
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
 * Mengirim notifikasi perubahan data hasil ujian (Realtime Broadcast ke Dashboard & Database Nilai)
 */
export function notifyResultChanged(payload: ResultChangePayload) {
  if (typeof window === 'undefined') return;

  // 1. Notifikasi listeners lokal di tab aktif
  resultChangeListeners.forEach(fn => {
    try { fn(payload); } catch {}
  });

  // 2. Siarkan via BroadcastChannel lokal (antar-tab browser sama)
  const bc = getSharedBroadcastChannel();
  if (bc) {
    try {
      bc.postMessage({ type: 'RESULT_CHANGE', payload });
    } catch {}
  }

  // 3. Siarkan via Supabase Realtime Channel (lintas perangkat / PC guru & laptop siswa)
  const supa = initSupabaseChannel();
  if (supa) {
    try {
      supa.send({
        type: 'broadcast',
        event: 'result_change',
        payload
      });
    } catch {}
  }
}

/**
 * Guru/Dashboard mendengarkan pembaruan hasil ujian secara realtime
 */
export function subscribeToResultChanges(onResultChange: (payload: ResultChangePayload) => void): () => void {
  resultChangeListeners.add(onResultChange);
  return () => {
    resultChangeListeners.delete(onResultChange);
  };
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
