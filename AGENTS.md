# TruthLens – Agent Instructions

## Project

TruthLens is a SerpApi-powered web investigation tool.

Goal:

Turn a user's question into a small set of targeted web searches, collect evidence, compare claims, and produce a traceable investigation report.

## Tech Stack

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- ESLint
- SerpApi
- LLM only where needed

## Core Rules

1. Build incrementally.
2. Do not implement future stages unless explicitly requested.
3. Before changing code, inspect the existing project.
4. Reuse existing code and dependencies whenever possible.
5. Do not install packages unless required for the current stage.
6. Keep the architecture simple and suitable for a hackathon MVP.
7. Keep API keys server-side only.
8. Never expose SERPAPI_KEY or LLM_API_KEY to the client.
9. Use real SerpApi results. Do not create fake search results.
10. Minimize SerpApi requests. Prefer 2–4 targeted searches per investigation.
11. Keep components small and reusable.
12. Handle loading, errors, empty results, and API failures.
13. Do not add authentication, database, payments, or unnecessary infrastructure unless explicitly requested.
14. Do not rewrite working code unnecessarily.
15. Do not add libraries for functionality that can reasonably be implemented with the existing stack.

## Investigation Results

Use evidence states:

- Supported
- Conflicting
- Unverified
- Insufficient Evidence

Do not claim something is definitely true or false unless the evidence genuinely supports that conclusion.

Every important claim should retain:

- claim
- source
- URL
- source type
- evidence
- relationship: supports / contradicts / neutral

## Development Workflow

For every requested stage:

1. Inspect current implementation.
2. Identify the minimum files that need modification.
3. Implement only that stage.
4. Run available checks/build.
5. Report:
   - files changed
   - packages added, if any
   - what was implemented
   - any remaining issue
6. Stop.

Do not continue automatically to the next stage.

## Token Efficiency

Prefer concise responses.

Do not explain obvious code line-by-line unless asked.

Do not generate large documentation files unless requested.

Before installing a package, check whether the existing stack can solve the requirement.

## Current Stage

Stage 5 — Investigation Report

Focus only on:

- Taking the structured evidence analysis produced by Stage 4.
- Turning the analyzed evidence into a clear investigation report.
- Presenting the investigation question.
- Presenting the overall evidence state:
  - Supported
  - Conflicting
  - Unverified
  - Insufficient Evidence
- Presenting the important claims found during the investigation.
- Showing which sources support, contradict, or are neutral toward each claim.
- Showing source title, URL, source type, and relevant evidence/snippet.
- Clearly separating:
  - evidence
  - analysis
  - conclusion
- Providing a concise final conclusion based only on the collected evidence.
- Preserving uncertainty when the evidence is insufficient or conflicting.
- Making the report traceable back to the original sources.
- Handling cases where there are no claims or insufficient evidence.
- Handling API errors and malformed input gracefully.

Use the existing Stage 3 investigation pipeline and Stage 4 evidence analysis.

Do not perform additional SerpApi searches in this stage.

Do not create new search queries in this stage.

Do not invent sources, claims, facts, URLs, or evidence.

Do not treat search-result snippets as absolute proof.

Do not claim a statement is definitely true or false unless the Stage 4 evidence supports that conclusion.

If sources disagree, clearly show the disagreement instead of hiding it.

If evidence is insufficient, say so instead of generating a confident conclusion.

LLM usage is allowed only if it is actually needed to produce a concise evidence-based synthesis. Prefer existing project configuration and native HTTP requests. Do not add an SDK/package unless absolutely required.

The report should remain useful even if LLM synthesis is unavailable. A deterministic fallback based on Stage 4 evidence should exist.

Do not implement:

- Evidence graph visualization
- Advanced SerpApi engine selection
- Additional SerpApi searches
- Authentication
- Database
- Payments
- User accounts
- Future-stage features

## Stage 5 Architecture

Use this flow:

User question
→ Stage 3 investigation
→ Stage 4 evidence analysis
→ Stage 5 investigation report

Stage 5 should consume existing structured Stage 4 output rather than independently repeating earlier processing.

Prefer a reusable report-generation function in:

src/lib/report.ts

and an API endpoint in:

src/app/api/report/route.ts

Only create these files if they do not already exist.

The existing page should be updated only as necessary to display the Stage 5 report.

## Report Structure

The report should contain, at minimum:

1. Question
2. Overall evidence state
3. Short conclusion
4. Key findings
5. Evidence breakdown
6. Sources

Each important finding should remain traceable to one or more source URLs.

For conflicting evidence, show both sides and identify the relevant sources.

For insufficient evidence, explicitly state that the available evidence does not support a reliable conclusion.

## UI Rules

Keep the existing TruthLens visual style.

Do not redesign the entire application.

Prefer clear sections/cards over a large amount of text.

The user should be able to quickly understand:

- What was investigated
- What the evidence indicates
- Whether sources agree or disagree
- Where the evidence came from

Do not add unnecessary animations, libraries, pages, or components.

## Validation

After implementation:

- Run npm run lint
- Run npx tsc --noEmit
- Run npm run build

If possible, manually verify:

1. A question with supporting evidence.
2. A question with conflicting evidence.
3. A question with insufficient/unverified evidence.
4. A malformed or empty request.

Stop after Stage 5.