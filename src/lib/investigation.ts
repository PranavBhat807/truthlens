import { searchGoogle, NormalizedSearchResult } from './serpapi';
import {
  generateSearchStrategy,
  PlannedQuery,
  QuestionType,
  SearchStrategyResult,
} from './searchStrategy';

export type { PlannedQuery, QuestionType, SearchStrategyResult };

export interface InvestigationResultItem extends NormalizedSearchResult {
  querySource?: string;
}

export interface InvestigationReport {
  question: string;
  questionType?: string;
  selectedStrategy?: string;
  plannedQueries: PlannedQuery[];
  totalResultsCount: number;
  results: InvestigationResultItem[];
  executedAt: string;
}

/**
 * Deterministic rule-based investigation query planner (Stage 7).
 * Utilizes the search strategy engine to select question-type-specific search queries.
 */
export function planInvestigationQueries(question: string): PlannedQuery[] {
  return generateSearchStrategy(question).queries;
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
 * 1. Plans 2-4 targeted searches deterministically via intelligent search strategy.
 * 2. Fetches search results via SerpApi in parallel.
 * 3. Combines, deduplicates, and structures evidence.
 */
export async function executeInvestigation(question: string): Promise<InvestigationReport> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error('Question or claim cannot be empty');
  }

  const strategy = generateSearchStrategy(trimmed);
  const plannedQueries = strategy.queries;
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
    questionType: strategy.questionType,
    selectedStrategy: strategy.selectedStrategy,
    plannedQueries,
    totalResultsCount: combinedResults.length,
    results: combinedResults,
    executedAt: new Date().toISOString(),
  };
}

