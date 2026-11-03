import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passcode, teacher } = body;

    // 1. Verifikasi Kode Otorisasi Dewan Guru di Sisi Server (Backend)
    // Server memprioritaskan Environment Variable, lalu konfigurasi database Supabase (teachers row __cbt_school_settings__), lalu fallback 'GURU58'.
    // Kode ini TIDAK PERNAH dikirim ke client/frontend bundle, sehingga aman 100% dari Inspect DevTools browser.
    let expectedPasscode = process.env.TEACHER_REGISTRATION_PASSCODE?.trim();

    if (!expectedPasscode) {
      try {
        const { data } = await supabase
          .from('teachers')
          .select('assignments')
          .eq('id', '__cbt_school_settings__')
          .maybeSingle();

        if (data?.assignments && typeof data.assignments === 'object') {
          const cfg = data.assignments as Record<string, any>;
          if (cfg.teacherRegistrationPasscode && typeof cfg.teacherRegistrationPasscode === 'string') {
            expectedPasscode = cfg.teacherRegistrationPasscode.trim();
          }
        }
      } catch (err) {
        console.warn('Gagal membaca passcode dari Supabase config row teachers:', err);
      }
    }

    if (!expectedPasscode) {
      try {
        const { data: directData } = await supabase
          .from('school_settings')
          .select('*')
          .eq('id', 'default')
          .maybeSingle();

        if (directData?.teacher_registration_passcode && typeof directData.teacher_registration_passcode === 'string') {
          expectedPasscode = directData.teacher_registration_passcode.trim();
        }
      } catch {}
    }

    // Default fallback jika belum dikonfigurasi di cloud/env
    if (!expectedPasscode) {
      expectedPasscode = 'GURU58';
    }

    const submittedPasscode = String(passcode || '').trim().toUpperCase();
    if (!submittedPasscode) {
      return NextResponse.json(
        {
          success: false,
          message: 'Kode Otorisasi Dewan Guru wajib diisi untuk verifikasi keamanan sekolah.'
        },
        { status: 400 }
      );
    }

    if (submittedPasscode !== expectedPasscode.toUpperCase()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Kode Otorisasi Dewan Guru salah! Akses pendaftaran ini dilindungi khusus bagi dewan guru resmi SMPN 58 Palembang.'
        },
        { status: 403 }
      );
    }

    // 2. Validasi Data Akun Guru
    if (!teacher || typeof teacher !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Data akun guru tidak valid.' },
        { status: 400 }
      );
    }

    const cleanName = String(teacher.name || '').trim();
    const cleanNip = String(teacher.nip || '').trim();
    const cleanEmail = String(teacher.email || '').trim().toLowerCase();
    const cleanPin = String(teacher.pin || '').trim();

    if (!cleanName || !cleanNip || !cleanEmail) {
      return NextResponse.json(
        { success: false, message: 'Nama lengkap, NIP, dan Email wajib diisi.' },
        { status: 400 }
      );
    }

    if (cleanPin.length < 4) {
      return NextResponse.json(
        { success: false, message: 'Password / PIN keamanan minimal 4 karakter.' },
        { status: 400 }
      );
    }

    // 3. Verifikasi Duplikasi NIP / Email di Database Supabase
    try {
      const { data: existing, error: checkErr } = await supabase
        .from('teachers')
        .select('id, nip, email')
        .or(`nip.eq.${cleanNip},email.eq.${cleanEmail}`)
        .limit(1);

      if (!checkErr && existing && existing.length > 0) {
        const dup = existing[0];
        if (dup.nip === cleanNip) {
          return NextResponse.json(
            { success: false, message: `NIP ${cleanNip} sudah terdaftar di sistem. Silakan masuk via menu Login.` },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { success: false, message: `Email ${cleanEmail} sudah terdaftar di sistem.` },
          { status: 409 }
        );
      }
    } catch (checkEx) {
      console.warn('Pengecekan duplikat guru:', checkEx);
    }

    // 4. Simpan Akun Baru ke Database Supabase
    const newId = teacher.id || `tea-${Date.now()}`;
    const newTeacherRecord = {
      id: newId,
      nip: cleanNip,
      name: cleanName,
      email: cleanEmail,
      subject: teacher.subject || '',
      classes: teacher.classes || [],
      assignments: teacher.assignments || [],
      role: teacher.role || 'guru_mapel',
      pin: cleanPin,
      avatar_color: teacher.avatarColor || 'bg-violet-600',
      status: 'Aktif Mengawas'
    };

    const { error: insertErr } = await supabase
      .from('teachers')
      .insert(newTeacherRecord);

    if (insertErr) {
      console.error('Gagal insert teacher ke Supabase:', insertErr);
      return NextResponse.json(
        { success: false, message: `Terjadi kendala saat menyimpan ke database cloud: ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran akun guru resmi berhasil diverifikasi!',
      teacher: {
        id: newId,
        nip: cleanNip,
        name: cleanName,
        email: cleanEmail,
        subject: teacher.subject || '',
        classes: teacher.classes || [],
        assignments: teacher.assignments || [],
        role: teacher.role || 'guru_mapel',
        pin: cleanPin,
        avatarColor: teacher.avatarColor || 'bg-violet-600',
        status: 'Aktif Mengawas',
        lastLogin: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('API register-teacher exception:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan internal pada server pendaftaran.' },
      { status: 500 }
    );
  }
}
