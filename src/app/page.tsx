export default function Home() {
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
              <span className="text-cyan-400 font-semibold">Stage 1</span>
              <span className="text-zinc-600">•</span>
              <span>SerpApi-Powered Investigation Engine</span>
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

            {/* Primary Investigation Input Mock / CTA */}
            <div
              id="investigate"
              className="mx-auto mt-10 max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900/90 p-2 shadow-2xl shadow-cyan-950/20 backdrop-blur-sm sm:p-3"
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
                    readOnly
                    defaultValue="Did scientists discover a new room-temperature superconductor in 2026?"
                    placeholder="Enter a claim or question to investigate..."
                    className="w-full rounded-xl border-0 bg-zinc-950/60 py-3.5 pr-4 pl-11 text-sm text-zinc-200 placeholder:text-zinc-500 focus:ring-1 focus:ring-cyan-500 cursor-default"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 active:scale-[0.98]"
                >
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
                </button>
              </div>

              {/* Sample Prompt Pills */}
              <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-xs text-zinc-400">
                <span className="text-zinc-500">Sample claims:</span>
                <span className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-zinc-300">
                  Mars cave water evidence
                </span>
                <span className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-zinc-300">
                  EU AI Act enforcement timeline
                </span>
                <span className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2.5 py-1 text-zinc-300">
                  Quantum advantage benchmark
                </span>
              </div>
            </div>
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
          <p>© 2026 TruthLens. Stage 1 MVP Shell.</p>
        </div>
      </footer>
    </div>
  );
}
