import { NextRequest, NextResponse } from 'next/server';
import { parseHttpError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log error report (in production, send to monitoring service)
    const errorReport = {
      timestamp: new Date().toISOString(),
      message: body.message,
      stack: body.stack,
      url: body.url,
      userAgent: body.userAgent,
      sessionId: request.headers.get('x-session-id') || 'unknown',
      userId: request.headers.get('x-user-id') || 'anonymous'
    };

    // In production, you would send this to services like:
    // - Sentry
    // - LogRocket
    // - Datadog
    // - Custom logging service
    console.error('Error report received:', errorReport);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 200));

    return NextResponse.json({
      success: true,
      reportId: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: 'Error report received successfully',
      messageJa: 'エラーレポートを受信しました'
    });

  } catch (error) {
    const appError = parseHttpError(error);
    console.error('Error report submission failed:', appError.toJSON());

    // Always return success for error reporting to avoid infinite loops
    return NextResponse.json({
      success: true,
      message: 'Error report processed',
      messageJa: 'エラーレポートを処理しました'
    });
  }
}