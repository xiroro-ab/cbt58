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
    defaultModel: 'gemini-2.5-flash'
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
   - "Pilihan Ganda Kompleks" (PGK): Siswa memilih lebih dari 1 jawaban yang benar (misal mencentang kotak).
   - "Benar/Salah": Pernyataan dengan opsi Benar / Salah.
   - "Menjodohkan": Mencocokkan premis/pertanyaan dengan pasangan jawaban.
   - "Isian Singkat": Jawaban singkat berupa kata/frasa/angka pasti.
   - "Esai": Soal uraian atau penjelasan bebas.

2. STRUKTUR FORMAT DATA:
   Kembalikan HANYA array JSON (Array of Objects) dengan struktur berikut untuk setiap soal:
   [
     {
       "type": "Pilihan Ganda" | "Pilihan Ganda Kompleks" | "Benar/Salah" | "Menjodohkan" | "Isian Singkat" | "Esai",
       "questionText": "Teks lengkap butir pertanyaan (termasuk stimulus, kutipan bacaan, dialog, atau cerita jika ada)",
       "options": [
         { "text": "Isi pilihan A tanpa awalan A. atau A)" },
         { "text": "Isi pilihan B tanpa awalan B. atau B)" },
         { "text": "Isi pilihan C tanpa awalan C. atau C)" },
         { "text": "Isi pilihan D tanpa awalan D. atau D)" }
       ],
       "answer": "A", // Jawaban benar (huruf opsi, string, atau array huruf untuk PGK)
       "explanation": "Penjelasan atau kunci pembahasan ringkas jika ada di naskah"
     }
   ]

3. KUNCI JAWABAN (ANSWER):
   - Jika pada naskah soal terdapat penanda kunci jawaban (misalnya: kunci jawaban di lembar akhir, tulisan "Kunci: C", huruf tebal, tanda centang/lingkaran), gunakan kunci tersebut.
   - Jika naskah soal tidak memuat kunci jawaban secara eksplisit, analisis pertanyaan dan tentukan kunci jawaban yang paling benar dan tepat secara keilmuan akademis.

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

    // Urutan kandidat model untuk mitigasi kendala 'High Demand' (Overloaded 503 / 429):
    // 1. Model yang diminta pengguna
    // 2. gemini-1.5-flash (paling stabil & kuota tertinggi)
    // 3. gemini-2.0-flash
    const defaultModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const rawModel = (clientModel?.trim() || defaultModel).trim();
    const primaryModel = rawModel.replace(/^models\//i, '');

    const candidateModels = Array.from(new Set([
      primaryModel,
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.5-flash'
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

      const helpfulMsg = isHighDemand
        ? 'Server Google Gemini saat ini sedang mengalami lonjakan beban (High Demand/Overloaded) untuk file PDF. Solusi Cepat: Silakan gunakan tab "Salin & Tempel Teks" atau klik "Salin Prompt AI" lalu upload naskah ke gemini.google.com secara gratis tanpa batasan.'
        : lastErrorMsg || 'Gagal mengekstrak soal dari dokumen dengan AI.';

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
