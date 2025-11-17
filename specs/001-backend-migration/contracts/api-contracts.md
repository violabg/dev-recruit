# API Contracts: Backend Migration

## Overview

The application uses a combination of Next.js API routes and server actions. All contracts must be maintained during migration to ensure no breaking changes.

## API Routes

### POST /api/quiz/save

**Purpose**: Save a new quiz to the database.

**Request Body**:

```json
{
  "title": "string",
  "position_id": "uuid",
  "questions": [
    {
      "question": "string",
      "options": ["string"],
      "correct_answer": "string",
      "type": "multiple-choice|open-ended"
    }
  ],
  "time_limit": "number?"
}
```

**Response**:

```json
{
  "id": "uuid",
  "message": "Quiz saved successfully"
}
```

**Authentication**: Required (Supabase auth)

**Migration Notes**: Replace supabase client with Prisma client, maintain validation.

## Server Actions

### Positions Actions (lib/actions/positions.ts)

**createPosition**: Create new position

- Input: Position data
- Output: Created position
- Auth: Required

**getPositions**: Get user's positions

- Input: User ID
- Output: Array of positions
- Auth: Required

**updatePosition**: Update position

- Input: Position ID + updates
- Output: Updated position
- Auth: Required (owner only)

**deletePosition**: Delete position

- Input: Position ID
- Output: Success confirmation
- Auth: Required (owner only)

### Candidates Actions (lib/actions/candidates.ts)

**createCandidate**: Create new candidate

- Input: Candidate data + position_id
- Output: Created candidate
- Auth: Required

**getCandidates**: Get user's candidates

- Input: Filters (status, position)
- Output: Array of candidates
- Auth: Required

**updateCandidate**: Update candidate

- Input: Candidate ID + updates
- Output: Updated candidate
- Auth: Required (owner only)

**deleteCandidate**: Delete candidate

- Input: Candidate ID
- Output: Success confirmation
- Auth: Required (owner only)

### Quizzes Actions (lib/actions/quizzes.ts)

**createQuiz**: Create new quiz

- Input: Quiz data + position_id
- Output: Created quiz
- Auth: Required

**getQuizzes**: Get user's quizzes

- Input: Filters
- Output: Array of quizzes
- Auth: Required

**updateQuiz**: Update quiz

- Input: Quiz ID + updates
- Output: Updated quiz
- Auth: Required (owner only)

**deleteQuiz**: Delete quiz

- Input: Quiz ID
- Output: Success confirmation
- Auth: Required (owner only)

### Interviews Actions (lib/actions/interviews.ts)

**createInterview**: Create interview for candidate-quiz pair

- Input: candidate_id, quiz_id
- Output: Created interview with token
- Auth: Required

**getInterviews**: Get user's interviews

- Input: Filters (status, search)
- Output: Array of interviews
- Auth: Required

**getInterviewByToken**: Get interview by public token

- Input: token
- Output: Interview data (public access)

**updateInterview**: Update interview status/scores

- Input: Interview ID + updates
- Output: Updated interview
- Auth: Required (owner only)

### Profile Actions (lib/actions/profile.ts)

**getProfile**: Get user profile

- Input: User ID
- Output: Profile data
- Auth: Required

**updateProfile**: Update profile

- Input: Profile updates
- Output: Updated profile
- Auth: Required (own profile only)

## Migration Requirements

- All action signatures must remain identical
- Authentication checks must be maintained
- Error responses must be consistent
- Data validation must be preserved
- Performance characteristics must be maintained

## Database Functions

The following PostgreSQL functions must be migrated or recreated:

- `count_quizzes_by_position()`
- `generate_unique_token()`
- `count_candidates_by_status(user_id)`
- `get_candidates_for_quiz_assignment(quiz_id, user_id)`
- `search_interviews(user_id, filters)`
- `get_candidate_quiz_data(candidate_id, user_id)`

## Authentication Migration

- Replace Supabase auth.getUser() with Better Auth session checks
- Maintain user ID consistency
- Preserve profile creation triggers
- Ensure RLS-equivalent security in new system
