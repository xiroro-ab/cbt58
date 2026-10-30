import { supabase } from './supabaseClient';
import { Subject, Question, ExamResult, ScoringRules, ExamNotification, ExamMessage, Student, Teacher } from '@/types/cbt';
import { initialSubject, sampleQuestions } from './mockData';
import { initialStudents } from './rosterStudents';
import { initialTeachers } from './rosterTeachers';

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
 * Berlangganan (Realtime Subscription) hasil ujian baru dari Supabase
 */
export function subscribeToExamResults(
  subjectId: string,
  onNewResult: (result: ExamResult) => void
) {
  try {
    const channel = supabase
      .channel('realtime_exam_results')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exam_results',
          filter: `subject_id=eq.${subjectId}`
        },
        payload => {
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
            onNewResult(mappedResult);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription not available, fallback to manual refresh:', err);
    return () => {};
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
      query = query.eq('subject_id', subjectId);
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
      createdAt: new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
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

    return data.map(t => ({
      id: t.id,
      nip: t.nip,
      name: t.name,
      email: t.email,
      subject: t.subject,
      classes: t.classes || [],
      role: t.role || 'guru_mapel',
      pin: t.pin || '123456',
      avatarColor: t.avatar_color || 'bg-violet-600',
      status: t.status || 'Standby',
      lastLogin: t.last_login
    }));
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

