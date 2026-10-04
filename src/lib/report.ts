import {
  EvidenceAnalysisResult,
  EvidenceState,
  ExtractedClaim,
  CrossSourceComparison,
  ClaimRelationship,
  classifySourceType,
} from './evidence';

export interface ReportSourceItem {
  id: string;
  source: string;
  title: string;
  url: string;
  snippet: string;
  sourceType: string;
  relationship: ClaimRelationship;
}

export interface KeyFinding {
  id: string;
  finding: string;
  relationship: ClaimRelationship;
  supportingSources: string[];
  contradictingSources: string[];
  sources: {
    source: string;
    url: string;
    sourceType: string;
    snippet: string;
  }[];
  explanation: string;
}

export interface EvidenceBreakdownCategory {
  relationship: ClaimRelationship;
  label: string;
  count: number;
  sources: string[];
  items: ReportSourceItem[];
}

export interface EvidenceBreakdown {
  supporting: EvidenceBreakdownCategory;
  contradicting: EvidenceBreakdownCategory;
  neutral: EvidenceBreakdownCategory;
  comparisons: CrossSourceComparison[];
}

export interface ReportConclusion {
  statement: string;
  confidenceLevel: 'High' | 'Moderate' | 'Low' | 'Inconclusive';
  caveat: string;
}

export interface FinalInvestigationReport {
  question: string;
  overallEvidenceState: EvidenceState;
  conclusion: ReportConclusion;
  keyFindings: KeyFinding[];
  evidenceBreakdown: EvidenceBreakdown;
  sources: ReportSourceItem[];
  generatedAt: string;
  isLlmSynthesized?: boolean;
}

/**
 * Normalizes input claims into clean ReportSourceItem array with unique IDs and traceable URLs.
 */
function extractReportSources(claims: ExtractedClaim[]): ReportSourceItem[] {
  return claims.map((claim, idx) => ({
    id: claim.id || `source-${idx + 1}`,
    source: claim.source || 'Web Source',
    title: claim.title || 'Untitled Document',
    url: claim.url || '',
    snippet: claim.snippet || claim.claim || '',
    sourceType: claim.sourceType || classifySourceType(claim.url, claim.source),
    relationship: claim.relationship || 'neutral',
  }));
}

/**
 * Builds structured evidence breakdown categorized into Supporting, Contradicting, and Neutral.
 */
function buildEvidenceBreakdown(
  claims: ExtractedClaim[],
  comparisons: CrossSourceComparison[] = []
): EvidenceBreakdown {
  const sources = extractReportSources(claims);

  const supportingItems = sources.filter((s) => s.relationship === 'supports');
  const contradictingItems = sources.filter((s) => s.relationship === 'contradicts');
  const neutralItems = sources.filter((s) => s.relationship === 'neutral');

  const uniqueSupportingSources = Array.from(new Set(supportingItems.map((s) => s.source)));
  const uniqueContradictingSources = Array.from(new Set(contradictingItems.map((s) => s.source)));
  const uniqueNeutralSources = Array.from(new Set(neutralItems.map((s) => s.source)));

  return {
    supporting: {
      relationship: 'supports',
      label: 'Supporting Evidence',
      count: supportingItems.length,
      sources: uniqueSupportingSources,
      items: supportingItems,
    },
    contradicting: {
      relationship: 'contradicts',
      label: 'Contradicting / Skeptical Evidence',
      count: contradictingItems.length,
      sources: uniqueContradictingSources,
      items: contradictingItems,
    },
    neutral: {
      relationship: 'neutral',
      label: 'Contextual / Neutral Evidence',
      count: neutralItems.length,
      sources: uniqueNeutralSources,
      items: neutralItems,
    },
    comparisons,
  };
}

/**
 * Deterministically constructs key findings strictly grounded in Stage 4 claims.
 */
function buildDeterministicKeyFindings(claims: ExtractedClaim[]): KeyFinding[] {
  if (!claims || claims.length === 0) {
    return [];
  }

  const findings: KeyFinding[] = [];

  // Group claims by relationship to preserve priority: supports/contradicts first, then neutral
  const prioritizedClaims = [
    ...claims.filter((c) => c.relationship === 'contradicts'),
    ...claims.filter((c) => c.relationship === 'supports'),
    ...claims.filter((c) => c.relationship === 'neutral'),
  ];

  // Limit to top 6 representative findings to avoid information overload while preserving traceability
  const selectedClaims = prioritizedClaims.slice(0, 6);

  selectedClaims.forEach((claimItem, idx) => {
    findings.push({
      id: `finding-${idx + 1}`,
      finding: claimItem.claim,
      relationship: claimItem.relationship,
      supportingSources: claimItem.relationship === 'supports' ? [claimItem.source] : [],
      contradictingSources: claimItem.relationship === 'contradicts' ? [claimItem.source] : [],
      sources: [
        {
          source: claimItem.source,
          url: claimItem.url,
          sourceType: claimItem.sourceType,
          snippet: claimItem.snippet,
        },
      ],
      explanation:
        claimItem.reasoning ||
        (claimItem.relationship === 'supports'
          ? `Corroborated by ${claimItem.source}.`
          : claimItem.relationship === 'contradicts'
          ? `Contradicted or challenged by ${claimItem.source}.`
          : `Reported with neutral context by ${claimItem.source}.`),
    });
  });

  return findings;
}

/**
 * Deterministically synthesizes conclusion based on Stage 4 evidence analysis.
 */
function buildDeterministicConclusion(
  analysis: EvidenceAnalysisResult
): ReportConclusion {
  const { overallEvidenceState, claims, supportCount } = analysis;

  if (!claims || claims.length === 0 || overallEvidenceState === 'Insufficient Evidence') {
    return {
      statement:
        'The available web evidence is insufficient to verify or answer this question. No conclusive, verified claims were found across queried sources.',
      confidenceLevel: 'Inconclusive',
      caveat:
        'Public search results did not yield verifiable source snippets or direct answers. Additional primary sources or targeted searches are required.',
    };
  }

  const supportingSources = Array.from(
    new Set(claims.filter((c) => c.relationship === 'supports').map((c) => c.source))
  );
  const contradictingSources = Array.from(
    new Set(claims.filter((c) => c.relationship === 'contradicts').map((c) => c.source))
  );

  switch (overallEvidenceState) {
    case 'Supported': {
      const sourceListStr = supportingSources.slice(0, 3).join(', ');
      const extraCount = supportingSources.length > 3 ? ` and ${supportingSources.length - 3} other source(s)` : '';
      return {
        statement: `Based on the collected evidence, multiple independent sources (${sourceListStr}${extraCount}) consistently corroborate this inquiry with no contradictory evidence identified.`,
        confidenceLevel: supportingSources.length >= 3 ? 'High' : 'Moderate',
        caveat:
          'Conclusions are derived from public web search results and snippets. Search-result snippets should not be treated as absolute proof and should be cross-referenced with full primary texts.',
      };
    }

    case 'Conflicting': {
      const suppStr = supportingSources.length > 0 ? supportingSources.join(', ') : 'some sources';
      const contraStr = contradictingSources.length > 0 ? contradictingSources.join(', ') : 'other sources';
      return {
        statement: `The collected evidence shows active disagreement across consulted publications. Affirmative claims from ${suppStr} are challenged by contrary findings or skepticism reported by ${contraStr}.`,
        confidenceLevel: 'Low',
        caveat:
          'Because credible sources disagree or present competing facts, a definitive truth determination cannot be made without further authoritative primary verification.',
      };
    }

    case 'Unverified': {
      if (supportCount === 1) {
        const singleSource = supportingSources[0] || 'a single source';
        return {
          statement: `A preliminary corroborating claim was identified by ${singleSource}, but independent cross-source verification remains limited across other queried publications.`,
          confidenceLevel: 'Low',
          caveat:
            'Single-source reporting carries inherent risks of uncorroborated claims, outdated reporting, or editorial bias.',
        };
      }
      return {
        statement:
          'Consulted sources discuss the subject matter but offer descriptive, conditional, or inconclusive evidence without a definitive affirmative or negative determination.',
        confidenceLevel: 'Inconclusive',
        caveat:
          'Available findings provide contextual background rather than verified confirmation or refutation.',
      };
    }

    default:
      return {
        statement:
          'The available web evidence is insufficient to verify or answer this question. No conclusive, verified claims were found across queried sources.',
        confidenceLevel: 'Inconclusive',
        caveat:
          'Public search results did not yield verifiable source snippets or direct answers.',
      };
  }
}

/**
 * Optional native LLM synthesis helper when an LLM API key is configured.
 * Strictly adheres to collected Stage 4 evidence without inventing facts.
 */
async function tryLlmReportSynthesis(
  analysis: EvidenceAnalysisResult
): Promise<FinalInvestigationReport | null> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || !analysis.claims || analysis.claims.length === 0) {
    return null;
  }

  try {
    if (process.env.OPENAI_API_KEY || process.env.LLM_API_KEY) {
      const endpoint = process.env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
      const prompt = `You are an investigation report synthesizer for TruthLens.
Synthesize a structured, traceable investigation report based ONLY on the provided Stage 4 evidence analysis.

Question: "${analysis.question}"
Evidence State: "${analysis.overallEvidenceState}"
Summary from Evidence Analysis: "${analysis.summary}"

Collected Evidence Claims:
${analysis.claims
  .map(
    (c, i) =>
      `[Claim ${i + 1}] Source: "${c.source}", Stance: "${c.relationship}", URL: "${c.url}", Snippet: "${c.snippet}", Claim: "${c.claim}"`
  )
  .join('\n\n')}

Rules:
1. Do NOT invent facts, sources, claims, or URLs. Use ONLY the provided evidence.
2. If evidence state is "Insufficient Evidence" or "Unverified", do NOT manufacture false certainty; state that evidence is insufficient.
3. If evidence is "Conflicting", explicitly present both sides and their respective sources.
4. If evidence is "Supported", concisely summarize the corroborating consensus.
5. Every key finding must retain its source attribution.
6. Provide a concise, clear final conclusion statement, confidence level ("High" | "Moderate" | "Low" | "Inconclusive"), and caveat.

Return STRICT JSON matching:
{
  "conclusion": {
    "statement": "...",
    "confidenceLevel": "High" | "Moderate" | "Low" | "Inconclusive",
    "caveat": "..."
  },
  "keyFindings": [
    {
      "id": "finding-1",
      "finding": "...",
      "relationship": "supports" | "contradicts" | "neutral",
      "supportingSources": ["..."],
      "contradictingSources": ["..."],
      "explanation": "..."
    }
  ]
}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
        cache: 'no-store',
      });

      if (!res.ok) return null;

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;

      const parsed = JSON.parse(content);
      if (!parsed.conclusion || typeof parsed.conclusion.statement !== 'string') {
        return null;
      }

      const rawKeyFindings = Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [];
      const sources = extractReportSources(analysis.claims);
      const evidenceBreakdown = buildEvidenceBreakdown(analysis.claims, analysis.comparisons);

      const formattedKeyFindings: KeyFinding[] = rawKeyFindings.map((kf: Record<string, unknown>, idx: number) => {
        const rel = (['supports', 'contradicts', 'neutral'].includes(String(kf.relationship))
          ? kf.relationship
          : 'neutral') as ClaimRelationship;

        // Map relevant sources from existing sources
        const matchedSources = sources.filter(
          (s) =>
            (Array.isArray(kf.supportingSources) && kf.supportingSources.includes(s.source)) ||
            (Array.isArray(kf.contradictingSources) && kf.contradictingSources.includes(s.source))
        );

        return {
          id: `finding-${idx + 1}`,
          finding: String(kf.finding || ''),
          relationship: rel,
          supportingSources: Array.isArray(kf.supportingSources) ? kf.supportingSources.map(String) : [],
          contradictingSources: Array.isArray(kf.contradictingSources) ? kf.contradictingSources.map(String) : [],
          sources: matchedSources.length > 0
            ? matchedSources.map((ms) => ({
                source: ms.source,
                url: ms.url,
                sourceType: ms.sourceType,
                snippet: ms.snippet,
              }))
            : sources.slice(0, 1).map((s) => ({
                source: s.source,
                url: s.url,
                sourceType: s.sourceType,
                snippet: s.snippet,
              })),
          explanation: String(kf.explanation || ''),
        };
      });

      const validConfidenceLevels: ('High' | 'Moderate' | 'Low' | 'Inconclusive')[] = [
        'High',
        'Moderate',
        'Low',
        'Inconclusive',
      ];
      const confLevel = validConfidenceLevels.includes(parsed.conclusion.confidenceLevel)
        ? parsed.conclusion.confidenceLevel
        : 'Moderate';

      return {
        question: analysis.question,
        overallEvidenceState: analysis.overallEvidenceState,
        conclusion: {
          statement: parsed.conclusion.statement,
          confidenceLevel: confLevel,
          caveat: String(
            parsed.conclusion.caveat ||
              'Conclusions are derived from public web search results and snippets; snippets should be verified against full source texts.'
          ),
        },
        keyFindings: formattedKeyFindings.length > 0 ? formattedKeyFindings : buildDeterministicKeyFindings(analysis.claims),
        evidenceBreakdown,
        sources,
        generatedAt: new Date().toISOString(),
        isLlmSynthesized: true,
      };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Main Stage 5 Report Generation Function.
 * Consumes structured Stage 4 Evidence Analysis and produces a complete, traceable investigation report.
 */
export async function generateInvestigationReport(
  analysis: EvidenceAnalysisResult
): Promise<FinalInvestigationReport> {
  if (!analysis || !analysis.question) {
    throw new Error('Invalid evidence analysis data: missing question or analysis payload.');
  }

  // 1. Try LLM synthesis if available
  const llmReport = await tryLlmReportSynthesis(analysis);
  if (llmReport) {
    return llmReport;
  }

  // 2. Deterministic Fallback Generation
  const claims = Array.isArray(analysis.claims) ? analysis.claims : [];
  const sources = extractReportSources(claims);
  const evidenceBreakdown = buildEvidenceBreakdown(claims, analysis.comparisons || []);
  const keyFindings = buildDeterministicKeyFindings(claims);
  const conclusion = buildDeterministicConclusion(analysis);

  return {
    question: analysis.question,
    overallEvidenceState: analysis.overallEvidenceState || 'Insufficient Evidence',
    conclusion,
    keyFindings,
    evidenceBreakdown,
    sources,
    generatedAt: new Date().toISOString(),
    isLlmSynthesized: false,
  };
}
