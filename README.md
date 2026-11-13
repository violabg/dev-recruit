# DevRecruit AI

A modern, AI-powered technical recruitment platform built with Next.js 16 that streamlines the candidate assessment process through intelligent quiz generation, automated evaluations, and comprehensive candidate management.

![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.10.1-2D3748?style=flat-square&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3.5-38B2AC?style=flat-square&logo=tailwind-css)

## 🚀 Features

### Core Functionality

- **📋 Position Management** - Create and manage job positions with detailed skill requirements and AI-generated descriptions
- **👥 Candidate Tracking** - Track candidates through the recruitment pipeline with status management, resume storage, and **multi-position assignment** (candidates can be associated with multiple positions with primary designation)
- **📝 AI-Powered Quiz Generation** - Generate technical assessments tailored to specific positions using advanced LLMs
- **🎯 Interview System** - Send quiz invitations to candidates via unique tokens for remote technical assessments. Features time-limited quizzes with user confirmation dialogs for completion when time expires.
- **📊 AI Evaluation** - Dual evaluation system:
  - **Interview Evaluations** - Automated quiz answer evaluation with detailed feedback and scoring
  - **Candidate Evaluations** - Resume-based assessment against position requirements with fit scoring
- **🔄 Reusable Question Library** - Create, manage, and favorite questions for reuse across multiple quizzes
- **⚙️ Generation Presets** - Configurable templates for question generation with type-specific parameters

### AI Capabilities

- **Multi-Model Support** - Flexible LLM selection (Groq-powered models including LLaMA, Gemma, DeepSeek, Kimi)
- **Three Question Types**:
  - Multiple Choice - Auto-validated with intelligent distractors
  - Open Questions - Free-form responses with sample answers
  - Code Snippets - Code analysis, bug fixing, and improvement tasks
- **Smart Prompting** - Type-specific prompt engineering for optimal question quality
- **Retry & Fallback** - Robust error handling with automatic model fallbacks
- **Streaming Responses** - Real-time position description generation with streaming AI responses
- **Voice Transcription** - Audio-to-text transcription for candidate answers using Whisper models
- **Consistent Evaluations** - Temperature-controlled AI responses for reproducible assessment scores

### Technical Features

- **Server Components** - Next.js 16 App Router with Cache Components (`"use cache"`)
- **Real-time Streaming** - Position description generation with streaming responses
- **Zod Validation** - End-to-end type safety with comprehensive schemas (Zod v4)
- **Better Auth** - Modern authentication with session management
- **Neon PostgreSQL** - Serverless database with Prisma ORM
- **Cloudflare R2 Storage** - S3-compatible object storage for resume/file uploads
- **PDF Parsing** - Serverless PDF text extraction using unpdf for resume analysis
- **Polymorphic Evaluations** - Unified evaluation entity supporting both interview and candidate assessments

## 📁 Project Structure

```text
dev-recruit/
├── app/                    # Next.js App Router
│   ├── dashboard/          # Protected dashboard routes
│   │   ├── candidates/     # Candidate management & evaluations
│   │   ├── interviews/     # Interview tracking & evaluations
│   │   ├── positions/      # Job position management
│   │   ├── quizzes/        # Quiz creation & editing with reusable questions
│   │   ├── presets/        # Question generation presets management
│   │   └── profile/        # User profile & settings
│   ├── recruting/          # Public interview pages (candidate-facing)
│   ├── auth/               # Authentication pages (login, signup, etc.)
│   └── api/                # API routes (streaming, uploads)
├── components/             # React components
│   ├── ui/                 # Base UI primitives (shadcn/ui)
│   │   ├── rhf-inputs/     # React Hook Form input components
│   ├── dashboard/          # Dashboard-specific components
│   ├── quiz/               # Quiz editing components (AI dialogs, question management)
│   ├── candidates/         # Candidate management components
│   ├── interviews/         # Interview tracking components
│   ├── presets/            # Preset management components
│   └── recruting/          # Interview taking components
├── lib/                    # Core business logic
│   ├── actions/            # Server actions (quizzes, candidates, evaluations, etc.)
│   ├── data/               # Data fetching layer (cached queries)
│   ├── schemas/            # Zod validation schemas
│   ├── services/           # AI services (quiz generation, evaluation, transcription)
│   ├── utils/              # Utility functions
│   └── prisma/             # Generated Prisma client
├── hooks/                  # React hooks (AI generation, forms, etc.)
├── prisma/                 # Database schema & migrations
└── docs/                   # Documentation
```

## 🛠️ Technology Stack

| Category           | Technology                    |
| ------------------ | ----------------------------- |
| **Framework**      | Next.js 16.4 (App Router) + React 19.3 |
| **Language**       | TypeScript 7 (native `tsc`; typescript-eslint uses the TS 6 API via `.pnpmfile.cjs`) |
| **Database**       | PostgreSQL (Neon) + Prisma 7.10 (`pg` pool + `attachDatabasePool`) |
| **AI/LLM**         | Groq API (Vercel AI SDK 7)    |
| **Styling**        | Tailwind CSS 4 + OKLCH colors |
| **UI Components**  | Base UI + shadcn/ui (base-nova) |
| **Forms**          | React Hook Form 7.9 (`useWatch`) + Zod 4.6 (Italian locale) |
| **Authentication** | Better Auth                   |

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 22.12+ or 24.x LTS (Prisma 7 requirement)
- **pnpm** 10.x or later (build approvals live in `pnpm-workspace.yaml` → `allowBuilds`)
- **PostgreSQL** database (Neon recommended)
- **Groq API Key** for AI features

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/dev-recruit.git
cd dev-recruit
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Authentication (Better Auth)
BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# AI (Groq)
GROQ_API_KEY="your-groq-api-key"

# Cloudflare R2 (Resume Storage)
R2_ACCOUNT_ID="your-r2-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret"
R2_BUCKET_NAME="your-r2-bucket-name"
# Optional: if using a custom/public domain for files
R2_PUBLIC_URL="https://files.yourdomain.com"
```

### 4. Set up the database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (development)
pnpm db:push

# Optional: Seed with sample data
pnpm db:seed
```

### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## 📖 Documentation

For detailed documentation on specific features:

- **[AI Quiz Generation System](./docs/AI_QUIZ_GENERATION.md)** - Deep dive into the AI-powered quiz generation
- **[Cache Implementation](./docs/CACHE_IMPLEMENTATION.md)** - Server-side caching patterns
- **[Question Schema Reference](./docs/QUESTION_SCHEMAS.md)** - Zod schemas for question validation

## 🔧 Available Scripts

| Command            | Description                    |
| ------------------ | ------------------------------ |
| `pnpm dev`         | Start development server       |
| `pnpm build`       | Build for production           |
| `pnpm start`       | Start production server        |
| `pnpm lint`        | Run ESLint                     |
| `pnpm db:generate` | Generate Prisma client         |
| `pnpm db:push`     | Push schema changes (dev)      |
| `pnpm db:seed`     | Seed database with sample data |

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph Client
        UI[React Components]
        RHF[React Hook Form]
    end

    subgraph "Next.js App Router"
        SC[Server Components]
        SA[Server Actions]
        API[API Routes]
    end

    subgraph "Data Layer"
        Cache["Cache Components<br/>(use cache)"]
        Prisma[Prisma Client]
    end

    subgraph "AI Layer"
        AIS[AIQuizService]
        Groq[Groq API]
    end

    subgraph "Database"
        Neon[(Neon PostgreSQL)]
    end

    UI --> RHF --> SA
    UI --> SC
    SC --> Cache --> Prisma --> Neon
    SA --> AIS --> Groq
    SA --> Prisma
```

## 🤖 AI Quiz Generation Flow

The AI quiz generation system is the heart of DevRecruit. See the detailed documentation at **[docs/AI_QUIZ_GENERATION.md](./docs/AI_QUIZ_GENERATION.md)**.

### High-Level Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Form (Client)
    participant A as Server Action
    participant AI as AIQuizService
    participant G as Groq API
    participant DB as Database

    U->>F: Configure quiz parameters
    F->>A: generateNewQuizAction()
    A->>A: Validate user & position
    A->>AI: generateQuiz(params)
    AI->>AI: Build prompts
    AI->>G: generateText() with Output.object()
    G-->>AI: Structured JSON response
    AI->>AI: Validate with Zod
    AI-->>A: Questions array
    A-->>F: Return generated questions
    F->>U: Display in quiz editor
    U->>F: Review & save
    F->>A: upsertQuizAction()
    A->>DB: Save quiz
    A-->>F: Success
```

## 🔐 Authentication

DevRecruit uses **Better Auth** for authentication with support for:

- Email/password authentication
- Session management
- Password reset flow
- Email verification (optional)

See `lib/auth.ts` for configuration and `lib/auth-server.ts` for server-side helpers.

## 📊 Data Model

The core entities in DevRecruit:

| Entity                | Description                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| **User**              | Application users (recruiters)                                                |
| **Position**          | Job positions with skill requirements                                         |
| **Candidate**         | Applicants with multi-position support and resume storage                     |
| **CandidatePosition** | Join table for many-to-many candidate-position relationship with primary flag |
| **Quiz**              | Technical assessments composed of reusable questions                          |
| **Question**          | Reusable question library (multiple choice, open, code snippet)               |
| **QuizQuestion**      | Join table linking questions to quizzes with ordering                         |
| **Interview**         | Quiz assignments to candidates with answers and results                       |
| **Evaluation**        | AI-generated assessments (polymorphic: interview or candidate-based)          |
| **Preset**            | Question generation templates with type-specific parameters                   |

For detailed information on the candidate-position relationship, see [`docs/CANDIDATE_POSITIONS.md`](docs/CANDIDATE_POSITIONS.md).

## 🎨 Styling Guidelines

- Use **Tailwind CSS v4** utilities for styling
- Colors must be in **OKLCH format** (see `app/globals.css`)
- Compose classes with `cn()` helper from `lib/utils`
- Prefer existing UI components from `components/ui/`

## 🤝 Contributing

1. Follow the conventions in `.github/copilot-instructions.md`
2. Keep Prisma/AI calls in `"use cache"` scopes or server actions
3. Validate all inputs with Zod schemas from `lib/schemas/`
4. Update cache tags after mutations
5. Write documentation for significant features

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ using Next.js, TypeScript, and AI
