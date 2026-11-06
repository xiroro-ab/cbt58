-- GuruPro CBT Modern: perbaikan Live Monitoring
-- Jalankan satu kali di Supabase SQL Editor.
--
-- Perubahan ini tidak menyentuh students atau exam_results.
-- Sesi live bersifat sementara; jika ada duplikat identitas sesi yang sama,
-- hanya baris dengan heartbeat terbaru yang dipertahankan agar unique index
-- dapat dibuat tanpa mengubah hasil ujian.

BEGIN;

ALTER TABLE public.exam_sessions
    ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remaining_seconds INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_focus BOOLEAN DEFAULT TRUE;

WITH ranked_sessions AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY subject_id, student_name, class_name
            ORDER BY last_heartbeat DESC NULLS LAST, start_time DESC NULLS LAST, id DESC
        ) AS row_number
    FROM public.exam_sessions
)
DELETE FROM public.exam_sessions AS sessions
USING ranked_sessions AS ranked
WHERE sessions.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_subject_student_class_key
    ON public.exam_sessions (subject_id, student_name, class_name);

ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all exam sessions" ON public.exam_sessions;
CREATE POLICY "Allow public all exam sessions" ON public.exam_sessions
    FOR ALL TO public USING (true) WITH CHECK (true);

COMMIT;

-- Verifikasi: harus menampilkan tiga kolom baru dan unique index.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'exam_sessions'
  AND column_name IN ('total_questions', 'remaining_seconds', 'is_focus')
ORDER BY column_name;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'exam_sessions'
  AND indexname = 'exam_sessions_subject_student_class_key';
