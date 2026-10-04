import { NormalizedSearchResult } from './serpapi';
import { InvestigationResultItem } from './investigation';

export type ClaimRelationship = 'supports' | 'contradicts' | 'neutral';

export type EvidenceState = 'Supported' | 'Conflicting' | 'Unverified' | 'Insufficient Evidence';

export type QuestionType = 'wh' | 'proposition';

export interface ExtractedClaim {
  id: string;
  claim: string;
  source: string;
  title: string;
  url: string;
  snippet: string;
  sourceType: string;
  relationship: ClaimRelationship;
  confidence: number;
  reasoning: string;
}

export interface CrossSourceComparison {
  aspect: string;
  supportingSources: string[];
  contradictingSources: string[];
  neutralSources: string[];
  summary: string;
}

export interface EvidenceAnalysisResult {
  question: string;
  overallEvidenceState: EvidenceState;
  summary: string;
  totalClaimsCount: number;
  supportCount: number;
  contradictCount: number;
  neutralCount: number;
  claims: ExtractedClaim[];
  comparisons: CrossSourceComparison[];
  analyzedAt: string;
}

export interface QuestionAnalysis {
  isWhQuestion: boolean;
  whType: 'who' | 'what' | 'when' | 'where' | 'which' | 'how' | 'why' | null;
  targetSubject: string;
  keywords: string[];
  rolePhrases: string[];
  targetJurisdiction: string | null;
}

/**
 * FIX: Portfolio words that legitimately combine with "minister".
 * Used to prevent "minister of india" → "india minister" alias explosion.
 */
const PORTFOLIO_WORDS = new Set([
  'finance', 'defense', 'defence', 'home', 'foreign', 'external affairs',
  'internal affairs', 'railway', 'railways', 'education', 'health', 'law',
  'commerce', 'industry', 'energy', 'power', 'agriculture', 'agricultural',
  'labour', 'labor', 'transport', 'transportation', 'housing', 'urban development',
  'rural development', 'environment', 'forest', 'forests', 'climate change',
  'information', 'broadcasting', 'communication', 'communications', 'it',
  'science', 'technology', 'culture', 'tourism', 'sports', 'youth affairs',
  'women', 'child development', 'social justice', 'minority affairs',
  'panchayati raj', 'parliamentary affairs', 'personnel', 'public grievances',
  'pensions', 'petroleum', 'natural gas', 'coal', 'mines', 'steel', 'textiles',
  'food', 'public distribution', 'consumer affairs', 'corporate affairs',
  'civil aviation', 'shipping', 'ports', 'water resources', 'jal shakti',
  'heavy industries', 'micro', 'small', 'medium enterprises', 'msme',
  'skill development', 'entrepreneurship', 'statistics', 'programme implementation',
  'planning', 'earth sciences', 'atomic energy', 'space', 'development of north eastern region',
]);

/**
 * FIX: Single-word role stems that should never be emitted as standalone
 * role phrases when a more specific multi-word role is present.
 */
const GENERIC_ROLE_STEMS = new Set([
  'minister', 'president', 'secretary', 'director', 'head', 'chief',
  'justice', 'judge', 'chancellor', 'governor', 'officer', 'commissioner',
  'administrator', 'premier', 'chair', 'chairman', 'chairperson', 'chairwoman',
  'leader', 'ruler', 'king', 'queen', 'emperor', 'monarch', 'senator',
  'mayor', 'speaker', 'ambassador', 'author', 'actor', 'scientist',
  'inventor', 'discoverer', 'founder',
]);

/**
 * Generic multi-word and single-word role phrase extraction from question or text.
 */
export function extractRolePhrases(questionOrText: string, keywords: string[] = []): string[] {
  const roles: string[] = [];
  const normalized = questionOrText.toLowerCase().replace(/['"“”‘’]/g, '');

  // 1. Generic multi-word role patterns
  const multiWordPatterns: RegExp[] = [
    // Prime Minister, Chief Justice, Chief Executive Officer, Managing Director, Deputy Prime Minister, etc.
    /\b(?:prime|chief|deputy|vice|managing|executive|first|general|assistant|associate|interim|acting)\s+(?:minister|justice|executive(?:\s+officer)?|officer|director|chancellor|president|secretary|judge|editor|counsel|commissioner|administrator|governor|premier|magistrate|marshal)\b/gi,
    // Secretary-General, Director-General, Attorney-General, Governor-General
    /\b(?:secretary|director|attorney|governor|solicitor|auditor|inspector)[\s-]+(?:general)\b/gi,
    // Head of State, Head of Government
    /\bhead\s+of\s+(?:state|government)\b/gi,
    // FIX: "Minister of X" only matches when X is a portfolio word (not a country/jurisdiction).
    // Previously "minister of india" matched and produced bogus "india minister" alias.
    /\b(?:minister|secretary|director|head|commissioner|speaker)\s+of\s+(?:the\s+)?(?:finance|defense|defence|home|foreign|external\s+affairs|internal\s+affairs|railway|railways|education|health|law|commerce|industry|energy|power|state|agriculture|labour|labor|transport|housing|environment|forest|forests|science|technology|culture|tourism|sports|water\s+resources|coal|mines|steel|textiles|food|shipping|ports|space)\b/gi,
    // Finance Minister, Defense Minister, External Affairs Minister, Home Minister
    /\b(?:finance|defense|defence|home|foreign|external\s+affairs|internal\s+affairs|railway|railways|education|health|law|commerce|industry|energy|power|agriculture|labour|labor|transport|housing|environment|forest|forests|science|technology|culture|tourism|sports|water\s+resources|coal|mines|steel|textiles|food|shipping|ports|space)\s+(?:minister|director|secretary|governor|commissioner)\b/gi,
  ];

  for (const pattern of multiWordPatterns) {
    const matches = normalized.match(pattern);
    if (matches) {
      for (const m of matches) {
        const cleaned = m.trim();
        if (
          cleaned &&
          !roles.includes(cleaned) &&
          !/^(the|a|an|current|currently|former|new|this|that|which|who|what|where|when|how|is|are|was|were|tell|name)\s+/i.test(
            cleaned
          )
        ) {
          roles.push(cleaned);

          // FIX: Only add "X minister" alias if X is a genuine portfolio word,
          // NOT a country/jurisdiction like "india".
          const ministerOfMatch = cleaned.match(/^minister\s+of\s+(?:the\s+)?([a-z\s]+)$/i);
          if (ministerOfMatch && ministerOfMatch[1]) {
            const portfolio = ministerOfMatch[1].trim();
            if (PORTFOLIO_WORDS.has(portfolio)) {
              const alias = `${portfolio} minister`;
              if (!roles.includes(alias)) roles.push(alias);
            }
          }

          // If "X minister", also add "minister of X" — only for portfolio words
          const xMinisterMatch = cleaned.match(/^([a-z\s]+)\s+minister$/i);
          if (xMinisterMatch && xMinisterMatch[1]) {
            const portfolio = xMinisterMatch[1].trim();
            if (
              portfolio !== 'prime' &&
              portfolio !== 'chief' &&
              PORTFOLIO_WORDS.has(portfolio)
            ) {
              const alias = `minister of ${portfolio}`;
              if (!roles.includes(alias)) roles.push(alias);
            }
          }

          // If "secretary-general" or "secretary general", add both hyphenated & spaced
          if (cleaned.includes('general')) {
            const spaced = cleaned.replace(/-/g, ' ');
            const hyphenated = cleaned.replace(/\s+/g, '-');
            if (!roles.includes(spaced)) roles.push(spaced);
            if (!roles.includes(hyphenated)) roles.push(hyphenated);
          }
        }
      }
    }
  }

  // Check CEO alias
  if (/\bceo\b/i.test(normalized) && !roles.includes('chief executive officer')) {
    roles.push('chief executive officer');
    roles.push('ceo');
  }
  if (/\bchief executive officer\b/i.test(normalized) && !roles.includes('ceo')) {
    roles.push('ceo');
  }

  // 2. Single-word role patterns ONLY if no multi-word role was found, OR for standalone roles
  const singleWordPattern =
    /\b(president|minister|ceo|coo|cto|cfo|founder|leader|governor|director|author|actor|scientist|inventor|discoverer|chair|chairman|chairperson|chairwoman|head|chief|ruler|king|queen|emperor|monarch|chancellor|justice|judge|secretary|premier|senator|mayor|speaker|ambassador)\b/gi;
  const singleMatches = normalized.match(singleWordPattern);
  if (singleMatches) {
    for (const sm of singleMatches) {
      const cleaned = sm.trim();
      // If we already have a multi-word role containing this word (e.g. "prime minister" contains "minister"),
      // do NOT add the bare word "minister" because it dilutes the specific role
      const isSubwordOfMultiWord = roles.some((r) => r.includes(' ') && r.split(/\s+/).includes(cleaned));
      if (cleaned && !roles.includes(cleaned) && !isSubwordOfMultiWord) {
        roles.push(cleaned);
      }
    }
  }

  // 3. Include individual keywords that match single word pattern ONLY if not a subword of an existing multi-word role
  for (const k of keywords) {
    const kLower = k.toLowerCase().trim();
    const isSubwordOfMultiWord = roles.some((r) => r.includes(' ') && r.split(/\s+/).includes(kLower));
    if (singleWordPattern.test(kLower) && !roles.includes(kLower) && !isSubwordOfMultiWord) {
      roles.push(kLower);
    }
  }

  // FIX: Final cleanup — remove generic stems that are subsumed by a more specific
  // multi-word role. This prevents "minister" from surviving when "prime minister"
  // is present, which was the root cause of contradictory extractions.
  const cleanedRoles = roles.filter((role) => {
    const lowerRole = role.toLowerCase().trim();

    // Drop bare generic stems if any multi-word role contains them as a component
    if (GENERIC_ROLE_STEMS.has(lowerRole) || lowerRole.split(/\s+/).length === 1) {
      const isComponentOfLonger = roles.some(
        (other) =>
          other !== role &&
          other.includes(' ') &&
          other.toLowerCase().split(/\s+/).includes(lowerRole)
      );
      if (isComponentOfLonger) return false;
    }

    return true;
  });

  // FIX: Deduplicate case-insensitively while preserving first-seen casing
  const seen = new Set<string>();
  const dedupedRoles: string[] = [];
  for (const r of cleanedRoles) {
    const key = r.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      dedupedRoles.push(r);
    }
  }

  return dedupedRoles;
}

/**
 * Determine a classification category for the source domain.
 */
export function classifySourceType(url: string, source: string): string {
  const lowerUrl = (url || '').toLowerCase();
  const lowerSource = (source || '').toLowerCase();

  if (
    lowerUrl.includes('.gov') ||
    lowerUrl.includes('.mil') ||
    lowerUrl.includes('who.int') ||
    lowerUrl.includes('nasa.gov') ||
    lowerUrl.includes('nih.gov') ||
    lowerUrl.includes('cdc.gov')
  ) {
    return 'Government & Official';
  }

  if (
    lowerUrl.includes('.edu') ||
    lowerUrl.includes('.ac.') ||
    lowerUrl.includes('nature.com') ||
    lowerUrl.includes('science.org') ||
    lowerUrl.includes('ncbi.nlm.nih.gov') ||
    lowerUrl.includes('arxiv.org') ||
    lowerUrl.includes('thelancet.com') ||
    lowerUrl.includes('sciencedirect.com') ||
    lowerUrl.includes('springer.com') ||
    lowerUrl.includes('cell.com') ||
    lowerUrl.includes('frontiersin.org') ||
    lowerUrl.includes('jamanetwork.com')
  ) {
    return 'Academic & Peer-Reviewed';
  }

  if (
    lowerSource.includes('reuters') ||
    lowerSource.includes('associated press') ||
    lowerSource.includes('ap news') ||
    lowerSource.includes('bbc') ||
    lowerSource.includes('bloomberg') ||
    lowerSource.includes('guardian') ||
    lowerSource.includes('nytimes') ||
    lowerSource.includes('washington post') ||
    lowerSource.includes('wall street journal') ||
    lowerSource.includes('cnbc') ||
    lowerSource.includes('cnn') ||
    lowerSource.includes('forbes') ||
    lowerSource.includes('al jazeera') ||
    lowerSource.includes('the hindu') ||
    lowerSource.includes('ndtv') ||
    lowerSource.includes('times of india') ||
    lowerSource.includes('indian express')
  ) {
    return 'Major News & Media';
  }

  if (
    lowerSource.includes('snopes') ||
    lowerSource.includes('factcheck') ||
    lowerSource.includes('politifact') ||
    lowerSource.includes('lead stories') ||
    lowerSource.includes('full fact')
  ) {
    return 'Fact-Checking Organization';
  }

  if (lowerUrl.includes('wikipedia.org') || lowerUrl.includes('britannica.com')) {
    return 'Encyclopedia & Reference';
  }

  return 'Web Publication';
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'under', 'and', 'or',
  'but', 'if', 'then', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should',
  'now', 'current', 'currently', 'who', 'what', 'when', 'where', 'which', 'how', 'why',
  'whom', 'whose', 'does', 'did', 'do', 'has', 'have', 'had', 'name', 'tell', 'me', 'please'
]);

const HONORIFICS_LIST = [
  'shri', 'shree', 'sri', 'smt', 'shrimati',
  'mr', 'mrs', 'ms', 'miss', 'mst',
  'dr', 'prof', 'professor',
  'sir', 'dame', 'lord', 'lady', 'madam', 'madame',
  'hon', 'honorable', 'hon\'ble', 'honble',
  'his excellency', 'her excellency', 'h.e.', 'he',
  'his highness', 'her highness', 'h.h.', 'hh',
  'justice', 'chief justice', 'president', 'prime minister', 'minister'
];

const HONORIFICS_SET = new Set(HONORIFICS_LIST);

/**
 * Question classifier: distinguishes WH / Information questions from Proposition / Yes-No questions.
 */
export function analyzeQuestion(question: string): QuestionAnalysis {
  const cleanQ = question.trim().replace(/[?.,!;:"]/g, ' ');
  const lowerQ = cleanQ.toLowerCase();
  const words = lowerQ.split(/\s+/).filter(Boolean);

  const whMatch = lowerQ.match(/\b(who|what|when|where|which|how|why|whom|whose)\b/);

  // Check if it starts with WH word or WH phrase
  const isWhStart = /^(who|what|when|where|which|how|why|whom|whose|name\s+the|tell\s+me\s+(who|what|when|where|which|how))\b/i.test(
    lowerQ
  );

  // Check if it's a proposition / yes-no start
  const isYesNoStart = /^(is|are|was|were|do|does|did|has|have|had|can|could|will|would|should|may|might|whether|if)\b/i.test(
    lowerQ
  );

  const isWhQuestion = isWhStart || (whMatch !== null && !isYesNoStart);
  const whType = whMatch ? (whMatch[1] as 'who' | 'what' | 'when' | 'where' | 'which' | 'how' | 'why') : null;

  const keywords = words.filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  const targetSubject = keywords.join(' ');
  const rolePhrases = extractRolePhrases(question, keywords);

  // Extract target jurisdiction / entity
  let targetJurisdiction: string | null = null;
  const ofMatch = lowerQ.match(/\b(?:of|for|in)\s+([a-z\s]+?)(?:\?|$)/i);
  if (ofMatch && ofMatch[1]) {
    const cand = ofMatch[1].trim();
    const cleanCand = cand
      .split(/\s+/)
      .filter((w) => !STOP_WORDS.has(w) && !rolePhrases.some((r) => r.includes(w)))
      .join(' ');
    if (cleanCand.length >= 2) {
      targetJurisdiction = cleanCand;
    }
  }

  if (!targetJurisdiction) {
    const nonRoleKeywords = keywords.filter(
      (k) => !rolePhrases.some((r) => r.includes(k)) && !['current', 'latest', 'new'].includes(k)
    );
    if (nonRoleKeywords.length > 0) {
      targetJurisdiction = nonRoleKeywords.join(' ');
    }
  }

  return {
    isWhQuestion,
    whType,
    targetSubject,
    keywords,
    rolePhrases,
    targetJurisdiction,
  };
}

/**
 * Normalizes and cleans candidate answer text.
 * Strips honorifics, titles, parentheticals, and trailing attachments.
 */
export function cleanCandidateAnswer(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim();

  // Strip leading/trailing quotes, brackets, punctuation
  cleaned = cleaned.replace(/^["'“”‘’`(\[\{<]+|[)"'“”‘’`\]\}>.,;:!\?]+$/g, '').trim();

  // Check if string is purely an honorific or title
  const rawLower = cleaned.toLowerCase().replace(/[.,]/g, '').trim();
  if (HONORIFICS_SET.has(rawLower)) {
    return '';
  }

  // Strip leading honorifics & titles repeatedly (e.g. "Hon'ble Shri Pranab Mukherjee" -> "Pranab Mukherjee")
  const leadingHonorificPattern =
    /^(?:The\s+Honorable|The\s+Hon'ble|Honorable|Hon'ble|Honble|Hon\.?|His\s+Excellency|Her\s+Excellency|H\.E\.?|His\s+Highness|Her\s+Highness|H\.H\.?|Smt\.?|Shrimati|Shri\.?|Shree\.?|Sri\.?|Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?|Prof\.?|Professor|Sir|Dame|Lord|Lady|Madam|Madame|Justice|The|An|A)[.,\s]+/i;

  let prev = '';
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(leadingHonorificPattern, '').trim();
  }

  // Strip leading role prefixes if the regex captured part of the role title
  cleaned = cleaned
    .replace(
      /^(?:President|Prime\s+Minister|Chief\s+Justice|Deputy\s+Prime\s+Minister|Chief\s+Executive\s+Officer|CEO|Managing\s+Director|Governor|Chancellor|Secretary-General|Director-General|Minister)\s+(?:of\s+[A-Za-z\s]+?,\s*)?/i,
      ''
    )
    .trim();

  // Strip trailing parentheticals e.g. "(born 1950)"
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '').trim();

  // Strip trailing clauses, verbs, prepositions or verbal attachments
  cleaned = cleaned
    .replace(
      /\s+(?:who|which|since|having|born|assumed|sworn|served|from|was|is|and|of|in|at|on|for|to|with|by|as|that|has|have|had|met|visited|held|addressed|announced|stated|said|received|welcomed)\b.*$/i,
      ''
    )
    .trim();

  // Strip remaining punctuation
  cleaned = cleaned.replace(/^[,\s;:\-|/\\]+|[,\s;:\-|/\\]+$/g, '').trim();

  // Re-check if remaining string is purely an honorific or too short
  const postLower = cleaned.toLowerCase().replace(/[.,]/g, '').trim();
  if (HONORIFICS_SET.has(postLower) || postLower.length < 2) {
    return '';
  }

  return cleaned;
}

/**
 * Validates whether an extracted string looks like a legitimate candidate person name.
 */
function isValidCandidateName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const cleaned = cleanCandidateAnswer(name.trim());
  if (!cleaned) return false;
  const lower = cleaned.toLowerCase().trim();
  if (lower.length < 3 || lower.length > 50) return false;

  // Check if it's purely an honorific or all tokens are honorifics
  const cleanTokens = lower.replace(/[.,]/g, '').split(/\s+/).filter(Boolean);
  if (cleanTokens.every((t) => HONORIFICS_SET.has(t))) return false;

  // Check capitalization of raw words (must start with uppercase or accepted particles)
  const rawWords = cleaned.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return false;

  const validNameCapitalization = rawWords.every(
    (w) => /^[A-Z]/.test(w) || /^(von|van|de|da|di|du|la|le|del|der|al)$/i.test(w)
  );
  if (!validNameCapitalization) return false;

  const nonNames = new Set([
    'the', 'this', 'that', 'there', 'it', 'he', 'she', 'they', 'here', 'and', 'or',
    'article', 'section', 'constitution', 'government', 'office', 'country',
    'state', 'republic', 'first', 'second', 'former', 'every', 'each', 'all',
    'president', 'prime minister', 'official', 'website', 'portal', 'india', 'indian',
    'executive power', 'union', 'chief justice', 'supreme court', 'high court',
    'ministry', 'external affairs', 'foreign affairs', 'department', 'parliament',
    'press release', 'statement', 'spokesperson', 'cabinet', 'national', 'international',
    'shri', 'shree', 'sri', 'smt', 'shrimati', 'mr', 'mrs', 'ms', 'miss', 'dr', 'prof',
    'professor', 'sir', 'dame', 'lord', 'lady', 'hon', 'honorable', 'honble', 'he',
    'of india', 'of the country', 'of the union', 'of state', 'of government'
  ]);

  if (nonNames.has(lower)) return false;

  const words = lower.split(/\s+/).filter(Boolean);

  // Candidate name cannot start with or contain leading prepositions/articles/verbs
  if (
    [
      'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by', 'from', 'as', 'and',
      'the', 'a', 'an', 'is', 'was', 'oversaw', 'held', 'met', 'received', 'visited'
    ].includes(words[0])
  ) {
    return false;
  }

  // Any word in candidate name cannot be purely a country / jurisdiction / role token
  const disallowedTokens = new Set([
    'of', 'to', 'in', 'for', 'with', 'on', 'at', 'by', 'from', 'as', 'and', 'or',
    'the', 'a', 'an', 'is', 'was', 'were', 'are', 'been', 'has', 'have', 'had',
    'india', 'indian', 'america', 'american', 'china', 'chinese', 'japan', 'japanese',
    'france', 'french', 'germany', 'german', 'russia', 'russian', 'uk', 'british',
    'uzbekistan', 'uzbek',
    'president', 'minister', 'justice', 'chief', 'prime', 'governor', 'secretary', 'ceo'
  ]);

  // If all words in candidate are disallowed tokens, it cannot be a person name
  if (words.every((w) => disallowedTokens.has(w))) return false;

  // At least one word must be a genuine person name token (length >= 2, not a stop word, not disallowed, not honorific)
  const hasSubstantialNameWord = words.some(
    (w) =>
      !disallowedTokens.has(w) &&
      !nonNames.has(w) &&
      !HONORIFICS_SET.has(w.replace(/[.,]/g, '')) &&
      w.length >= 2
  );
  if (!hasSubstantialNameWord) return false;

  return true;
}

/**
 * Validates whether an extracted string looks like a legitimate candidate entity.
 */
function isValidCandidateEntity(entity: string): boolean {
  const cleaned = cleanCandidateAnswer(entity);
  const lower = cleaned.toLowerCase().trim();
  if (lower.length < 2 || lower.length > 50) return false;
  const invalid = ['the', 'this', 'that', 'there', 'it', 'which', 'what', 'where', 'how', 'city', 'country', 'capital', 'state'];
  if (invalid.includes(lower)) return false;
  return true;
}

/**
 * Normalizes candidate answer for grouping & semantic comparison.
 */
export function normalizeForGrouping(ans: string): string {
  return ans
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two candidate answers are semantically equivalent.
 */
export function areAnswersEquivalent(ans1: string, ans2: string): boolean {
  const norm1 = normalizeForGrouping(cleanCandidateAnswer(ans1));
  const norm2 = normalizeForGrouping(cleanCandidateAnswer(ans2));
  if (norm1 === norm2) return true;
  if (!norm1 || !norm2) return false;

  const words1 = norm1.split(/\s+/).filter(Boolean);
  const words2 = norm2.split(/\s+/).filter(Boolean);

  // Exact word set equivalence
  if (words1.length === words2.length && words1.every((w) => words2.includes(w))) {
    return true;
  }

  // Substring inclusion: e.g. "new delhi" in "new delhi india" or full names "narendra damodardas modi" vs "narendra modi"
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    if (words1.length >= 2 || words2.length >= 2) {
      return true;
    }
  }

  // Transliteration / vowel variations: e.g. "draupadi murmu" vs "droupadi murmu"
  const simplified1 = norm1.replace(/[aeiou]/g, '');
  const simplified2 = norm2.replace(/[aeiou]/g, '');
  if (simplified1.length >= 4 && simplified1 === simplified2) return true;

  // Person name match (first and last name match, e.g. "Narendra D. Modi" vs "Narendra Modi")
  if (words1.length >= 2 && words2.length >= 2) {
    if (words1[0] === words2[0] && words1[words1.length - 1] === words2[words2.length - 1]) {
      return true;
    }
  }

  return false;
}

/**
 * Helper to make a string case-insensitive in a regex without setting the global /i flag.
 */
function makeCaseAgnostic(str: string): string {
  return str
    .split('')
    .map((c) => {
      if (/[a-zA-Z]/.test(c)) {
        return `[${c.toUpperCase()}${c.toLowerCase()}]`;
      }
      return c === ' ' ? '\\s+' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
}

/**
 * FIX: Pick the primary (most specific) role phrase from a list.
 * Prefers multi-word roles; among those, prefers the longest.
 * Returns null if no roles.
 */
function pickPrimaryRole(rolePhrases: string[]): string | null {
  if (!rolePhrases || rolePhrases.length === 0) return null;
  const sorted = [...rolePhrases].sort((a, b) => {
    const aWords = a.split(/\s+/).length;
    const bWords = b.split(/\s+/).length;
    if (aWords !== bWords) return bWords - aWords; // more words first
    return b.length - a.length;
  });
  return sorted[0];
}

/**
 * Extracts a candidate answer from text for WH questions strictly grounded in the question's target role/subject.
 */
export function extractCandidateAnswerFromText(
  text: string,
  whType: string | null,
  keywords: string[],
  rolePhrasesOrQuestion?: string[] | string,
  targetJurisdiction?: string | null
): string | null {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return null;

  // TL-DEBUG: track which pattern matched
  const _dbgLog = (patternLabel: string, matchVal: string | null) => {
    if (matchVal) {
      console.log(`[TL-DEBUG][EXTRACT] ✓ Pattern "${patternLabel}" matched → candidate="${matchVal}"`);
      console.log(`[TL-DEBUG][EXTRACT]   text: "${cleanText.substring(0, 200)}"`);
    }
  };

  // 1. Who questions: Names / Persons / Leaders
  if (whType === 'who' || whType === null) {
    let roleList: string[] = [];
    if (Array.isArray(rolePhrasesOrQuestion) && rolePhrasesOrQuestion.length > 0) {
      roleList = [...rolePhrasesOrQuestion];
    } else if (typeof rolePhrasesOrQuestion === 'string' && rolePhrasesOrQuestion) {
      roleList = extractRolePhrases(rolePhrasesOrQuestion, keywords);
    } else {
      roleList = extractRolePhrases(keywords.join(' '), keywords);
    }

    // Sort by length descending so multi-word roles match before single words
    roleList.sort((a, b) => b.length - a.length);

    // FIX: Build the role alternation, but EXCLUDE single-word generic stems
    // if a more specific multi-word role exists. This is the core fix that
    // prevents "Home Minister" from matching when "Prime Minister" is asked.
    const hasSpecificRole = roleList.some((r) => r.includes(' ') && r.split(/\s+/).length >= 2);
    const filteredRoleList = hasSpecificRole
      ? roleList.filter((r) => {
          const words = r.split(/\s+/);
          // Keep multi-word roles
          if (words.length >= 2) return true;
          // Drop single-word generic stems that are components of a multi-word role
          if (GENERIC_ROLE_STEMS.has(r.toLowerCase())) return false;
          return true;
        })
      : roleList;

    const baseRolePattern =
      filteredRoleList.length > 0
        ? filteredRoleList.map((r) => makeCaseAgnostic(r)).join('|')
        : makeCaseAgnostic(
            'president|prime minister|ceo|head of state|leader|governor|founder|chief justice|author|director|secretary-general'
          );

    // Demonym / jurisdiction regex part
    let demonymPrefix = '';
    if (targetJurisdiction && targetJurisdiction.trim()) {
      const cleanJ = targetJurisdiction.trim();
      const demonym = cleanJ.endsWith('a') ? `${cleanJ}n` : cleanJ;
      demonymPrefix = `(?:${makeCaseAgnostic(cleanJ)}|${makeCaseAgnostic(demonym)}|${makeCaseAgnostic(cleanJ)}'s)`;
    }

    // Strict jurisdiction of-part: strictly matches target jurisdiction or 1 to 3 capitalized words
    const targetOfPart =
      targetJurisdiction && targetJurisdiction.trim()
        ? `(?:\\s+${makeCaseAgnostic('of')}\\s+(?:${makeCaseAgnostic('the')}\\s+)?(?:(?:${makeCaseAgnostic(
            'republic of'
          )}\\s+)?${makeCaseAgnostic(targetJurisdiction.trim())}))`
        : `(?:\\s+${makeCaseAgnostic('of')}\\s+(?:${makeCaseAgnostic('the')}\\s+)?[A-Z][a-zA-Z]*(?:\\s+[A-Z][a-zA-Z]*){0,2})`;

    const ofCountryPart =
      targetJurisdiction && targetJurisdiction.trim()
        ? `(?:${targetOfPart}|(?!\\s+${makeCaseAgnostic('of')}\\b))`
        : `(?:${targetOfPart})?`;

    const jurisdictionRolePrefix =
      targetJurisdiction && targetJurisdiction.trim()
        ? `(?:${demonymPrefix}\\s+)?`
        : `(?:[A-Za-z]+'s\\s+)?`;

    const honorificPrefix = `(?:(?:Shri|Shree|Sri|Smt\\.?|Shrimati|Mr\\.?|Mrs\\.?|Ms\\.?|Miss|Dr\\.?|Prof\\.?|Professor|Sir|Dame|Lord|Lady|Madam|Madame|Honorable|Hon'ble|Honble|Hon\\.?|His\\s+Excellency|Her\\s+Excellency|H\\.E\\.?|Justice)[.,\\s]+)*`;
    const personNameCapture = `([A-Z][a-zA-Z'.'-]*(?:\\s+[A-Z][a-zA-Z'.'-]*){0,4})`;
    const multiWordNameCapture = `([A-Z][a-zA-Z'.'-]+(?:\\s+[A-Z][a-zA-Z'.'-]+){1,3})`;

    const thePrefix = `(?:[Tt]he\\s+)?`;
    const currentPrefix = `(?:[Cc]urrent\\s+|\\d+(?:st|nd|rd|th)\\s+(?:and\\s+[Cc]urrent\\s+)?|[Ii]ncumbent\\s+|[Pp]resent\\s+)?`;

    // Pattern 1: [Role] (of [Jurisdiction]), [Honorific] [Name]
    const roleAppositiveNameRegex = new RegExp(
      `${thePrefix}${currentPrefix}(?:${demonymPrefix ? `${demonymPrefix}\\s+` : ''})(?:${baseRolePattern})${ofCountryPart},\\s*${honorificPrefix}${personNameCapture}`
    );
    const m1 = cleanText.match(roleAppositiveNameRegex);
    if (m1 && isValidCandidateName(m1[1])) {
      const candidate = cleanCandidateAnswer(m1[1]);
      if (candidate) { _dbgLog('P1: Role-Appositive-Name', candidate); return candidate; }
    }

    // Pattern 2: [Honorific] [Name], [the] [current] [Role] (of [Jurisdiction])
    const nameAppositiveRoleRegex = new RegExp(
      `\\b${honorificPrefix}${personNameCapture},\\s*${thePrefix}${currentPrefix}${jurisdictionRolePrefix}(?:${baseRolePattern})${ofCountryPart}\\b`
    );
    const m2 = cleanText.match(nameAppositiveRoleRegex);
    if (m2 && isValidCandidateName(m2[1])) {
      const candidate = cleanCandidateAnswer(m2[1]);
      if (candidate) { _dbgLog('P2: Name-Appositive-Role', candidate); return candidate; }
    }

    // Pattern 3: [Honorific] [Name] is/was/serves as [the] [Role] (of [Jurisdiction])
    const isServingVerbs = `(?:is|was|were|became|has become|serves as|served as|is serving as|has been|has served as|has been serving as|was elected as|elected as|was appointed as|appointed as|was sworn[\\s-]+in as|sworn[\\s-]+in as|was sworn[\\s-]+in|sworn[\\s-]+in|took oath as|took the oath as|took over as|assumed office as|took office as|holds office as|is currently serving as)`;
    const nameIsRoleRegex = new RegExp(
      `\\b${honorificPrefix}${personNameCapture}\\s+(?:[Cc]urrently\\s+|[Pp]resently\\s+)?${isServingVerbs}\\s+(?:the\\s+|a\\s+|an\\s+)?${currentPrefix}${jurisdictionRolePrefix}(?:${baseRolePattern})${ofCountryPart}\\b`,
      'i'
    );
    const m3 = cleanText.match(nameIsRoleRegex);
    if (m3 && isValidCandidateName(m3[1])) {
      const candidate = cleanCandidateAnswer(m3[1]);
      if (candidate) { _dbgLog('P3: Name-Is-Role', candidate); return candidate; }
    }

    // Pattern 3b: [Name], who is/was [the] [current] [Role] of [Jurisdiction]
    const nameWhoIsRoleRegex = new RegExp(
      `\\b${honorificPrefix}${personNameCapture},\\s*who\\s+(?:is|was|serves as|served as|has been|has served as)\\s+(?:the\\s+|a\\s+|an\\s+)?(?:current\\s+|\\d+(?:st|nd|rd|th)\\s+)?(?:${baseRolePattern})${ofCountryPart}\\b`,
      'i'
    );
    const m3b = cleanText.match(nameWhoIsRoleRegex);
    if (m3b && isValidCandidateName(m3b[1])) {
      const candidate = cleanCandidateAnswer(m3b[1]);
      if (candidate) { _dbgLog('P3b: Name-Who-Is-Role', candidate); return candidate; }
    }

    // Pattern 4: (The) [Role] (of [Jurisdiction]) is/was [Honorific] [Name]
    const isNameVerbs = `(?:is|was|became|is currently|remains|has been)`;
    const roleIsNameRegex = new RegExp(
      `${thePrefix}${currentPrefix}(?:${demonymPrefix ? `${demonymPrefix}\\s+` : ''})(?:${baseRolePattern})${ofCountryPart}\\s+${isNameVerbs}\\s+${honorificPrefix}${personNameCapture}`,
      'i'
    );
    const m4 = cleanText.match(roleIsNameRegex);
    if (m4 && isValidCandidateName(m4[1])) {
      const candidate = cleanCandidateAnswer(m4[1]);
      if (candidate) { _dbgLog('P4: Role-Is-Name', candidate); return candidate; }
    }

    // Pattern 5: Key-Value / Incumbent: [Name]
    const keyValRegex = new RegExp(
      `(?:[Ii]ncumbent|[Oo]fficeholder|(?:${demonymPrefix ? `${demonymPrefix}\\s+` : ''}${baseRolePattern}))${ofCountryPart}\\s*:\\s*${honorificPrefix}${personNameCapture}(?:[.,;|\\n(]|$)`
    );
    const m5 = cleanText.match(keyValRegex);
    if (m5 && isValidCandidateName(m5[1])) {
      const candidate = cleanCandidateAnswer(m5[1]);
      if (candidate) { _dbgLog('P5: Key-Value', candidate); return candidate; }
    }

    // Pattern 5b: [Role] [Honorific] [Name] — e.g. "Prime Minister Shri Narendra Modi"
    // (recovers cases where the title-prefixed pattern above fails due to
    // intervening prepositions or extra words)
    const roleHonorificNameRegex = new RegExp(
      `(?:^|[.!?]\\s+)${thePrefix}(?:${demonymPrefix ? `${demonymPrefix}\\s+` : ''})(?:${baseRolePattern})${ofCountryPart}?\\s+${honorificPrefix}${multiWordNameCapture}(?:\\b|$)`,
      'i'
    );
    const m5b = cleanText.match(roleHonorificNameRegex);
    if (m5b && m5b[1]) {
      const firstWord = m5b[1].trim().split(/\s+/)[0].toLowerCase().replace(/[.,]/g, '');
      if (!HONORIFICS_SET.has(firstWord) && isValidCandidateName(m5b[1])) {
        const candidate = cleanCandidateAnswer(m5b[1]);
        if (candidate) { _dbgLog('P5b: Role-Honorific-Name', candidate); return candidate; }
      }
    }

    // Pattern 6: Title-prefixed Name with multi-word name
    const strictNameWord = `[A-Z][a-zA-Z'.\\-]+`;
    const strictMultiWordName = `(${strictNameWord}(?:\\s+${strictNameWord}){1,3})`;
    const titlePrefixedRegex = new RegExp(
      `${thePrefix}(?:${demonymPrefix ? `${demonymPrefix}\\s+` : ''})(?:${baseRolePattern})${ofCountryPart}?,?\\s+${honorificPrefix}${strictMultiWordName}\\b`
    );
    const m6 = cleanText.match(titlePrefixedRegex);
    if (m6 && m6[1]) {
      const captureFirstWord = m6[1].trim().split(/\s+/)[0].toLowerCase().replace(/[.,]/g, '');
      if (!HONORIFICS_SET.has(captureFirstWord) && isValidCandidateName(m6[1])) {
        const candidate = cleanCandidateAnswer(m6[1]);
        if (candidate) { _dbgLog('P6: Title-Prefixed-Name', candidate); return candidate; }
      }
    }

    // Pattern 7: [Country]'s [Role] [Name]
    const countryPossessivePattern =
      targetJurisdiction && targetJurisdiction.trim() ? demonymPrefix : `[A-Za-z]+'s`;
    const countryRoleNameRegex = new RegExp(
      `\\b(?:${countryPossessivePattern})\\s+${currentPrefix}(?:${baseRolePattern})\\s+${honorificPrefix}${multiWordNameCapture}\\b`
    );
    const m7 = cleanText.match(countryRoleNameRegex);
    if (m7 && isValidCandidateName(m7[1])) {
      const candidate = cleanCandidateAnswer(m7[1]);
      if (candidate) { _dbgLog('P7: Country-Possessive-Role-Name', candidate); return candidate; }
    }
  }

  // 2. What questions: Capital, Currency, Symbol, Concept
  if (whType === 'what' || whType === null) {
    const whatKeywords = keywords.filter((k) =>
      /^(capital|currency|language|symbol|anthem|headquarters|population|name|city|religion|sport|animal|bird|flower|tree)\w*/i.test(k)
    );
    const whatPattern = whatKeywords.length > 0
      ? whatKeywords.join('|')
      : 'capital|currency|language|symbol|anthem|seat of government|headquarters|largest city';

    const whatBeforeRoleRegex = new RegExp(
      `\\b([A-Z][A-Za-z0-9'.\\s-]{2,40}?)\\s+(?:is|was|serves as|became)\\s+(?:the\\s+)?(?:current\\s+|national\\s+)?(?:${whatPattern})\\s+(?:of|for)\\s+([A-Za-z\\s]+)`,
      'i'
    );
    const w1 = cleanText.match(whatBeforeRoleRegex);
    if (w1 && isValidCandidateEntity(w1[1])) return cleanCandidateAnswer(w1[1]);

    const roleBeforeWhatRegex = new RegExp(
      `(?:the\\s+)?(?:${whatPattern})\\s+(?:of\\s+[A-Za-z\\s]+?\\s+)?(?:is|was)\\s+([A-Z][A-Za-z0-9'.\\s-]{2,40}?)(?:[.,;]|\\s+which|\\s+and|\\s*\\()`,
      'i'
    );
    const w2 = cleanText.match(roleBeforeWhatRegex);
    if (w2 && isValidCandidateEntity(w2[1])) return cleanCandidateAnswer(w2[1]);

    const keyValWhatRegex = new RegExp(
      `(?:${whatPattern})\\s*:\\s*([A-Z][A-Za-z0-9'.\\s-]{2,40}?)(?:[.,;|\\n(]|$)`,
      'i'
    );
    const w3 = cleanText.match(keyValWhatRegex);
    if (w3 && isValidCandidateEntity(w3[1])) return cleanCandidateAnswer(w3[1]);

    const appositiveWhatRegex = new RegExp(
      `\\b([A-Z][A-Za-z0-9'.\\s-]{2,40}?),\\s*(?:the\\s+)?(?:national\\s+)?(?:${whatPattern})\\s+of\\s+([A-Za-z\\s]+)`,
      'i'
    );
    const w4 = cleanText.match(appositiveWhatRegex);
    if (w4 && isValidCandidateEntity(w4[1])) return cleanCandidateAnswer(w4[1]);
  }

  // 3. Where questions: Location / Country / City
  if (whType === 'where') {
    const locMatch = cleanText.match(
      /(?:located in|situated in|based in|found in)\s+([A-Z][A-Za-z0-9\s,'-]+?)(?:[.;]|\s+on|\s+along|\s+near)/i
    );
    if (locMatch && locMatch[1].trim().length > 2) {
      return cleanCandidateAnswer(locMatch[1]);
    }
  }

  // 4. When questions: Dates / Years
  if (whType === 'when') {
    const dateMatch = cleanText.match(
      /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\b(?:1[6-9]|20)\d{2}\b)/i
    );
    if (dateMatch) {
      return dateMatch[1].trim();
    }
  }

  return null;
}

const CONTRADICTING_PATTERNS = [
  /\b(debunked|debunking|debunks|false|hoax|untrue|fake|myth|disproven|disproved|refuted|refutes|refuting)\b/i,
  /\b(failed to replicate|cannot replicate|unable to replicate|replication failure|not replicated)\b/i,
  /\b(no evidence|no scientific evidence|no proof|lacks evidence|not supported by evidence|unfounded)\b/i,
  /\b(harm|harms|harming|harmful|damage|damages|damaging|hurt|hurts|danger|dangers|dangerous)\b/i,
  /\b(adverse effects|side effects|toxicity|toxic|risk|risks|drawback|drawbacks|disadvantage|disadvantages)\b/i,
  /\b(ineffective|useless|fails to|does not improve|no benefit|worse|negative impact|negative effects)\b/i,
  /\b(incorrect|misleading|fabrication|unsubstantiated|denies|rejected|pseudoscience)\b/i,
];

const SUPPORTING_PATTERNS = [
  /\b(confirm|confirms|confirmed|confirming|evidence shows|evidence indicates|proven|proved|proves)\b/i,
  /\b(discovered|breakthrough|successful|succeeds|validated|validates|verified|verifies)\b/i,
  /\b(improve|improves|improving|improvement|beneficial|benefit|benefits|positive effect|positive impact)\b/i,
  /\b(effective|efficacy|advantage|advantages|safely|safe|protection|protects|cures|heals)\b/i,
  /\b(statistically significant|clinical trial supports|study finds|study shows|research confirms)\b/i,
  /\b(true|accurate|corroborated|supported by data|authentic|real)\b/i,
];

const NEUTRAL_PATTERNS = [
  /\b(mixed results|inconclusive|unclear|further research needed|debated|ongoing study|remains to be seen)\b/i,
  /\b(varies|depends on|preliminary|investigating|overview of|exploring|reviewing|potential)\b/i,
  /\b(controversy|controversial|under investigation|both positive and negative|pros and cons)\b/i,
];

/**
 * Classifies a claim against a Proposition / Yes-No style question.
 */
function classifyPropositionStance(
  claimText: string,
  question: string
): { relationship: ClaimRelationship; confidence: number; reasoning: string } {
  const combinedText = claimText.toLowerCase();
  const lowerQ = question.toLowerCase();

  let contradictScore = 0;
  let supportScore = 0;
  let neutralScore = 0;

  for (const pattern of CONTRADICTING_PATTERNS) {
    if (pattern.test(combinedText)) contradictScore += 2;
  }
  for (const pattern of SUPPORTING_PATTERNS) {
    if (pattern.test(combinedText)) supportScore += 2;
  }
  for (const pattern of NEUTRAL_PATTERNS) {
    if (pattern.test(combinedText)) neutralScore += 2;
  }

  const isHarmQuestion = /\b(harm|harms|dangerous|risk|fake|hoax|false|myth)\b/i.test(lowerQ);

  if (neutralScore > supportScore && neutralScore > contradictScore) {
    return {
      relationship: 'neutral',
      confidence: 0.75,
      reasoning: 'Evidence indicates mixed, conditional, or inconclusive outcomes.',
    };
  }

  if (contradictScore > supportScore) {
    return {
      relationship: 'contradicts',
      confidence: Math.min(0.95, 0.6 + contradictScore * 0.1),
      reasoning: isHarmQuestion
        ? 'Presents findings confirming negative effects or disputing efficacy.'
        : 'Presents counter-evidence, skepticism, debunking, or negative outcomes.',
    };
  }

  if (supportScore > contradictScore) {
    return {
      relationship: 'supports',
      confidence: Math.min(0.95, 0.6 + supportScore * 0.1),
      reasoning: 'Presents affirmative evidence, corroboration, or positive findings.',
    };
  }

  return {
    relationship: 'neutral',
    confidence: 0.5,
    reasoning: 'Presents descriptive context without explicit directional confirmation or refutation.',
  };
}

/**
 * Cleans a snippet: strips dates, breadcrumbs, ellipsis.
 */
function cleanSnippet(snippet: string): string {
  return snippet
    .replace(/^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s*(\.\.\.|—|-|:)\s*/i, '')
    .replace(/\s*\.\.\.\s*/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits snippet into clean sentences.
 */
function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10 && !/^(read more|click here|jump to|sign in|subscribe|cookie)/i.test(s));
}

interface CandidateGroup {
  normalizedKey: string;
  displayAnswer: string;
  sources: Set<string>;
  claimsCount: number;
}

/**
 * FIX: For WH "who" questions with a specific role + jurisdiction, validates that the
 * extracted candidate is genuinely asserted as holding that *specific* role for that
 * jurisdiction in the given text.
 *
 * Key change from previous version: We now validate against the PRIMARY (most specific)
 * role phrase, not the entire role alternation. This prevents "Home Minister" from
 * validating when the question asks about "Prime Minister".
 */
function validateWhCandidateInContext(
  candidate: string | null,
  text: string,
  whType: string | null,
  rolePhrases: string[],
  targetJurisdiction: string | null
): string | null {
  if (!candidate) return null;
  let effectiveCandidate = candidate;
  console.log(`[TL-DEBUG][VALIDATE] ── Validating candidate="${candidate}"`);
  console.log(`[TL-DEBUG][VALIDATE]    roles=[${rolePhrases.join(', ')}] jurisdiction="${targetJurisdiction}"`);
  console.log(`[TL-DEBUG][VALIDATE]    context: "${text.substring(0, 250)}"`);

  const _vResult = (patLabel: string, accepted: boolean) => {
    console.log(`[TL-DEBUG][VALIDATE]    ${accepted ? '✓ ACCEPTED' : '✗ REJECTED'} (${patLabel}) candidate="${candidate}"`);
    if (effectiveCandidate !== candidate) {
      console.log(`[TL-DEBUG][VALIDATE]    effectiveCandidate="${effectiveCandidate}"`);
    }
  };

  // Only apply strict validation to "who" questions with both role and jurisdiction
  if (whType !== 'who') { _vResult('bypass: not who-question', true); return candidate; }
  if (!targetJurisdiction || !targetJurisdiction.trim()) { _vResult('bypass: no jurisdiction', true); return candidate; }
  if (rolePhrases.length === 0) { _vResult('bypass: no role phrases', true); return candidate; }

  // FIX: Use ONLY the primary (most specific) role for validation.
  const primaryRole = pickPrimaryRole(rolePhrases);
  if (!primaryRole) { _vResult('bypass: no primary role', true); return candidate; }

  console.log(`[TL-DEBUG][VALIDATE]    primaryRole="${primaryRole}"`);

  const cleanText = text.replace(/\s+/g, ' ').trim();
  const lowerText = cleanText.toLowerCase();
  const lowerCandidate = candidate.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const candidateWords = lowerCandidate.split(/\s+/).filter(Boolean);
  const lowerJurisdiction = targetJurisdiction.toLowerCase().trim();

  // Build jurisdiction variants (e.g. "india", "indian", "india's")
  const jurisdictionVariants: string[] = [lowerJurisdiction];
  if (lowerJurisdiction.endsWith('a')) {
    jurisdictionVariants.push(`${lowerJurisdiction}n`);
  }
  jurisdictionVariants.push(`${lowerJurisdiction}'s`);

  // Check if the candidate name appears in the text
  if (!candidateWords.some((w) => lowerText.includes(w))) {
    _vResult('candidate words not found in text', false);
    return null;
  }

  // Fallback: if the candidate is a strict prefix or subset of a longer
  // capitalized name in the text, expand it to the longer form before
  // running the structural patterns. This handles cases where the
  // extractor grabbed a partial name (e.g. "Narendra") while the text
  // contains the full name (e.g. "Narendra Modi").
  //
  // Strategy: find the position of the FIRST candidate word in the text,
  // then greedily extend the match to include any immediately following
  // capitalized words. If the extension differs from the candidate, use
  // the extension as the candidate for pattern matching below.
  effectiveCandidate = candidate;
  {
    const firstWord = candidateWords[0];
    const firstIdx = lowerText.indexOf(firstWord);
    if (firstIdx >= 0) {
      // Slice the ORIGINAL text starting at firstIdx, then match a run of
      // capitalized words.
      const tail = cleanText.slice(firstIdx);
      const extendedMatch = tail.match(/^([A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+){0,3})/);
      if (extendedMatch && extendedMatch[1]) {
        const extended = extendedMatch[1].trim();
        if (extended.length > candidate.length) {
          effectiveCandidate = extended;
        }
      }
    }
  }

  const lowerEffectiveCandidate = effectiveCandidate.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const effectiveCandidateWords = lowerEffectiveCandidate.split(/\s+/).filter(Boolean);

  // Build regex-safe versions
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // FIX: Use primaryRole only, NOT the full role alternation.
  const rolePattern = escapeRegex(primaryRole.toLowerCase());
  const jurisdictionPattern = jurisdictionVariants.map((j) => escapeRegex(j)).join('|');

  // Escape candidate name for regex
  const candidatePattern = effectiveCandidateWords.map((w) => escapeRegex(w)).join('\\s+');

  // ── Pattern A: [Jurisdiction's / Demonym] [Role] [Candidate]
  const patA = new RegExp(
    `(?:${jurisdictionPattern})\\s+(?:current\\s+|\\d+(?:st|nd|rd|th)\\s+)?(?:${rolePattern})\\s+(?:[A-Z][a-z]+\\.?\\s+)*${candidatePattern}`,
    'i'
  );
  if (patA.test(cleanText)) { _vResult('Pattern-A: Jurisdiction-Role-Name', true); return effectiveCandidate; }

  // ── Pattern B: [Role] of [Jurisdiction][,] [Candidate]
  const patB = new RegExp(
    `(?:${rolePattern})\\s+of\\s+(?:the\\s+)?(?:republic\\s+of\\s+)?(?:${jurisdictionPattern})[,\\s]+(?:[A-Z][a-z]+\\.?\\s+)*${candidatePattern}`,
    'i'
  );
  if (patB.test(cleanText)) { _vResult('Pattern-B: Role-of-Jurisdiction-Name', true); return effectiveCandidate; }

  // ── Pattern C: [Candidate][,] [the] [Role] of [Jurisdiction]
  const patC = new RegExp(
    `${candidatePattern}[,\\s]+(?:the\\s+)?(?:current\\s+)?(?:${rolePattern})\\s+of\\s+(?:the\\s+)?(?:republic\\s+of\\s+)?(?:${jurisdictionPattern})`,
    'i'
  );
  if (patC.test(cleanText)) { _vResult('Pattern-C: Name-Role-of-Jurisdiction', true); return effectiveCandidate; }

  // ── Pattern D: [Name] [verb] [Role] of [Jurisdiction]
  //                 OR [Name] [verb] [Jurisdiction]'s [Role]
  //                 OR [Name] [verb] [Jurisdiction] [Role]
  const linkingVerbs = '(?:is|was|were|became|has\\s+become|serves\\s+as|served\\s+as|is\\s+serving\\s+as|has\\s+been|has\\s+served\\s+as|was\\s+elected\\s+as|elected\\s+as|was\\s+appointed\\s+as|appointed\\s+as|was\\s+sworn[\\s-]+in\\s+as|sworn[\\s-]+in\\s+as|was\\s+sworn[\\s-]+in|took\\s+oath\\s+as|took\\s+the\\s+oath\\s+as|took\\s+over\\s+as|assumed\\s+office\\s+as|took\\s+office\\s+as|holds\\s+office\\s+as|is\\s+currently\\s+serving\\s+as)';
  const patD = new RegExp(
    `${candidatePattern}\\s+(?:currently\\s+)?${linkingVerbs}\\s+(?:the\\s+|a\\s+|an\\s+)?(?:current\\s+|\\d+(?:st|nd|rd|th)\\s+(?:and\\s+current\\s+)?)?(?:(?:${jurisdictionPattern})['’]s\\s+(?:${rolePattern})|(?:${rolePattern})\\s+of\\s+(?:the\\s+)?(?:republic\\s+of\\s+)?(?:${jurisdictionPattern})|(?:${jurisdictionPattern})\\s+(?:${rolePattern}))`,
    'i'
  );
  if (patD.test(cleanText)) {
    _vResult('Pattern-D: Name-Verb-Role-Jurisdiction', true);
    return effectiveCandidate;
  }

  // ── Pattern D2: [Name], who is/was [the] [current] [Role] of [Jurisdiction]
  //               Appositive form common in Wikipedia/news prose.
  const patD2 = new RegExp(
    `${candidatePattern},\\s*who\\s+(?:is|was|serves\\s+as|served\\s+as|has\\s+been|has\\s+served\\s+as)\\s+(?:the\\s+|a\\s+|an\\s+)?(?:current\\s+|\\d+(?:st|nd|rd|th)\\s+)?(?:${rolePattern})\\s+of\\s+(?:the\\s+)?(?:republic\\s+of\\s+)?(?:${jurisdictionPattern})`,
    'i'
  );
  if (patD2.test(cleanText)) { _vResult('Pattern-D2: Name-Who-Is-Role-of-Jurisdiction', true); return effectiveCandidate; }

  // ── Pattern E: [Role] of [Jurisdiction] is/was [Candidate]
  const patE = new RegExp(
    `(?:the\\s+)?(?:current\\s+)?(?:${jurisdictionPattern}\\s+)?(?:${rolePattern})\\s+of\\s+(?:the\\s+)?(?:republic\\s+of\\s+)?(?:${jurisdictionPattern})\\s+(?:is|was|remains|has\\s+been|is\\s+currently)\\s+(?:[A-Z][a-z]+\\.?\\s+)*${candidatePattern}`,
    'i'
  );
  if (patE.test(cleanText)) { _vResult('Pattern-E: Role-of-Jurisdiction-is-Name', true); return effectiveCandidate; }

  // ── Pattern F: Key-value / label style
  const patF = new RegExp(
    `(?:${rolePattern})\\s+of\\s+(?:the\\s+)?(?:republic\\s+of\\s+)?(?:${jurisdictionPattern})\\s*:\\s*(?:[A-Z][a-z]+\\.?\\s+)*${candidatePattern}`,
    'i'
  );
  if (patF.test(cleanText)) { _vResult('Pattern-F: Key-Value-Label', true); return effectiveCandidate; }

  // ── None of the strict patterns matched
  const hasRole = new RegExp(`(?:${rolePattern})`, 'i').test(lowerText);
  const hasJurisdiction = jurisdictionVariants.some((j) => lowerText.includes(j));

  if (!hasRole || !hasJurisdiction) {
    _vResult(`no-pattern-match, hasRole=${hasRole} hasJurisdiction=${hasJurisdiction}`, false);
    return null;
  }

  _vResult('role+jurisdiction present but no assertion pattern matched', false);
  return null;
}

/**
 * Question-Aware Evidence Analysis & Claim Extraction.
 */
export function extractQuestionAwareClaims(
  question: string,
  results: (NormalizedSearchResult | InvestigationResultItem)[]
): {
  claims: ExtractedClaim[];
  dominantAnswer: string | null;
  candidateGroups: CandidateGroup[];
  qAnalysis: QuestionAnalysis;
} {
  const qAnalysis = analyzeQuestion(question);
  const { isWhQuestion, whType, keywords, rolePhrases, targetJurisdiction } = qAnalysis;

  console.log('\n' + '═'.repeat(80));
  console.log('[TL-DEBUG][QUESTION] ══ Stage 4 Evidence Analysis ══');
  console.log(`[TL-DEBUG][QUESTION] question: "${question}"`);
  console.log(`[TL-DEBUG][QUESTION] isWhQuestion=${isWhQuestion} whType=${whType}`);
  console.log(`[TL-DEBUG][QUESTION] keywords=[${keywords.join(', ')}]`);
  console.log(`[TL-DEBUG][QUESTION] rolePhrases=[${rolePhrases.join(', ')}]`);
  console.log(`[TL-DEBUG][QUESTION] targetJurisdiction="${targetJurisdiction}"`);
  console.log(`[TL-DEBUG][QUESTION] total results: ${results.length}`);
  console.log('─'.repeat(80));

  interface RawResultClaim {
    item: NormalizedSearchResult | InvestigationResultItem;
    resultIndex: number;
    sentence: string;
    candidateAnswer: string | null;
    isTopical: boolean;
  }

  const rawExtracted: RawResultClaim[] = [];

  results.forEach((item, index) => {
    const rawSnippet = item.snippet?.trim() || '';
    const title = item.title?.trim() || '';
    const cleaned = cleanSnippet(rawSnippet);

    console.log(`\n[TL-DEBUG][SOURCE] ── Result #${index + 1} ──`);
    console.log(`[TL-DEBUG][SOURCE]   title: "${title.substring(0, 120)}"`);
    console.log(`[TL-DEBUG][SOURCE]   url: "${item.url}"`);
    console.log(`[TL-DEBUG][SOURCE]   snippet: "${rawSnippet.substring(0, 200)}"`);
    console.log(`[TL-DEBUG][SOURCE]   source: "${item.source}"`);

    const sentences = splitIntoSentences(cleaned);
    if (sentences.length === 0 && cleaned.length >= 15) {
      sentences.push(cleaned);
    } else if (sentences.length === 0 && title.length >= 15) {
      sentences.push(title);
    }

    let bestSentence = '';
    let extractedCandidate: string | null = null;
    let highestRelevanceScore = -1;

    const fullContext = `${title}. ${cleaned}`.replace(/\s+/g, ' ').trim();

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      let matchCount = 0;
      keywords.forEach((k) => {
        if (lowerSentence.includes(k)) matchCount++;
      });

      console.log(`[TL-DEBUG][EXTRACT] Sentence: "${sentence.substring(0, 150)}"`);
      let candidate = isWhQuestion
        ? extractCandidateAnswerFromText(sentence, whType, keywords, rolePhrases, targetJurisdiction)
        : null;
      const candidateBeforeValidation = candidate;
      console.log(`[TL-DEBUG][EXTRACT] rawCandidate (before validation)=${candidate ? `"${candidate}"` : 'null'}`);

      if (candidate && isWhQuestion && whType === 'who') {
        candidate = validateWhCandidateInContext(
          candidate,
          fullContext,
          whType,
          rolePhrases,
          targetJurisdiction
        );
      }
      if (candidateBeforeValidation && !candidate) {
        console.log(`[TL-DEBUG][VALIDATE] ✗ Candidate "${candidateBeforeValidation}" REJECTED by validation → null`);
      } else if (candidate) {
        console.log(`[TL-DEBUG][VALIDATE] ✓ Candidate "${candidate}" PASSED validation`);
      }

      const score = matchCount + (candidate ? 10 : 0);

      if (score > highestRelevanceScore) {
        highestRelevanceScore = score;
        bestSentence = sentence;
        extractedCandidate = candidate;
      }
    }

    // Also check title if no candidate answer found in snippet
    if (isWhQuestion && !extractedCandidate && title) {
      let titleCandidate = extractCandidateAnswerFromText(
        title,
        whType,
        keywords,
        rolePhrases,
        targetJurisdiction
      );
      if (titleCandidate && whType === 'who') {
        titleCandidate = validateWhCandidateInContext(
          titleCandidate,
          fullContext,
          whType,
          rolePhrases,
          targetJurisdiction
        );
      }
      if (titleCandidate) {
        extractedCandidate = titleCandidate;
        if (!bestSentence) bestSentence = title;
      }
    }

    if (bestSentence) {
      const isTopical = highestRelevanceScore > 0 || keywords.length === 0;
      console.log(`[TL-DEBUG][SOURCE] Result #${index + 1} FINAL: candidate=${extractedCandidate ? `"${extractedCandidate}"` : 'null'} bestSentence="${bestSentence.substring(0, 100)}" isTopical=${isTopical}`);
      rawExtracted.push({
        item,
        resultIndex: index,
        sentence: bestSentence,
        candidateAnswer: extractedCandidate,
        isTopical,
      });
    }
  });

  // Candidate Answer Grouping for WH questions
  const candidateGroups: CandidateGroup[] = [];
  let dominantAnswer: string | null = null;

  console.log('\n' + '─'.repeat(80));
  console.log('[TL-DEBUG][GROUP] ══ Candidate Grouping ══');

  if (isWhQuestion) {
    rawExtracted.forEach(({ item, candidateAnswer }) => {
      if (!candidateAnswer) return;

      let matchedGroup = candidateGroups.find((g) => areAnswersEquivalent(g.displayAnswer, candidateAnswer));
      const isNewGroup = !matchedGroup;
      if (!matchedGroup) {
        matchedGroup = {
          normalizedKey: normalizeForGrouping(candidateAnswer),
          displayAnswer: candidateAnswer,
          sources: new Set<string>(),
          claimsCount: 0,
        };
        candidateGroups.push(matchedGroup);
      }

      matchedGroup.sources.add(item.source || 'Web Source');
      matchedGroup.claimsCount += 1;
      console.log(`[TL-DEBUG][GROUP] candidate="${candidateAnswer}" source="${item.source}" ${isNewGroup ? '(NEW GROUP)' : `(merged into "${matchedGroup.displayAnswer}")` }`);
    });

    candidateGroups.sort((a, b) => b.sources.size - a.sources.size);
    if (candidateGroups.length > 0) {
      dominantAnswer = candidateGroups[0].displayAnswer;
    }

    console.log(`[TL-DEBUG][GROUP] Total groups: ${candidateGroups.length}`);
    candidateGroups.forEach((g, i) => {
      console.log(`[TL-DEBUG][GROUP]   #${i + 1} "${g.displayAnswer}" — ${g.sources.size} source(s), ${g.claimsCount} claim(s) [${Array.from(g.sources).join(', ')}]`);
    });
    console.log(`[TL-DEBUG][GROUP] dominantAnswer=${dominantAnswer ? `"${dominantAnswer}"` : 'null'}`);
  }

  // Construct Final Extracted Claims with Question-Aware Stances
  const claims: ExtractedClaim[] = [];

  console.log('\n' + '─'.repeat(80));
  console.log('[TL-DEBUG][CLAIM] ══ Claim Classification ══');

  rawExtracted.forEach(({ item, resultIndex, sentence, candidateAnswer, isTopical }) => {
    const sourceType = classifySourceType(item.url, item.source);
    let relationship: ClaimRelationship = 'neutral';
    let confidence = 0.6;
    let reasoning = 'Presents contextual background without explicit directional polarity.';

    if (isWhQuestion) {
      if (candidateAnswer && dominantAnswer) {
        const equiv = areAnswersEquivalent(candidateAnswer, dominantAnswer);
        console.log(`[TL-DEBUG][CLAIM] Result #${resultIndex + 1}: candidate="${candidateAnswer}" dominant="${dominantAnswer}" areEquivalent=${equiv}`);
        if (equiv) {
          relationship = 'supports';
          confidence = 0.9;
          reasoning = `Identifies and corroborates "${dominantAnswer}" as the candidate answer.`;
        } else {
          relationship = 'contradicts';
          confidence = 0.85;
          reasoning = `Identifies "${candidateAnswer}" as the answer, which materially differs from "${dominantAnswer}".`;
          console.log(`[TL-DEBUG][CLAIM] ⚠ CONTRADICTION: "${candidateAnswer}" ≠ "${dominantAnswer}" from source="${item.source}" url="${item.url}"`);
          console.log(`[TL-DEBUG][CLAIM]   sentence: "${sentence.substring(0, 200)}"`);
        }
      } else {
        relationship = 'neutral';
        confidence = isTopical ? 0.7 : 0.5;
        reasoning = isTopical
          ? 'Discusses the subject matter but does not explicitly identify a candidate answer.'
          : 'Provides general background context.';
        console.log(`[TL-DEBUG][CLAIM] Result #${resultIndex + 1}: no candidate (neutral) isTopical=${isTopical}`);
      }
    } else {
      const stance = classifyPropositionStance(sentence, question);
      relationship = stance.relationship;
      confidence = stance.confidence;
      reasoning = stance.reasoning;
    }

    console.log(`[TL-DEBUG][CLAIM] Result #${resultIndex + 1} → relationship=${relationship} confidence=${confidence.toFixed(2)} source="${item.source}"`);

    claims.push({
      id: `claim-${resultIndex + 1}`,
      claim: sentence,
      source: item.source || 'Web Source',
      title: item.title || 'Untitled Document',
      url: item.url || '',
      snippet: item.snippet || sentence,
      sourceType,
      relationship,
      confidence,
      reasoning,
    });
  });

  const finalSupport = claims.filter(c => c.relationship === 'supports').length;
  const finalContradict = claims.filter(c => c.relationship === 'contradicts').length;
  const finalNeutral = claims.filter(c => c.relationship === 'neutral').length;
  console.log('\n' + '─'.repeat(80));
  console.log(`[TL-DEBUG][SUMMARY] supports=${finalSupport} contradicts=${finalContradict} neutral=${finalNeutral}`);
  console.log(`[TL-DEBUG][SUMMARY] dominantAnswer=${dominantAnswer ? `"${dominantAnswer}"` : 'null'}`);
  if (finalContradict > 0) {
    const contradictingClaims = claims.filter(c => c.relationship === 'contradicts');
    console.log('[TL-DEBUG][SUMMARY] ⚠ CONTRADICTING CLAIMS:');
    contradictingClaims.forEach(c => {
      console.log(`[TL-DEBUG][SUMMARY]   id=${c.id} source="${c.source}" claim="${c.claim.substring(0, 150)}"`);
    });
  }
  console.log('═'.repeat(80) + '\n');

  return {
    claims,
    dominantAnswer,
    candidateGroups,
    qAnalysis,
  };
}

/**
 * Generates cross-source comparison synthesis from extracted claims.
 */
export function synthesizeComparisons(
  claims: ExtractedClaim[],
  question: string,
  dominantAnswer: string | null = null,
  candidateGroups: CandidateGroup[] = []
): CrossSourceComparison[] {
  const comparisons: CrossSourceComparison[] = [];

  const supportingSources = Array.from(
    new Set(claims.filter((c) => c.relationship === 'supports').map((c) => c.source))
  );
  const contradictingSources = Array.from(
    new Set(claims.filter((c) => c.relationship === 'contradicts').map((c) => c.source))
  );
  const neutralSources = Array.from(
    new Set(claims.filter((c) => c.relationship === 'neutral').map((c) => c.source))
  );

  let comparisonSummary = '';

  if (dominantAnswer) {
    if (supportingSources.length > 0 && contradictingSources.length > 0) {
      const altAnswers = candidateGroups
        .filter((g) => !areAnswersEquivalent(g.displayAnswer, dominantAnswer))
        .map((g) => `"${g.displayAnswer}" (${g.sources.size} source(s))`)
        .join(', ');
      comparisonSummary = `Divergent candidate answers identified: ${supportingSources.length} source(s) support "${dominantAnswer}", while conflicting sources identify alternative candidate answer(s): ${altAnswers}.`;
    } else if (supportingSources.length > 0) {
      comparisonSummary = `Consistently supported across ${supportingSources.length} source(s) that "${dominantAnswer}" is the answer to the question, with no contradictory answers identified in collected evidence.`;
    } else {
      comparisonSummary = `Sources provide descriptive context regarding the topic but lack affirmative corroboration.`;
    }
  } else {
    if (supportingSources.length > 0 && contradictingSources.length > 0) {
      comparisonSummary = `Direct divergence identified: ${supportingSources.length} source(s) corroborate the proposition, while ${contradictingSources.length} source(s) provide contrary evidence or counterclaims.`;
    } else if (supportingSources.length > 0) {
      comparisonSummary = `Broad agreement across ${supportingSources.length} source(s) supporting the proposition without explicit counterclaims in collected evidence.`;
    } else if (contradictingSources.length > 0) {
      comparisonSummary = `Consistent refutation across ${contradictingSources.length} source(s) disputing the claim or identifying significant counter-evidence.`;
    } else {
      comparisonSummary = `Sources provide descriptive context and neutral background without definitive directional consensus.`;
    }
  }

  comparisons.push({
    aspect: dominantAnswer
      ? `Candidate Answer: "${dominantAnswer}"`
      : `Core Premise: "${question.slice(0, 80)}${question.length > 80 ? '...' : ''}"`,
    supportingSources,
    contradictingSources,
    neutralSources,
    summary: comparisonSummary,
  });

  return comparisons;
}

/**
 * Computes the overall evidence state strictly according to the evidence rules.
 */
export function evaluateEvidenceState(
  claims: ExtractedClaim[],
  totalResults: number,
  dominantAnswer: string | null = null
): { state: EvidenceState; summary: string } {
  if (totalResults === 0 || claims.length === 0) {
    return {
      state: 'Insufficient Evidence',
      summary: 'No conclusive web evidence or indexing data was collected to substantiate or evaluate this inquiry.',
    };
  }

  const supportClaims = claims.filter((c) => c.relationship === 'supports');
  const contradictClaims = claims.filter((c) => c.relationship === 'contradicts');
  const neutralClaims = claims.filter((c) => c.relationship === 'neutral');

  const uniqueSupportSources = new Set(supportClaims.map((c) => c.source)).size;
  const uniqueContradictSources = new Set(contradictClaims.map((c) => c.source)).size;

  if (dominantAnswer) {
    if (uniqueSupportSources >= 1 && uniqueContradictSources >= 1) {
      return {
        state: 'Conflicting',
        summary: `Sources provide conflicting candidate answers: "${dominantAnswer}" (${uniqueSupportSources} source(s)) vs alternative claims (${uniqueContradictSources} source(s)).`,
      };
    }

    if (uniqueSupportSources >= 2 && uniqueContradictSources === 0) {
      return {
        state: 'Supported',
        summary: `Corroborated across ${uniqueSupportSources} independent source(s) supporting "${dominantAnswer}" with consistent factual assertions and no contradictory evidence identified.`,
      };
    }

    if (uniqueSupportSources === 1 && uniqueContradictSources === 0) {
      return {
        state: 'Unverified',
        summary: `A candidate answer ("${dominantAnswer}") was identified, but cross-source corroboration is currently limited to a single source.`,
      };
    }

    if (uniqueContradictSources >= 1 && uniqueSupportSources === 0) {
      return {
        state: 'Conflicting',
        summary: `Collected evidence challenges the primary candidate answer across ${uniqueContradictSources} source(s).`,
      };
    }
  }

  if (uniqueSupportSources >= 1 && uniqueContradictSources >= 1) {
    return {
      state: 'Conflicting',
      summary: `Evidence across consulted sources is in active tension: ${uniqueSupportSources} source(s) support the claim while ${uniqueContradictSources} source(s) report contradictory findings or skepticism.`,
    };
  }

  if (uniqueSupportSources >= 2 && uniqueContradictSources === 0) {
    return {
      state: 'Supported',
      summary: `Corroborated across ${uniqueSupportSources} distinct sources with consistent factual assertions and no contradictory evidence identified.`,
    };
  }

  if (uniqueSupportSources === 1 && uniqueContradictSources === 0) {
    return {
      state: 'Unverified',
      summary: 'A preliminary supporting claim was identified, but cross-source corroboration remains limited across independent publications.',
    };
  }

  if (uniqueContradictSources >= 1 && uniqueSupportSources === 0) {
    return {
      state: 'Conflicting',
      summary: `Collected evidence challenges or refutes the stated premise across ${uniqueContradictSources} source(s) without affirmative corroboration.`,
    };
  }

  if (neutralClaims.length > 0) {
    return {
      state: 'Unverified',
      summary: 'Consulted sources discuss the subject matter but offer descriptive, conditional, or inconclusive evidence without a decisive answer.',
    };
  }

  return {
    state: 'Insufficient Evidence',
    summary: 'Available evidence is too scant or tangential to determine factual veracity or answer the inquiry.',
  };
}

/**
 * Optional native LLM extraction helper when an LLM API key is present in environment.
 */
async function tryLlmEvidenceAnalysis(
  question: string,
  results: (NormalizedSearchResult | InvestigationResultItem)[]
): Promise<EvidenceAnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    if (process.env.OPENAI_API_KEY || process.env.LLM_API_KEY) {
      const endpoint = process.env.LLM_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
      const prompt = `You are a strict evidence extraction assistant for TruthLens.
Given the investigation question and collected search results, perform question-aware claim extraction and classification.

Investigation Question: "${question}"

Search Results:
${results
  .slice(0, 10)
  .map(
    (r, i) =>
      `[Result ${i + 1}] Source: "${r.source}", Title: "${r.title}", URL: "${r.url}", Snippet: "${r.snippet}"`
  )
  .join('\n\n')}

Rules:
1. Determine Question Type:
   - For Information / WH questions (who, what, when, where, which, how):
     * Extract candidate answers from evidence. Group semantically equivalent answers.
     * Sources supporting the consensus candidate answer are "supports".
     * Sources asserting a materially different answer are "contradicts".
     * Sources that do not answer the question are "neutral" (absence of an answer is NOT contradiction).
   - For Proposition / Yes-No questions:
     * Sources corroborating the premise are "supports", sources refuting it are "contradicts", non-addressing are "neutral".
2. Prevent Claim Explosion: Extract at most 1 concise, highly-relevant factual claim per search result.
3. Preserve source, title, url, snippet for each extracted claim.
4. Set overallEvidenceState to "Supported", "Conflicting", "Unverified", or "Insufficient Evidence".
5. Return strictly JSON matching:
{
  "overallEvidenceState": "Supported" | "Conflicting" | "Unverified" | "Insufficient Evidence",
  "summary": "...",
  "claims": [
    {
      "claim": "...",
      "source": "...",
      "title": "...",
      "url": "...",
      "snippet": "...",
      "relationship": "supports" | "contradicts" | "neutral",
      "reasoning": "..."
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
      const rawClaims = Array.isArray(parsed.claims) ? parsed.claims : [];

      const formattedClaims: ExtractedClaim[] = rawClaims.map((c: Record<string, unknown>, idx: number) => {
        const urlStr = String(c.url || '');
        const sourceStr = String(c.source || 'Web Source');
        const relationshipVal = (['supports', 'contradicts', 'neutral'].includes(String(c.relationship))
          ? c.relationship
          : 'neutral') as ClaimRelationship;

        return {
          id: `claim-llm-${idx + 1}`,
          claim: String(c.claim || ''),
          source: sourceStr,
          title: String(c.title || 'Untitled Document'),
          url: urlStr,
          snippet: String(c.snippet || ''),
          sourceType: classifySourceType(urlStr, sourceStr),
          relationship: relationshipVal,
          confidence: 0.9,
          reasoning: String(c.reasoning || ''),
        };
      });

      const supportCount = formattedClaims.filter((c) => c.relationship === 'supports').length;
      const contradictCount = formattedClaims.filter((c) => c.relationship === 'contradicts').length;
      const neutralCount = formattedClaims.filter((c) => c.relationship === 'neutral').length;

      const validStates: EvidenceState[] = ['Supported', 'Conflicting', 'Unverified', 'Insufficient Evidence'];
      const overallState = validStates.includes(parsed.overallEvidenceState)
        ? parsed.overallEvidenceState
        : evaluateEvidenceState(formattedClaims, results.length).state;

      return {
        question,
        overallEvidenceState: overallState,
        summary: String(parsed.summary || evaluateEvidenceState(formattedClaims, results.length).summary),
        totalClaimsCount: formattedClaims.length,
        supportCount,
        contradictCount,
        neutralCount,
        claims: formattedClaims,
        comparisons: synthesizeComparisons(formattedClaims, question),
        analyzedAt: new Date().toISOString(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Main Stage 4 Evidence Analysis Entry Point.
 */
export async function analyzeEvidence(
  question: string,
  results: (NormalizedSearchResult | InvestigationResultItem)[] = []
): Promise<EvidenceAnalysisResult> {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    throw new Error('Investigation question cannot be empty.');
  }

  // 1. Check if LLM is configured and successful
  const llmResult = await tryLlmEvidenceAnalysis(trimmedQuestion, results);
  if (llmResult) {
    return llmResult;
  }

  // 2. Deterministic Question-Aware Evidence Extraction & Analysis
  const { claims, dominantAnswer, candidateGroups } = extractQuestionAwareClaims(trimmedQuestion, results);

  const supportCount = claims.filter((c) => c.relationship === 'supports').length;
  const contradictCount = claims.filter((c) => c.relationship === 'contradicts').length;
  const neutralCount = claims.filter((c) => c.relationship === 'neutral').length;

  const { state: overallEvidenceState, summary } = evaluateEvidenceState(
    claims,
    results.length,
    dominantAnswer
  );

  const comparisons = synthesizeComparisons(claims, trimmedQuestion, dominantAnswer, candidateGroups);

  return {
    question: trimmedQuestion,
    overallEvidenceState,
    summary,
    totalClaimsCount: claims.length,
    supportCount,
    contradictCount,
    neutralCount,
    claims,
    comparisons,
    analyzedAt: new Date().toISOString(),
  };
}