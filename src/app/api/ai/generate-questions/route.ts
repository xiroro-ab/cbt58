import { NextRequest, NextResponse } from 'next/server';
import { buildAiQuestionPrompt, StandardBadge, sanitizeAndParseAiJson } from '@/lib/aiQuestionGenerator';

// Maksimum durasi eksekusi di Vercel Serverless Function (60 detik)
export const maxDuration = 60;

/**
 * Mendapatkan API Key Gemini dari Environment Vercel / Server
 * Mendukung beberapa variasi nama variabel lingkungan agar fail-safe
 */
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

/**
 * Endpoint status untuk memeriksa apakah Vercel sudah terpasang API Key Gemini
 */
export async function GET() {
  const serverKey = getServerGeminiApiKey();
  return NextResponse.json({
    status: 'ok',
    hasServerKey: Boolean(serverKey),
    envDetected: serverKey ? 'GEMINI_API_KEY_ACTIVE' : 'NONE'
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subjectTitle = 'Mata Pelajaran Umum',
      className = 'Kelas VIII',
      topic = 'Materi Pembelajaran Umum',
      difficulty = 'Campuran',
      selectedStandards = ['AKM', 'TKA'],
      counts = { pg: 5, pgk: 2, bs: 2, jodoh: 1, isian: 0, esai: 0 },
      customInstructions = '',
      apiKey: clientApiKey = '',
      model: clientModel = ''
    } = body;

    // Prioritas Kunci API: 1. Input pribadi guru -> 2. Environment Vercel server sekolah
    const serverKey = getServerGeminiApiKey();
    const apiKey = clientApiKey?.trim() || serverKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'API_KEY_REQUIRED',
          message:
            'Kunci API Gemini belum dipasang di Vercel (Environment Variables) maupun input guru. Silakan tambahkan variabel GEMINI_API_KEY di Vercel Dashboard -> Settings -> Environment Variables, atau masukkan API Key Anda di modal.'
        },
        { status: 400 }
      );
    }

    const totalCount =
      (counts.pg || 0) +
      (counts.pgk || 0) +
      (counts.bs || 0) +
      (counts.jodoh || 0) +
      (counts.isian || 0) +
      (counts.esai || 0);

    if (totalCount <= 0) {
      return NextResponse.json(
        {
          error: 'INVALID_COUNT',
          message: 'Jumlah total butir soal yang diminta minimal 1 butir.'
        },
        { status: 400 }
      );
    }

    // Bangun prompt sistem dengan integrasi multi-standar (AKM, PISA, TKA, Harian)
    const systemPrompt = buildAiQuestionPrompt({
      subjectTitle,
      className,
      topic,
      difficulty,
      selectedStandards: (Array.isArray(selectedStandards) && selectedStandards.length > 0)
        ? (selectedStandards as StandardBadge[])
        : ['AKM', 'TKA'],
      counts,
      customInstructions,
      model: clientModel
    });

    // Sanitasi nama model yang dipilih guru (bersihkan spasi dan prefix 'models/' jika ada)
    const userSpecifiedModel = clientModel?.trim();
    const defaultModel = process.env.NEXT_PUBLIC_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const primaryModel = (userSpecifiedModel || defaultModel).replace(/^models\//i, '').trim();

    // JIKA GURU MEMASUKKAN MODEL MANUAL:
    // Wajib 100% HANYA gunakan model dari inputan guru tersebut! JANGAN looping / fallback ke model lain!
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
                parts: [{ text: systemPrompt }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              responseMimeType: 'application/json'
            }
          })
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          rawOutputText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          successfulModel = modelToTry;
          break;
        }

        const errText = await geminiRes.text();
        let errJson: any = null;
        try {
          errJson = JSON.parse(errText);
        } catch {}

        lastErrorStatus = geminiRes.status;
        lastErrorJson = errJson;
        lastErrorMsg = errJson?.error?.message || `Gagal dengan status ${geminiRes.status}`;

        // Jika error High Demand (503) atau Rate Limit (429), lanjutkan fallback ke model berikutnya
        if (geminiRes.status === 503 || geminiRes.status === 429) {
          console.warn(`[Gemini Generate] Model "${modelToTry}" high demand (${geminiRes.status}), mencoba fallback model berikutnya...`);
          continue;
        }

        break;
      } catch (networkErr: any) {
        lastErrorMsg = networkErr?.message || 'Network fetch error';
        console.warn(`[Gemini Generate] Network error on model "${modelToTry}": ${lastErrorMsg}`);
      }
    }

    if (!rawOutputText) {
      const isHighDemand = lastErrorStatus === 503 || lastErrorStatus === 429;
      let friendlyMsg = lastErrorMsg || `Gagal menghubungi Gemini API (Status ${lastErrorStatus})`;

      if (isHighDemand) {
        friendlyMsg = `Server Google Gemini saat ini sedang mengalami lonjakan antrean (High Demand 503 / 429) untuk model "${primaryModel}". Solusi: Coba beberapa saat lagi atau gunakan tombol "Salin Prompt AI" lalu tempel ke gemini.google.com secara gratis tanpa batasan API.`;
      } else if (lastErrorStatus === 404 || lastErrorMsg.toLowerCase().includes('not found')) {
        friendlyMsg = `Model Gemini "${primaryModel}" tidak ditemukan di Google AI Studio (API v1beta) atau belum didukung. Tips: Pastikan nama model sesuai yang terdaftar di Google AI Studio (misal: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash).`;
      }

      return NextResponse.json(
        {
          error: 'GEMINI_API_ERROR',
          message: friendlyMsg,
          rawError: lastErrorJson
        },
        { status: lastErrorStatus }
      );
    }

    // Parse & bersihkan JSON hasil dari Gemini dengan auto-repair
    let parsedQuestions: any[] = [];
    try {
      parsedQuestions = sanitizeAndParseAiJson(rawOutputText);
    } catch (parseErr: any) {
      console.error('Error parsing Gemini JSON output:', parseErr, rawOutputText);
      return NextResponse.json(
        {
          error: 'JSON_PARSE_ERROR',
          message:
            'Format balasan dari AI belum berupa array JSON yang valid. Silakan klik generate ulang atau coba dengan model lain.',
          raw: rawOutputText
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: parsedQuestions,
      meta: {
        totalGenerated: parsedQuestions.length,
        subjectTitle,
        topic,
        selectedStandards,
        model: successfulModel
      }
    });
  } catch (error: any) {
    console.error('AI Question Generator Route Error:', error);
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Terjadi kesalahan pada server AI.' },
      { status: 500 }
    );
  }
}
