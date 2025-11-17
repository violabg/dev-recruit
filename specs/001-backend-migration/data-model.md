# Data Model: Backend Migration

## Overview

The data model consists of 5 main entities: Users (Profiles), Positions, Candidates, Quizzes, and Interviews. All entities use UUID primary keys and maintain referential integrity.

## Entity: Profile (User)

**Purpose**: Extended user information linked to Supabase auth users.

**Fields**:

- `id` (UUID, Primary Key): References auth.users.id
- `name` (Text): User's name
- `full_name` (Text): Full display name
- `user_name` (Text): Username
- `avatar_url` (Text): Profile picture URL
- `created_at` (Timestamp): Creation timestamp
- `updated_at` (Timestamp): Last update timestamp

**Relationships**:

- One-to-many with Positions (created_by)
- One-to-many with Candidates (created_by)
- One-to-many with Quizzes (created_by)

**Validation Rules**:

- All text fields optional except id
- Timestamps auto-generated

## Entity: Position

**Purpose**: Job positions that require assessment.

**Fields**:

- `id` (UUID, Primary Key): Auto-generated
- `title` (Text, Required): Position title
- `description` (Text): Detailed job description
- `experience_level` (Text, Required): Seniority level
- `skills` (Text[], Required): Required technical skills
- `soft_skills` (Text[]): Required soft skills
- `contract_type` (Text): Employment type
- `created_by` (UUID, Required): References profiles.id
- `created_at` (Timestamp): Creation timestamp

**Relationships**:

- Many-to-one with Profile (created_by)
- One-to-many with Candidates (position_id)
- One-to-many with Quizzes (position_id)

**Validation Rules**:

- Title and experience_level required
- Skills array cannot be empty
- Created_by must reference valid profile

## Entity: Candidate

**Purpose**: Job applicants to be assessed.

**Fields**:

- `id` (UUID, Primary Key): Auto-generated
- `name` (Text, Required): Candidate's name
- `email` (Text, Required): Contact email
- `position_id` (UUID, Required): References positions.id
- `status` (Text, Required): Application status (default: 'pending')
- `resume_url` (Text): Resume document URL
- `created_by` (UUID, Required): References profiles.id
- `created_at` (Timestamp): Creation timestamp

**Relationships**:

- Many-to-one with Position (position_id)
- Many-to-one with Profile (created_by)
- One-to-many with Interviews (candidate_id)

**Validation Rules**:

- Name and email required
- Email format validation
- Status must be valid enum value

## Entity: Quiz

**Purpose**: Assessment tests for positions.

**Fields**:

- `id` (UUID, Primary Key): Auto-generated
- `title` (Text, Required): Quiz title
- `position_id` (UUID, Required): References positions.id
- `questions` (JSONB, Required): Quiz questions and answers
- `time_limit` (Integer): Time limit in minutes
- `created_by` (UUID, Required): References profiles.id
- `created_at` (Timestamp): Creation timestamp

**Relationships**:

- Many-to-one with Position (position_id)
- Many-to-one with Profile (created_by)
- One-to-many with Interviews (quiz_id)

**Validation Rules**:

- Title required
- Questions must be valid JSON structure
- Time_limit optional but must be positive if provided

## Entity: Interview

**Purpose**: Assessment sessions linking candidates to quizzes.

**Fields**:

- `id` (UUID, Primary Key): Auto-generated
- `candidate_id` (UUID, Required): References candidates.id
- `quiz_id` (UUID, Required): References quizzes.id
- `status` (Text, Required): Interview status (default: 'pending')
- `started_at` (Timestamp): When interview began
- `completed_at` (Timestamp): When interview finished
- `score` (Float): Final score (0-100)
- `answers` (JSONB): Candidate's answers
- `token` (Text, Required, Unique): Access token for interview
- `created_at` (Timestamp): Creation timestamp

**Relationships**:

- Many-to-one with Candidate (candidate_id)
- Many-to-one with Quiz (quiz_id)

**Validation Rules**:

- Token auto-generated and unique
- Score must be 0-100 if provided
- Status must be valid enum value
- Started/completed timestamps must be logical

## Database Functions

**count_quizzes_by_position()**: Returns quiz counts per position
**generate_unique_token()**: Creates unique interview tokens
**count_candidates_by_status(user_id)**: Returns candidate status counts
**get_candidates_for_quiz_assignment(quiz_id, user_id)**: Returns assignable candidates
**search_interviews(user_id, filters)**: Advanced interview search
**get_candidate_quiz_data(candidate_id, user_id)**: Candidate quiz assignment data

## Migration Considerations

- Maintain all existing data relationships
- Preserve RLS policies in new system
- Convert Supabase auth triggers to Prisma/Better Auth equivalents
- Ensure all functions are migrated or recreated
- Validate data integrity post-migration
