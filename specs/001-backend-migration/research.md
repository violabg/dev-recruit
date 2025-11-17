# Research: Backend Migration to Prisma + Neon + Better Auth

## Decision: Use Prisma ORM with Neon Database

**Rationale**: Prisma provides type-safe database access with excellent Next.js integration. Neon offers serverless PostgreSQL with good performance and scalability. Together they provide a modern, maintainable alternative to Supabase.

**Alternatives considered**:

- Direct PostgreSQL client: Too low-level, requires manual query building
- Drizzle ORM: Good alternative but Prisma has more mature ecosystem
- PlanetScale: MySQL-based, not PostgreSQL

## Decision: Use Better Auth for Authentication

**Rationale**: Better Auth provides modern authentication with excellent Next.js support, including server actions compatibility. It supports multiple providers and has good security defaults.

**Alternatives considered**:

- NextAuth.js: Mature but more complex configuration
- Clerk: SaaS solution, higher cost
- Custom JWT: Too much development overhead

## Decision: Phased Migration Approach

**Rationale**: To keep the app functional during development, migrate incrementally: auth first, then each entity group, maintaining Supabase fallback until complete.

**Migration Phases**:

1. Auth: Replace Supabase auth with Better Auth
2. Positions: Migrate positions CRUD to Prisma
3. Candidates: Migrate candidates operations
4. Quizzes: Migrate quiz generation and management
5. Remaining entities: Interviews, etc.

**Alternatives considered**: Big bang migration - too risky, app would be broken for extended period.

## Decision: Database Schema Migration Strategy

**Rationale**: Use Prisma's migration system to generate schema from existing Supabase schema. Maintain data integrity with careful migration scripts.

**Steps**:

- Export current Supabase schema
- Convert to Prisma schema format
- Generate initial migration
- Test data migration in development

## Decision: API Migration Strategy

**Rationale**: Gradually replace Supabase client calls with Prisma client calls in server actions and API routes. Use feature flags or environment variables to switch between implementations.

**Implementation**:

- Create new Prisma-based service functions alongside existing Supabase ones
- Update components to use new services
- Remove old Supabase code after verification

## Decision: Environment and Configuration

**Rationale**: Use environment variables for Neon connection and Better Auth configuration. Maintain backward compatibility with Supabase during transition.

**Configuration**:

- DATABASE_URL: Neon connection string
- BETTER_AUTH_SECRET: Auth secret
- SUPABASE_URL/KEY: Keep for fallback during migration
