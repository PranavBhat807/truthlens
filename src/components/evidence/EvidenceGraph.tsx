'use client';

import { useState, useMemo } from 'react';
import type { ExtractedClaim, EvidenceAnalysisResult, EvidenceState, ClaimRelationship } from '@/lib/evidence';
import type { FinalInvestigationReport } from '@/lib/report';

export interface EvidenceGraphProps {
  analysis: EvidenceAnalysisResult | null;
  finalReport?: FinalInvestigationReport | null;
  question?: string;
}

export function EvidenceGraph({ analysis, finalReport, question: fallbackQuestion }: EvidenceGraphProps) {
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [selectedSourceUrl, setSelectedSourceUrl] = useState<string | null>(null);
  const [relationshipFilter, setRelationshipFilter] = useState<'all' | ClaimRelationship>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'flow' | 'grouped'>('flow');

  const question = analysis?.question || finalReport?.question || fallbackQuestion || 'Investigation Inquiry';
  const overallState: EvidenceState = analysis?.overallEvidenceState || finalReport?.overallEvidenceState || 'Insufficient Evidence';

  const allClaims: ExtractedClaim[] = useMemo(() => {
    return analysis?.claims || [];
  }, [analysis]);

  // Unique sources mapping
  const sourceNodes = useMemo(() => {
    const map = new Map<string, {
      url: string;
      source: string;
      title: string;
      sourceType: string;
      claims: ExtractedClaim[];
      relationships: Set<ClaimRelationship>;
    }>();

    for (const claim of allClaims) {
      const key = claim.url || claim.source || `unknown-${claim.id}`;
      const existing = map.get(key);
      if (existing) {
        existing.claims.push(claim);
        existing.relationships.add(claim.relationship);
      } else {
        map.set(key, {
          url: claim.url,
          source: claim.source || 'Web Source',
          title: claim.title || claim.source || 'Untitled Source',
          sourceType: claim.sourceType || 'Web Publication',
          claims: [claim],
          relationships: new Set([claim.relationship]),
        });
      }
    }

    return Array.from(map.values());
  }, [allClaims]);

  // Filtered claims based on filter buttons and search query
  const filteredClaims = useMemo(() => {
    return allClaims.filter((c) => {
      if (relationshipFilter !== 'all' && c.relationship !== relationshipFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClaim = c.claim.toLowerCase().includes(q);
        const matchesSource = c.source.toLowerCase().includes(q);
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesSnippet = c.snippet.toLowerCase().includes(q);
        if (!matchesClaim && !matchesSource && !matchesTitle && !matchesSnippet) {
          return false;
        }
      }
      return true;
    });
  }, [allClaims, relationshipFilter, searchQuery]);

  // Selected claim details
  const selectedClaim = useMemo(() => {
    if (!selectedClaimId) return null;
    return allClaims.find((c) => c.id === selectedClaimId) || null;
  }, [allClaims, selectedClaimId]);

  // Selected source details
  const selectedSource = useMemo(() => {
    if (!selectedSourceUrl) return null;
    return sourceNodes.find((s) => s.url === selectedSourceUrl || s.source === selectedSourceUrl) || null;
  }, [sourceNodes, selectedSourceUrl]);

  // Metrics
  const supportCount = allClaims.filter((c) => c.relationship === 'supports').length;
  const contradictCount = allClaims.filter((c) => c.relationship === 'contradicts').length;
  const neutralCount = allClaims.filter((c) => c.relationship === 'neutral').length;

  const getStateBadge = (state: EvidenceState) => {
    switch (state) {
      case 'Supported':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          icon: (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ),
        };
      case 'Conflicting':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400',
          icon: (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8" />
            </svg>
          ),
        };
    }
  };

  const getRelationshipStyles = (rel: ClaimRelationship) => {
    switch (rel) {
      case 'supports':
        return {
          border: 'border-emerald-500/40 hover:border-emerald-500',
          bg: 'bg-emerald-950/20',
          badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          glow: 'shadow-emerald-500/10',
          line: 'stroke-emerald-500/60',
          activeBg: 'bg-emerald-950/50 border-emerald-400 shadow-lg shadow-emerald-500/20',
          label: 'Supports',
        };
      case 'contradicts':
        return {
          border: 'border-rose-500/40 hover:border-rose-500',
          bg: 'bg-rose-950/20',
          badge: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
          glow: 'shadow-rose-500/10',
          line: 'stroke-rose-500/60',
          activeBg: 'bg-rose-950/50 border-rose-400 shadow-lg shadow-rose-500/20',
          label: 'Contradicts',
        };
      case 'neutral':
      default:
        return {
          border: 'border-zinc-700/60 hover:border-zinc-500',
          bg: 'bg-zinc-900/40',
          badge: 'bg-zinc-800 border-zinc-700 text-zinc-300',
          glow: 'shadow-zinc-500/5',
          line: 'stroke-zinc-600/60',
          activeBg: 'bg-zinc-800/80 border-cyan-400 shadow-lg shadow-cyan-500/20',
          label: 'Neutral',
        };
    }
  };

  if (!analysis && !finalReport) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center backdrop-blur-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/80 text-zinc-500">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </div>
        <h3 className="mt-3 text-sm font-semibold text-zinc-300">No Evidence Graph Data</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Run an investigation above to generate the structured question-to-source evidence graph.
        </p>
      </div>
    );
  }

  const stateBadge = getStateBadge(overallState);

  return (
    <div id="evidence-graph" className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-6">
      {/* ── Graph Header & Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-tr from-cyan-500 to-emerald-500 text-zinc-950 font-bold text-xs shadow-md">
              <svg className="h-3.5 w-3.5 text-zinc-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Stage 6 • Evidence Relationship Graph
            </span>
            <span className="text-xs text-zinc-600">•</span>
            <span className="text-xs font-mono text-zinc-400">
              Question → Claims → Sources
            </span>
          </div>
          <h2 className="mt-1 text-lg sm:text-xl font-bold text-white tracking-tight">
            Traceable Evidence Provenance
          </h2>
        </div>

        {/* State Badge & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${stateBadge.bg}`}>
            {stateBadge.icon}
            <span>{overallState}</span>
          </div>

          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('flow')}
              className={`rounded-md px-2.5 py-1 transition ${
                viewMode === 'flow'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              3-Tier Flow
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`rounded-md px-2.5 py-1 transition ${
                viewMode === 'grouped'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Grouped Matrix
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Counts & Filter Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 text-xs">
        {/* Relationship Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-zinc-500 font-medium mr-1">Filter:</span>
          <button
            type="button"
            onClick={() => setRelationshipFilter('all')}
            className={`rounded-lg px-2.5 py-1 transition font-medium ${
              relationshipFilter === 'all'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({allClaims.length})
          </button>
          <button
            type="button"
            onClick={() => setRelationshipFilter('supports')}
            className={`rounded-lg px-2.5 py-1 transition font-medium ${
              relationshipFilter === 'supports'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-400 hover:text-emerald-300'
            }`}
          >
            Supports ({supportCount})
          </button>
          <button
            type="button"
            onClick={() => setRelationshipFilter('contradicts')}
            className={`rounded-lg px-2.5 py-1 transition font-medium ${
              relationshipFilter === 'contradicts'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-zinc-400 hover:text-rose-300'
            }`}
          >
            Contradicts ({contradictCount})
          </button>
          <button
            type="button"
            onClick={() => setRelationshipFilter('neutral')}
            className={`rounded-lg px-2.5 py-1 transition font-medium ${
              relationshipFilter === 'neutral'
                ? 'bg-zinc-700/60 text-zinc-200 border border-zinc-600'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Neutral ({neutralCount})
          </button>
        </div>

        {/* Search Filter */}
        <div className="relative min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search claims or sources..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/90 py-1.5 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none"
          />
          <svg className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Visual Flow View Mode (3 Columns) ── */}
      {viewMode === 'flow' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* TIER 1: Question Root Node (Cols 1-3) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Tier 1 • Inquiry Node
              </span>
              <span className="text-[10px] text-zinc-500">Root</span>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/30 to-zinc-950/80 p-4 shadow-lg shadow-cyan-950/20 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                  Target Question
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-white leading-snug">
                &ldquo;{question}&rdquo;
              </p>

              <div className="mt-4 border-t border-zinc-800/80 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Evidence State:</span>
                  <span className="font-semibold text-zinc-200">{overallState}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Total Claims:</span>
                  <span className="font-mono font-semibold text-zinc-200">{allClaims.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Distinct Sources:</span>
                  <span className="font-mono font-semibold text-zinc-200">{sourceNodes.length}</span>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800 text-[11px] space-y-1.5">
                <span className="font-semibold text-zinc-400 text-[10px] uppercase tracking-wider block">
                  Relationship Legend
                </span>
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Supports Question</span>
                </div>
                <div className="flex items-center gap-2 text-rose-300">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span>Contradicts / Denies</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-zinc-500" />
                  <span>Neutral / Contextual</span>
                </div>
              </div>
            </div>
          </div>

          {/* TIER 2: Extracted Claims (Cols 4-8) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Tier 2 • Extracted Claims ({filteredClaims.length})
              </span>
              <span className="text-[10px] text-zinc-500">Click to trace source</span>
            </div>

            {filteredClaims.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-6 text-center text-xs text-zinc-400">
                No claims match the active filter criteria.
              </div>
            ) : (
              <div className="max-h-[620px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                {filteredClaims.map((claim) => {
                  const styles = getRelationshipStyles(claim.relationship);
                  const isSelected = selectedClaimId === claim.id;
                  const isHighlightedBySource = selectedSource && selectedSource.claims.some((c) => c.id === claim.id);

                  return (
                    <div
                      key={claim.id}
                      onClick={() => {
                        setSelectedClaimId(isSelected ? null : claim.id);
                        if (!isSelected && claim.url) {
                          setSelectedSourceUrl(claim.url);
                        }
                      }}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-150 ${styles.bg} ${
                        isSelected
                          ? styles.activeBg
                          : isHighlightedBySource
                          ? 'border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400/50'
                          : `${styles.border} hover:bg-zinc-900/80`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles.badge}`}>
                          {styles.label}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <span className="max-w-[140px] truncate font-medium text-zinc-300">
                            {claim.source}
                          </span>
                          <span className="text-zinc-600">•</span>
                          <span className="font-mono text-[10px] text-zinc-400">
                            {Math.round(claim.confidence * 100)}% conf
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 text-xs font-semibold text-zinc-100 leading-snug">
                        &ldquo;{claim.claim}&rdquo;
                      </p>

                      {claim.reasoning && (
                        <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {claim.reasoning}
                        </p>
                      )}

                      <div className="mt-2.5 flex items-center justify-between border-t border-zinc-800/60 pt-2 text-[10px] text-zinc-500">
                        <span>Source: {claim.sourceType}</span>
                        <span className="text-cyan-400 flex items-center gap-1">
                          {isSelected ? 'Selected' : 'View Path →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TIER 3: Traceable Sources (Cols 9-12) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Tier 3 • Source Nodes ({sourceNodes.length})
              </span>
              <span className="text-[10px] text-zinc-500">Traceable Provenance</span>
            </div>

            <div className="max-h-[620px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
              {sourceNodes.map((srcNode, idx) => {
                const isSelected = selectedSourceUrl === srcNode.url;
                const isHighlightedByClaim = selectedClaim && selectedClaim.url === srcNode.url;
                const hasSupport = srcNode.relationships.has('supports');
                const hasContradict = srcNode.relationships.has('contradicts');

                const borderClass = isSelected || isHighlightedByClaim
                  ? 'border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/60 shadow-lg shadow-cyan-500/20'
                  : hasContradict && hasSupport
                  ? 'border-amber-500/40 bg-zinc-950/60 hover:border-amber-400'
                  : hasContradict
                  ? 'border-rose-500/30 bg-zinc-950/60 hover:border-rose-400'
                  : hasSupport
                  ? 'border-emerald-500/30 bg-zinc-950/60 hover:border-emerald-400'
                  : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700';

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedSourceUrl(isSelected ? null : srcNode.url);
                    }}
                    className={`cursor-pointer rounded-xl border p-3 transition-all duration-150 ${borderClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-zinc-100 truncate max-w-[180px]">
                        {srcNode.source}
                      </span>
                      <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400 shrink-0">
                        {srcNode.sourceType}
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-zinc-300 font-medium line-clamp-1">
                      {srcNode.title}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        {Array.from(srcNode.relationships).map((rel) => {
                          const badge = getRelationshipStyles(rel);
                          return (
                            <span key={rel} className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase ${badge.badge}`}>
                              {rel}
                            </span>
                          );
                        })}
                      </div>

                      {srcNode.url && (
                        <a
                          href={srcNode.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors shrink-0"
                        >
                          <span>URL</span>
                          <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Grouped Matrix View Mode ── */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Supporting Column */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Supporting Claims ({supportCount})
                </h3>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {allClaims
                .filter((c) => c.relationship === 'supports')
                .map((claim) => (
                  <div
                    key={claim.id}
                    onClick={() => setSelectedClaimId(selectedClaimId === claim.id ? null : claim.id)}
                    className="cursor-pointer rounded-lg border border-emerald-500/30 bg-zinc-950/70 p-3 text-xs transition hover:border-emerald-400"
                  >
                    <p className="font-semibold text-zinc-100">&ldquo;{claim.claim}&rdquo;</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-medium text-emerald-400">{claim.source}</span>
                      {claim.url && (
                        <a
                          href={claim.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-cyan-400 hover:underline"
                        >
                          Source ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              {supportCount === 0 && (
                <div className="text-center py-6 text-xs text-zinc-500">
                  No supporting claims found.
                </div>
              )}
            </div>
          </div>

          {/* Contradicting Column */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Contradicting Claims ({contradictCount})
                </h3>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {allClaims
                .filter((c) => c.relationship === 'contradicts')
                .map((claim) => (
                  <div
                    key={claim.id}
                    onClick={() => setSelectedClaimId(selectedClaimId === claim.id ? null : claim.id)}
                    className="cursor-pointer rounded-lg border border-rose-500/30 bg-zinc-950/70 p-3 text-xs transition hover:border-rose-400"
                  >
                    <p className="font-semibold text-zinc-100">&ldquo;{claim.claim}&rdquo;</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-medium text-rose-400">{claim.source}</span>
                      {claim.url && (
                        <a
                          href={claim.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-cyan-400 hover:underline"
                        >
                          Source ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              {contradictCount === 0 && (
                <div className="text-center py-6 text-xs text-zinc-500">
                  No contradicting claims found.
                </div>
              )}
            </div>
          </div>

          {/* Neutral / Context Column */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Neutral / Context ({neutralCount})
                </h3>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {allClaims
                .filter((c) => c.relationship === 'neutral')
                .map((claim) => (
                  <div
                    key={claim.id}
                    onClick={() => setSelectedClaimId(selectedClaimId === claim.id ? null : claim.id)}
                    className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-xs transition hover:border-zinc-600"
                  >
                    <p className="font-semibold text-zinc-100">&ldquo;{claim.claim}&rdquo;</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                      <span className="font-medium text-zinc-300">{claim.source}</span>
                      {claim.url && (
                        <a
                          href={claim.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-cyan-400 hover:underline"
                        >
                          Source ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              {neutralCount === 0 && (
                <div className="text-center py-6 text-xs text-zinc-500">
                  No neutral claims found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Selected Node Trace Inspector Panel ── */}
      {selectedClaim && (
        <div className="rounded-xl border border-cyan-500/40 bg-zinc-950/90 p-4 shadow-xl backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Traceable Node Inspector
              </span>
              <span className="text-xs text-zinc-600">•</span>
              <span className="text-xs font-mono text-zinc-400">Claim ID: {selectedClaim.id}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedClaimId(null)}
              className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:text-white transition"
            >
              Close Inspector ✕
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
            {/* Left: Claim & Provenance */}
            <div className="md:col-span-8 space-y-2">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Extracted Claim
                </span>
                <p className="mt-0.5 font-bold text-zinc-100 text-sm">
                  &ldquo;{selectedClaim.claim}&rdquo;
                </p>
              </div>

              {selectedClaim.snippet && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Source Evidence Snippet
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-300 italic bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
                    &ldquo;{selectedClaim.snippet}&rdquo;
                  </p>
                </div>
              )}

              {selectedClaim.reasoning && (
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Classification Rationale
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {selectedClaim.reasoning}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Source Metadata & Direct Link */}
            <div className="md:col-span-4 rounded-lg bg-zinc-900/70 p-3 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 block border-b border-zinc-800 pb-1">
                Source Attribution
              </span>
              <div>
                <div className="font-bold text-zinc-200">{selectedClaim.source}</div>
                <div className="text-[11px] text-zinc-400">{selectedClaim.title}</div>
                <div className="mt-1 inline-block rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-mono text-zinc-400">
                  {selectedClaim.sourceType}
                </div>
              </div>

              <div className="border-t border-zinc-800 pt-2 flex items-center justify-between">
                <span className="text-zinc-500">Relationship:</span>
                {(() => {
                  const badge = getRelationshipStyles(selectedClaim.relationship);
                  return (
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${badge.badge}`}>
                      {badge.label}
                    </span>
                  );
                })()}
              </div>

              {selectedClaim.url && (
                <div className="pt-2 border-t border-zinc-800">
                  <a
                    href={selectedClaim.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-400 transition"
                  >
                    <span>Visit Source Website</span>
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
