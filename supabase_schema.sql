-- ===============================================================
-- SKEMA DATABASE CBT MODERN - SUPABASE (POSTGRESQL)
-- Salin SELURUH isi file ini lalu tempel (paste) di SQL Editor Supabase
-- dan klik tombol "Run"
-- ===============================================================

-- 1. Bersihkan tabel lama jika sebelumnya pernah dibuat (Opsional)
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS exam_sessions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Aktifkan ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. TABEL PROFIL (Guru / Siswa)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'teacher' CHECK (role IN ('admin', 'teacher', 'student')),
    class_name VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL MATA PELAJARAN / UJIAN
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(150) NOT NULL,
    class_target VARCHAR(50) NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    violation_limit INT NOT NULL DEFAULT 3,
    token VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    scoring_rules JSONB NOT NULL DEFAULT '{
        "Pilihan Ganda": 1,
        "Pilihan Ganda Kompleks": 2,
        "Benar/Salah": 2,
        "Menjodohkan": 2,
        "Isian Singkat": 2,
        "Esai": 4
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL SOAL UJIAN
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (
        type IN (
            'Pilihan Ganda',
            'Pilihan Ganda Kompleks',
            'Benar/Salah',
            'Menjodohkan',
            'Isian Singkat',
            'Esai'
        )
    ),
    question_text TEXT NOT NULL,
    media_url TEXT,
    options JSONB DEFAULT '[]'::jsonb,
    answer JSONB NOT NULL,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL SESI UJIAN AKTIF (Untuk Monitoring Guru & Anti-Cheat)
CREATE TABLE exam_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    student_name VARCHAR(100) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    progress_count INT DEFAULT 0,
    violation_count INT DEFAULT 0,
    answers JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'blocked'))
);

-- 7. TABEL HASIL UJIAN (Arsip Nilai Siswa)
CREATE TABLE exam_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    student_name VARCHAR(100) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    total_earned NUMERIC(6, 2) DEFAULT 0,
    total_max NUMERIC(6, 2) DEFAULT 0,
    answers JSONB NOT NULL,
    violation_count INT DEFAULT 0,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================================
-- DATA AWAL CONTOH (SEED DATA)
-- Agar langsung ada 1 Mapel & 6 Contoh Soal (termasuk Benar/Salah baru)
-- ===============================================================

-- 1. Buat Contoh Mapel
INSERT INTO subjects (id, title, class_target, duration_minutes, violation_limit, token, is_active, scoring_rules)
VALUES (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Asesmen Sumatif Tengah Semester - IPA Terpadu',
    'IX-A',
    45,
    3,
    'IPA2026',
    TRUE,
    '{"Pilihan Ganda": 1, "Pilihan Ganda Kompleks": 2, "Benar/Salah": 2, "Menjodohkan": 2, "Isian Singkat": 2, "Esai": 4}'::jsonb
);

-- 2. Buat Contoh Soal (6 Tipe Soal Lengkap)
-- Soal 1: Pilihan Ganda
INSERT INTO questions (subject_id, type, question_text, options, answer, order_index)
VALUES (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Pilihan Ganda',
    'Organel sel yang berfungsi sebagai tempat berlangsungnya respirasi sel dan menghasilkan energi (ATP) adalah...',
    '[{"text": "Ribosom"}, {"text": "Mitokondria"}, {"text": "Badan Golgi"}, {"text": "Retikulum Endoplasma"}]'::jsonb,
    '"B"'::jsonb,
    1
);

-- Soal 2: Benar / Salah (Format Baru: Banyak Pernyataan)
INSERT INTO questions (subject_id, type, question_text, options, answer, order_index)
VALUES (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Benar/Salah',
    'Perhatikan pernyataan mengenai tata surya berikut. Tentukan apakah masing-masing pernyataan Benar atau Salah!',
    '[
        {"text": "Planet Venus merupakan planet terpanas di tata surya karena efek rumah kaca atmosfernya yang pekat."},
        {"text": "Bumi merupakan satu-satunya planet yang memiliki medan magnetik kuat."},
        {"text": "Bulan tidak memiliki atmosfer sehingga tidak terjadi perubahan cuaca atau angin."},
        {"text": "Matahari berotasi mengelilingi pusat Galaksi Bima Sakti."}
    ]'::jsonb,
    '["Benar", "Salah", "Benar", "Benar"]'::jsonb,
    2
);

-- Soal 3: Pilihan Ganda Kompleks
INSERT INTO questions (subject_id, type, question_text, options, answer, order_index)
VALUES (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Pilihan Ganda Kompleks',
    'Manakah di antara peristiwa berikut yang merupakan contoh perubahan kimia? (Pilihlah satu atau lebih jawaban)',
    '[{"text": "Besi mengalami perkaratan"}, {"text": "Es batu mencair menjadi air"}, {"text": "Kertas dibakar menjadi abu"}, {"text": "Gula larut dalam segelas teh"}]'::jsonb,
    '["A", "C"]'::jsonb,
    3
);

-- Soal 4: Menjodohkan
INSERT INTO questions (subject_id, type, question_text, options, answer, order_index)
VALUES (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Menjodohkan',
    'Pasangkanlah besaran pokok fisika di sebelah kiri dengan satuan internasionalnya (SI) di sebelah kanan!',
    '[
        {"q": {"text": "Panjang"}, "a": {"text": "Meter"}},
        {"q": {"text": "Massa"}, "a": {"text": "Kilogram"}},
        {"q": {"text": "Waktu"}, "a": {"text": "Sekon"}},
        {"q": {"text": "Suhu"}, "a": {"text": "Kelvin"}}
    ]'::jsonb,
    '"Otomatis"'::jsonb,
    4
);

-- Soal 5: Isian Singkat
INSERT INTO questions (subject_id, type, question_text, options, answer, order_index)
VALUES (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Isian Singkat',
    'Satuan standar gaya dalam Sistem Internasional (SI) yang dinamai menurut fisikawan Inggris terkenal adalah...',
    '[]'::jsonb,
    '["newton", "n"]'::jsonb,
    5
);

-- Soal 6: Esai
INSERT INTO questions (subject_id, type, question_text, options, answer, order_index)
VALUES (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Esai',
    'Jelaskan mengapa fotosintesis pada tumbuhan sangat penting bagi kelangsungan hidup seluruh makhluk hidup di bumi!',
    '[]'::jsonb,
    '"Menghasilkan oksigen untuk respirasi makhluk hidup dan menghasilkan glukosa/energi sebagai produsen primer rantai makanan."'::jsonb,
    6
);

-- ===============================================================
-- 8. TABEL DATA SISWA (Roster Siswa Peserta Ujian)
-- ===============================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nisn VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    gender VARCHAR(20) DEFAULT 'Laki-Laki',
    class_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all students" ON students FOR ALL USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE students;

-- ===============================================================
-- 9. TABEL NOTIFIKASI EVENT SISTEM (Lonceng 🔔)
-- Otomatis terisi saat siswa submit, tab switch violation, dsb.
-- ===============================================================
CREATE TABLE IF NOT EXISTS exam_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    student_name VARCHAR(100),
    type VARCHAR(30) NOT NULL CHECK (type IN ('submission', 'violation', 'autolock', 'system')),
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================================
-- 9. TABEL PESAN KENDALA SISWA & BROADCAST PENGAWAS (Amplop ✉️)
-- Siswa lapor kendala -> Guru terima & balas / Kirim Broadcast
-- ===============================================================
CREATE TABLE IF NOT EXISTS exam_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    sender_name VARCHAR(100) NOT NULL,
    sender_role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (sender_role IN ('student', 'teacher', 'admin')),
    target_type VARCHAR(20) NOT NULL DEFAULT 'proctor' CHECK (target_type IN ('broadcast', 'proctor', 'student')),
    student_class VARCHAR(50),
    question_number INT,
    title VARCHAR(150),
    body TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'acknowledged')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AKTIFKAN KEAMANAN RLS (Public read-write untuk aplikasi CBT)
ALTER TABLE exam_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all notifications" ON exam_notifications FOR ALL USING (true);

ALTER TABLE exam_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all messages" ON exam_messages FOR ALL USING (true);

-- AKTIFKAN SUPABASE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE exam_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE exam_messages;

-- CONTOH DATA AWAL NOTIFIKASI & PESAN
INSERT INTO exam_notifications (subject_id, student_name, type, title, message, is_read)
VALUES
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Ahmad Fauzan',
    'submission',
    'Ujian Telah Diselesaikan',
    'Siswa Ahmad Fauzan (Kelas 8A) telah menyelesaikan ujian IPA dengan skor 87%.',
    false
),
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Budi Santoso',
    'violation',
    'Peringatan Anti-Cheat',
    'Siswa terdeteksi berpindah tab browser sebanyak 1x saat ujian berlangsung.',
    false
);

INSERT INTO exam_messages (subject_id, sender_name, sender_role, target_type, student_class, question_number, title, body, status)
VALUES
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Siti Rahmawati',
    'student',
    'proctor',
    '8A',
    4,
    'Kendala Gambar Soal',
    'Pak/Bu Pengawas, gambar diagram sel pada soal no. 4 tidak muncul di layar saya.',
    'pending'
),
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Pengawas Ruang 1',
    'teacher',
    'broadcast',
    '8A',
    NULL,
    'Pengumuman Waktu Ujian',
    'Waktu ujian tersisa 15 menit lagi. Harap periksa kembali nomor yang masih ragu-ragu.',
    'acknowledged'
);
