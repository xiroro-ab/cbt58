import { NextRequest, NextResponse } from 'next/server';
import { buildAiQuestionPrompt, StandardBadge, sanitizeAndParseAiJson } from '@/lib/aiQuestionGenerator';

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
      model: clientModel = 'gemini-1.5-flash'
    } = body;

    // Prioritas Kunci API: 1. Input pribadi guru -> 2. Environment server sekolah
    const apiKey = clientApiKey?.trim() || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'API_KEY_REQUIRED',
          message:
            'Kunci API Gemini belum dikonfigurasi pada server sekolah maupun input guru. Silakan masukkan Google Gemini API Key Anda (gratis di aistudio.google.com) atau gunakan tombol "Salin Prompt AI" untuk membuat soal langsung secara gratis di gemini.google.com tanpa API key.'
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

    // Sanitasi nama model yang dipilih guru
    const selectedModel = (clientModel || 'gemini-1.5-flash').trim();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      selectedModel
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

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      let errJson: any = null;
      try {
        errJson = JSON.parse(errText);
      } catch {}

      const msg =
        errJson?.error?.message ||
        `Gagal menghubungi Gemini API dengan model "${selectedModel}" (Status ${geminiRes.status})`;
      return NextResponse.json(
        { error: 'GEMINI_API_ERROR', message: msg, rawError: errJson },
        { status: geminiRes.status }
      );
    }

    const geminiData = await geminiRes.json();
    const rawOutputText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawOutputText) {
      return NextResponse.json(
        {
          error: 'NO_RESPONSE',
          message: `Model Gemini ${selectedModel} tidak memberikan respons teks yang valid.`
        },
        { status: 500 }
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
        model: selectedModel
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
