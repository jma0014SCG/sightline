# Glossary

**Canonical terminology and definitions for Sightline.ai platform**

## Business Terms

### Core Concepts

**Anonymous User**  
A user who can create one free summary without registration using browser fingerprinting for identification. Cannot save summaries or access personal library.

**Browser Fingerprinting**  
Client-side technique that generates a unique identifier from browser characteristics (User Agent, screen resolution, timezone) combined with IP address to track anonymous usage without cookies.

**Personal Library**  
User's private collection of saved video summaries with search, filtering, and organization capabilities. Includes Smart Collections tagging and categorization.

**Plan Limits**  
Usage restrictions based on subscription tier:
- Anonymous: 1 summary (lifetime)
- Free: 3 summaries (lifetime) 
- Pro: 25 summaries/month
- Complete: Unlimited summaries

**Progress Tracking**  
Real-time status updates during AI processing using UUID-based task identification, showing completion percentage and current processing stage.

**Public Sharing**  
Feature allowing users to generate public URLs for summaries, making them viewable without authentication via unique slug identifiers.

**Smart Collections**  
AI-powered automatic categorization system that extracts entities and assigns categories to video summaries for intelligent organization and filtering.

**Summary Claiming**  
Process where anonymous users can convert their free summary to a saved summary by creating an account, transferring ownership from anonymous to authenticated user.

**Usage Events**  
Database records tracking user actions (summary creation, deletion) for plan limit enforcement and analytics, with security-hardened deletion protection.

**Video Summarization**  
AI-powered process that converts YouTube video content into structured summaries with TL;DR, key moments, frameworks, playbooks, and other actionable insights.

## Technical Terms

### Architecture

**Dual API Architecture**  
System design using tRPC (TypeScript) for user operations and FastAPI (Python) for AI processing, enabling type safety and performance optimization.

**FastAPI Backend**  
Python-based API layer handling CPU-intensive AI operations including transcript acquisition, OpenAI processing, and Smart Collections classification.

**Modal Authentication**  
In-app authentication flow using Clerk modals instead of redirects, providing seamless user experience without leaving the application context.

**tRPC Router**  
Type-safe API layer providing end-to-end TypeScript validation between frontend and backend with automatic type inference and error handling.

### Data Management

**Browser Fingerprint**  
Unique identifier generated from browser characteristics: `btoa([userAgent, screenSize, timezone, language, canvasHash].join('|'))`

**CUID**  
Collision-resistant Unique Identifier used for database primary keys, providing URL-safe unique identifiers without coordination.

**Prisma ORM**  
Database toolkit providing type-safe database access, schema management, and query building with automatic TypeScript generation.

**Task ID**  
UUID identifier for tracking long-running operations, enabling progress polling and result retrieval without blocking user interface.

**Usage Event**  
Database record linking user actions to plan limits: `{userId, eventType, browserFingerprint, ipAddressHash, metadata, createdAt}`

### AI & Processing

**Classification Service**  
OpenAI-powered system that extracts entities and categories from video content using GPT-4 with structured JSON output schemas.

**Entity Extraction**  
Process of identifying and categorizing specific items in video content: people, companies, technologies, products, concepts, frameworks, tools.

**LangChain Integration**  
Framework for building AI applications that manages OpenAI API interactions, prompt templates, and response processing.

**Multi-Service Transcript**  
Fallback chain for video transcript acquisition using YouTube Transcript API, Gumloop, YT-DLP, and Oxylabs services.

**OpenAI Classification**  
Structured AI processing using GPT-4 models to analyze content and return JSON-formatted entity extraction and categorization results.

**Structured Output**  
OpenAI API feature ensuring consistent JSON response format using defined schemas for reliable parsing and processing.

## System Concepts

### Authentication & Security

**JWT Validation**  
Process of verifying JSON Web Tokens from Clerk authentication service using public key cryptography and signature validation.

**Plan Enforcement**  
System for checking and enforcing usage limits based on user subscription tier with real-time validation and graceful error handling.

**Rate Limiting**  
Throttling mechanism controlling API request frequency based on user plan, IP address, and endpoint sensitivity.

**Security Headers**  
HTTP headers implementing defense-in-depth security: CORS, CSP, HSTS, and other protections against common web vulnerabilities.

### User Experience

**Atomic Design Pattern**  
Component organization methodology: atoms (basic elements) → molecules (simple features) → organisms (complex sections).

**Optimistic Updates**  
UI pattern showing expected results immediately while API requests process, with automatic rollback on errors.

**Progressive Registration**  
User experience flow allowing value demonstration before requiring account creation, reducing friction and improving conversion.

**Responsive Design**  
Mobile-first design approach ensuring optimal experience across devices using Tailwind CSS utility classes and breakpoint system.

## Entity Types (Smart Collections)

**PERSON**  
Individuals mentioned in video content: experts, influencers, speakers, authors, or other notable people.

**COMPANY**  
Organizations referenced in content: businesses, brands, startups, enterprises, or institutional entities.

**TECHNOLOGY**  
Technical tools and platforms: programming languages, databases, operating systems, cloud platforms, or technical frameworks.

**PRODUCT**  
Specific products or services: software applications, physical products, SaaS platforms, or commercial offerings.

**CONCEPT**  
Abstract ideas or methodologies: principles, theories, approaches, strategies, or conceptual frameworks.

**FRAMEWORK**  
Structured systems or libraries: development frameworks, methodological approaches, or systematic processes.

**TOOL**  
Specific tools or utilities: software applications, development tools, productivity apps, or specialized utilities.

## Categories (Smart Collections)

**Technology**  
Content related to programming, software development, technical systems, and digital innovation.

**Business**  
Content covering entrepreneurship, management, strategy, finance, and organizational development.

**Marketing**  
Content focused on promotion, branding, customer acquisition, and growth strategies.

**Productivity**  
Content about efficiency, time management, personal development, and optimization techniques.

**Education**  
Content providing learning, training, skill development, and knowledge transfer.

**Health & Wellness**  
Content covering physical health, mental wellness, fitness, and lifestyle optimization.

## Acronyms & Abbreviations

**ADR** - Architectural Decision Record  
**API** - Application Programming Interface  
**CDN** - Content Delivery Network  
**CORS** - Cross-Origin Resource Sharing  
**CSP** - Content Security Policy  
**CUID** - Collision-resistant Unique Identifier  
**E2E** - End-to-End (testing)  
**GPT** - Generative Pre-trained Transformer  
**HSTS** - HTTP Strict Transport Security  
**JWT** - JSON Web Token  
**LLM** - Large Language Model  
**ORM** - Object-Relational Mapping  
**PII** - Personally Identifiable Information  
**PWA** - Progressive Web Application  
**SDK** - Software Development Kit  
**SEO** - Search Engine Optimization  
**SPA** - Single Page Application  
**SSG** - Static Site Generation  
**SSR** - Server-Side Rendering  
**TL;DR** - Too Long; Didn't Read  
**tRPC** - TypeScript Remote Procedure Call  
**UI** - User Interface  
**UUID** - Universally Unique Identifier  
**UX** - User Experience  
**WCAG** - Web Content Accessibility Guidelines  

## Version & Plan Information

**Free Plan**  
Entry-level tier with 3 lifetime summaries, personal library access, and basic Smart Collections features.

**Pro Plan**  
Premium tier at $9.99/month with 25 summaries per month, unlimited library storage, and advanced sharing features.

**Complete Plan**  
Highest tier (future) with unlimited summaries, priority processing, and enterprise features.

## Development Terms

**Atomic Design**  
Component architecture pattern organizing UI elements into atoms, molecules, organisms, templates, and pages.

**Branch Strategies**  
Git workflow patterns: `feature/`, `fix/`, `refactor/`, `docs/` prefixes with descriptive naming conventions.

**Component Props**  
TypeScript interfaces defining component input parameters with strict type checking and optional properties.

**Conventional Commits**  
Commit message format: `type(scope): description` enabling automated changelog generation and semantic versioning.

**Quality Gates**  
Automated checks ensuring code quality: linting, type checking, testing, and formatting before deployment.

**Semantic Versioning**  
Version numbering scheme: MAJOR.MINOR.PATCH indicating breaking changes, features, and bug fixes.

---

*This glossary provides canonical definitions for consistent communication across development, documentation, and user-facing content. When in doubt, refer to these definitions.*