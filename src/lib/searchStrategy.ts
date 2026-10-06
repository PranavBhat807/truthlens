/**
 * TruthLens – Intelligent SerpApi Search Strategy Engine (Stage 7)
 *
 * Deterministic rule-based search strategy engine that:
 * 1. Analyzes the question type (factual/identity, yes/no proposition, comparison, current status, research/evidence).
 * 2. Selects an appropriate search strategy tailored to the question's semantics.
 * 3. Generates 2–4 targeted, non-duplicate queries with distinct investigative purposes.
 * 4. Prioritizes authoritative, balanced, or status-oriented sources based on question needs.
 * 5. Strictly avoids LLMs, fake search results, or executing SerpApi requests internally.
 */

export type QuestionType =
  | 'factual_identity'
  | 'yes_no_proposition'
  | 'comparison'
  | 'current_status'
  | 'research_evidence'
  | 'general_inquiry';

export interface PlannedQuery {
  query: string;
  purpose: string;
}

export interface SearchStrategyResult {
  question: string;
  questionType: QuestionType;
  selectedStrategy: string;
  rationale: string;
  queries: PlannedQuery[];
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
    neutral: 'effects overview',
  },
  {
    regex: /\b(harm|harms|harming|hurt|hurts|damage|damages)\s+(or|and|vs\.?|versus|\/)\s+(improve|improves|improving|improvement)\b/i,
    positive: 'benefits positive effects',
    negative: 'harms negative effects',
    neutral: 'effects overview',
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
 * Clean question string and remove common conversational fillers and punctuation.
 */
export function cleanQuestionForSearch(question: string): string {
  let cleaned = question.trim().replace(/[?.,!;:"]/g, ' ');

  // Remove common conversational question prefixes
  cleaned = cleaned.replace(
    /^(is it true that|is there evidence that|can you tell me if|do you know if|did|does|do|has|have|can|could|will|would|was|were|is|are|why did|how did|what is|who is|what are|what about)\s+/i,
    ''
  );

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Deduplicates queries and enforces a strict 2-4 query count.
 */
export function deduplicateQueries(candidates: PlannedQuery[], minQueries = 2, maxQueries = 4): PlannedQuery[] {
  const seen = new Set<string>();
  const planned: PlannedQuery[] = [];

  for (const candidate of candidates) {
    const norm = candidate.query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!seen.has(norm) && norm.length > 0 && planned.length < maxQueries) {
      seen.add(norm);
      planned.push({
        query: candidate.query.replace(/\s+/g, ' ').trim(),
        purpose: candidate.purpose,
      });
    }
  }

  // Ensure at least minQueries if candidates had at least that many unique entries
  return planned.slice(0, Math.max(minQueries, Math.min(planned.length, maxQueries)));
}

/**
 * Classifies a user question into one of 5 distinct investigative question types.
 */
export function classifyQuestion(question: string): {
  questionType: QuestionType;
  selectedStrategy: string;
  rationale: string;
} {
  const trimmed = question.trim();
  const lower = trimmed.toLowerCase();

  // 1. Comparison Questions (e.g., "Compare React and Vue for web development", "React vs Vue", "Which is better for X, A or B?")
  const isComparePrefix = /^(?:compare|comparing|comparison between|differences? between)\b/i.test(trimmed);
  const isWhichBetter = /\b(?:which is better|which is best|which one is better|which framework is better|which tool is better)\b/i.test(trimmed);
  const isVsPattern = /\b(?:vs\.?|versus)\b/i.test(trimmed);
  const isCompareOrPattern = /\b(?:better|worse|preferable)\s+(?:for|in)\s+.+?,\s*(?:either\s+)?(.+?)\s+or\s+(.+)/i.test(trimmed);

  if (isComparePrefix || isWhichBetter || isVsPattern || isCompareOrPattern) {
    return {
      questionType: 'comparison',
      selectedStrategy: 'Multi-Entity Comparative Analysis',
      rationale: 'Question requests a comparison or trade-off evaluation between two or more technologies, approaches, or entities.',
    };
  }

  // 2. Current-Status Questions (e.g., "What is the current status of India's semiconductor manufacturing?", "Latest developments in X")
  const isStatusPattern = /\b(?:current status(?: of)?|current state(?: of)?|latest developments?(?: in| on| of)?|recent progress(?: on| in)?|recent updates?(?: on| in)?|state of affairs(?: in)?|where does .+ stand)\b/i.test(trimmed);
  const isCurrentTimeline = /\b(?:current|latest|recent|2025|2026)\b/i.test(trimmed) && /\b(?:status|progress|milestones|initiatives|developments|roadmap|outlook)\b/i.test(trimmed);

  if (isStatusPattern || isCurrentTimeline) {
    return {
      questionType: 'current_status',
      selectedStrategy: 'Current Status & Milestone Tracking',
      rationale: 'Question asks about the current state, progress, government/industry roadmap, or recent developments of an ongoing initiative.',
    };
  }

  // 3. Factual / Identity Questions (e.g., "Who is the current Prime Minister of India?", "Where was X born?", "What is the capital of Y?")
  const isIdentityQuestion = /^(?:who is|who was|who are|who were|whose|who became|who holds the office of)\b/i.test(trimmed);
  const isDirectFactual = /^(?:what is the capital of|where was .+ born|when was .+ founded|what company founded|what is the net worth of|what is the population of|when did .+ happen)\b/i.test(trimmed);

  if (isIdentityQuestion || isDirectFactual) {
    return {
      questionType: 'factual_identity',
      selectedStrategy: 'Authoritative Identity & Direct Factual Confirmation',
      rationale: 'Question seeks a straightforward factual answer or entity identity; prioritizes authoritative records and current official profiles.',
    };
  }

  // 4. Research / Evidence / Causal Questions (e.g., "Does social media improve mental health?", "Does X cause Y?", "Benefits and risks of Z")
  const isCausalQuestion = /^(?:does|do|can|could|will|would|is|are|how does)\s+.+?\s+(?:cause|lead to|affect|impact|improve|harm|help|hurt|prevent|increase|decrease|cure|treat|boost|worsen|influence|reduce|alleviate)\b/i.test(trimmed);
  const hasOpposingPairs = OPPOSING_PAIRS.some((p) => p.regex.test(trimmed));
  const isResearchQuery = /\b(?:evidence for|research on|clinical trials|health effects|adverse effects|side effects|pros and cons|benefits (?:and|or) risks|scientific study)\b/i.test(trimmed);

  if (isCausalQuestion || hasOpposingPairs || isResearchQuery) {
    return {
      questionType: 'research_evidence',
      selectedStrategy: 'Multi-Angle Empirical Evidence & Systematic Reviews',
      rationale: 'Question investigates a causal claim, health/efficacy outcome, or scientific hypothesis requiring supporting, contrary, and meta-analytic evidence.',
    };
  }

  // 5. Yes/No Propositions & Claim Verifications (e.g., "Did scientists discover a room-temperature superconductor in 2026?", "Was Apollo 11 faked?")
  const isProposition = /^(?:did|does|do|has|have|can|could|is|are|was|were|will|would|is it true that|is there any truth to|has anyone ever)\b/i.test(trimmed);
  const isDiscoveryClaim = /\b(?:discover|discovered|discovery|invented|breakthrough|announced|proven|debunked|hoax|faked|true|false)\b/i.test(lower);

  if (isProposition || isDiscoveryClaim) {
    return {
      questionType: 'yes_no_proposition',
      selectedStrategy: 'Claim Corroboration & Counter-Hypothesis Verification',
      rationale: 'Question tests a specific event, discovery, or factual assertion requiring direct confirmation, independent fact-checking, and critical counter-evidence.',
    };
  }

  // 6. General Inquiry fallback
  return {
    questionType: 'general_inquiry',
    selectedStrategy: 'Comprehensive Multi-Source Overview',
    rationale: 'General inquiry requiring core overview, authoritative analysis, and independent perspectives.',
  };
}

/**
 * Generates an intelligent, type-specific search strategy and queries for a given question.
 */
export function generateSearchStrategy(question: string): SearchStrategyResult {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      question: '',
      questionType: 'general_inquiry',
      selectedStrategy: 'Empty Query Strategy',
      rationale: 'Empty input provided.',
      queries: [],
    };
  }

  const { questionType, selectedStrategy, rationale } = classifyQuestion(trimmed);
  const cleanSubject = cleanQuestionForSearch(trimmed) || trimmed.replace(/[?]/g, '').trim();
  const directQuery = trimmed.replace(/[?]/g, '').trim();

  let candidates: PlannedQuery[] = [];

  switch (questionType) {
    case 'factual_identity': {
      // Prioritize direct query + authoritative profiles + official records (avoiding irrelevant controversy/debunking searches)
      candidates = [
        {
          query: directQuery,
          purpose: 'Direct Identity Confirmation',
        },
        {
          query: `${cleanSubject} official profile biography government record`.trim(),
          purpose: 'Authoritative Source Verification',
        },
        {
          query: `${cleanSubject} incumbent current office term`.trim(),
          purpose: 'Current Status & Tenure Verification',
        },
      ];
      break;
    }

    case 'comparison': {
      // Extract entities A and B if possible
      let entityA = '';
      let entityB = '';
      let context = '';

      // Pattern 1: "Compare React and Vue for web development" / "Compare X and Y"
      const compareMatch = trimmed.match(/^compare\s+(.+?)\s+and\s+(.+?)(?:\s+for\s+(.+))?$/i);
      // Pattern 2: "Which is better for X, A or B?" / "Which is better: A or B for X"
      const whichBetterMatch = trimmed.match(/which(?:\s+is|\s+one\s+is)?\s+better\s+(?:for\s+(.+?)[,:]?\s+)?(.+?)\s+or\s+(.+?)(?:\s+for\s+(.+))?$/i);
      // Pattern 3: "React vs Vue for web development"
      const vsMatch = trimmed.match(/\b(.+?)\s+(?:vs\.?|versus)\s+(.+?)(?:\s+for\s+(.+))?$/i);

      if (compareMatch) {
        entityA = compareMatch[1].trim();
        entityB = compareMatch[2].trim();
        context = (compareMatch[3] || '').trim();
      } else if (whichBetterMatch) {
        context = (whichBetterMatch[1] || whichBetterMatch[4] || '').trim();
        entityA = whichBetterMatch[2].trim();
        entityB = whichBetterMatch[3].trim();
      } else if (vsMatch) {
        entityA = vsMatch[1].replace(/^(?:what is|how does|compare|difference between)\s+/i, '').trim();
        entityB = vsMatch[2].trim();
        context = (vsMatch[3] || '').trim();
      }

      if (entityA && entityB) {
        const ctxSuffix = context ? ` ${context}` : '';
        candidates = [
          {
            query: `${entityA} vs ${entityB}${ctxSuffix} comparison analysis`.trim(),
            purpose: 'Comparative Overview & Benchmarks',
          },
          {
            query: `${entityA}${ctxSuffix} advantages strengths benefits`.trim(),
            purpose: `${entityA} Strengths & Ecosystem`,
          },
          {
            query: `${entityB}${ctxSuffix} advantages strengths benefits`.trim(),
            purpose: `${entityB} Strengths & Ecosystem`,
          },
          {
            query: `${entityA} vs ${entityB}${ctxSuffix} performance trade-offs developer consensus`.trim(),
            purpose: 'Trade-Offs & Expert Consensus',
          },
        ];
      } else {
        // Fallback for general comparison
        candidates = [
          {
            query: directQuery,
            purpose: 'Comparative Analysis',
          },
          {
            query: `${cleanSubject} comparison benchmarks evaluation`.trim(),
            purpose: 'Direct Benchmark & Trade-offs',
          },
          {
            query: `${cleanSubject} pros and cons strengths weaknesses`.trim(),
            purpose: 'Pros, Cons & Practical Trade-offs',
          },
        ];
      }
      break;
    }

    case 'current_status': {
      // Extract core topic by stripping status question prefixes
      const topic = cleanSubject
        .replace(/\b(current status of|current state of|status of|latest developments in|recent updates on|state of)\b/i, '')
        .replace(/\s+/g, ' ')
        .trim() || cleanSubject;

      candidates = [
        {
          query: `${topic} current status latest updates 2026`.trim(),
          purpose: 'Current Status & Recent Milestones',
        },
        {
          query: `${topic} official reports roadmap government industry initiatives`.trim(),
          purpose: 'Official Roadmap & Government/Industry Initiatives',
        },
        {
          query: `${topic} progress challenges strategic outlook`.trim(),
          purpose: 'Analysis, Challenges & Strategic Outlook',
        },
      ];
      break;
    }

    case 'research_evidence': {
      // Check for opposing pair patterns first (e.g. "improve or harm", "benefits or risks")
      let matchedOpposing: OpposingPattern | null = null;
      for (const pattern of OPPOSING_PAIRS) {
        if (pattern.regex.test(cleanSubject)) {
          matchedOpposing = pattern;
          break;
        }
      }

      if (matchedOpposing) {
        const coreTopic = cleanSubject
          .replace(matchedOpposing.regex, '')
          .replace(/\s+/g, ' ')
          .trim() || cleanSubject;

        candidates = [
          {
            query: `${coreTopic} ${matchedOpposing.neutral}`.trim(),
            purpose: 'Direct Topic & Overview',
          },
          {
            query: `${coreTopic} ${matchedOpposing.positive}`.trim(),
            purpose: 'Supporting & Positive Evidence',
          },
          {
            query: `${coreTopic} ${matchedOpposing.negative}`.trim(),
            purpose: 'Contrary & Negative Evidence',
          },
          {
            query: `${coreTopic} systematic review research clinical evidence`.trim(),
            purpose: 'Authoritative Research & Meta-Analyses',
          },
        ];
      } else {
        // General causal / empirical question (e.g., "Does social media improve mental health?")
        candidates = [
          {
            query: `${cleanSubject} scientific research study evidence`.trim(),
            purpose: 'Direct Empirical Research',
          },
          {
            query: `${cleanSubject} benefits positive effects findings`.trim(),
            purpose: 'Supporting & Positive Evidence',
          },
          {
            query: `${cleanSubject} risks negative effects adverse outcomes`.trim(),
            purpose: 'Contrary & Negative Evidence',
          },
          {
            query: `${cleanSubject} systematic review meta-analysis consensus`.trim(),
            purpose: 'Authoritative Reviews & Scientific Consensus',
          },
        ];
      }
      break;
    }

    case 'yes_no_proposition': {
      // 4-angle verification for factual claims / discoveries / propositions
      candidates = [
        {
          query: `${cleanSubject} announcement official report`.trim(),
          purpose: 'Direct Claim & Primary Reporting',
        },
        {
          query: `${cleanSubject} fact check independent verification evidence`.trim(),
          purpose: 'Independent Corroboration & Verification',
        },
        {
          query: `${cleanSubject} debunked controversy replication failure skepticism`.trim(),
          purpose: 'Counter-Evidence & Skepticism',
        },
        {
          query: `${cleanSubject} scientific paper peer-reviewed research study`.trim(),
          purpose: 'Authoritative & Primary Sources',
        },
      ];
      break;
    }

    case 'general_inquiry':
    default: {
      candidates = [
        {
          query: directQuery,
          purpose: 'Direct Query Search',
        },
        {
          query: `${cleanSubject} overview analysis evidence`.trim(),
          purpose: 'In-Depth Analysis & Context',
        },
        {
          query: `${cleanSubject} official sources fact check`.trim(),
          purpose: 'Authoritative Verification',
        },
      ];
      break;
    }
  }

  const queries = deduplicateQueries(candidates, 2, 4);

  // Debug logging as requested in Stage 7 specifications
  console.log(`[TL-DEBUG][SEARCH-STRATEGY]
question: ${trimmed}
question type: ${questionType}
selected strategy: ${selectedStrategy}
generated queries:
${queries.map((q, idx) => `  ${idx + 1}. [${q.purpose}] ${q.query}`).join('\n')}`);

  return {
    question: trimmed,
    questionType,
    selectedStrategy,
    rationale,
    queries,
  };
}
