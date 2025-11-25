# DevRecruit AI

A modern, AI-powered technical recruitment platform built with Next.js 16 that streamlines the candidate assessment process through intelligent quiz generation, automated evaluations, and comprehensive candidate management.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.18-2D3748?style=flat-square&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=flat-square&logo=tailwind-css)

## 🚀 Features

### Core Functionality

- **📋 Position Management** - Create and manage job positions with detailed skill requirements
- **👥 Candidate Tracking** - Track candidates through the recruitment pipeline with status management
- **📝 AI-Powered Quiz Generation** - Generate technical assessments tailored to specific positions using advanced LLMs
- **🎯 Interview System** - Send quiz invitations to candidates via unique tokens
- **📊 AI Evaluation** - Automated answer evaluation with detailed feedback and scoring

### AI Capabilities

- **Multi-Model Support** - Flexible LLM selection (Groq-powered models including LLaMA, Gemma, DeepSeek)
- **Three Question Types**:
  - Multiple Choice - Auto-validated with intelligent distractors
  - Open Questions - Free-form responses with sample answers
  - Code Snippets - Code analysis, bug fixing, and improvement tasks
- **Smart Prompting** - Type-specific prompt engineering for optimal question quality
- **Retry & Fallback** - Robust error handling with automatic model fallbacks

### Technical Features

- **Server Components** - Next.js 16 App Router with Cache Components (`"use cache"`)
- **Real-time Streaming** - Position description generation with streaming responses
- **Zod Validation** - End-to-end type safety with comprehensive schemas
- **Better Auth** - Modern authentication with session management
- **Neon PostgreSQL** - Serverless database with Prisma ORM

## 📁 Project Structure

```text
dev-recruit/
├── app/                    # Next.js App Router
│   ├── dashboard/          # Protected dashboard routes
│   │   ├── candidates/     # Candidate management
│   │   ├── interviews/     # Interview tracking
│   │   ├── positions/      # Job position management
│   │   ├── quizzes/        # Quiz creation & editing
│   │   └── presets/        # Question generation presets
│   ├── interview/          # Public interview pages
│   └── auth/               # Authentication pages
├── components/             # React components
│   ├── ui/                 # Base UI primitives (shadcn/ui)
│   ├── dashboard/          # Dashboard-specific components
│   ├── quiz/               # Quiz editing components
│   └── interview/          # Interview taking components
├── lib/                    # Core business logic
│   ├── actions/            # Server actions
│   ├── data/               # Data fetching layer
│   ├── schemas/            # Zod validation schemas
│   ├── services/           # AI services
│   └── utils/              # Utility functions
├── hooks/                  # React hooks
├── prisma/                 # Database schema & migrations
└── docs/                   # Documentation
```

## 🛠️ Technology Stack

| Category           | Technology                    |
| ------------------ | ----------------------------- |
| **Framework**      | Next.js 16 (App Router)       |
| **Language**       | TypeScript 5.9                |
| **Database**       | PostgreSQL (Neon) + Prisma 6  |
| **AI/LLM**         | Groq API (Vercel AI SDK)      |
| **Styling**        | Tailwind CSS 4 + OKLCH colors |
| **UI Components**  | Radix UI + shadcn/ui          |
| **Forms**          | React Hook Form + Zod v4      |
| **Authentication** | Better Auth                   |

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 20.x or later
- **pnpm** 8.x or later (recommended)
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
    AI->>G: generateObject() with schema
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

| Entity        | Description                                 |
| ------------- | ------------------------------------------- |
| **User**      | Application users (recruiters)              |
| **Position**  | Job positions with skill requirements       |
| **Candidate** | Applicants linked to positions              |
| **Quiz**      | Technical assessments with questions        |
| **Interview** | Quiz assignments to candidates with results |
| **Preset**    | Reusable question generation templates      |

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
