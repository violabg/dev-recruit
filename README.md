# DevRecruit AI

[![Next.js](https://img.shields.io/badge/Next.js-16.0.3-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.19.1-2D3748)](https://www.prisma.io/)
[![Neon](https://img.shields.io/badge/Neon-Serverless%20Postgres-00E599)](https://neon.tech/)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-Latest-4A90E2)](https://www.better-auth.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.4-38B2AC)](https://tailwindcss.com/)

An advanced AI-powered technical recruitment platform that streamlines the hiring process through intelligent quiz generation, candidate assessment, and interview management.

## 📋 Table of Contents

- [🎯 Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [📊 Database Schema](#-database-schema)
- [🔧 Technology Stack](#-technology-stack)
- [📱 Application Structure](#-application-structure)
- [🤖 AI Integration](#-ai-integration)
- [🔒 Authentication & Security](#-authentication--security)
- [📊 Component System](#-component-system)
- [🎨 UI/UX Design System](#-uiux-design-system)
- [🛠️ Development](#-development)
- [📚 API Reference](#-api-reference)
- [🔍 Testing](#-testing)
- [🚀 Deployment](#-deployment)
- [📖 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🎯 Features

### Core Functionality

#### 🎯 Position Management

- **Create and manage job positions** with detailed requirements
- **Define skills, experience levels, and contract types**
- **Position-based quiz assignment** and candidate filtering
- **Comprehensive position analytics** and tracking

#### 👥 Candidate Management

- **Candidate registration** with detailed profiles
- **Resume upload and management**
- **Status tracking** (pending, in-progress, completed, hired, rejected)
- **Position-based candidate organization**
- **Advanced search and filtering** capabilities

#### 📝 AI-Powered Quiz Generation

- **Intelligent quiz creation** using Groq AI models
- **Multiple question types**:
  - Multiple choice questions with 4 options
  - Open-ended questions with sample answers
  - Code snippet challenges with bug fixing exercises
- **Difficulty scaling** (1-5 levels)
- **Customizable question count** and time limits
- **Position-specific content** generation
- **Previous question avoidance** for unique assessments

#### 🎤 Interview Management

- **Token-based secure interview access**
- **Real-time interview monitoring**
- **Automatic scoring and evaluation**
- **Interview status tracking**
- **Results analysis and reporting**

#### 📊 Analytics and Reporting

- **Candidate performance analytics**
- **Quiz effectiveness metrics**
- **Interview completion rates**
- **Position-based statistics**

### Advanced Features

#### 🔄 Real-time Updates

- **Live interview monitoring**
- **Real-time status updates**
- **Instant quiz generation feedback**

#### 🎨 Modern UI/UX

- **Glass morphism design** with Vision Pro aesthetics
- **Dark/Light theme support** with system preference detection
- **Responsive design** for all device types
- **Accessibility-first** component design

#### 🔒 Enterprise Security

- **Row Level Security (RLS)** policies
- **Token-based interview access**
- **User isolation** and data protection
- **Secure API endpoints**

## 🏗️ Architecture

### System Architecture

```mermaid
graph TB
  A[Next.js Frontend] --> B[API Routes]
  B --> C[Server Actions]
  C --> D[Prisma Client]
  D --> E[Neon PostgreSQL]
  C --> F[Groq AI Models]
  G[Better Auth] --> B
```

### Application Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant AI as Groq AI
    participant DB as Neon

    U->>F: Create Position
    F->>DB: Store Position Data
    U->>F: Generate Quiz
    F->>A: Quiz Generation Request
    A->>AI: Generate Questions
    AI->>A: Return Questions
    A->>DB: Save Quiz
    U->>F: Invite Candidates
    F->>DB: Create Interview Tokens
    DB->>U: Send Interview Links
```

## 🔁 Cache Components Strategy

- `next.config.mjs` enables `cacheComponents: true`, which prerenders a static shell while streaming request-specific subtrees inside `<Suspense>` boundaries.
- Runtime APIs such as `cookies()`, `headers()`, `searchParams`, and dynamic `params` drive the Suspense subtree so they never block the static shell or live inside `'use cache'` scopes. Fallback UI keeps the layout responsive while those values resolve.
- Repeated data queries stay inside `'use cache'` + `cacheLife(...)` profiles, and mutations refresh `cacheTag`/`revalidateTag` to keep cached shells aligned with Prisma updates. See `docs/CACHE_IMPLEMENTATION.md` for the full caching reference.

- Suspense fallbacks reuse the shared `components/ui/skeleton` primitives so every loading state matches the shadcn component structure documented in `docs/VISION_PRO_STYLE_GUIDE.md`.
- Server actions should call `updateTag` after writes when they touch `positions`, `candidates`, `quizes`, or `interviews` data so the cached cards and lists revalidate immediately and the shell stays accurate.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **pnpm** (recommended) or npm/yarn
- **Neon PostgreSQL** (or compatible Postgres) connection string
- **Groq API key** for AI features
- **GitHub OAuth app** for Better Auth social login (optional but recommended)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/dev-recruit-ai.git
   cd dev-recruit-ai
   ```

1. **Install dependencies**

   ```bash
   pnpm install
   ```

1. **Environment Setup**
   Copy `.env.example` to `.env` and update the values:

```env
DATABASE_URL="postgresql://user:password@host:5432/dev_recruit_ai"
BETTER_AUTH_SECRET="replace-with-secure-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GROQ_API_KEY="your-groq-api-key"
```

1. **Database Setup**

```bash
pnpm prisma migrate deploy
```

For a local database during development you can instead run:

```bash
pnpm prisma db push
```

1. **Start Development Server**

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## 📊 Database Schema

The relational schema lives in Neon PostgreSQL and is defined with Prisma. Migrations are tracked in `prisma/migrations` and applied with `pnpm prisma migrate deploy`.

### Prisma Overview

- **Datasource** points at the `DATABASE_URL` environment variable.
- **Generator** emits the client into `lib/prisma` for tree-shakable imports.
- **Better Auth models** (`User`, `Session`, `Account`, `Verification`) co-exist with app-specific entities.

### Core Application Models

#### `User` & `Profile`

Better Auth manages authentication while the local `Profile` model stores recruiter metadata.

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile   Profile?
  positions Position[]
  candidates Candidate[]
  quizzes   Quiz[]
}

model Profile {
  id        String   @id @default(cuid())
  userId    String   @unique
  fullName  String?
  userName  String?
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### `Position`, `Candidate`, and `Quiz`

These models power the recruiting workflows for planning, inviting, and assessing candidates.

```prisma
model Position {
  id              String   @id @default(cuid())
  title           String
  description     String?
  experienceLevel String
  skills          String[]
  softSkills      String[]
  contractType    String?
  createdBy       String
  createdAt       DateTime @default(now())

  candidates Candidate[]
  quizzes    Quiz[]
}

model Candidate {
  id         String   @id @default(cuid())
  name       String
  email      String
  positionId String
  status     String   @default("pending")
  resumeUrl  String?
  createdBy  String
  createdAt  DateTime @default(now())

  position Position @relation(fields: [positionId], references: [id], onDelete: Cascade)
}

model Quiz {
  id         String   @id @default(cuid())
  title      String
  positionId String
  questions  Json
  timeLimit  Int?
  createdBy  String
  createdAt  DateTime @default(now())

  position Position @relation(fields: [positionId], references: [id], onDelete: Cascade)
}
```

#### `Interview`

Interview records connect candidates to quizzes and store evaluation results.

```prisma
model Interview {
  id           String   @id @default(cuid())
  candidateId  String
  quizId       String
  status       String   @default("pending")
  startedAt    DateTime?
  completedAt  DateTime?
  score        Float?
  answers      Json?
  token        String   @unique
  createdAt    DateTime @default(now())

  candidate Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  quiz      Quiz      @relation(fields: [quizId], references: [id], onDelete: Cascade)
}
```

## 🔧 Technology Stack

### Frontend Framework

- **[Next.js 16.0.3](https://nextjs.org/)** - React framework with App Router
- **[React 19.2.0](https://reactjs.org/)** - UI library with concurrent features
- **[TypeScript 5.8.3](https://www.typescriptlang.org/)** - Type-safe development

### Backend & Database

- **[Prisma](https://www.prisma.io/)** - Type-safe ORM with schema migrations
- **[Neon](https://neon.tech/)** - Serverless PostgreSQL with branching
- **[Better Auth](https://www.better-auth.com/)** - Authentication and session management

### AI Integration

- **[Groq](https://groq.com/)** - High-performance AI inference
- **[Vercel AI SDK](https://sdk.vercel.ai/)** - AI integration framework
- **[Zod](https://zod.dev/)** - Schema validation for AI responses

### UI Framework

- **[Tailwind CSS 4.1.4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[Lucide React](https://lucide.dev/)** - Modern icon library
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Theme management

### Code Quality

- **[ESLint](https://eslint.org/)** - Code linting and formatting
- **[React Hook Form](https://react-hook-form.com/)** - Form state management
- **[Zod](https://zod.dev/)** - Runtime type validation

### Development Tools

- **[Storybook](https://storybook.js.org/)** - Component documentation
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)** - Code editing
- **[Prism](https://prismjs.com/)** - Syntax highlighting

## 📱 Application Structure

### Directory Organization

```
dev-recruit-ai/
├── app/                          # Next.js App Router
│   ├── api/                      # API route handlers
│   │   ├── quiz-edit/           # Quiz generation & editing endpoints
│   │   └── quiz/                # Quiz CRUD operations
│   ├── auth/                     # Authentication pages
│   ├── dashboard/               # Main application pages
│   │   ├── candidates/          # Candidate management
│   │   ├── interviews/          # Interview management
│   │   ├── positions/           # Position management
│   │   ├── profile/             # User profile
│   │   └── quizzes/            # Quiz management
│   └── interview/               # Public interview pages
├── components/                   # Reusable UI components
│   ├── auth/                    # Authentication components
│   ├── dashboard/               # Dashboard-specific components
│   ├── interview/               # Interview interface components
│   ├── quiz/                    # Quiz management components
│   └── ui/                      # Base UI components
├── docs/                        # Project documentation
│   ├── QUIZ_AI_GENERATION_SYSTEM.md
│   ├── SCHEMA_TYPE_SAFETY_IMPROVEMENTS.md
│   ├── MAINTAINABILITY_PERFORMANCE_ANALYSIS.md
│   ├── CACHE_IMPLEMENTATION.md
│   └── VISION_PRO_STYLE_GUIDE.md
├── lib/                         # Utility libraries
│   ├── actions/                 # Server actions
│   ├── data/                    # Cached data layer
│   ├── schemas/                 # Zod validation schemas
│   ├── services/                # AI service & error handling
│   ├── lib/                    # Prisma client, Better Auth helpers, server utilities
│   └── utils/                   # Utility functions
├── stories/                     # Storybook component stories
└── public/                      # Static assets
```

### Key Components

#### Dashboard Layout

**[`app/dashboard/layout.tsx`](app/dashboard/layout.tsx)** provides the main application shell:

```tsx
export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header>
          <SidebarTrigger />
          <Breadcrumbs />
          <ThemeToggle />
        </header>
        <div className="p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

#### App Sidebar

**[`components/dashboard/app-sidebar.tsx`](components/dashboard/app-sidebar.tsx)** defines navigation:

```tsx
const navigation = [
  { href: "/dashboard/positions", label: "Posizioni", icon: Briefcase },
  { href: "/dashboard/candidates", label: "Candidati", icon: Users },
  { href: "/dashboard/quizzes", label: "Quiz", icon: FileQuestion },
  { href: "/dashboard/interviews", label: "Colloqui", icon: MessageSquareMore },
];
```

## 🤖 AI Integration

### Quiz Generation System

The AI system uses **Groq's high-performance inference** to generate technical assessments.

#### Generation Flow

```mermaid
graph LR
    A[Position Data] --> B[Prompt Construction]
    B --> C[Groq AI Model]
    C --> D[Structured Response]
    D --> E[Validation]
    E --> F[Database Storage]
```

#### Core Generation Function

**Enhanced AI Service Integration** - [`lib/services/ai-service.ts`](lib/services/ai-service.ts)

The application now uses an enhanced AI service with comprehensive error handling, retry mechanisms, and security features:

```typescript
export class AIQuizService {
  async generateQuiz(
    params: GenerateQuizParams
  ): Promise<{ questions: Question[] }> {
    const startTime = performance.now();

    try {
      const model = getOptimalModel("quiz_generation", params.specificModel);
      const prompt = this.buildQuizPrompt(params);

      const result = await withTimeout(
        withRetry(async () => {
          const response = await generateObject({
            model: groq(model),
            prompt,
            system: this.system,
            schema: quizDataSchema,
            temperature: 0.7,
          });

          if (!response.object || !response.object.questions) {
            throw new AIGenerationError(
              "Invalid response structure from AI model",
              AIErrorCode.INVALID_RESPONSE
            );
          }

          return response.object;
        }, this.config),
        this.config.timeout
      );

      return { questions: convertToStrictQuestions(result.questions) };
    } catch (error) {
      // Enhanced error handling with fallback strategies
      if (params.specificModel && this.config.fallbackModels.length > 0) {
        // Try fallback models...
      }
      throw new AIGenerationError(
        "Generation failed",
        AIErrorCode.GENERATION_FAILED
      );
    }
  }
}
```

**Key Features:**

- **Retry Logic**: Exponential backoff with 3 attempts
- **Model Fallbacks**: Automatic switching to backup models
- **Input Sanitization**: Protection against prompt injection
- **Performance Monitoring**: Built-in timing and metrics
- **Security**: Input validation and sanitization

### AI Model Selection

The AI service optimizes model selection based on task type through the `getOptimalModel` utility function:

```typescript
export function getOptimalModel(taskType: string, specificModel?: string) {
  if (specificModel) return specificModel;

  switch (taskType) {
    case "quiz_generation":
      return "llama-3.3-70b-versatile"; // High reasoning capability
    case "question_generation":
      return "llama-3.1-8b-instant"; // Fast single questions
    default:
      return "llama-3.3-70b-versatile";
  }
}
```

### Question Types

#### Multiple Choice Questions

```typescript
{
  id: "q1",
  type: "multiple_choice",
  question: "Qual è la differenza principale tra let e var?",
  options: [
    "Non c'è differenza",
    "let ha scope di blocco, var ha scope di funzione",
    "var è più veloce",
    "let è deprecato"
  ],
  correctAnswer: 1,
  explanation: "let introduce il block scope..."
}
```

#### Open Questions

```typescript
{
  id: "q2",
  type: "open_question",
  question: "Spiega il concetto di closure in JavaScript",
  keywords: ["closure", "scope", "funzione", "variabile"],
  sampleAnswer: "Una closure è una funzione che mantiene accesso...",
  explanation: "Le closure sono fondamentali per..."
}
```

#### Code Snippet Questions

```typescript
{
  id: "q3",
  type: "code_snippet",
  question: "Correggi il bug in questo codice JavaScript",
  codeSnippet: "function sum(a, b) {\n  return a + b\n  console.log('done');\n}",
  sampleSolution: "function sum(a, b) {\n  console.log('done');\n  return a + b;\n}",
  language: "javascript"
}
```

### API Endpoints

#### Quiz Generation

**[`app/api/quiz-edit/generate-quiz/route.ts`](app/api/quiz-edit/generate-quiz/route.ts)**

```typescript
export async function POST(req: Request) {
  const body = await req.json();
  const validationResult = generateQuizRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const aiQuiz = await generateNewQuizAction(validationResult.data);
  return NextResponse.json(aiQuiz);
}
```

#### Question Generation

**[`app/api/quiz-edit/generate-question/route.ts`](app/api/quiz-edit/generate-question/route.ts)**

Individual question generation for quiz editing and expansion with rate limiting and enhanced error handling.

#### Quiz Saving

**[`app/api/quiz/save/route.ts`](app/api/quiz/save/route.ts)**

Secure quiz saving with user authentication and validation.

## 🔒 Authentication & Security

### Better Auth Configuration

Authentication is powered by **Better Auth** with email/password and optional GitHub OAuth. The configuration lives in [`lib/auth.ts`](lib/auth.ts) and couples Better Auth with Prisma for persistence.

```typescript
export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
  },
  plugins: [admin()],
});
```

### Server-Side Session Access

Server actions use [`lib/auth-server.ts`](lib/auth-server.ts) helpers to fetch or require the current user.

```typescript
export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  return user;
}
```

### Client Utilities

Client components interact with Better Auth through [`lib/auth-client.ts`](lib/auth-client.ts), which exposes the generated client with admin plugin support.

### Data Protection

- **User isolation** enforced via Prisma relations and server-side checks
- **Token security** maintained for interview access tokens stored in Neon
- **Input validation** powered by Zod across actions and API routes
- **CSRF protection** provided by Next.js App Router defaults

## 📊 Component System

### UI Component Architecture

The application uses a **component-driven architecture** with **Radix UI primitives**:

```
components/
├── ui/              # Base components (buttons, inputs, etc.)
├── auth/            # Authentication-specific components
├── dashboard/       # Dashboard layout components
├── interview/       # Interview interface components
├── quiz/           # Quiz management components
└── candidates/     # Candidate management components
```

### Base UI Components

#### Button Component

**[`components/ui/button.tsx`](components/ui/button.tsx)**

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background",
        secondary: "bg-secondary text-secondary-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
  }
);
```

### Quiz Components

#### Question Type Forms

**[`components/quiz/question-types/`](components/quiz/question-types/)**

**Multiple Choice Form:**
[`components/quiz/question-types/multiple-choice-form.tsx`](components/quiz/question-types/multiple-choice-form.tsx)

**Open Question Form:**
[`components/quiz/question-types/open-question-form.tsx`](components/quiz/question-types/open-question-form.tsx)

**Code Snippet Form:**
[`components/quiz/question-types/code-snippet-form.tsx`](components/quiz/question-types/code-snippet-form.tsx)

#### Question Display Components

**[`components/quiz/question-display/`](components/quiz/question-display/)**

These components handle rendering different question types during interviews:

- **Multiple Choice Display:** [`multiple-choice-display.tsx`](components/quiz/question-display/multiple-choice-display.tsx)
- **Open Question Display:** [`open-question-display.tsx`](components/quiz/question-display/open-question-display.tsx)
- **Code Snippet Display:** [`code-snippet-display.tsx`](components/quiz/question-display/code-snippet-display.tsx)

### Form Management

**React Hook Form Integration:**

```typescript
const form = useForm<QuizFormData>({
  resolver: zodResolver(quizFormSchema),
  defaultValues: {
    title: "",
    questions: [],
    timeLimit: null,
  },
});
```

**Zod Validation Schemas:**

The application uses comprehensive validation schemas in [`lib/schemas/`](lib/schemas/) for type safety:

```typescript
export const questionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("multiple_choice"),
    question: z.string(),
    options: z.array(z.string()).min(4).max(4),
    correctAnswer: z.number().min(0).max(3),
    keywords: z.array(z.string()).optional(),
    explanation: z.string().optional(),
  }),
  // ... other question types
]);
```

## 🎨 UI/UX Design System

### Vision Pro-Inspired Design

The application features a **glass morphism design** inspired by Apple's Vision Pro interface:

#### Design Tokens

**[`app/globals.css`](app/globals.css)**

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  --backdrop-blur: blur(20px);
}

.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--backdrop-blur) saturate(1.8);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}
```

#### Animation System

**Smooth transitions** with custom easing:

```css
.transition-vision {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ease-vision {
  transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

### Theme System

**Dual Theme Support:**
**[`components/theme-provider.tsx`](components/theme-provider.tsx)**

```typescript
export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

**Dynamic Theme Colors:**

```css
.light {
  --background: oklch(0.98 0.005 210);
  --foreground: oklch(0.15 0.015 240);
  --primary: oklch(0.45 0.25 260);
}

.dark {
  --background: oklch(0.12 0.015 240);
  --foreground: oklch(0.9 0.01 240);
  --primary: oklch(0.65 0.25 260);
}
```

### Responsive Design

**Mobile-First Approach:**

```typescript
const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};
```

**Adaptive Layouts:**

- **Sidebar collapse** on mobile devices
- **Responsive tables** with horizontal scroll
- **Touch-friendly** button sizes
- **Adaptive typography** scaling

## 🛠️ Development

### Development Workflow

1. **Start Development Server**

   ```bash
   pnpm dev
   ```

2. **Build Application**

   ```bash
   pnpm build
   ```

3. **Run Linting**

   ```bash
   pnpm lint
   ```

4. **Start Storybook**
   ```bash
   pnpm storybook
   ```

### Component Development

**Storybook Integration:**
[`stories/`](stories/) directory contains component stories:

```typescript
// Button.stories.tsx
export default {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Button>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};
```

### Code Quality

**ESLint Configuration:**
**[`eslint.config.mjs`](eslint.config.mjs)**

```javascript
export default [
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "react/jsx-key": "off",
    },
  },
];
```

**TypeScript Configuration:**
**[`tsconfig.json`](tsconfig.json)**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "allowJs": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Performance Optimization

**Next.js Configuration:**
**[`next.config.mjs`](next.config.mjs)**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@radix-ui/react-icons"],
  },
  images: {
    domains: ["avatars.githubusercontent.com"],
  },
};
```

## 📚 API Reference

### Server Actions

#### Quiz Management

**[`lib/actions/quizzes.ts`](lib/actions/quizzes.ts)**

**generateAndSaveQuiz(formData: FormData)**

- Generates and saves a complete quiz
- **Parameters**: FormData with quiz configuration
- **Returns**: Quiz ID
- **Usage**: Form submission handling

**generateNewQuizAction(params: GenerateNewQuizActionParams)**

- AI-powered quiz generation with enhanced error handling
- **Parameters**: Quiz generation parameters
- **Returns**: Generated quiz data
- **Usage**: API endpoint integration

**generateNewQuestionAction(params: GenerateNewQuestionActionParams)**

- Generates individual questions with fallback strategies
- **Parameters**: Question generation parameters
- **Returns**: Generated question object
- **Usage**: Quiz editing and expansion

#### Candidate Management

**[`lib/actions/candidates.ts`](lib/actions/candidates.ts)**

**createCandidate(formData: FormData)**

- Creates new candidate record
- **Parameters**: Candidate information
- **Returns**: Candidate ID
- **Usage**: Candidate registration

**updateCandidateStatus(candidateId: string, status: string)**

- Updates candidate status
- **Parameters**: Candidate ID and new status
- **Returns**: Updated candidate data
- **Usage**: Status management

### Database Functions

#### Interview Search

**Database Function: `search_interviews`** (defined in [`schema.sql`](schema.sql))

```sql
SELECT * FROM search_interviews(
  p_user_id := 'user-uuid',
  p_search := 'john',
  p_status := 'completed',
  p_position_id := 'position-uuid',
  p_programming_language := 'javascript',
  p_page := 1,
  p_limit := 10
);
```

#### Quiz Assignment Data

**Database Function: `get_candidates_for_quiz_assignment`** (defined in [`schema.sql`](schema.sql))

```sql
SELECT * FROM get_candidates_for_quiz_assignment(
  quiz_id_param := 'quiz-uuid',
  p_user_id := 'user-uuid'
);
```

### REST API Endpoints

#### POST `/api/quiz-edit/generate-quiz`

Generates a complete quiz using AI.

**Request Body:**

```typescript
{
  positionId: string;
  quizTitle: string;
  questionCount: number;
  difficulty: number;
  includeMultipleChoice: boolean;
  includeOpenQuestions: boolean;
  includeCodeSnippets: boolean;
  specificModel?: string;
  instructions?: string;
  previousQuestions?: Array<{ question: string }>;
}
```

**Response:**

```typescript
{
  questions: Array<Question>;
}
```

#### POST `/api/quiz-edit/generate-question`

Generates a single question.

**Request Body:**

```typescript
{
  quizTitle: string;
  positionTitle: string;
  experienceLevel: string;
  skills: string[];
  type: "multiple_choice" | "open_question" | "code_snippet";
  previousQuestions?: Array<{ question: string; type?: string }>;
  specificModel?: string;
  instructions?: string;
}
```

**Response:**

```typescript
Question; // Single question object
```

#### POST `/api/quiz-edit/update`

Updates an existing quiz.

**Request Body:**

```typescript
{
  quizId: string;
  title: string;
  timeLimit?: number;
  questions: Array<Question>;
}
```

## 🔍 Testing

### Component Testing

**Storybook Stories:**
Component stories serve as living documentation and testing:

```typescript
export const ButtonVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};
```

### API Testing

**Server Action Testing:**

```typescript
// Test quiz generation
const quizData = await generateNewQuizAction({
  positionId: "test-position-id",
  quizTitle: "Test Quiz",
  questionCount: 5,
  difficulty: 3,
  includeMultipleChoice: true,
  includeOpenQuestions: true,
  includeCodeSnippets: false,
});

expect(quizData.questions).toHaveLength(5);
```

### Database Testing

**Prisma Testing:**

```typescript
// Ensure Prisma can reach Neon and basic queries work
const totalPositions = await prisma.position.count();
expect(totalPositions).toBeGreaterThanOrEqual(0);
```

### End-to-End Testing

**User Flow Testing:**

1. **User Registration** → Profile Creation
2. **Position Creation** → Skills Assignment
3. **Quiz Generation** → AI Integration
4. **Candidate Invitation** → Token Generation
5. **Interview Completion** → Score Calculation

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository**

   ```bash
   vercel --prod
   ```

1. **Environment Variables**
   Set in Vercel dashboard:

```env
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
NEXT_PUBLIC_APP_URL
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GROQ_API_KEY
```

1. **Domain Configuration**
   Configure Better Auth allowed origins and OAuth callback URLs.

### Docker Deployment

**Dockerfile:**

```dockerfile
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

### Database Migration

**Production Setup:**

1. Provision a Neon database branch
1. Run `pnpm prisma migrate deploy`
1. Seed baseline data if required via Prisma scripts
1. Configure Better Auth providers (GitHub, email/password)
1. Define any optional storage integrations

### Environment Configuration

**Production Environment:**

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dev_recruit_ai

# Better Auth
BETTER_AUTH_SECRET=replace-with-secure-secret
BETTER_AUTH_URL=https://your-production-domain
NEXT_PUBLIC_APP_URL=https://your-production-domain

# OAuth Providers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# AI
GROQ_API_KEY=your-groq-api-key

# Application
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret
```

### Performance Optimization

**Build Optimization:**

```bash
# Analyze bundle size
npm run build && npm run analyze

# Performance profiling
npm run dev -- --turbo
```

**Caching Strategy:**

- **Static assets**: CDN caching
- **API responses**: Server-side caching
- **Database queries**: Prisma + React cache deduplication

## 📖 Documentation

This project includes comprehensive documentation to help developers understand and contribute to the codebase:

### 📁 Documentation Files

#### **Core Documentation**

- **[README.md](README.md)** - Main project documentation (this file)
- **[Architecture Overview](#🏗️-architecture)** - System architecture and data flow

#### **Technical Documentation**

- **[Quiz AI Generation System](docs/QUIZ_AI_GENERATION_SYSTEM.md)** - Comprehensive guide to the AI-powered quiz generation system with visual flows, API documentation, and architecture details
- **[Schema and Type Safety Improvements](docs/SCHEMA_TYPE_SAFETY_IMPROVEMENTS.md)** - Detailed plan for schema consolidation, type safety enhancements, and maintainability improvements
- **[Maintainability and Performance Analysis](docs/MAINTAINABILITY_PERFORMANCE_ANALYSIS.md)** - Complete analysis of improvement opportunities with prioritized roadmap for enhanced maintainability and performance
- **[Cache Implementation](docs/CACHE_IMPLEMENTATION.md)** - React Cache and Next.js revalidation patterns for optimal performance

#### **Design Documentation**

- **[Vision Pro Style Guide](docs/VISION_PRO_STYLE_GUIDE.md)** - Comprehensive design system documentation with glass morphism and Vision Pro aesthetics

### 🔗 Quick Links to Key Sections

#### **Getting Started**

- [🚀 Quick Start](#-quick-start) - Installation and setup instructions
- [🔧 Technology Stack](#-technology-stack) - Technologies and frameworks used
- [📊 Database Schema](#-database-schema) - Database structure and relationships

#### **Development Guide**

- [📱 Application Structure](#-application-structure) - Project organization and key components
- [🤖 AI Integration](#-ai-integration) - AI-powered quiz generation system
- [🔒 Authentication & Security](#-authentication--security) - Security implementation and RLS policies

#### **API & Integration**

- [📚 API Reference](#-api-reference) - Complete API documentation
- [🎨 UI/UX Design System](#-uiux-design-system) - Component system and design tokens

### 📋 Documentation Navigation

| Topic             | File                                                               | Description                                     |
| ----------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| **Performance**   | [`docs/CACHE_IMPLEMENTATION.md`](docs/CACHE_IMPLEMENTATION.md)     | Caching strategies and performance optimization |
| **Design System** | [`docs/VISION_PRO_STYLE_GUIDE.md`](docs/VISION_PRO_STYLE_GUIDE.md) | UI components and design guidelines             |

### 🎯 Key Implementation Features

Based on the technical documentation, this project includes:

#### **✅ Enhanced AI Integration**

- Exponential backoff retry mechanisms
- Model fallback strategies
- Input sanitization and security
- Performance monitoring and metrics
- Italian localization for error messages

#### **✅ Advanced Error Handling**

- 12 specific error codes with context
- User-friendly Italian error messages
- Comprehensive logging and monitoring
- Development vs production error modes

#### **✅ API Security & Performance**

- Rate limiting (5 requests/minute for quiz generation)
- Request size validation (1MB limit)
- Comprehensive input validation with Zod
- Proper HTTP status codes and headers

#### **✅ Modern UI/UX**

- Vision Pro-inspired glass morphism design
- Comprehensive component system with Radix UI
- Dark/Light theme support
- Responsive design for all devices

### 📚 Additional Resources

- **[Database Schema](schema.sql)** - Complete SQL schema with RLS policies
- **[Storybook Stories](stories/)** - Interactive component documentation
- **[Component Examples](#📊-component-system)** - Usage examples and patterns

For specific implementation details, troubleshooting, or advanced configuration, refer to the corresponding documentation files in the [`/docs`](docs/) directory.

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Create feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

### Contribution Guidelines

#### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured rules
- **Prettier**: Automatic formatting
- **Naming**: Descriptive, camelCase for variables, PascalCase for components

#### Component Development

```typescript
// Component template
interface ComponentProps {
  // Props interface
}

export function Component({ ...props }: ComponentProps) {
  // Implementation
  return <div>Component content</div>;
}

// Export with proper typing
export type { ComponentProps };
```

#### Database Changes

1. **Schema modifications**: Update [`schema.sql`](schema.sql:1)
2. **Migration scripts**: Provide upgrade path
3. **RLS policies**: Maintain security
4. **Function updates**: Document parameters

#### Testing Requirements

- **Component stories**: Add Storybook stories
- **API testing**: Test server actions
- **Type safety**: Ensure TypeScript compliance
- **Security**: Validate RLS policies

### Pull Request Process

1. **Description**: Clear feature description
2. **Testing**: Include test results
3. **Documentation**: Update relevant docs
4. **Screenshots**: For UI changes
5. **Performance**: No significant degradation

### Issue Reporting

**Bug Reports:**

- **Environment**: OS, browser, Node.js version
- **Steps**: Reproduction steps
- **Expected**: Expected behavior
- **Actual**: Actual behavior
- **Screenshots**: If applicable

**Feature Requests:**

- **Problem**: What problem does this solve?
- **Solution**: Proposed solution
- **Alternatives**: Considered alternatives
- **Impact**: Who benefits from this feature?

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE.md](LICENSE.md) file for details.

### MIT License Summary

- ✅ **Commercial use**
- ✅ **Modification**
- ✅ **Distribution**
- ✅ **Private use**
- ❌ **Liability**
- ❌ **Warranty**

---

## 🔗 Links

- **Documentation**: [GitHub Wiki](https://github.com/yourusername/dev-recruit-ai/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/dev-recruit-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/dev-recruit-ai/discussions)
- **Prisma**: [https://www.prisma.io/](https://www.prisma.io/)
- **Neon**: [https://neon.tech/](https://neon.tech/)
- **Better Auth**: [https://www.better-auth.com/](https://www.better-auth.com/)
- **Groq**: [https://groq.com/](https://groq.com/)
- **Next.js**: [https://nextjs.org/](https://nextjs.org/)
- **Tailwind CSS**: [https://tailwindcss.com/](https://tailwindcss.com/)

---

**DevRecruit AI** - Transforming technical recruitment with the power of artificial intelligence.

_For support, please create an issue or contact the development team._
