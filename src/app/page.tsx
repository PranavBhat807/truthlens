'use client';

import { useState } from 'react';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchApiResponse {
  query?: string;
  count?: number;
  results?: SearchResult[];
  error?: string;
}

export default function Home() {
  const [query, setQuery] = useState('Did scientists discover a new room-temperature superconductor in 2026?');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [lastSearchedQuery, setLastSearchedQuery] = useState<string | null>(null);

  const handleSearch = async (searchQuery?: string) => {
    const targetQuery = (searchQuery !== undefined ? searchQuery : query).trim();

    if (!targetQuery) {
      setError('Please enter a claim or question to investigate.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(targetQuery)}`);
      const data = (await response.json()) as SearchApiResponse;

      if (!response.ok) {
        throw new Error(data.error || `Search failed with status ${response.status}`);
      }

      setResults(data.results || []);
      setLastSearchedQuery(targetQuery);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred while searching.';
      setError(message);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  const handleSampleClick = (sampleText: string) => {
    setQuery(sampleText);
    handleSearch(sampleText);
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
              <svg
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                Truth<span className="text-cyan-400">Lens</span>
              </span>
              <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                v0.1
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#overview"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Overview
            </a>
            <a
              href="#evidence-model"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Evidence Model
            </a>
            <a
              href="#pipeline"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Architecture
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Engine Ready</span>
            </div>
            <a
              href="#investigate"
              className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              New Investigation
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section
          id="overview"
          className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 lg:px-8"
        >
          {/* Subtle background glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl"
          >
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-cyan-600 to-blue-800 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur-sm">
              <span className="text-cyan-400 font-semibold">Stage 2</span>
              <span className="text-zinc-600">•</span>
              <span>Live SerpApi Search Integration</span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn complex claims into{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                traceable evidence
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              TruthLens translates queries into targeted web searches, gathers
              primary sources, cross-references contradictory reports, and compiles
              a structured, verified investigation dossier.
            </p>

            {/* Primary Investigation Input */}
            <div
              id="investigate"
              className="mx-auto mt-10 max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/90 p-2 shadow-2xl shadow-cyan-950/20 backdrop-blur-sm sm:p-3 text-left"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg
                      className="h-5 w-5 text-zinc-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder="Enter a claim or question to investigate..."
                    className="w-full rounded-xl border border-transparent bg-zinc-950/60 py-3.5 pr-4 pl-11 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:bg-zinc-950/90 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin text-zinc-950"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <span>Investigate Claim</span>
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Prompt Pills */}
              <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-xs text-zinc-400">
                <span className="text-zinc-500">Sample claims:</span>
                <button
                  type="button"
                  onClick={() => handleSampleClick('Mars cave water evidence')}
                  disabled={isLoading}
                  className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-zinc-300 transition hover:border-cyan-500/40 hover:bg-zinc-800/60 hover:text-white"
                >
                  Mars cave water evidence
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleClick('EU AI Act enforcement timeline')}
                  disabled={isLoading}
                  className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-zinc-300 transition hover:border-cyan-500/40 hover:bg-zinc-800/60 hover:text-white"
                >
                  EU AI Act enforcement timeline
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleClick('Quantum advantage benchmark')}
                  disabled={isLoading}
                  className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-zinc-300 transition hover:border-cyan-500/40 hover:bg-zinc-800/60 hover:text-white"
                >
                  Quantum advantage benchmark
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-left backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-red-300">Search Error</h4>
                    <p className="mt-1 text-xs text-red-200/90 leading-relaxed">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search Results Display */}
            {results !== null && !isLoading && (
              <div className="mx-auto mt-8 max-w-3xl text-left">
                <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                      Search Results
                    </span>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-300">
                      {results.length} {results.length === 1 ? 'source' : 'sources'}
                    </span>
                  </div>
                  {lastSearchedQuery && (
                    <span className="text-xs text-zinc-500 truncate max-w-xs sm:max-w-md">
                      Query: <span className="text-zinc-400">&ldquo;{lastSearchedQuery}&rdquo;</span>
                    </span>
                  )}
                </div>

                {results.length === 0 ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center backdrop-blur-sm">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                      </svg>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-zinc-200">No results found</h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      No matching web evidence returned for this query. Try rephrasing or searching for related keywords.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((result, idx) => (
                      <article
                        key={`${result.url}-${idx}`}
                        className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/90 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 font-medium text-cyan-400">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
                            {result.source || 'Web Source'}
                          </span>
                          {result.url && (
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-cyan-300 transition-colors"
                            >
                              <span className="max-w-[200px] truncate sm:max-w-[280px]">
                                {result.url}
                              </span>
                              <svg
                                className="h-3 w-3 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          )}
                        </div>

                        <h3 className="mt-2 text-sm font-semibold text-zinc-100">
                          {result.url ? (
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-cyan-300 hover:underline transition-colors"
                            >
                              {result.title || 'Untitled Document'}
                            </a>
                          ) : (
                            result.title || 'Untitled Document'
                          )}
                        </h3>

                        {result.snippet && (
                          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                            {result.snippet}
                          </p>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Evidence Classification Framework */}
        <section
          id="evidence-model"
          className="border-t border-zinc-800/80 bg-zinc-900/30 px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Traceable Standard
              </h2>
              <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Rigorous Evidence Classification
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-zinc-400">
                Every investigated claim preserves full source lineage and is categorized
                into one of four distinct states based on corroborated web evidence.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Supported */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-emerald-300 text-sm">Supported</h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Multiple reliable, high-authority primary sources independently corroborate the factual assertion.
                </p>
              </div>

              {/* Card 2: Conflicting */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/20 text-amber-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-amber-300 text-sm">Conflicting</h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Credible sources present contradictory accounts or active disagreement across verified reporting.
                </p>
              </div>

              {/* Card 3: Unverified */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-950/10 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/20 text-sky-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <path d="M12 17h.01" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-sky-300 text-sm">Unverified</h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Circulating claim lacks authoritative primary verification or official confirmation in public search indices.
                </p>
              </div>

              {/* Card 4: Insufficient Evidence */}
              <div className="rounded-xl border border-zinc-700/40 bg-zinc-900/40 p-5 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 12h8" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-zinc-300 text-sm">Insufficient Evidence</h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Limited index coverage or scant search data prevents a definitive determination without further indexing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pipeline Architecture Highlights */}
        <section id="pipeline" className="border-t border-zinc-800/80 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="text-xs font-mono font-semibold text-cyan-400">01 / TARGETED QUERIES</div>
                <h3 className="mt-2 text-base font-semibold text-white">2–4 Focused Searches</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Minimizes API usage by breaking queries into precise, orthogonal SerpApi searches instead of broad scraping.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="text-xs font-mono font-semibold text-cyan-400">02 / TRACEABLE CITATIONS</div>
                <h3 className="mt-2 text-base font-semibold text-white">Direct URL Attribution</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Every fact retains source domain, publication timestamps, and direct snippet links for human auditability.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="text-xs font-mono font-semibold text-cyan-400">03 / CALIBRATED REPORTS</div>
                <h3 className="mt-2 text-base font-semibold text-white">Balanced Dossiers</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Synthesizes nuanced findings without false certainty, clearly noting conflicting perspectives.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-zinc-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">TruthLens</span>
            <span>—</span>
            <span>SerpApi-Powered Investigation Engine</span>
          </div>
          <p>© 2026 TruthLens. Stage 2 UI Search Integration.</p>
        </div>
      </footer>
    </div>
  );
}
