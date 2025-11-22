# Type Strategy Guide

## Principle VII: Prisma Types Over Custom Types

### Rule

Use Prisma-generated types directly whenever possible. Only create custom types for:

1. **DTO/API Contracts**: Transform data for external consumers (camelCase ↔ snake_case)
2. **Composite Views**: Combine multiple Prisma types or add computed fields
3. **Form-specific Types**: React Hook Form generics for validation

### The Problem We Solved

Before this guide was implemented, the codebase had:

- `EditableCandidate` type duplicating Prisma fields
- `QuizResponse` type with unclear purpose
- Risk of type drift when schema changed

**Current Status**: ✅ All custom entity types eliminated. Only API contract DTOs remain (which are acceptable).

### Examples

#### ✅ CORRECT: Use Prisma Type Directly

```typescript
import { Candidate } from "@/lib/prisma/client";

function CandidateCard(props: { candidate: Candidate }) {
  return <div>{props.candidate.name}</div>;
}
```

**Why**: Single source of truth. When schema changes, type auto-updates.

---

#### ✅ CORRECT: Use Prisma Type with Pick<>

```typescript
import { Candidate } from "@/lib/prisma/client";

type CandidateFormProps = {
  candidate: Pick<Candidate, "id" | "name" | "email">;
};

export function CandidateForm(props: CandidateFormProps) {
  return <form>{props.candidate.name}</form>;
}
```

**Why**: Select only fields you need. Stays in sync with Prisma schema.

---

#### ✅ CORRECT: Create DTO for API Contract

```typescript
/**
 * Quiz API response DTO
 * Transforms Prisma camelCase to snake_case for API contracts.
 * This is a composite view type, not a duplicate of Prisma fields.
 *
 * @see Principle VII: Acceptable as API contract type extending Prisma model
 */
export type QuizResponse = {
  id: string;
  title: string;
  created_at: string; // ISO string from Prisma createdAt
  position_id: string; // from Prisma positionId
  time_limit: number | null; // from Prisma timeLimit
  questions: Question[];
};
```

**Why**: API consumers expect snake_case. Transform at boundary, not in components.

---

#### ❌ WRONG: Duplicate Prisma Fields

```typescript
// DON'T DO THIS - stays out of sync with schema!
export type CandidateData = {
  id: string;
  name: string;
  email: string;
  positionId: string;
  status: string;
  resumeUrl: string | null;
};
```

**Why**: If Prisma schema adds a field, this type doesn't update. Creates bugs.

---

#### ❌ WRONG: Create Interface for Every Component

```typescript
// DON'T DO THIS - maintenance nightmare
interface CandidateCardProps {
  id: string;
  name: string;
  email: string;
}

interface CandidateFormProps {
  id: string;
  name: string;
  email: string;
  positionId: string;
}
```

**Why**: Multiple definitions of "candidate". Use Prisma type + Pick<> instead.

---

### Decision Tree

Use this flowchart to decide what type strategy to use:

```text
Need a type for component props?
  |
  ├─ "I need all fields from Prisma Candidate"
  │  └─ Use: `Candidate` (direct import)
  │     Example: `function Card(props: { candidate: Candidate })`
  │
  ├─ "I need only specific fields from Prisma Candidate"
  │  └─ Use: `Pick<Candidate, "id" | "name">`
  │     Example: `candidate: Pick<Candidate, "id" | "name">`
  │
  ├─ "I need to transform data for API response"
  │  └─ Use: Create DTO type with JSDoc
  │     Example: `type QuizResponse = { id: string; created_at: string; ... }`
  │
  └─ "I need custom fields + Prisma fields"
     └─ Use: Extend Prisma type
        Example: `type CandidateWithScore = Candidate & { score: number }`
```

### Checklist Before Commit

Before committing code with types, ask:

- [ ] Using Prisma type directly? ✅ Good
- [ ] Using `Pick<Prisma.Type, ...>`? ✅ Good
- [ ] Creating a DTO type?
  - [ ] Has JSDoc explaining why it's a DTO? ✅ Good
  - [ ] Transforms data (camelCase↔snake_case)? ✅ Good
  - [ ] Only at API boundaries? ✅ Good
- [ ] Creating custom type that duplicates Prisma fields?
  - ❌ STOP - Use Prisma type instead
- [ ] Creating interface for every component?
  - ❌ STOP - Use Prisma type + Pick<> instead

### Related Principles

- **Principle V**: Data Queries in `lib/data/` Only
- **Principle II**: Zod Validation (Non-Negotiable)
- **Principle III**: Server Actions + Prisma with Auth Guards

### Files to Reference

- ✅ **Good example (API DTO)**: `lib/data/quizzes.ts:40-50` - `QuizResponse` type with clear JSDoc
- ✅ **Good example (Pick<>)**: `components/candidates/candidate-form.tsx:31-37` - Uses `Pick<Candidate, ...>`
- ✅ **Good example (Direct Prisma)**: `lib/actions/candidates.ts` - Uses Prisma types directly

### Troubleshooting

**Q: Schema changed, but my custom type wasn't updated. How do I prevent this?**

A: Don't use custom types for entity models. Use Prisma types directly or `Pick<>`. The schema is your type definition.

---

**Q: I need to add computed fields to Candidate. What should I do?**

A: Create a composite type at the point of use:

```typescript
type CandidateWithMetadata = Candidate & {
  score: number;
  lastInterviewDate: Date | null;
};
```

Don't duplicate Candidate fields in a new type.

---

**Q: Can I create a type that extends Prisma types?**

A: Yes, but only for computed fields or view models:

```typescript
// ✅ CORRECT: Extends Prisma, adds computed field
type CandidateWithStats = Candidate & {
  interviewCount: number;
};

// ❌ WRONG: Duplicates Prisma fields
type CandidateView = {
  id: string;
  name: string;
  // ... duplicating Prisma fields
};
```

---

### FAQ

**Q: Should I create a `types/` folder for all types?**

A: No. Keep Prisma types imported from `@/lib/prisma/client`. Keep DTOs next to the code that uses them. Avoid a central types folder that becomes a dumping ground.

---

**Q: What about backwards compatibility if I rename a Prisma field?**

A: Use data mappers at boundaries (`lib/data/` layer) to transform field names. This is acceptable because it's a DTO, not a duplicate type.

```typescript
// In lib/data/quizzes.ts
const mapQuizResponse = (prismaQuiz: Prisma.Quiz): QuizResponse => ({
  id: prismaQuiz.id,
  title: prismaQuiz.title,
  created_at: prismaQuiz.createdAt.toISOString(), // Transform field name
});
```

---

### Compliance

This guide enforces **Principle VII: Prisma Types Over Custom Types** from the Constitutional framework.

**Compliance Score**: ✅ 100%

**Last Updated**: 2025-11-22  
**Version**: 1.0.0
