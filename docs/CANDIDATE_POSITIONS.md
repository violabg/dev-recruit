# Candidate-Position Many-to-Many Relationship

## Overview

Candidates can now be associated with multiple positions, allowing for more flexible talent management. This document describes the implementation details, data model, and usage patterns.

## Data Model

### Schema Changes

The relationship between `Candidate` and `Position` has been refactored from one-to-many to many-to-many using a join table:

```prisma
model Candidate {
  id          String    @id @default(cuid())
  firstName   String
  lastName    String
  email       String
  dateOfBirth DateTime?
  status      String    @default("pending")
  resumeUrl   String?
  createdBy   String
  createdAt   DateTime  @default(now())

  positions          CandidatePosition[]  // Many-to-many via join table
  creator            User                 @relation("UserCandidates", fields: [createdBy], references: [id], onDelete: Cascade)
  interviews         Interview[]
  evaluations        Evaluation[]

  @@map("candidates")
}

model CandidatePosition {
  id          String   @id @default(cuid())
  candidateId String
  positionId  String
  isPrimary   Boolean  @default(false) // Flag to mark the primary position
  createdAt   DateTime @default(now())

  candidate Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  position  Position  @relation(fields: [positionId], references: [id], onDelete: Cascade)

  @@unique([candidateId, positionId])
  @@index([candidateId])
  @@index([positionId])
  @@map("candidate_positions")
}

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

  creator            User                @relation("UserPositions", fields: [createdBy], references: [id], onDelete: Cascade)
  candidatePositions CandidatePosition[] // Many-to-many via join table
  quizzes            Quiz[]
  evaluations        Evaluation[]

  @@map("positions")
}
```

### Key Features

- **Join Table**: `CandidatePosition` manages the many-to-many relationship
- **Primary Position**: The `isPrimary` flag identifies the main position for each candidate (first position added is primary by default)
- **Cascade Deletion**: Removing a candidate or position automatically removes associated join table records
- **Unique Constraint**: A candidate can only be associated with a position once
- **Indexed**: Both `candidateId` and `positionId` are indexed for query performance

## UI Components

### Candidate Form

The candidate form now uses `MultiSelectField` for position selection:

```tsx
<MultiSelectField
  control={form.control}
  name="positionIds"
  label="Posizioni"
  required
  placeholder="Seleziona una o più posizioni"
  options={positions.map((position) => ({
    value: position.id,
    label: position.title,
  }))}
/>
```

**Features:**

- Select 1-10 positions per candidate
- Multi-select dropdown with checkboxes
- Clear visual feedback for selected positions
- Validation enforces at least one position

### Display Components

#### Candidate Table

Shows all positions with primary badge:

```tsx
{
  candidate.positions.map((cp) => (
    <div key={cp.id}>
      <div className="flex items-center gap-1">
        <span>{cp.position.title}</span>
        {cp.isPrimary && (
          <span className="bg-primary/10 px-1.5 py-0.5 rounded text-primary text-xs">
            Primaria
          </span>
        )}
      </div>
      {cp.position.experienceLevel && (
        <span className="text-muted-foreground text-xs">
          {cp.position.experienceLevel}
        </span>
      )}
    </div>
  ));
}
```

#### Candidate Grid

Same layout as table, adapted for card format with compact vertical stacking.

#### Candidate Details

Shows all positions with primary indicator in the details card.

## Server Actions

### Create Candidate

```typescript
export async function createCandidate(formData: FormData) {
  const positionIdsRaw = readFormValue(formData, "positionIds");
  const payload = candidateFormSchema.parse({
    firstName: readFormValue(formData, "firstName"),
    lastName: readFormValue(formData, "lastName"),
    email: readFormValue(formData, "email"),
    positionIds: positionIdsRaw ? JSON.parse(positionIdsRaw) : [],
    dateOfBirth: dateOfBirthRaw ? new Date(dateOfBirthRaw) : undefined,
  });

  // Validate all positions exist
  const positions = await prisma.position.findMany({
    where: { id: { in: payload.positionIds } },
    select: { id: true },
  });

  if (positions.length !== payload.positionIds.length) {
    throw new Error("Una o più posizioni selezionate non sono valide");
  }

  // Create candidate with position relationships
  const candidate = await prisma.candidate.create({
    data: {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email.trim(),
      dateOfBirth: payload.dateOfBirth ?? null,
      status: "pending",
      createdBy: user.id,
      positions: {
        create: payload.positionIds.map((positionId, index) => ({
          positionId,
          isPrimary: index === 0, // First position is primary
        })),
      },
    },
  });
}
```

### Update Candidate

```typescript
export async function updateCandidate(id: string, formData: FormData) {
  if (payload.positionIds) {
    // Validate all positions exist
    const positions = await prisma.position.findMany({
      where: { id: { in: payload.positionIds } },
      select: { id: true },
    });

    if (positions.length !== payload.positionIds.length) {
      throw new Error("Una o più posizioni selezionate non sono valide");
    }

    // Delete existing position relationships and create new ones
    updateData.positions = {
      deleteMany: {},
      create: payload.positionIds.map((positionId, index) => ({
        positionId,
        isPrimary: index === 0, // First position is primary
      })),
    };
  }
}
```

## Data Queries

### Candidate Queries with Positions

```typescript
const CANDIDATE_INCLUDE = {
  positions: {
    include: {
      position: {
        select: {
          id: true,
          title: true,
          experienceLevel: true,
        },
      },
    },
    orderBy: {
      isPrimary: "desc" as const, // Primary position first
    },
  },
  interviews: {
    select: {
      id: true,
      status: true,
      score: true,
      createdAt: true,
    },
  },
} as const;
```

### Filter Candidates by Position

```typescript
const buildCandidateWhere = ({ positionId }): Prisma.CandidateWhereInput => {
  const where: Prisma.CandidateWhereInput = {};

  if (positionId !== "all") {
    where.positions = {
      some: {
        positionId: positionId,
      },
    };
  }

  return where;
};
```

## Cache Invalidation

The cache utilities have been updated to support multiple positions:

```typescript
export function invalidateCandidateCache(options?: {
  candidateId?: string;
  positionId?: string;
  positionIds?: string[];
}) {
  updateTag(CacheTags.CANDIDATES);

  if (options?.candidateId) {
    updateTag(entityTag.candidate(options.candidateId));
    revalidatePath(`/dashboard/candidates/${options.candidateId}`);
  }

  if (options?.positionId) {
    updateTag(entityTag.position(options.positionId));
    revalidatePath(`/dashboard/positions/${options.positionId}`);
  }

  if (options?.positionIds) {
    for (const positionId of options.positionIds) {
      updateTag(entityTag.position(positionId));
      revalidatePath(`/dashboard/positions/${positionId}`);
    }
  }

  revalidatePath("/dashboard/candidates");
}
```

## Validation Schemas

### Candidate Form Schema

```typescript
export const candidateFormSchema = z.object({
  firstName: baseSchemas.name,
  lastName: baseSchemas.name,
  email: baseSchemas.email,
  dateOfBirth: dateOfBirthSchema.optional(),
  positionIds: z
    .array(z.string())
    .min(1, {
      error: "Seleziona almeno una posizione.",
    })
    .max(10, {
      error: "Massimo 10 posizioni.",
    }),
});
```

### Candidate Update Schema

```typescript
export const candidateUpdateSchema = z
  .object({
    firstName: baseSchemas.name.optional(),
    lastName: baseSchemas.name.optional(),
    email: baseSchemas.email.optional(),
    dateOfBirth: dateOfBirthSchema.optional().nullable(),
    positionIds: z
      .array(z.string())
      .min(1, {
        error: "Seleziona almeno una posizione valida.",
      })
      .max(10, {
        error: "Massimo 10 posizioni.",
      })
      .optional(),
    status: z
      .enum(["pending", "contacted", "interviewing", "hired", "rejected"], {
        error: "Stato candidato non valido",
      })
      .optional(),
    resumeUrl: z
      .union([
        z.url({ message: "Inserisci un URL valido" }),
        z.literal(""),
        z.null(),
      ])
      .optional(),
    removeResume: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Nessun campo da aggiornare",
  });
```

## Migration Strategy

### Database Migration

For existing databases with the old schema:

1. **Create join table**: `CandidatePosition`
2. **Migrate existing data**: Copy `positionId` from `Candidate` to `CandidatePosition` (set as primary)
3. **Drop old column**: Remove `positionId` from `Candidate`
4. **Update indexes**: Add indexes to `CandidatePosition`

### Production Migration Example

```sql
-- Step 1: Create new join table
CREATE TABLE "candidate_positions" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- Step 2: Migrate existing data
INSERT INTO "candidate_positions" ("id", "candidateId", "positionId", "isPrimary", "createdAt")
SELECT
  gen_random_uuid()::text,
  c."id",
  c."positionId",
  true, -- Mark as primary
  c."createdAt"
FROM "candidates" c
WHERE c."positionId" IS NOT NULL;

-- Step 3: Add constraints and indexes
ALTER TABLE "candidate_positions" ADD CONSTRAINT "candidate_positions_candidateId_positionId_key" UNIQUE ("candidateId", "positionId");
CREATE INDEX "candidate_positions_candidateId_idx" ON "candidate_positions"("candidateId");
CREATE INDEX "candidate_positions_positionId_idx" ON "candidate_positions"("positionId");

-- Step 4: Add foreign keys
ALTER TABLE "candidate_positions" ADD CONSTRAINT "candidate_positions_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_positions" ADD CONSTRAINT "candidate_positions_positionId_fkey"
  FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Remove old column (only after verifying data migration)
ALTER TABLE "candidates" DROP COLUMN "positionId";
```

## Best Practices

1. **Always set a primary position**: The first position in the array is automatically marked as primary
2. **Validate position existence**: Always check that all position IDs exist before creating relationships
3. **Cache invalidation**: Invalidate caches for all affected positions when updating candidate positions
4. **UI consistency**: Always display the primary position first in lists and details
5. **Error handling**: Provide clear error messages when validation fails (e.g., "Una o più posizioni selezionate non sono valide")

## Testing

Key scenarios to test:

- [ ] Create candidate with single position
- [ ] Create candidate with multiple positions
- [ ] Update candidate to add/remove positions
- [ ] Update candidate to change position order (primary changes)
- [ ] Filter candidates by position (should include candidates with that position in their list)
- [ ] Delete position with associated candidates (should cascade delete join table records)
- [ ] Delete candidate with multiple positions (should cascade delete all join table records)
- [ ] Attempt to exceed 10 positions (should fail validation)
- [ ] Attempt to save with zero positions (should fail validation)
- [ ] Display primary position badge correctly in all views

## Future Enhancements

- **Position priority**: Allow manual reordering of positions beyond primary flag
- **Position history**: Track when positions were added/removed from a candidate
- **Bulk position assignment**: Assign multiple candidates to positions in one operation
- **Position-specific notes**: Add notes specific to each candidate-position relationship
- **Matching score**: Calculate and display match scores for each candidate-position pair
