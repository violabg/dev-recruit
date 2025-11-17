---
description: "Task list template for feature implementation"
---

# Tasks: Backend Migration to Prisma + Neon + Better Auth

> **Current Phase:** Phase 8 - Polish & Cross-Cutting Concerns

**Input**: Design documents from `/specs/001-backend-migration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: None requested - migration focuses on maintaining existing functionality

**Organization**: Tasks are grouped by migration phase to enable independent implementation and testing of each component.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which migration phase this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: Existing Next.js structure in root
- **Database**: Prisma schema in prisma/schema.prisma
- **Auth**: Better Auth in lib/auth.ts
- **Actions**: Server actions in lib/actions/
- **API**: API routes in app/api/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [ ] T001 Install Prisma and Better Auth dependencies
- [ ] T002 [P] Setup Neon database account and connection
- [ ] T003 Initialize Prisma in project root
- [ ] T004 Configure environment variables for Neon and Better Auth

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database migration and schema setup that MUST be complete before ANY migration phase

**⚠️ CRITICAL**: No migration work can begin until this phase is complete

- [ ] T005 Export current Supabase schema to SQL file
- [ ] T006 Convert Supabase schema to Prisma schema format
- [ ] T007 Create initial Prisma migration
- [ ] T008 Setup Prisma client in lib/db.ts
- [ ] T009 Test Neon database connection

**Checkpoint**: Database foundation ready - migration phases can now begin

---

## Phase 3: User Story 1 - Auth Migration (Priority: P1) 🎯 MVP

**Goal**: Replace Supabase authentication with Better Auth while maintaining user sessions

**Independent Test**: Login/signup flows work with new auth system

### Implementation for User Story 1

- [ ] T010 Setup Better Auth configuration in lib/auth.ts
- [ ] T011 Create Better Auth API route at app/api/auth/[...all]/route.ts
- [ ] T012 Update authentication checks in lib/actions/profile.ts
- [ ] T013 Update authentication checks in lib/actions/positions.ts
- [ ] T014 Update authentication checks in lib/actions/candidates.ts
- [ ] T015 Update authentication checks in lib/actions/quizzes.ts
- [ ] T016 Update authentication checks in lib/actions/interviews.ts
- [ ] T017 Update auth check in app/api/quiz/save/route.ts

**Checkpoint**: Authentication fully migrated - users can login/signup with Better Auth

---

## Phase 4: User Story 2 - Positions Migration (Priority: P1)

**Goal**: Migrate positions CRUD operations from Supabase to Prisma

**Independent Test**: Create, read, update, delete positions works with Prisma

### Implementation for User Story 2

- [x] T018 Replace Supabase queries with Prisma in lib/actions/positions.ts
- [x] T019 Update position creation logic for Prisma
- [x] T020 Update position retrieval logic for Prisma
- [x] T021 Update position update logic for Prisma
- [x] T022 Update position deletion logic for Prisma
- [ ] T023 Test positions CRUD operations

**Checkpoint**: Positions fully migrated - all position operations use Prisma

---

## Phase 5: User Story 3 - Candidates Migration (Priority: P2)

**Goal**: Migrate candidates operations from Supabase to Prisma

**Independent Test**: Create, read, update, delete candidates works with Prisma

### Implementation for User Story 3

- [x] T024 Replace Supabase queries with Prisma in lib/actions/candidates.ts
- [x] T025 Update candidate creation logic for Prisma
- [x] T026 Update candidate retrieval logic for Prisma
- [x] T027 Update candidate update logic for Prisma
- [x] T028 Update candidate deletion logic for Prisma
- [ ] T029 Test candidates CRUD operations

**Checkpoint**: Candidates fully migrated - all candidate operations use Prisma

---

## Phase 6: User Story 4 - Quizzes Migration (Priority: P2)

**Goal**: Migrate quizzes operations from Supabase to Prisma

**Independent Test**: Create, read, update, delete quizzes works with Prisma

### Implementation for User Story 4

- [x] T030 Replace Supabase queries with Prisma in lib/actions/quizzes.ts
- [x] T031 Update quiz creation logic for Prisma
- [x] T032 Update quiz retrieval logic for Prisma
- [x] T033 Update quiz update logic for Prisma
- [x] T034 Update quiz deletion logic for Prisma
- [x] T035 Update quiz save API route at app/api/quiz/save/route.ts
- [ ] T036 Test quizzes CRUD operations

**Checkpoint**: Quizzes fully migrated - all quiz operations use Prisma

---

## Phase 7: User Story 5 - Interviews Migration (Priority: P2)

**Status:** Completed

**Goal**: Migrate interviews operations from Supabase to Prisma

**Independent Test**: Create, read, update interviews and token access works with Prisma

### Implementation for User Story 5

- [x] T037 Replace Supabase queries with Prisma in lib/actions/interviews.ts
- [x] T038 Update interview creation logic for Prisma
- [x] T039 Update interview retrieval logic for Prisma
- [x] T040 Update interview update logic for Prisma
- [x] T041 Update interview deletion logic for Prisma
- [x] T042 Migrate database functions to Prisma/raw SQL
- [x] T043 Test interviews operations and token access

**Checkpoint**: Interviews fully migrated - all interview operations use Prisma

---

## Phase 8: Polish & Cross-Cutting Concerns

**Status:** In progress

**Purpose**: Final cleanup and validation

- [x] T044 Remove Supabase dependencies from package.json
- [x] T045 Update environment variables (remove Supabase, keep Neon/Better Auth)
- [ ] T046 Run full application test suite
- [ ] T047 Validate data integrity across all entities
- [x] T048 Update documentation and README
- [x] T049 Remove Supabase-related code and files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all migration phases
- **Migration Phases (Phase 3-7)**: All depend on Foundational phase completion
  - Auth migration first (P1), then positions (P1), then others (P2)
  - Can proceed sequentially or in parallel if multiple developers
- **Polish (Phase 8)**: Depends on all migration phases being complete

### User Story Dependencies

- **Auth Migration (US1, P1)**: Can start after Foundational - No dependencies
- **Positions Migration (US2, P1)**: Can start after Auth Migration - Independent
- **Candidates Migration (US3, P2)**: Can start after Foundational - Independent
- **Quizzes Migration (US4, P2)**: Can start after Foundational - Independent
- **Interviews Migration (US5, P2)**: Can start after Foundational - May depend on candidates/quizzes

### Within Each Migration Phase

- Update authentication checks first
- Then replace database queries
- Test operations after each change
- Commit after each logical group

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks can run in parallel (within Phase 2)
- Once Foundational completes, migration phases can run in parallel
- Within each phase, action updates can run in parallel
- Different migration phases can be worked on by different developers

---

## Parallel Example: Auth Migration

```bash
# Update all action files in parallel:
Task: "Update authentication checks in lib/actions/profile.ts"
Task: "Update authentication checks in lib/actions/positions.ts"
Task: "Update authentication checks in lib/actions/candidates.ts"
Task: "Update authentication checks in lib/actions/quizzes.ts"
Task: "Update authentication checks in lib/actions/interviews.ts"
```

---

## Implementation Strategy

### MVP First (Auth + Positions Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all migrations)
3. Complete Phase 3: Auth Migration
4. Complete Phase 4: Positions Migration
5. **STOP and VALIDATE**: Test auth and positions independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Database ready
2. Add Auth Migration → Test login/signup → Deploy/Demo (MVP!)
3. Add Positions Migration → Test CRUD → Deploy/Demo
4. Add Candidates Migration → Test CRUD → Deploy/Demo
5. Add Quizzes Migration → Test CRUD → Deploy/Demo
6. Add Interviews Migration → Test operations → Deploy/Demo
7. Each migration adds functionality without breaking previous

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: Auth Migration
   - Developer B: Positions Migration
   - Developer C: Candidates + Quizzes Migration
   - Developer D: Interviews Migration
3. Migrations complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific migration phase for traceability
- Each migration phase should be independently completable and testable
- Keep Supabase as fallback during migration
- Commit after each task or logical group
- Stop at any checkpoint to validate phase independently
- Avoid: breaking existing functionality, data loss, auth failures
