# Feature Specification: Backend Migration to Prisma + Neon + Better Auth

**Feature Branch**: `001-backend-migration`  
**Created**: 2025-11-14  
**Status**: Draft  
**Input**: User description: "migra da supabase a prisma + neon, usa better-auth per autenticazione, le funzionalità devono rimanere le stesse quindi mantiene lo schema del db e migra le query, assicurati di non rompere nessuna funzionalità"

## User Scenarios _(mandatory)_

### User Story 1 - User Authentication (Priority: P1)

Users can log in, sign up, and manage their accounts using the new Better Auth system.

**Why this priority**: Authentication is fundamental to all other features.

**Independent Test**: Can be tested by attempting login/signup flows and verifying access to protected routes.

**Acceptance Scenarios**:

1. **Given** a user has an account, **When** they enter valid credentials, **Then** they are logged in successfully.
2. **Given** a new user, **When** they sign up with valid details, **Then** an account is created and they are logged in.

---

### User Story 2 - Database Operations (Priority: P1)

All database queries and operations work seamlessly with Prisma and Neon.

**Why this priority**: Database is core to data persistence and retrieval.

**Independent Test**: Can be tested by performing CRUD operations on key entities like positions, candidates, interviews.

**Acceptance Scenarios**:

1. **Given** existing data in Supabase, **When** migrated to Neon, **Then** all data is preserved and accessible.
2. **Given** a new record, **When** created via Prisma, **Then** it persists correctly in Neon.

---

### User Story 3 - Interview Management (Priority: P2)

Admins can create and manage interviews, candidates can participate.

**Why this priority**: Core business functionality.

**Independent Test**: Can be tested by creating an interview and having a candidate complete it.

**Acceptance Scenarios**:

1. **Given** an admin, **When** they create an interview, **Then** it is stored and accessible.
2. **Given** a candidate, **When** they access an interview link, **Then** they can participate if authenticated.

---

### Edge Cases

- What happens when migration encounters schema incompatibilities?
- How does system handle authentication failures during transition?
- What if Neon connection fails?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST migrate the database schema from Supabase to Prisma with Neon without data loss.
- **FR-002**: System MUST replace Supabase authentication with Better Auth, maintaining user sessions.
- **FR-003**: System MUST migrate all database queries from Supabase client to Prisma client.
- **FR-004**: System MUST ensure all existing functionalities (dashboard, interviews, quizzes) work without changes.
- **FR-005**: System MUST handle authentication state transitions seamlessly.

### Key Entities _(include if feature involves data)_

- **User**: Represents authenticated users, with attributes like email, name, role.
- **Position**: Job positions, with attributes like title, description, requirements.
- **Candidate**: Applicants, with attributes like name, email, resume.
- **Interview**: Assessment sessions, with attributes like candidate_id, position_id, status.
- **Quiz**: Generated questions, with attributes like content, answers.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All existing user accounts can log in successfully after migration.
- **SC-002**: 100% of existing data is migrated without loss.
- **SC-003**: All interview and quiz functionalities complete successfully.
- **SC-004**: No functionality breaks reported in testing.
