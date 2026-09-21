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
5. Do not install packages unless they are required for the current stage.
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

Use these evidence states:

- Supported
- Conflicting
- Unverified
- Insufficient evidence

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

1. Inspect the current implementation.
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
## Current Stage

Stage 1 — Landing Page & Application Shell

Focus only on:
- TruthLens branding
- Landing page
- Basic navigation/header
- Primary CTA
- Responsive layout
- Initial visual design system

Do not implement:
- SerpApi integration
- Search functionality
- Investigation pipeline
- Evidence extraction
- LLM integration
- Database
- Authentication
- Future-stage functionality

Use the existing Next.js, TypeScript, Tailwind CSS, and ESLint setup.

Do not install new packages unless absolutely required.