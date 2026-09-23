import { NextRequest, NextResponse } from 'next/server';
import { searchGoogle } from '@/lib/serpapi';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawQuery = searchParams.get('q') ?? searchParams.get('query');

    if (!rawQuery || rawQuery.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty search query. Provide "q" or "query" parameter.' },
        { status: 400 }
      );
    }

    const query = rawQuery.trim();

    if (!process.env.SERPAPI_KEY) {
      return NextResponse.json(
        { error: 'Search service is unconfigured. Missing server API key.' },
        { status: 500 }
      );
    }

    const results = await searchGoogle(query);

    return NextResponse.json(
      {
        query,
        count: results.length,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unknown search error';
    // Ensure no API keys or sensitive strings leak in the error message
    const sanitizedMessage = rawMessage.replace(/[a-f0-9]{32,64}/gi, '[REDACTED]');

    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 502 }
    );
  }
}
