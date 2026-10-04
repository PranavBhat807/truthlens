import { NextRequest, NextResponse } from 'next/server';
import { analyzeEvidence, EvidenceAnalysisResult } from '@/lib/evidence';
import { NormalizedSearchResult } from '@/lib/serpapi';

interface AnalyzeRequestBody {
  question?: string;
  query?: string;
  results?: NormalizedSearchResult[];
  report?: {
    question?: string;
    results?: NormalizedSearchResult[];
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: AnalyzeRequestBody = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body. Expected {"question": "...", "results": [...]}' },
        { status: 400 }
      );
    }

    const question = (body.question ?? body.query ?? body.report?.question ?? '').trim();

    if (!question) {
      return NextResponse.json(
        { error: 'Missing or empty investigation question. Provide "question" in request body.' },
        { status: 400 }
      );
    }

    const rawResults = body.results ?? body.report?.results ?? [];
    if (!Array.isArray(rawResults)) {
      return NextResponse.json(
        { error: 'Invalid "results" format. Expected an array of search results.' },
        { status: 400 }
      );
    }

    const analysis: EvidenceAnalysisResult = await analyzeEvidence(question, rawResults);

    return NextResponse.json(analysis, { status: 200 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unknown evidence analysis error';
    const sanitizedMessage = rawMessage.replace(/[a-f0-9]{32,64}/gi, '[REDACTED]');

    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 500 }
    );
  }
}
