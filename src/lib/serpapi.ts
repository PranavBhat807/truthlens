const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';

export interface SerpApiParams {
  [key: string]: string | number | boolean | undefined;
}

export interface SerpApiOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  displayed_link?: string;
  snippet?: string;
  source?: string;
  [key: string]: unknown;
}

export interface SerpApiResponse {
  search_metadata?: {
    id?: string;
    status?: string;
    json_endpoint?: string;
    created_at?: string;
    processed_at?: string;
    google_url?: string;
    raw_html_file?: string;
    total_time_taken?: number;
  };
  organic_results?: SerpApiOrganicResult[];
  error?: string;
  [key: string]: unknown;
}

export interface NormalizedSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

/**
 * Reusable low-level SerpApi request executor.
 * Supports any SerpApi search engine by name while securely reading the API key on the server.
 */
export async function fetchSerpApi(
  params: SerpApiParams,
  engine: string = 'google'
): Promise<SerpApiResponse> {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    throw new Error('SERPAPI_KEY is not configured on the server');
  }

  const searchParams = new URLSearchParams();
  searchParams.set('api_key', apiKey);
  searchParams.set('engine', engine);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && key !== 'api_key' && key !== 'engine') {
      searchParams.set(key, String(value));
    }
  }

  const endpoint = `${SERPAPI_BASE_URL}?${searchParams.toString()}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    let errorMessage = `SerpApi request failed with HTTP ${response.status}`;
    try {
      const errorJson = (await response.json()) as { error?: string };
      if (errorJson?.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Fall back to default error message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as SerpApiResponse;

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * Normalizes a raw SerpApi organic result into the TruthLens evidence format.
 */
export function normalizeOrganicResult(result: SerpApiOrganicResult): NormalizedSearchResult {
  const url = result.link || '';
  let source = result.source || '';

  if (!source && url) {
    try {
      const parsedUrl = new URL(url);
      source = parsedUrl.hostname.replace(/^www\./, '');
    } catch {
      source = result.displayed_link || '';
    }
  }

  if (!source && result.displayed_link) {
    source = result.displayed_link;
  }

  return {
    title: result.title || '',
    url,
    snippet: result.snippet || '',
    source: source || 'Unknown Source',
  };
}

/**
 * Google Search engine wrapper returning normalized results.
 */
export async function searchGoogle(
  query: string,
  extraParams?: SerpApiParams
): Promise<NormalizedSearchResult[]> {
  const response = await fetchSerpApi(
    {
      q: query,
      ...extraParams,
    },
    'google'
  );

  const organicResults = response.organic_results || [];
  return organicResults.map(normalizeOrganicResult);
}
