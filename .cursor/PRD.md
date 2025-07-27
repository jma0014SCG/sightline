Sightline.ai – Technical Blueprint

(compliant with the 9-section PRD you specified)
 
1  Product Design Requirements (PDR)
Item	Detail
Vision	“Speed-learn anything on YouTube.” One click turns hour-long videos or entire channels into short, Markdown summaries you can search, save, and share.
Target Users	Speed-Learner Sam (time-poor professionals & students) and Creator Casey (content strategists, channel managers).
Core Features (MVP)	1) URL paste-box ➜ instant summary. 2) Google OAuth. 3) Personal library (CRUD). 4) Copy / export / share link.
Pro-Tier (v1.1+)	Batch channel summariser, follow-up Q&A, analytics dashboard, team workspaces.
Functional Reqs	☐ Summarise ≤ 20 min video in < 15 s P95. ☐ Support 10 concurrent summaries/user. ☐ Persist summaries & metadata per user. ☐ Stripe billing (monthly plan).
Non-Functional Reqs	☐ Global ≥ 99.5 % uptime. ☐ P95 TTFB < 200 ms for library pages. ☐ GDPR-ready deletion & export. ☐ ≤ $0.03 infra cost/summary @ 4-o-mini.
Problem Solved	Cuts the time cost of extracting insight from video → converts passive viewing into actionable text; gives creators a competitive map of their niche.
 
2  Tech Stack
Layer	Chosen Tech	Why
Frontend	Next.js 14 (App Router, RSC) + TypeScript + Tailwind + shadcn/ui	React familiarity, Vercel edge streaming, instant SSR/SSG.
State / RPC	TanStack Query + tRPC	Type-safe calls, cache invalidation, zero REST boilerplate.
Auth	NextAuth (Google provider) → Clerk if SSO needed	Checklist #1 (battle-tested).
Backend	FastAPI (Python 3.12) → Vercel Serverless Functions	Async, Pydantic typing, easy LangChain integration.
LLM Layer	LangChain 0.3 + OpenAI SDK (gpt-4o-mini default)	Lower unit cost & prompt control; Gumloop SDK stays as optional fallback trigger.
Transcript Fetch	youtube-transcript-api + Whisper v3 for no-caption videos	100 % coverage.
DB	Vercel Postgres (Neon) – Row-level security, Prisma ORM	Checklist #8.
Background Jobs	Vercel Cron + Upstash Q	For > 20 min videos & retries.
Payments	Stripe Checkout + Billing Portal	PCI-safe, low friction.
Observability	Sentry (FE+BE) + LangSmith traces + Vercel Analytics	Prod debug & prompt A/B.
CI/CD	GitHub → Vercel preview deployments	Zero-ops, instant rollbacks.
 
3  App Flowchart
flowchart TD
    A[Paste YT URL] -->|Google OAuth? | B[Auth Check (NextAuth)]
    B --> C[POST /api/summarise]
    C --> D[FastAPI Controller]
    D --> E[youtube-transcript-api]
    E --> F[LangChain SummariseChain]
    F --> G{>30s?}
    G -- No --> H[Return Markdown]
    G -- Yes --> I[Enqueue Upstash Job]
    I --> J[[Cron Worker → produce summary → store]]
    H --> K[Prisma → summaries table]
    J --> K
    K --> L[Edge Stream → Frontend]
    L --> M[User Library List]
    M --> N[Share / Copy / Export]
 
4  Project Rules
•	Coding Standards – ESLint + Prettier (Airbnb); Ruff & Black for Python.
•	Branching – main (prod), dev (integration), feature branches → PR → squash merge; Semantic PR titles (feat: …).
•	Testing – Vitest (FE), Pytest (BE) with ≥ 80 % coverage gate; Cypress e2e smoke.
•	Docs – /docs folder + Storybook; OpenAPI auto-generated from FastAPI; ADRs in /docs/adr.
•	CI – GitHub Actions: lint → test → build → Vercel preview; fail-fast.
•	Performance – Lighthouse PWA ≥ 90; serverless cold-start budget ≤ 150 ms; use Vercel Edge runtime where streaming.
•	Accessibility – WCAG 2.1 AA; use @accessible/react lint rules; semantic HTML.
•	Code Review – 2 approvals, mandatory security checklist tick-box, auto-assign reviewers via CODEOWNERS.
 
5  Implementation Plan (14-day MVP)
Day	Milestone & Tasks	Dependencies
1-2	Repo scaffold (create-next-app, Tailwind, shadcn/ui).	—
3	Deploy FastAPI “hello-world” on Vercel, connect tRPC.	Vercel acct
4	Gumloop SDK fallback path wired ➜ E2E demo.	Gumloop key
5-6	Replace Gumloop with LangChain summariser; stream tokens.	OpenAI key
7	Google OAuth, user table migration (prisma migrate).	Vercel DB
8	Stripe Checkout + webhook → users.plan column.	Stripe acct
9	Summary persistence + Library UI (TanStack Query).	Auth
10	Share-link slugs + RBAC (admin vs user).	DB
11	Whisper fallback for no‐caption videos (long jobs queue).	Upstash Q
12	Sentry, LangSmith, error sanitiser middleware.	Keys
13	Lighthouse, a11y audit, cold-start load test.	—
14	Prod deploy, marketing copy, landing page → launch.	—
 
6  Frontend Guidelines
Area	Principle	Key Practices
Design Paradigm	Desktop-first—optimise for ≥ 1280 px where Sam & Casey actually work; ensure graceful degradation to tablets & phones.	• Primary layouts assume two-pane or sidebar views.• Use Tailwind’s 2xl, xl, lg break-points as the design baseline; progressively collapse to md, sm when width shrinks.• Critical flows (URL input, copy/share) remain fully usable at 360 px.
Layout & Grid	Fluid grid that re-flows not re-stacks.	• CSS Grid for macro layout (grid-cols-[sidebar___1fr]).• On < 768 px: sidebar becomes off-canvas drawer, tables → stackable cards.• Max-width text blocks ≈ 65ch for readability on ultrawide screens.
Component Architecture	Atomic + Colocation for speed of change.	• Atoms (Button, Input) → Molecules (SummaryCard) → Organisms (LibraryTable).• Keep component, test, and styles in same folder.• Use TanStack Query hooks at Organism level to avoid over-fetching.
State Management	Cache smart, render fast.	• Server data via TanStack Query + tRPC; UI micro-state via local hooks (useState).• Memoise expensive selectors with useMemo.• Avoid context for large objects—pass ids or fetch lazily.
Styling	Tailwind + shadcn/ui tokens.	• Never inline style objects (perf + maintainability).• Use Tailwind’s @apply for frequently reused utility combos.• Theme variables in tailwind.config.js drive dark/light modes.
Accessibility (WCAG 2.1 AA)	Inclusive by default.	• Semantic HTML (<main>, <nav>, <button>).• Visible focus rings, aria-* attributes for all interactive elements.• Check contrast at every palette update.
Performance	Fast desktop, acceptable mobile.	• next/dynamic and Suspense to code-split heavy panes (analytics).• Lazy-load images (loading="lazy").• Limit initial JS ≤ 200 kB gzip.• Use Edge Streaming for summary text to minimise TTI.
Testing	Ship without regressions.	• Storybook visual snapshots at lg and sm viewports.• Playwright mobile-emulation smoke test for URL→Summary flow.• Lighthouse CI budget: CLS < 0.1, TTI < 3 s on cable.
 
7  Backend Guidelines
Concern	Practice
API	REST-like tRPC; rate-limit 50 req/min/user (Clerk middleware).
Schema	Prisma models: User, Summary, ShareLink, Plan.
Caching	Cloudflare CDN for public share MD → HTML; Redis (Upstash) for hot summaries.
Scaling	Stateless functions; heavy tasks queue; concurrency env var tuning.
Security	OAuth JWT verify in FastAPI dependency (Depends(get_current_user)); RBAC decorator; error sanitiser (Checklist #5).
Observability	Structured logging (JSON) → Vercel Log Drains; custom metrics via LangSmith.
Integration	Frontend calls POST /api/summarise (edge); long jobs poll /api/status/:id.
 
8  Optimised React Code Guidelines
//  ❌  Bad: inline fn & obj every render
export function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      style={{ backgroundColor: '#1e40af' }}  // creates new object
    >
      Copy
    </button>
  );
}

//  ✅  Good: memoised callback + className
export const CopyButton = React.memo(function CopyButton({
  text,
}: { text: string }) {
  const handleClick = React.useCallback(() => {
    navigator.clipboard.writeText(text);
  }, [text]);

  return (
    <button
      onClick={handleClick}
      className="bg-blue-700 text-white px-3 py-1 rounded"
    >
      Copy
    </button>
  );
});
•	React.memo for pure presentational components.
•	useCallback / useMemo every time a prop receives a fn/obj.
•	Avoid prop drilling – use context or tRPC hooks.
•	Split routes – use Next.js Route Groups for lazy chunks.
•	Use Suspense + ErrorBoundary around streaming summary component.
 
9  Security Checklist (Enforced)
1.	Auth Library – NextAuth/Clerk (no DIY).
2.	Protect Endpoints – FastAPI dependency validates JWT on every request.
3.	Secrets – All keys in Vercel Project → Environment Variables; never shipped to client.
4.	.gitignore – .env, .vercel, *.key, node_modules.
5.	Sanitised Errors – uvicorn.error logs internal; client gets “Something went wrong.”
6.	Middleware Gatekeeper – tRPC isAuthed middleware before mutating routes.
7.	RBAC – Prisma enum Role { ADMIN, USER, GUEST }; feature flags by role.
8.	Secure DB – Vercel Postgres row-level-security ON; Prisma parametrised queries.
9.	Secure Host – Vercel’s WAF & DDoS; Vercel Auto-TLS (LetsEncrypt) ➜ HTTPS only.
10.	HTTPS Everywhere – next.config.js → webpack: { forceHttps: true }; HSTS header.
11.	File-Upload Hardening – No file uploads in MVP; future: use UploadThing (virus scan, MIME check).
 
 🛠️

