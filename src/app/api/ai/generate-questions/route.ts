import { NextRequest, NextResponse } from 'next/server';
import { buildAiQuestionPrompt, StandardPresetType } from '@/lib/aiQuestionGenerator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subjectTitle = 'Mata Pelajaran Umum',
      className = 'Kelas VIII',
      topic = 'Materi Pembelajaran Umum',
      difficulty = 'Campuran',
      standardPreset = 'AKM',
      counts = { pg: 5, pgk: 2, bs: 2, jodoh: 1, isian: 0, esai: 0 },
      customInstructions = '',
      apiKey: clientApiKey = ''
    } = body;

    const apiKey = clientApiKey?.trim() || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'API_KEY_REQUIRED',
          message: 'Kunci API Gemini belum dikonfigurasi. Masukkan Google Gemini API Key Anda pada pengaturan modal (gratis di aistudio.google.com) atau gunakan opsi Salin Prompt.'
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

    // Bangun prompt sistem komprehensif
    const systemPrompt = buildAiQuestionPrompt({
      subjectTitle,
      className,
      topic,
      difficulty,
      standardPreset: standardPreset as StandardPresetType,
      counts,
      customInstructions
    });

    // Panggil API Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

      const msg = errJson?.error?.message || `Gagal menghubungi Gemini API (Status ${geminiRes.status})`;
      return NextResponse.json({ error: 'GEMINI_API_ERROR', message: msg }, { status: geminiRes.status });
    }

    const geminiData = await geminiRes.json();
    const rawOutputText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawOutputText) {
      return NextResponse.json(
        { error: 'NO_RESPONSE', message: 'Gemini tidak memberikan jawaban yang valid.' },
        { status: 500 }
      );
    }

    // Parse JSON hasil dari Gemini
    let cleanedJson = rawOutputText.trim();
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedQuestions: any[] = [];
    try {
      parsedQuestions = JSON.parse(cleanedJson);
      if (!Array.isArray(parsedQuestions)) {
        if (parsedQuestions && typeof parsedQuestions === 'object' && Array.isArray((parsedQuestions as any).questions)) {
          parsedQuestions = (parsedQuestions as any).questions;
        } else {
          parsedQuestions = [parsedQuestions];
        }
      }
    } catch (parseErr) {
      console.error('Error parsing Gemini JSON output:', parseErr, cleanedJson);
      return NextResponse.json(
        {
          error: 'JSON_PARSE_ERROR',
          message: 'Format balasan AI belum berupa JSON valid. Silakan coba kembali atau gunakan mode Salin Prompt.',
          raw: cleanedJson
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
        standardPreset
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
