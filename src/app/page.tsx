'use client';

import { useState } from 'react';
import type { ExtractedClaim, EvidenceAnalysisResult, EvidenceState } from '@/lib/evidence';
import type { FinalInvestigationReport, KeyFinding, ReportSourceItem } from '@/lib/report';

interface PlannedQuery {
  query: string;
  purpose: string;
}

interface InvestigationResultItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  querySource?: string;
}

interface InvestigationReport {
  question: string;
  plannedQueries: PlannedQuery[];
  totalResultsCount: number;
  results: InvestigationResultItem[];
  executedAt: string;
}

export default function Home() {
  const [query, setQuery] = useState('Did scientists discover a new room-temperature superconductor in 2026?');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [analysis, setAnalysis] = useState<EvidenceAnalysisResult | null>(null);
  const [finalReport, setFinalReport] = useState<FinalInvestigationReport | null>(null);
  const [claimFilter, setClaimFilter] = useState<'all' | 'supports' | 'contradicts' | 'neutral'>('all');
  const [breakdownTab, setBreakdownTab] = useState<'supporting' | 'contradicting' | 'neutral'>('supporting');

  const handleInvestigate = async (searchQuery?: string) => {
    const targetQuery = (searchQuery !== undefined ? searchQuery : query).trim();

    if (!targetQuery) {
      setError('Please enter a claim or question to investigate.');
      return;
    }

    setIsLoading(true);
    setIsAnalyzing(false);
    setIsGeneratingReport(false);
    setError(null);
    setAnalysis(null);
    setFinalReport(null);

    try {
      // Stage 3: Fetch investigation and search evidence
      const response = await fetch('/api/investigate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: targetQuery }),
      });

      const data = (await response.json()) as InvestigationReport & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || `Investigation failed with status ${response.status}`);
      }

      setReport(data);
      setIsLoading(false);

      let currentAnalysis: EvidenceAnalysisResult | null = null;

      // Stage 4: Automatically analyze extracted claims & contradictions from existing evidence
      if (data.results && data.results.length > 0) {
        setIsAnalyzing(true);
        try {
          const analyzeRes = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              question: targetQuery,
              results: data.results,
            }),
          });

          const analyzeData = (await analyzeRes.json()) as EvidenceAnalysisResult & { error?: string };
          if (analyzeRes.ok) {
            currentAnalysis = analyzeData;
            setAnalysis(analyzeData);
          }
        } catch {
          // Fallback if analysis endpoint fails
        } finally {
          setIsAnalyzing(false);
        }
      } else {
        // Empty results fallback analysis
        currentAnalysis = {
          question: targetQuery,
          overallEvidenceState: 'Insufficient Evidence',
          summary: 'No search results or evidence were returned from public web indices.',
          totalClaimsCount: 0,
          supportCount: 0,
          contradictCount: 0,
          neutralCount: 0,
          claims: [],
          comparisons: [],
          analyzedAt: new Date().toISOString(),
        };
        setAnalysis(currentAnalysis);
      }

      // Stage 5: Automatically generate the structured final investigation report
      if (currentAnalysis) {
        setIsGeneratingReport(true);
        try {
          const reportRes = await fetch('/api/report', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              analysis: currentAnalysis,
            }),
          });

          const reportData = (await reportRes.json()) as FinalInvestigationReport & { error?: string };
          if (reportRes.ok) {
            setFinalReport(reportData);
          }
        } catch {
          // If report generation fails, user still has Stage 3 and Stage 4 views
        } finally {
          setIsGeneratingReport(false);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during investigation.';
      setError(message);
      setReport(null);
      setAnalysis(null);
      setFinalReport(null);
      setIsLoading(false);
      setIsAnalyzing(false);
      setIsGeneratingReport(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && !isAnalyzing && !isGeneratingReport) {
      handleInvestigate();
    }
  };

  const handleSampleClick = (sampleText: string) => {
    setQuery(sampleText);
    handleInvestigate(sampleText);
  };

  const filteredClaims: ExtractedClaim[] = analysis
    ? analysis.claims.filter((c) => {
        if (claimFilter === 'all') return true;
        return c.relationship === claimFilter;
      })
    : [];

  const getEvidenceStateBadge = (state: EvidenceState) => {
    switch (state) {
      case 'Supported':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          icon: (
            <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ),
        };
      case 'Conflicting':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400',
          icon: (
            <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          ),
        };
      case 'Unverified':
        return {
          bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
          dot: 'bg-sky-400',
          icon: (
            <svg className="h-4 w-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
          ),
        };
      case 'Insufficient Evidence':
      default:
        return {
          bg: 'bg-zinc-800 border-zinc-700 text-zinc-300',
          dot: 'bg-zinc-400',
          icon: (
            <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8" />
            </svg>
          ),
        };
    }
  };

  const getRelationshipBadge = (relationship: 'supports' | 'contradicts' | 'neutral') => {
    switch (relationship) {
      case 'supports':
        return {
          label: 'Supports',
          className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        };
      case 'contradicts':
        return {
          label: 'Contradicts',
          className: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
        };
      case 'neutral':
      default:
        return {
          label: 'Neutral / Context',
          className: 'bg-zinc-800 border-zinc-700 text-zinc-300',
        };
    }
  };

  const getConfidenceBadge = (confidence: 'High' | 'Moderate' | 'Low' | 'Inconclusive') => {
    switch (confidence) {
      case 'High':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'Moderate':
        return 'bg-sky-500/10 border-sky-500/30 text-sky-400';
      case 'Low':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'Inconclusive':
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-400';
    }
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
                v0.5 • Stage 5
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
            {finalReport && (
              <>
                <a
                  href="#final-report"
                  className="text-sm font-medium text-cyan-400 transition-colors hover:text-cyan-300"
                >
                  Investigation Report
                </a>
                <a
                  href="#key-findings"
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                >
                  Key Findings
                </a>
                <a
                  href="#evidence-breakdown"
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                >
                  Evidence Breakdown
                </a>
              </>
            )}
            <a
              href="#planned-queries"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              Query Planner
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Pipeline &amp; Report Active</span>
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
          {/* Background glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl"
          >
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-cyan-600 to-blue-800 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur-sm">
              <span className="text-cyan-400 font-semibold">Stage 5</span>
              <span className="text-zinc-600">•</span>
              <span>Traceable Investigation Report</span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn complex claims into{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                traceable reports
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              TruthLens translates natural-language inquiries into targeted search angles,
              collects evidence via SerpApi, compares claims across sources, and generates a structured, traceable investigation dossier.
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
                    disabled={isLoading || isAnalyzing || isGeneratingReport}
                    placeholder="Enter a claim or question to investigate..."
                    className="w-full rounded-xl border border-transparent bg-zinc-950/60 py-3.5 pr-4 pl-11 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:bg-zinc-950/90 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleInvestigate()}
                  disabled={isLoading || isAnalyzing || isGeneratingReport}
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
                      <span>Investigating...</span>
                    </>
                  ) : isAnalyzing ? (
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
                      <span>Analyzing Evidence...</span>
                    </>
                  ) : isGeneratingReport ? (
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
                      <span>Generating Report...</span>
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
                  disabled={isLoading || isAnalyzing || isGeneratingReport}
                  className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-zinc-300 transition hover:border-cyan-500/40 hover:bg-zinc-800/60 hover:text-white"
                >
                  Mars cave water evidence
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleClick('Does social media improve or harm mental health?')}
                  disabled={isLoading || isAnalyzing || isGeneratingReport}
                  className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-zinc-300 transition hover:border-cyan-500/40 hover:bg-zinc-800/60 hover:text-white"
                >
                  Social media improve or harm mental health
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleClick('EU AI Act enforcement timeline')}
                  disabled={isLoading || isAnalyzing || isGeneratingReport}
                  className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-zinc-300 transition hover:border-cyan-500/40 hover:bg-zinc-800/60 hover:text-white"
                >
                  EU AI Act enforcement timeline
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleClick('Quantum advantage benchmark')}
                  disabled={isLoading || isAnalyzing || isGeneratingReport}
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
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-red-300">Investigation Error</h4>
                    <p className="mt-1 text-xs text-red-200/90 leading-relaxed">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Indicators */}
            {isLoading && (
              <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-cyan-500/20 bg-zinc-900/50 p-6 text-center backdrop-blur-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle className="opacity-25" cx="12" cy="12" r="10" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-200">Executing Targeted Searches (Stage 3)</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Planning orthogonal search angles, querying SerpApi, and collecting web sources...
                </p>
              </div>
            )}

            {isAnalyzing && (
              <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-sky-500/20 bg-zinc-900/50 p-6 text-center backdrop-blur-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle className="opacity-25" cx="12" cy="12" r="10" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-200">Analyzing Evidence &amp; Contradictions (Stage 4)</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Extracting factual claims, mapping support/contradict stances, and cross-comparing sources...
                </p>
              </div>
            )}

            {isGeneratingReport && (
              <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-emerald-500/20 bg-zinc-900/50 p-6 text-center backdrop-blur-sm">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle className="opacity-25" cx="12" cy="12" r="10" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-zinc-200">Synthesizing Final Investigation Report (Stage 5)</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Compiling key findings, structuring evidence breakdown, and establishing calibrated conclusions...
                </p>
              </div>
            )}

            {/* STAGE 5: FINAL INVESTIGATION REPORT */}
            {finalReport !== null && !isLoading && !isAnalyzing && !isGeneratingReport && (
              <div id="final-report" className="mx-auto mt-10 max-w-4xl text-left space-y-6">
                {/* 1. Header & Overall Evidence State Banner */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                          Stage 5 Investigation Report
                        </span>
                        <span className="text-xs text-zinc-600">•</span>
                        <span className="text-xs text-zinc-400 font-mono">
                          {new Date(finalReport.generatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h2 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">
                        &ldquo;{finalReport.question}&rdquo;
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const badge = getEvidenceStateBadge(finalReport.overallEvidenceState);
                        return (
                          <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-wider ${badge.bg}`}>
                            {badge.icon}
                            <span>{finalReport.overallEvidenceState}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 2. Concise Conclusion Card (Clearly Separated) */}
                  <div className="mt-5 rounded-xl border border-zinc-800/90 bg-zinc-950/80 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                          Synthesis &amp; Conclusion
                        </span>
                        <span className="text-xs text-zinc-500">•</span>
                        <span className="text-xs text-zinc-400">Based strictly on collected evidence</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-400">Confidence:</span>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getConfidenceBadge(finalReport.conclusion.confidenceLevel)}`}>
                          {finalReport.conclusion.confidenceLevel}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-sm sm:text-base leading-relaxed text-zinc-100 font-medium">
                      {finalReport.conclusion.statement}
                    </p>

                    {finalReport.conclusion.caveat && (
                      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3 text-xs text-zinc-400">
                        <svg className="h-4 w-4 shrink-0 text-zinc-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className="leading-relaxed">
                          <strong className="text-zinc-300">Evidence Caveat: </strong>
                          {finalReport.conclusion.caveat}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Key Findings Section */}
                <div id="key-findings" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                        Key Factual Findings
                      </h3>
                    </div>
                    <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-mono text-zinc-300">
                      {finalReport.keyFindings.length} findings
                    </span>
                  </div>

                  {finalReport.keyFindings.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs text-zinc-400">
                      No key findings extracted from collected evidence.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {finalReport.keyFindings.map((finding: KeyFinding) => {
                        const badge = getRelationshipBadge(finding.relationship);
                        return (
                          <div
                            key={finding.id}
                            className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition hover:border-zinc-700"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>
                                  {badge.label}
                                </span>
                                {finding.sources.length > 0 && (
                                  <span className="text-xs font-semibold text-zinc-300">
                                    {finding.sources.map((s) => s.source).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="mt-2.5 text-sm font-semibold text-zinc-100 leading-snug">
                              &ldquo;{finding.finding}&rdquo;
                            </p>

                            <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                              {finding.explanation}
                            </p>

                            {finding.sources && finding.sources.length > 0 && finding.sources[0].url && (
                              <div className="mt-3 flex items-center justify-between border-t border-zinc-900 pt-2.5 text-[11px]">
                                <span className="text-zinc-500 font-medium">Source Attribution:</span>
                                <a
                                  href={finding.sources[0].url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                                >
                                  <span className="max-w-[260px] truncate sm:max-w-[340px]">
                                    {finding.sources[0].url}
                                  </span>
                                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Evidence Breakdown Section (Supporting vs Contradicting vs Neutral) */}
                <div id="evidence-breakdown" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M3 9h18" />
                          <path d="M9 21V9" />
                        </svg>
                      </div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                        Evidence Breakdown &amp; Balance
                      </h3>
                    </div>

                    {/* Breakdown Category Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setBreakdownTab('supporting')}
                        className={`rounded-lg px-2.5 py-1 transition ${
                          breakdownTab === 'supporting'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                            : 'bg-zinc-950 text-zinc-400 hover:text-emerald-300'
                        }`}
                      >
                        Supporting ({finalReport.evidenceBreakdown.supporting.count})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakdownTab('contradicting')}
                        className={`rounded-lg px-2.5 py-1 transition ${
                          breakdownTab === 'contradicting'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-medium'
                            : 'bg-zinc-950 text-zinc-400 hover:text-rose-300'
                        }`}
                      >
                        Contradicting ({finalReport.evidenceBreakdown.contradicting.count})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBreakdownTab('neutral')}
                        className={`rounded-lg px-2.5 py-1 transition ${
                          breakdownTab === 'neutral'
                            ? 'bg-zinc-700 text-zinc-200 font-medium'
                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Contextual ({finalReport.evidenceBreakdown.neutral.count})
                      </button>
                    </div>
                  </div>

                  {/* Active Breakdown Tab Content */}
                  <div>
                    {(() => {
                      const activeCategory = finalReport.evidenceBreakdown[breakdownTab];
                      if (activeCategory.items.length === 0) {
                        return (
                          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs text-zinc-400">
                            No evidence items classified in this category.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {activeCategory.items.map((item: ReportSourceItem) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 transition hover:border-zinc-700"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-semibold text-cyan-400">{item.source}</span>
                                  {item.sourceType && (
                                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                                      {item.sourceType}
                                    </span>
                                  )}
                                </div>
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-cyan-300 transition-colors"
                                  >
                                    <span className="max-w-[180px] truncate sm:max-w-[280px]">
                                      {item.url}
                                    </span>
                                    <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                      <polyline points="15 3 21 3 21 9" />
                                      <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                  </a>
                                )}
                              </div>

                              <p className="mt-2 text-xs text-zinc-300 leading-relaxed italic">
                                &ldquo;{item.snippet}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 5. Sources Dossier Table */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                      </div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                        Traceable Source Dossier
                      </h3>
                    </div>
                    <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-mono text-zinc-300">
                      {finalReport.sources.length} sources
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {finalReport.sources.map((src: ReportSourceItem) => {
                      const badge = getRelationshipBadge(src.relationship);
                      return (
                        <div
                          key={src.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${badge.className}`}>
                              {badge.label}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-zinc-200 truncate">{src.title}</div>
                              <div className="text-[11px] text-zinc-400">{src.source} • {src.sourceType}</div>
                            </div>
                          </div>

                          {src.url && (
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline shrink-0"
                            >
                              <span>Visit Source</span>
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Stage 4 Claims & Contradictions Pipeline Audit View */}
            {analysis !== null && !isLoading && !isAnalyzing && !isGeneratingReport && (
              <div id="claims-analysis" className="mx-auto mt-12 max-w-4xl text-left space-y-6 border-t border-zinc-800/80 pt-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Stage 4 Claims Extraction &amp; Contradiction Pipeline
                  </h3>
                  <span className="text-xs text-zinc-500 font-mono">
                    {analysis.totalClaimsCount} claims analyzed
                  </span>
                </div>

                {/* Metric Counters */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-center">
                    <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                      Extracted Claims
                    </div>
                    <div className="mt-1 text-xl font-bold font-mono text-zinc-100">
                      {analysis.totalClaimsCount}
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3 text-center">
                    <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                      Supporting
                    </div>
                    <div className="mt-1 text-xl font-bold font-mono text-emerald-300">
                      {analysis.supportCount}
                    </div>
                  </div>
                  <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-3 text-center">
                    <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">
                      Contradicting
                    </div>
                    <div className="mt-1 text-xl font-bold font-mono text-rose-300">
                      {analysis.contradictCount}
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-center">
                    <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                      Neutral / Context
                    </div>
                    <div className="mt-1 text-xl font-bold font-mono text-zinc-300">
                      {analysis.neutralCount}
                    </div>
                  </div>
                </div>

                {/* Cross-Source Comparisons */}
                {analysis.comparisons && analysis.comparisons.length > 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-sm">
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                      </div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                        Cross-Source Disagreement &amp; Agreement Comparison
                      </h3>
                    </div>

                    <div className="mt-4 space-y-3">
                      {analysis.comparisons.map((comp, idx) => (
                        <div key={idx} className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
                          <p className="text-xs font-semibold text-zinc-200">{comp.summary}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            {comp.supportingSources.length > 0 && (
                              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-2.5 py-1 text-emerald-300">
                                <span className="font-semibold">Corroborating:</span>
                                <span>{comp.supportingSources.join(', ')}</span>
                              </div>
                            )}
                            {comp.contradictingSources.length > 0 && (
                              <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 px-2.5 py-1 text-rose-300">
                                <span className="font-semibold">Contradicting:</span>
                                <span>{comp.contradictingSources.join(', ')}</span>
                              </div>
                            )}
                            {comp.neutralSources.length > 0 && (
                              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-400">
                                <span className="font-semibold">Descriptive:</span>
                                <span>{comp.neutralSources.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extracted Claims Filterable List */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                        Extracted Individual Claims
                      </span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-300">
                        {analysis.claims.length} claims
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setClaimFilter('all')}
                        className={`rounded-lg px-2.5 py-1 transition ${
                          claimFilter === 'all'
                            ? 'bg-zinc-700 text-white font-medium'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        All ({analysis.claims.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setClaimFilter('supports')}
                        className={`rounded-lg px-2.5 py-1 transition ${
                          claimFilter === 'supports'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                            : 'bg-zinc-900 text-zinc-400 hover:text-emerald-300'
                        }`}
                      >
                        Supports ({analysis.supportCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setClaimFilter('contradicts')}
                        className={`rounded-lg px-2.5 py-1 transition ${
                          claimFilter === 'contradicts'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-medium'
                            : 'bg-zinc-900 text-zinc-400 hover:text-rose-300'
                        }`}
                      >
                        Contradicts ({analysis.contradictCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setClaimFilter('neutral')}
                        className={`rounded-lg px-2.5 py-1 transition ${
                          claimFilter === 'neutral'
                            ? 'bg-zinc-700 text-zinc-200 font-medium'
                            : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Neutral ({analysis.neutralCount})
                      </button>
                    </div>
                  </div>

                  {filteredClaims.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center backdrop-blur-sm">
                      <p className="text-xs text-zinc-400">No claims match the selected filter.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredClaims.map((claimItem) => {
                        const relBadge = getRelationshipBadge(claimItem.relationship);
                        return (
                          <article
                            key={claimItem.id}
                            className="rounded-xl border border-zinc-800/90 bg-zinc-900/70 p-4 transition hover:border-zinc-700 backdrop-blur-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${relBadge.className}`}>
                                  {relBadge.label}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                  {claimItem.source}
                                </span>
                                {claimItem.sourceType && (
                                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                                    {claimItem.sourceType}
                                  </span>
                                )}
                              </div>

                              {claimItem.url && (
                                <a
                                  href={claimItem.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-cyan-300 transition-colors"
                                >
                                  <span className="max-w-[200px] truncate sm:max-w-[280px]">
                                    {claimItem.url}
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

                            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                                Extracted Claim
                              </div>
                              <p className="text-sm font-medium text-zinc-100 leading-snug">
                                &ldquo;{claimItem.claim}&rdquo;
                              </p>
                            </div>

                            {claimItem.snippet && (
                              <div className="mt-2.5 text-xs text-zinc-400">
                                <span className="text-zinc-500 font-medium">Source Snippet: </span>
                                <span className="italic text-zinc-300">{claimItem.snippet}</span>
                              </div>
                            )}

                            {claimItem.reasoning && (
                              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-500">
                                <span className="font-semibold text-zinc-400">Relationship Analysis:</span>
                                <span>{claimItem.reasoning}</span>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stage 3 Investigation Traceability (Planner & Raw Search Results) */}
            {report !== null && !isLoading && (
              <div className="mx-auto mt-12 max-w-4xl text-left space-y-8 border-t border-zinc-800/80 pt-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Stage 3 Investigation Traceability
                  </h3>
                  <span className="text-xs text-zinc-500 font-mono">
                    {report.totalResultsCount} deduplicated sources
                  </span>
                </div>

                {/* Planned Queries Card */}
                <div id="planned-queries" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="4 17 10 11 4 5" />
                          <line x1="12" y1="19" x2="20" y2="19" />
                        </svg>
                      </div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                        Generated Investigation Queries
                      </h3>
                    </div>
                    <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[11px] font-mono text-zinc-300">
                      {report.plannedQueries.length} planned searches
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {report.plannedQueries.map((pq, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            Angle {idx + 1}
                          </span>
                          <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-medium text-cyan-300 border border-cyan-500/20">
                            {pq.purpose}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-mono text-zinc-200 break-words">
                          &ldquo;{pq.query}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Raw Search Evidence Collection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                        Deduplicated Raw Search Evidence
                      </span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-zinc-300">
                        {report.totalResultsCount} {report.totalResultsCount === 1 ? 'source' : 'sources'}
                      </span>
                    </div>
                  </div>

                  {report.results.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center backdrop-blur-sm">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <path d="m21 21-4.3-4.3" />
                        </svg>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-zinc-200">No results found</h3>
                      <p className="mt-1 text-xs text-zinc-400">
                        No matching web evidence returned across all planned queries.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {report.results.map((result, idx) => (
                        <article
                          key={`${result.url}-${idx}`}
                          className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-4 transition hover:border-zinc-700 hover:bg-zinc-900/90 backdrop-blur-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 font-medium text-cyan-400">
                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                {result.source || 'Web Source'}
                              </span>
                              {result.querySource && (
                                <span className="hidden sm:inline-block rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400 font-mono truncate max-w-[220px]">
                                  via: {result.querySource}
                                </span>
                              )}
                            </div>
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
                  Synthesizes nuanced findings without false certainty, clearly separating evidence from conclusions.
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
            <span>SerpApi-Powered Investigation Pipeline</span>
          </div>
          <p>© 2026 TruthLens. Stage 5 Investigation Report Pipeline.</p>
        </div>
      </footer>
    </div>
  );
}
