-- ====================================================================
-- FIX: Tambahkan kolom updated_at pada public.exam_sessions
-- ====================================================================
-- Jalankan skrip ini 1x di Supabase SQL Editor untuk memastikan trigger
-- database tidak error (Postgres error 42703: record "new" has no field "updated_at").
--
-- Skrip ini AMAN: tidak menghapus data siswa atau hasil ujian.

BEGIN;

-- 1. Tambahkan kolom updated_at jika belum ada
ALTER TABLE public.exam_sessions
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Pastikan kolom total_questions, remaining_seconds, is_focus sudah ada
ALTER TABLE public.exam_sessions
    ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remaining_seconds INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_focus BOOLEAN DEFAULT TRUE;

-- 3. Pastikan unique constraint ada untuk upsert
CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_subject_student_class_key
    ON public.exam_sessions (subject_id, student_name, class_name);

-- 4. Pastikan RLS aktif dan mengizinkan operasi public
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all exam sessions" ON public.exam_sessions;
CREATE POLICY "Allow public all exam sessions" ON public.exam_sessions
    FOR ALL TO public USING (true) WITH CHECK (true);

COMMIT;

-- Verifikasi hasil
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exam_sessions'
ORDER BY ordinal_position;
