import { NextRequest, NextResponse } from 'next/server';
import { generateInvestigationReport, FinalInvestigationReport } from '@/lib/report';
import { EvidenceAnalysisResult } from '@/lib/evidence';

interface ReportRequestBody {
  analysis?: EvidenceAnalysisResult;
  question?: string;
  overallEvidenceState?: EvidenceAnalysisResult['overallEvidenceState'];
  claims?: EvidenceAnalysisResult['claims'];
  comparisons?: EvidenceAnalysisResult['comparisons'];
  summary?: string;
  totalClaimsCount?: number;
  supportCount?: number;
  contradictCount?: number;
  neutralCount?: number;
  analyzedAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    let body: ReportRequestBody = {};

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body. Expected Stage 4 structured evidence analysis payload.' },
        { status: 400 }
      );
    }

    // Support either nested { analysis: { ... } } or direct { question: "...", claims: [...] }
    const analysisPayload: EvidenceAnalysisResult = body.analysis || (body as EvidenceAnalysisResult);

    const question = (analysisPayload.question || body.question || '').trim();
    if (!question) {
      return NextResponse.json(
        { error: 'Missing or empty investigation question in evidence analysis payload.' },
        { status: 400 }
      );
    }

    // Normalize analysis object if fields are partial
    const normalizedAnalysis: EvidenceAnalysisResult = {
      question,
      overallEvidenceState: analysisPayload.overallEvidenceState || 'Insufficient Evidence',
      summary: analysisPayload.summary || '',
      totalClaimsCount: Array.isArray(analysisPayload.claims) ? analysisPayload.claims.length : 0,
      supportCount: Array.isArray(analysisPayload.claims)
        ? analysisPayload.claims.filter((c) => c.relationship === 'supports').length
        : 0,
      contradictCount: Array.isArray(analysisPayload.claims)
        ? analysisPayload.claims.filter((c) => c.relationship === 'contradicts').length
        : 0,
      neutralCount: Array.isArray(analysisPayload.claims)
        ? analysisPayload.claims.filter((c) => c.relationship === 'neutral').length
        : 0,
      claims: Array.isArray(analysisPayload.claims) ? analysisPayload.claims : [],
      comparisons: Array.isArray(analysisPayload.comparisons) ? analysisPayload.comparisons : [],
      analyzedAt: analysisPayload.analyzedAt || new Date().toISOString(),
    };

    const finalReport: FinalInvestigationReport = await generateInvestigationReport(normalizedAnalysis);

    return NextResponse.json(finalReport, { status: 200 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unknown report generation error';
    const sanitizedMessage = rawMessage.replace(/[a-f0-9]{32,64}/gi, '[REDACTED]');

    return NextResponse.json(
      { error: sanitizedMessage },
      { status: 500 }
    );
  }
}
