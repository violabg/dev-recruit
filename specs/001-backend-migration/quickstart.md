# Migration Quickstart: Supabase to Prisma + Neon + Better Auth

## Overview

This guide provides step-by-step instructions for migrating the backend from Supabase to Prisma + Neon + Better Auth while keeping the application functional.

## Prerequisites

- Node.js 18+
- Access to Neon database
- Better Auth configuration ready
- Current Supabase project with data

## Phase 1: Setup Infrastructure

### 1.1 Create Neon Database

1. Sign up for Neon (<https://neon.tech>)
2. Create a new project
3. Note the connection string: `postgresql://user:password@host/db`

### 1.2 Install Dependencies

```bash
pnpm add prisma @prisma/client @better-auth/next-js @neondatabase/serverless
pnpm add -D prisma
```

### 1.3 Initialize Prisma

```bash
npx prisma init
```

Update `.env`:

```env
DATABASE_URL="postgresql://user:password@host/db"
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
```

## Phase 2: Database Migration

### 2.1 Export Supabase Schema

Use Supabase dashboard or CLI to export current schema:

```bash
supabase db dump --db-url "$SUPABASE_URL" --schema public > supabase-schema.sql
```

### 2.2 Convert to Prisma Schema

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Profile {
  id        String   @id @default(cuid())
  name      String?
  fullName  String?
  userName  String?
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  positions  Position[]
  candidates Candidate[]
  quizzes    Quiz[]

  @@map("profiles")
}

model Position {
  id              String     @id @default(cuid())
  title           String
  description     String?
  experienceLevel String
  skills          String[]
  softSkills      String[]
  contractType    String?
  createdBy       String
  createdAt       DateTime   @default(now())

  // Relations
  creator   Profile    @relation(fields: [createdBy], references: [id])
  candidates Candidate[]
  quizzes   Quiz[]

  @@map("positions")
}

model Candidate {
  id         String    @id @default(cuid())
  name       String
  email      String
  positionId String
  status     String    @default("pending")
  resumeUrl  String?
  createdBy  String
  createdAt  DateTime  @default(now())

  // Relations
  position Position   @relation(fields: [positionId], references: [id])
  creator  Profile    @relation(fields: [createdBy], references: [id])
  interviews Interview[]

  @@map("candidates")
}

model Quiz {
  id         String     @id @default(cuid())
  title      String
  positionId String
  questions  Json
  timeLimit  Int?
  createdBy  String
  createdAt  DateTime   @default(now())

  // Relations
  position  Position    @relation(fields: [positionId], references: [id])
  creator   Profile     @relation(fields: [createdBy], references: [id])
  interviews Interview[]

  @@map("quizzes")
}

model Interview {
  id           String    @id @default(cuid())
  candidateId  String
  quizId       String
  status       String    @default("pending")
  startedAt    DateTime?
  completedAt  DateTime?
  score        Float?
  answers      Json?
  token        String    @unique
  createdAt    DateTime  @default(now())

  // Relations
  candidate Candidate @relation(fields: [candidateId], references: [id])
  quiz      Quiz      @relation(fields: [quizId], references: [id])

  @@map("interviews")
}
```

### 2.3 Generate Migration

```bash
npx prisma migrate dev --name init
```

### 2.4 Migrate Data

Create a migration script to copy data from Supabase to Neon:

```typescript
// scripts/migrate-data.ts
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);
const prisma = new PrismaClient();

async function migrateData() {
  // Migrate profiles
  const { data: profiles } = await supabase.from("profiles").select("*");
  for (const profile of profiles || []) {
    await prisma.profile.create({ data: profile });
  }

  // Migrate positions, candidates, quizzes, interviews...
  // (implement for each table)
}

migrateData();
```

## Phase 3: Authentication Migration

### 3.1 Setup Better Auth

Create `lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { nextjs } from "better-auth/nextjs";

export const auth = betterAuth({
  database: {
    type: "postgresql",
    url: process.env.DATABASE_URL!,
  },
  socialProviders: {
    // Configure providers as needed
  },
  plugins: [nextjs()],
});
```

### 3.2 Create Auth API Route

Create `app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/nextjs";

export const { GET, POST } = toNextJsHandler(auth);
```

### 3.3 Update Profile Creation

Replace Supabase triggers with Better Auth hooks or manual profile creation.

## Phase 4: Update Application Code

### 4.1 Replace Supabase Client

Create `lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 4.2 Update Server Actions

Replace Supabase queries with Prisma. Example:

```typescript
// Before
const { data: positions } = await supabase
  .from("positions")
  .select("*")
  .eq("created_by", userId);

// After
const positions = await prisma.position.findMany({
  where: { createdBy: userId },
});
```

### 4.3 Update Authentication Checks

Replace `supabase.auth.getUser()` with Better Auth session:

```typescript
// Before
const {
  data: { user },
} = await supabase.auth.getUser();

// After
const session = await auth.api.getSession({ req });
const user = session?.user;
```

## Phase 5: Testing and Validation

### 5.1 Run Tests

Ensure all existing functionality works:

```bash
# Test positions CRUD
# Test candidates management
# Test quiz creation
# Test interview flow
```

### 5.2 Validate Data Integrity

Check that all data migrated correctly and relationships are maintained.

### 5.3 Performance Testing

Verify query performance meets requirements.

## Phase 6: Cleanup

### 6.1 Remove Supabase Dependencies

```bash
pnpm remove @supabase/supabase-js
```

### 6.2 Update Environment Variables

Remove Supabase variables, keep Neon and Better Auth configs.

### 6.3 Deploy

Deploy with new infrastructure.

## Rollback Plan

If issues arise, keep Supabase credentials and switch back by:

1. Reinstall @supabase/supabase-js
2. Restore Supabase environment variables
3. Temporarily disable Prisma code paths

## Troubleshooting

- **Connection issues**: Verify Neon connection string format
- **Migration errors**: Check data types and constraints
- **Auth failures**: Ensure Better Auth configuration is correct
- **Performance**: Add indexes as needed in Prisma schema
