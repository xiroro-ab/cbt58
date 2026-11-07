import { NextRequest, NextResponse } from 'next/server';
import { fetchSchoolSettingsFromSupabase, defaultSchoolSettings } from '@/lib/supabaseService';

export async function GET(req: NextRequest) {
  try {
    const settings = await fetchSchoolSettingsFromSupabase();
    const exitPassword = (settings?.examExitPassword || defaultSchoolSettings.examExitPassword || 'palembang58').trim();

    return NextResponse.json({
      success: true,
      exitPassword: exitPassword,
      timestamp: Date.now()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      exitPassword: 'palembang58',
      fallback: true
    });
  }
}
