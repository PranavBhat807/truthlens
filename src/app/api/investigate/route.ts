import { NextRequest, NextResponse } from 'next/server';
import { executeInvestigation } from '@/lib/investigation';

export async function POST(request: NextRequest) {
  try {
    let body: { question?: string; query?: string } = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body. Expected {"question": "..."}' },
        { status: 400 }
      );
    }

    const rawQuestion = body.question ?? body.query;

    if (!rawQuestion || typeof rawQuestion !== 'string' || rawQuestion.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty investigation question. Provide "question" in the request body.' },
        { status: 400 }
      );
    }

    const question = rawQuestion.trim();

    if (!process.env.SERPAPI_KEY) {
      return NextResponse.json(
        { error: 'Investigation service is unconfigured. Missing server API key.' },
        { status: 500 }
      );
    }

    const report = await executeInvestigation(question);

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unknown investigation error';
    // Ensure no API keys or sensitive strings leak in the error message
    const sanitizedMessage = rawMessage.replace(/[a-f0-9]{32,64}/gi, '[REDACTED]');

    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 502 }
    );
  }
}
