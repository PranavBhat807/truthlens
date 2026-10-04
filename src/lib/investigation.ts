import { searchGoogle, NormalizedSearchResult } from './serpapi';

export interface PlannedQuery {
  query: string;
  purpose: string;
}

export interface InvestigationResultItem extends NormalizedSearchResult {
  querySource?: string;
}

export interface InvestigationReport {
  question: string;
  plannedQueries: PlannedQuery[];
  totalResultsCount: number;
  results: InvestigationResultItem[];
  executedAt: string;
}

interface OpposingPattern {
  regex: RegExp;
  positive: string;
  negative: string;
  neutral: string;
}

const OPPOSING_PAIRS: OpposingPattern[] = [
  {
    regex: /\b(improve|improves|improving|improvement)\s+(or|and|vs\.?|versus|\/)\s+(harm|harms|harming|hurt|hurts|damage|damages)\b/i,
    positive: 'benefits positive effects',
    negative: 'harms negative effects',
    neutral: 'effects',
  },
  {
    regex: /\b(harm|harms|harming|hurt|hurts|damage|damages)\s+(or|and|vs\.?|versus|\/)\s+(improve|improves|improving|improvement)\b/i,
    positive: 'benefits positive effects',
    negative: 'harms negative effects',
    neutral: 'effects',
  },
  {
    regex: /\b(benefit|benefits|beneficial)\s+(or|and|vs\.?|versus|\/)\s+(risk|risks|harm|harms|danger|dangers)\b/i,
    positive: 'benefits positive effects',
    negative: 'risks harms negative effects',
    neutral: 'effects overview',
  },
  {
    regex: /\b(risk|risks|harm|harms|danger|dangers)\s+(or|and|vs\.?|versus|\/)\s+(benefit|benefits|beneficial)\b/i,
    positive: 'benefits positive effects',
    negative: 'risks harms negative effects',
    neutral: 'effects overview',
  },
  {
    regex: /\b(advantage|advantages)\s+(or|and|vs\.?|versus|\/)\s+(disadvantage|disadvantages)\b/i,
    positive: 'advantages benefits',
    negative: 'disadvantages drawbacks risks',
    neutral: 'comparison analysis',
  },
  {
    regex: /\b(disadvantage|disadvantages)\s+(or|and|vs\.?|versus|\/)\s+(advantage|advantages)\b/i,
    positive: 'advantages benefits',
    negative: 'disadvantages drawbacks risks',
    neutral: 'comparison analysis',
  },
  {
    regex: /\b(positive|positives)\s+(or|and|vs\.?|versus|\/)\s+(negative|negatives)\b/i,
    positive: 'positive effects benefits',
    negative: 'negative effects harms',
    neutral: 'effects impact',
  },
  {
    regex: /\b(negative|negatives)\s+(or|and|vs\.?|versus|\/)\s+(positive|positives)\b/i,
    positive: 'positive effects benefits',
    negative: 'negative effects harms',
    neutral: 'effects impact',
  },
  {
    regex: /\b(good|better)\s+(or|and|vs\.?|versus|\/)\s+(bad|worse)\b/i,
    positive: 'benefits advantages positive outcomes',
    negative: 'harms disadvantages drawbacks',
    neutral: 'impact assessment',
  },
  {
    regex: /\b(bad|worse)\s+(or|and|vs\.?|versus|\/)\s+(good|better)\b/i,
    positive: 'benefits advantages positive outcomes',
    negative: 'harms disadvantages drawbacks',
    neutral: 'impact assessment',
  },
  {
    regex: /\b(pros\s+(and|or|vs\.?|versus|\/)\s+cons|pro\s+(and|or|vs\.?|versus|\/)\s+con)\b/i,
    positive: 'pros benefits advantages',
    negative: 'cons drawbacks disadvantages',
    neutral: 'tradeoffs analysis',
  },
  {
    regex: /\b(safe|safety)\s+(or|and|vs\.?|versus|\/)\s+(dangerous|danger|dangers|harmful|risks)\b/i,
    positive: 'safety evidence positive safety profile',
    negative: 'risks dangers adverse effects side effects',
    neutral: 'safety assessment clinical evaluation',
  },
  {
    regex: /\b(dangerous|danger|dangers|harmful|risks)\s+(or|and|vs\.?|versus|\/)\s+(safe|safety)\b/i,
    positive: 'safety evidence positive safety profile',
    negative: 'risks dangers adverse effects side effects',
    neutral: 'safety assessment clinical evaluation',
  },
  {
    regex: /\b(help|helps|helping)\s+(or|and|vs\.?|versus|\/)\s+(hurt|hurts|hurting|harm|harms)\b/i,
    positive: 'benefits helpful effects',
    negative: 'harms adverse effects negative impact',
    neutral: 'effects research',
  },
  {
    regex: /\b(hurt|hurts|hurting|harm|harms)\s+(or|and|vs\.?|versus|\/)\s+(help|helps|helping)\b/i,
    positive: 'benefits helpful effects',
    negative: 'harms adverse effects negative impact',
    neutral: 'effects research',
  },
  {
    regex: /\b(effective|efficacy)\s+(or|and|vs\.?|versus|\/)\s+(ineffective|ineffectiveness|harmful|useless)\b/i,
    positive: 'treatment efficacy positive outcomes',
    negative: 'ineffective lack of efficacy failure limitations',
    neutral: 'clinical trial results efficacy evaluation',
  },
  {
    regex: /\b(true|truth|real|fact)\s+(or|vs\.?|versus|\/)\s+(false|fake|hoax|myth|fiction)\b/i,
    positive: 'verified facts evidence',
    negative: 'myth debunked hoax false',
    neutral: 'fact check investigation',
  },
];

/**
 * Clean and extract key terms from a natural-language question.
 */
function cleanQuestionForSearch(question: string): string {
  let cleaned = question.trim().replace(/[?.,!;:"]/g, ' ');

  // Remove common conversational question prefixes
  cleaned = cleaned.replace(
    /^(is it true that|is there evidence that|can you tell me if|do you know if|did|does|do|has|have|can|could|will|would|was|were|is|are|why did|how did|what is|who is|what are|what about)\s+/i,
    ''
  );

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Deterministic rule-based investigation query planner.
 * Recognizes opposing concepts (e.g. improve/harm, benefits/risks, pros/cons, vs/versus)
 * and generates 2–4 targeted search queries representing genuinely distinct investigation directions.
 */
export function planInvestigationQueries(question: string): PlannedQuery[] {
  const trimmed = question.trim();
  if (!trimmed) {
    return [];
  }

  const cleanSubject = cleanQuestionForSearch(trimmed) || trimmed.replace(/[?]/g, '').trim();
  const directQuery = trimmed.replace(/[?]/g, '').trim();

  // 1. Check for opposing concepts (e.g. "improve or harm", "benefits or risks")
  for (const pattern of OPPOSING_PAIRS) {
    const match = cleanSubject.match(pattern.regex);
    if (match) {
      const coreTopic = cleanSubject
        .replace(pattern.regex, '')
        .replace(/\s+/g, ' ')
        .trim() || cleanSubject;

      const candidates: PlannedQuery[] = [
        {
          query: `${coreTopic} ${pattern.neutral}`.trim(),
          purpose: 'Direct Topic & Overview',
        },
        {
          query: `${coreTopic} ${pattern.positive}`.trim(),
          purpose: 'Supporting & Positive Evidence',
        },
        {
          query: `${coreTopic} ${pattern.negative}`.trim(),
          purpose: 'Contrary & Negative Evidence',
        },
        {
          query: `${coreTopic} systematic review research evidence`.trim(),
          purpose: 'Authoritative Research & Evidence',
        },
      ];

      return deduplicateQueries(candidates);
    }
  }

  // 2. Check for "vs" / "versus" comparative questions (e.g. "Ketogenic diet vs Mediterranean diet")
  const vsMatch = cleanSubject.match(/\b(.+?)\s+(?:vs\.?|versus)\s+(.+)\b/i);
  if (vsMatch && vsMatch[1] && vsMatch[2]) {
    const entityA = vsMatch[1].trim();
    const entityB = vsMatch[2].trim();

    const candidates: PlannedQuery[] = [
      {
        query: `${entityA} vs ${entityB} comparison analysis`.trim(),
        purpose: 'Comparative Overview',
      },
      {
        query: `${entityA} advantages benefits evidence`.trim(),
        purpose: 'Entity A Evidence & Strengths',
      },
      {
        query: `${entityB} advantages benefits evidence`.trim(),
        purpose: 'Entity B Evidence & Strengths',
      },
      {
        query: `${entityA} vs ${entityB} systematic review research study`.trim(),
        purpose: 'Head-to-Head Research & Studies',
      },
    ];

    return deduplicateQueries(candidates);
  }

  // 3. General assertion or discovery claim (e.g. "Did scientists discover a new room-temperature superconductor in 2026?")
  const candidates: PlannedQuery[] = [
    {
      query: directQuery,
      purpose: 'Direct Claim Verification',
    },
    {
      query: `${cleanSubject} fact check verification evidence`.trim(),
      purpose: 'Independent Corroboration',
    },
    {
      query: `${cleanSubject} debunked controversy replication failure hoax`.trim(),
      purpose: 'Counter-Evidence & Skepticism',
    },
    {
      query: `${cleanSubject} research paper study official report`.trim(),
      purpose: 'Authoritative Sources & Primary Reporting',
    },
  ];

  return deduplicateQueries(candidates);
}

/**
 * Helper to deduplicate queries and ensure a 2-4 query limit.
 */
function deduplicateQueries(candidates: PlannedQuery[]): PlannedQuery[] {
  const seen = new Set<string>();
  const planned: PlannedQuery[] = [];

  for (const candidate of candidates) {
    const norm = candidate.query.toLowerCase().trim();
    if (!seen.has(norm) && planned.length < 4) {
      seen.add(norm);
      planned.push({
        query: candidate.query.replace(/\s+/g, ' ').trim(),
        purpose: candidate.purpose,
      });
    }
  }

  return planned.slice(0, 4);
}

/**
 * Normalizes a URL for deduplication.
 */
function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    // Lowercase host and pathname, remove trailing slash and hash
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/$/, '') || '/';
    return `${parsed.protocol}//${host}${pathname}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

/**
 * Executes a full investigation pipeline for a given user query.
 * 1. Plans 2-4 targeted searches deterministically.
 * 2. Fetches search results via SerpApi in parallel.
 * 3. Combines, deduplicates, and structures evidence.
 */
export async function executeInvestigation(question: string): Promise<InvestigationReport> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error('Question or claim cannot be empty');
  }

  const plannedQueries = planInvestigationQueries(trimmed);
  if (plannedQueries.length === 0) {
    throw new Error('Failed to generate search queries for the provided input');
  }

  // Execute all planned searches in parallel
  const searchPromises = plannedQueries.map(async (pq) => {
    try {
      const results = await searchGoogle(pq.query);
      return { pq, results, error: null };
    } catch (err) {
      return {
        pq,
        results: [] as NormalizedSearchResult[],
        error: err instanceof Error ? err.message : 'Search failed',
      };
    }
  });

  const searchOutcomes = await Promise.all(searchPromises);

  // If every query failed, bubble up the error
  const allFailed = searchOutcomes.every((o) => o.error !== null);
  if (allFailed && searchOutcomes.length > 0) {
    throw new Error(searchOutcomes[0].error || 'All search queries failed to execute.');
  }

  // Combine and deduplicate results
  const seenUrls = new Set<string>();
  const combinedResults: InvestigationResultItem[] = [];

  for (const outcome of searchOutcomes) {
    for (const item of outcome.results) {
      const key = item.url ? canonicalizeUrl(item.url) : `${item.title}-${item.source}`;
      if (!seenUrls.has(key)) {
        seenUrls.add(key);
        combinedResults.push({
          ...item,
          querySource: outcome.pq.query,
        });
      }
    }
  }

  return {
    question: trimmed,
    plannedQueries,
    totalResultsCount: combinedResults.length,
    results: combinedResults,
    executedAt: new Date().toISOString(),
  };
}
