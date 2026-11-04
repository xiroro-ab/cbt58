import { NextRequest, NextResponse } from 'next/server';
import { sanitizeAndParseAiJson, validateAndConvertRawQuestions } from '@/lib/aiQuestionGenerator';

// Maksimum durasi eksekusi di Vercel Serverless Function (60 detik)
export const maxDuration = 60;

function getServerGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_KEY ||
    ''
  ).trim();
}

export async function GET() {
  const serverKey = getServerGeminiApiKey();
  return NextResponse.json({
    status: 'ready',
    hasServerKey: !!serverKey,
    defaultModel: 'gemini-3.5-flash'
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fileBase64,
      mimeType = 'application/pdf',
      fileName = 'naskah_soal.pdf',
      rawText = '',
      subjectTitle = 'Mata Pelajaran',
      className = 'Kelas VIII',
      apiKey: clientApiKey = '',
      model: clientModel = ''
    } = body;

    const serverKey = getServerGeminiApiKey();
    // Prioritas API Key: Input pribadi guru -> Kunci server bawaan website
    const apiKey = clientApiKey?.trim() || serverKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'API_KEY_REQUIRED',
          message:
            'Kunci API Gemini belum dipasang di sistem. Silakan masukkan API Key Gemini Anda di menu Import Soal atau pasang di Vercel Environment Variables.'
        },
        { status: 400 }
      );
    }

    if (!fileBase64 && !rawText?.trim()) {
      return NextResponse.json(
        {
          error: 'EMPTY_INPUT',
          message: 'Silakan pilih file PDF/dokumen atau tempelkan teks naskah soal yang ingin diimpor.'
        },
        { status: 400 }
      );
    }

    const extractionInstruction = `
Kamu adalah sistem parser dan ekstraktor naskah ujian CBT sekolah formal (SMP/MTs/SMA).
TUGAS UTAMA: Baca seluruh isi dokumen/naskah soal yang diberikan secara teliti, lalu ekstrak dan konversikan seluruh butir soal yang ada menjadi format JSON CBT murni yang siap disimpan ke database.

Mata Pelajaran: ${subjectTitle}
Jenjang/Kelas: ${className}
Nama Berkas: ${fileName}

PETUNJUK EKSTRAKSI KHUSUS:
1. DETEKSI TIPE SOAL:
   - "Pilihan Ganda" (PG): Memiliki pertanyaan dan opsi pilihan A, B, C, D (atau E).
   - "Pilihan Ganda Kompleks" (PGK): Siswa memilih lebih dari 1 jawaban yang benar (misal mencentang kotak). "answer": ["A", "C"].
   - "Benar/Salah":
     * Jika memiliki beberapa baris pernyataan dalam 1 nomor (misal pernyataan a, b, c atau baris-baris tabel asesmen), masukkan setiap pernyataan ke dalam array "options": [{ "text": "Pernyataan a..." }, { "text": "Pernyataan b..." }], dan "answer" berupa array string kunci: ["Salah", "Benar"].
     * Jika hanya 1 pernyataan tunggal, kosongkan "options": [] dan isi "answer": "Benar" (atau "Salah").
   - "Menjodohkan": Mencocokkan premis/pertanyaan kolom kiri dengan pasangan jawaban kolom kanan. "options": [{ "q": { "text": "Premis Kiri" }, "a": { "text": "Pasangan Kanan Cocok" } }], "answer": null.
   - "Isian Singkat": Jawaban singkat berupa kata/frasa/angka pasti. "options": [], "answer": ["Kunci Jawaban", "variasi sinonim"].
   - "Esai": Soal uraian atau penjelasan bebas. "options": [], "answer": "Rubrik penilaian".

2. STRUKTUR FORMAT DATA:
   Kembalikan HANYA array JSON (Array of Objects) dengan struktur berikut untuk setiap soal:
   [
     {
       "type": "Pilihan Ganda",
       "questionText": "Teks lengkap butir pertanyaan...",
       "options": [
         { "text": "Pilihan A tanpa awalan huruf" },
         { "text": "Pilihan B tanpa awalan huruf" },
         { "text": "Pilihan C tanpa awalan huruf" },
         { "text": "Pilihan D tanpa awalan huruf" }
       ],
       "answer": "A"
     },
     {
       "type": "Menjodohkan",
       "questionText": "Petunjuk menjodohkan premis di kolom kiri dengan pasangan di kolom kanan...",
       "options": [
         { "q": { "text": "Premis Kiri 1" }, "a": { "text": "Pasangan Kanan 1" } },
         { "q": { "text": "Premis Kiri 2" }, "a": { "text": "Pasangan Kanan 2" } }
       ],
       "answer": null
     },
     {
       "type": "Isian Singkat",
       "questionText": "Pertanyaan dengan jawaban kata kunci...",
       "options": [],
       "answer": ["Jawaban Pokok", "sinonim"]
     }
   ]

3. KUNCI JAWABAN (ANSWER):
   - Jika pada naskah soal terdapat penanda kunci jawaban (misalnya: kunci jawaban di lembar akhir, tulisan "Kunci: C", huruf tebal, tanda centang/lingkaran, pasangan "1-C, 2-A", atau kotak "[S]" "[B]"), gunakan kunci tersebut.
   - Jika pada soal Benar/Salah berupa kotak kosong "a. [ ]  b. [ ]" atau naskah tidak memuat kunci eksplisit, analisis pernyataan dan tentukan kunci status kebenaran yang paling akurat secara akademis.
   - Untuk Menjodohkan, q dan a harus sudah berupa pasangan yang tepat, dan answer diset null.

4. PEMBERSIHAN TEKS:
   - Bersihkan prefix huruf opsi seperti "A. ", "A) ", "B. ", "b) " dari field 'text' di dalam options, karena sistem web akan merendernya otomatis.
   - Singkirkan nomor urut soal di awal pertanyaan (misal "1. ", "Soal no 2: ") agar teks pertanyaan bersih.
   - Lewatkan teks kop surat sekolah, petunjuk umum ujian ("Pilihlah salah satu..."), atau tanda tangan pengawas yang bukan merupakan butir soal.

WAJIB: Hasilkan HANYA kode JSON murni tanpa pengantar obrolan, tanpa blok markdown triple backticks. Langsung mulai dengan "[" dan akhiri dengan "]".
`.trim();

    // Siapkan parts untuk Gemini API
    const parts: any[] = [];

    // Jika ada file base64 (PDF atau Gambar)
    if (fileBase64) {
      // Bersihkan data url prefix jika ada (contoh: "data:application/pdf;base64,...")
      const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '').trim();
      let detectedMime = mimeType;
      if (fileName.toLowerCase().endsWith('.pdf')) {
        detectedMime = 'application/pdf';
      } else if (fileName.toLowerCase().endsWith('.png')) {
        detectedMime = 'image/png';
      } else if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg')) {
        detectedMime = 'image/jpeg';
      }

      parts.push({
        inlineData: {
          mimeType: detectedMime,
          data: cleanBase64
        }
      });
    }

    // Jika ada teks naskah (rawText) yang sudah berupa JSON array dari Gemini Web / ChatGPT:
    if (rawText && !fileBase64) {
      const trimmedText = rawText.trim();
      const isLikelyJson =
        trimmedText.startsWith('[') ||
        trimmedText.startsWith('{') ||
        trimmedText.includes('"questionText"');

      if (isLikelyJson) {
        let preParsed: any[] = [];
        try {
          preParsed = sanitizeAndParseAiJson(trimmedText);
        } catch {
          const match = trimmedText.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (match) {
            try {
              preParsed = sanitizeAndParseAiJson(match[0]);
            } catch {}
          }
        }

        if (Array.isArray(preParsed) && preParsed.length > 0) {
          return NextResponse.json({
            success: true,
            questions: preParsed,
            meta: {
              totalExtracted: preParsed.length,
              model: 'Local JSON Parser (Direct)'
            }
          });
        }
      }
    }

    // Jika ada teks naskah (rawText)
    if (rawText?.trim()) {
      parts.push({
        text: `--- NASKAH SOAL YANG HARUS DIEKSTRAK ---\n${rawText.trim()}\n--- AKHIR NASKAH SOAL ---`
      });
    }

    // Tambahkan instruksi sistem
    parts.push({
      text: extractionInstruction
    });

    // Urutan kandidat model:
    // 1. Model yang diminta pengguna
    // 2. Jika GURU MEMASUKKAN MODEL MANUAL: HANYA gunakan model tersebut (tidak boleh fallback ke model lain)
    const userSpecifiedModel = clientModel?.trim();
    const defaultModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const primaryModel = (userSpecifiedModel || defaultModel).replace(/^models\//i, '').trim();

    // HANYA gunakan fallback jika guru TIDAK menentukan model sendiri (default website)
    const candidateModels = userSpecifiedModel
      ? [primaryModel]
      : Array.from(new Set([
          primaryModel,
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-1.5-flash'
        ]));

    let rawOutputText = '';
    let successfulModel = primaryModel;
    let lastErrorMsg = '';
    let lastErrorStatus = 500;
    let lastErrorJson: any = null;

    for (const modelToTry of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          modelToTry
        )}:generateContent?key=${apiKey}`;

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts
              }
            ],
            generationConfig: {
              temperature: 0.1, // Rendah agar ekstraksi sangat presisi dan faktual
              topP: 0.95,
              responseMimeType: 'application/json'
            }
          })
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          rawOutputText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawOutputText) {
            successfulModel = modelToTry;
            break; // Sukses mengekstrak naskah soal!
          }
        }

        const errText = await geminiRes.text();
        let errJson: any = null;
        try {
          errJson = JSON.parse(errText);
        } catch {}

        lastErrorStatus = geminiRes.status;
        lastErrorJson = errJson;
        lastErrorMsg = errJson?.error?.message || `Gagal dengan status ${geminiRes.status}`;

        // Jika error 503 (Model Overloaded) atau 429 (Resource Exhausted / High Demand), coba model berikutnya
        const isOverloaded =
          geminiRes.status === 503 ||
          geminiRes.status === 429 ||
          lastErrorMsg.toLowerCase().includes('overloaded') ||
          lastErrorMsg.toLowerCase().includes('demand');

        if (isOverloaded) {
          console.warn(`Model ${modelToTry} mengalami high demand/overload, beralih ke model cadangan berikutnya...`);
          continue;
        } else {
          // Jika error lain (misal API key invalid), jangan looping
          break;
        }
      } catch (callErr: any) {
        lastErrorMsg = callErr.message || 'Network call error';
      }
    }

    if (!rawOutputText) {
      const isHighDemand =
        lastErrorStatus === 503 ||
        lastErrorStatus === 429 ||
        lastErrorMsg.toLowerCase().includes('overloaded') ||
        lastErrorMsg.toLowerCase().includes('demand');

      let helpfulMsg = lastErrorMsg || 'Gagal mengekstrak soal dari dokumen dengan AI.';

      if (isHighDemand) {
        helpfulMsg = `Server Google Gemini saat ini sedang mengalami lonjakan antrean (High Demand/Overloaded 503/429) untuk model "${primaryModel}". Solusi Cepat: Silakan gunakan tombol "Ekstrak Instan JSON / Naskah" atau upload naskah ke gemini.google.com secara gratis tanpa batasan.`;
      } else if (lastErrorStatus === 404 || lastErrorMsg.toLowerCase().includes('not found')) {
        helpfulMsg = `Model Gemini "${primaryModel}" tidak ditemukan di Google AI Studio (API v1beta) atau belum didukung. Tips: Pastikan nama model sesuai yang terdaftar di Google AI Studio (misal: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash), atau gunakan tombol "Ekstrak Instan" tanpa memerlukan API.`;
      }

      console.error('Gemini Import API Final Error:', helpfulMsg, lastErrorJson);
      return NextResponse.json(
        {
          error: 'GEMINI_API_ERROR',
          message: helpfulMsg,
          details: lastErrorJson
        },
        { status: lastErrorStatus }
      );
    }

    // Parse output JSON
    let parsedQuestions: any[] = [];
    try {
      const parsed = sanitizeAndParseAiJson(rawOutputText);
      if (Array.isArray(parsed)) {
        parsedQuestions = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const potentialArray = Object.values(parsed).find(v => Array.isArray(v));
        if (potentialArray) {
          parsedQuestions = potentialArray as any[];
        } else {
          parsedQuestions = [parsed];
        }
      }
    } catch (parseErr: any) {
      console.error('Error parsing imported questions JSON:', parseErr, rawOutputText);
      return NextResponse.json(
        {
          error: 'JSON_PARSE_ERROR',
          message:
            'Gagal memformat hasil analisis dokumen menjadi struktur data soal. Silakan coba lagi atau salin teks naskah langsung ke formulir.',
          raw: rawOutputText
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: parsedQuestions,
      meta: {
        totalExtracted: parsedQuestions.length,
        fileName,
        subjectTitle,
        model: successfulModel,
        usedKeyType: clientApiKey?.trim() ? 'custom' : (serverKey ? 'server' : 'none')
      }
    });
  } catch (error: any) {
    console.error('Import Questions Route Error:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Terjadi kesalahan pada server ekstraksi dokumen.' },
      { status: 500 }
    );
  }
}
