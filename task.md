# Evaluation Feature Implementation

## Overview

Add Evaluation entity for AI-generated evaluations on:

- **Interview evaluations** — based on quiz results (title = quiz name)
- **Candidate evaluations** — based on resume PDF parsing (title = position name)

Both support manual notes. A candidate can have multiple evaluations for different positions.

---

## Tasks

### 1. Prisma Schema

- [ ] Add `Evaluation` model with polymorphic relations (`interviewId?`, `candidateId?`)
- [ ] Add `title`, `aiEvaluation` (JSON), `notes`, `positionId` fields
- [ ] Add inverse relations to `Interview`, `Candidate`, `User`
- [ ] Run migration

### 2. Data Layer

- [ ] Create `lib/data/evaluations.ts` with cached queries
- [ ] `getEvaluationByInterviewId(interviewId)`
- [ ] `getEvaluationsByCandidateId(candidateId)`
- [ ] `getEvaluationById(id)`

### 3. Server Actions

- [ ] Create `lib/actions/evaluations.ts`
- [ ] `createInterviewEvaluation(interviewId)` — generate AI evaluation from quiz answers
- [ ] `createCandidateEvaluation(candidateId, positionId)` — generate AI evaluation from resume
- [ ] `updateEvaluationNotes(id, notes)` — update manual notes
- [ ] `deleteEvaluation(id)`

### 4. AI Service Extension

- [ ] Add PDF parsing utility for resume URLs
- [ ] Add `generateCandidateEvaluation(resumeText, position)` in ai-service.ts
- [ ] Reuse existing `OverallEvaluation` schema structure

### 5. Routes

- [ ] `app/dashboard/interviews/[id]/evaluation/page.tsx` — view/generate interview evaluation
- [ ] `app/dashboard/candidates/[id]/evaluations/page.tsx` — list/generate candidate evaluations

### 6. UI Components

- [ ] Update `OverallEvaluationCard` to support editable notes
- [ ] Create evaluation list component for candidates
- [ ] Create "Generate Evaluation" button/form

### 7. Navigation

- [ ] Add "View Evaluation" link in interview detail page
- [ ] Add "Evaluations" link in candidate detail page

---

## Progress Log

- [x] Task 1: Prisma Schema — DONE
- [x] Task 2: Data Layer — DONE
- [x] Task 3: Server Actions — DONE
- [x] Task 4: AI Service — DONE
- [x] Task 5: Routes — DONE
- [x] Task 6: UI Components — DONE
- [x] Task 7: Navigation — DONE

## Summary

### Files Created/Modified

**Prisma Schema** (`prisma/schema.prisma`):

- Added `Evaluation` model with: `title`, `evaluation`, `strengths`, `weaknesses`, `recommendation`, `fitScore`, `notes`
- Polymorphic relations: `interviewId` (unique, 1:1), `candidateId` (many per candidate)
- Added `positionId` for tracking which position the evaluation is for
- Added inverse relations to `User`, `Interview`, `Candidate`, `Position`

**Data Layer** (`lib/data/evaluations.ts`):

- `getEvaluationByInterviewId(interviewId)` — cached query for interview evaluation
- `getEvaluationsByCandidateId(candidateId)` — cached query for all candidate evaluations
- `getEvaluationById(id)` — cached query for single evaluation
- `hasEvaluationForPosition(candidateId, positionId)` — check if evaluation exists
- `getEvaluationStats()` — dashboard stats

**Server Actions** (`lib/actions/evaluation-entity.ts`):

- `createInterviewEvaluation(interviewId, aiEvaluation)` — save interview quiz evaluation
- `createCandidateEvaluation(candidateId, positionId)` — generate + save resume evaluation
- `updateEvaluationNotes(id, notes)` — update manual notes
- `deleteEvaluation(id)` — delete evaluation
- PDF parsing via `pdf-parse` package for resume text extraction
- AI evaluation generation using Groq

**Routes**:

- `app/dashboard/interviews/[id]/evaluation/page.tsx` — view/generate interview evaluation
- `app/dashboard/interviews/[id]/evaluation/evaluation-view.tsx` — client component
- `app/dashboard/candidates/[id]/evaluations/page.tsx` — list/generate candidate evaluations
- `app/dashboard/candidates/[id]/evaluations/evaluations-view.tsx` — client component

**Navigation**:

- Added "Valutazione" button on interview detail page (when status=completed)
- Added "Valutazioni" button on candidate detail page

**Dependencies**:

- Added `pdf-parse` package for PDF text extraction
