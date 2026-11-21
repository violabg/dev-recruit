# MCP operation inventory

Every dashboard operation with exactly one class. Related documents: [MCP server](mcp.md), [data policy](mcp-data-policy.md).

## Classes

- **read**: a page read of selection data.
- **draft**: content saved through the entity's single write path without making it final or visible outside the team: position create (draft status), quiz save, kit save (kit stays draft), interview slot proposal.
- **write**: the confirmed step that makes a draft final: position open, kit ready, interview scheduled from a proposal.
- **dashboard-only**: never exposed through MCP: final decisions, every delete, anything that sends or invites candidates or creates assessments, user management, presets, reference data, automations and in-app AI generation, kanban and bulk views, candidate-facing public actions, stage moves and ownership, plus every other write not listed as draft or write.

Phase of an MCP tool: 1 read tools, 3 `get_interview`, 4 drafts and publish. Phase 6 reviews the remaining rows marked `6`. Tool names follow the plan; the tool operations fix the final names.

## Server actions (`lib/actions/*.ts`)

| Operation | Entity | Class | MCP tool | Phase |
|---|---|---|---|---|
| `recordApplicationDecisionAction` | decision | dashboard-only | — | — |
| `challengeDecisionAction` | decision | dashboard-only | — | — |
| `moveApplicationStageAction` | application | dashboard-only | — | — |
| `setApplicationOwnerAction` | application | dashboard-only | — | — |
| `startAssessmentAction` | assessment (candidate-facing) | dashboard-only | — | — |
| `submitAnswerAction` | assessment (candidate-facing) | dashboard-only | — | — |
| `completeAssessmentAction` | assessment (candidate-facing) | dashboard-only | — | — |
| `deleteAssessmentAction` | assessment | dashboard-only | — | — |
| `closeExpiredAssessmentAction` | assessment (automation) | dashboard-only | — | — |
| `assignCandidatesToQuizAction` | assessment (creates and invites) | dashboard-only | — | — |
| `assignQuizzesToCandidateAction` | assessment (creates and invites) | dashboard-only | — | — |
| `createCandidateAction` | candidate | dashboard-only | — | 6 |
| `applyAsCandidateAction` | candidate (public) | dashboard-only | — | — |
| `updateCandidateAction` | candidate (diff of applications, withdrawals) | dashboard-only | — | 6 |
| `deleteCandidateAction` | candidate | dashboard-only | — | — |
| `updateEvaluationNotesAction` | evaluation | dashboard-only | — | 6 |
| `deleteEvaluationAction` | evaluation | dashboard-only | — | — |
| `evaluateAssessmentAnswerAction` | evaluation (in-app AI scoring) | dashboard-only | — | — |
| `completeAssessmentEvaluationAction` | evaluation (in-app AI scoring) | dashboard-only | — | — |
| `recalculateAnswerEvaluationsAction` | evaluation (in-app AI scoring) | dashboard-only | — | — |
| `upsertInterviewGuideAction` | interview guide | dashboard-only | — | 6 |
| `deleteInterviewGuideAction` | interview guide | dashboard-only | — | — |
| `generateInterviewGuideAction` | interview guide (in-app AI) | dashboard-only | — | — |
| `generateInterviewKitAction` | interview kit (in-app AI) | dashboard-only | — | — |
| `saveInterviewKitAction` | interview kit | draft | `save_interview_kit_draft` (patch: service `patchInterviewKit` → `saveInterviewKit` with `requireDraftStatus`) | 4 |
| `setInterviewKitStatusAction` | interview kit | write | `publish_draft` with `kind: "kit"` (status `ready`, service `setInterviewKitStatus`), widget only | 4 |
| `saveKitItemNoteAction` | live notes | dashboard-only | — | — |
| `setKitItemCoveredAction` | live notes | dashboard-only | — | — |
| `saveInterviewerFeedbackAction` | interviewer scorecard | dashboard-only | — | — |
| `submitInterviewerFeedbackAction` | interviewer scorecard (stage automation) | dashboard-only | — | — |
| `scheduleInterviewProposalAction` | interview proposal (Pianifica in the Colloqui tab) | dashboard-only | — (same service as `publish_draft` with `kind: "proposal"`) | — |
| `discardInterviewProposalAction` | interview proposal (Scarta) | dashboard-only | — | — |
| `scheduleInterviewAction` | interview | write | `publish_draft` with `kind: "proposal"` (service `confirmInterviewProposal` → `scheduleInterview`), widget only | 4 |
| `rescheduleInterviewAction` | interview | dashboard-only | — | 6 |
| `cancelInterviewAction` | interview | dashboard-only | — | — |
| `markInterviewNoShowAction` | interview | dashboard-only | — | — |
| `startInterviewAction` | interview | dashboard-only | — | — |
| `completeInterviewAction` | interview | dashboard-only | — | — |
| `createPositionAction` | position | draft | `create_position_draft` (service `createPosition`, status `draft`) | 4 |
| `updatePositionAction` | position | dashboard-only | — | 6 |
| `updatePositionStatusAction` | position (open, close, reopen) | dashboard-only | — | — |
| `deletePositionAction` | position | dashboard-only | — | — |
| `fetchPositionDataAction` | position (public form) | dashboard-only | — | — |
| `createPresetAction` | preset | dashboard-only | — | — |
| `updatePresetAction` | preset | dashboard-only | — | — |
| `deletePresetAction` | preset | dashboard-only | — | — |
| `updateProfileAction` | profile (own account) | dashboard-only | — | — |
| `updatePasswordAction` | profile (own account) | dashboard-only | — | — |
| `toggleQuestionFavoriteAction` | question | dashboard-only | — | 6 |
| `deleteQuestionFromQuizAction` | question | dashboard-only | — | — |
| `generateNewQuizAction` | quiz (in-app AI) | dashboard-only | — | — |
| `generateNewQuestionAction` | quiz (in-app AI) | dashboard-only | — | — |
| `deleteQuizAction` | quiz | dashboard-only | — | — |
| `upsertQuizAction` | quiz | draft | `save_quiz_draft` (preview, no write), then `save_quiz` from the widget (service `saveQuiz`; a quiz has no draft state) | 4 |
| `duplicateQuizAction` | quiz | dashboard-only | — | 6 |
| `createReferenceDataAction` | reference data | dashboard-only | — | — |
| `updateReferenceDataAction` | reference data | dashboard-only | — | — |
| `deleteReferenceDataAction` | reference data | dashboard-only | — | — |
| `reorderReferenceDataAction` | reference data | dashboard-only | — | — |
| `saveScorecardAction` | scorecard | dashboard-only | — | 6 |
| `generateScorecardCriteriaAction` | scorecard (in-app AI) | dashboard-only | — | — |
| `seedDefaultPresetsAction` | preset | dashboard-only | — | — |
| `transcribeAudioAction` | assessment (candidate-facing) | dashboard-only | — | — |
| `createUserAction` | user management | dashboard-only | — | — |
| `updateUserAction` | user management | dashboard-only | — | — |
| `setUserRoleAction` | user management | dashboard-only | — | — |
| `setUserEmailVerifiedAction` | user management | dashboard-only | — | — |
| `setUserPasswordAction` | user management | dashboard-only | — | — |
| `banUserAction` | user management | dashboard-only | — | — |
| `unbanUserAction` | user management | dashboard-only | — | — |
| `revokeUserSessionAction` | user management | dashboard-only | — | — |
| `revokeUserSessionsAction` | user management | dashboard-only | — | — |

`runAction` (`lib/actions/run-action.ts`) is the shared action shell, not an operation.

## Operations without a dashboard action

| Operation | Entity | Class | MCP tool | Phase |
|---|---|---|---|---|
| Interview slot proposal (service `proposeInterviewSlot`) | interview proposal | draft | `propose_interview_slot` | 4 |
| Scheduling options (guides, team members, next round, pending proposals) | interview proposal | read | `get_scheduling_options` | 4 |
| Position publish (service `publishPositionDraft`, `draft` → `open`) | position | write | `publish_draft` with `kind: "position"`, widget only | 4 |

## Page reads (`app/dashboard/**/page.tsx` and public pages)

Pages that only host the form of an action (`new`, `edit`, `invite`, `prepare/edit`, `change-password`) are covered by that action's row.

| Operation | Entity | Class | MCP tool | Phase |
|---|---|---|---|---|
| Home "Le mie azioni" (`/dashboard`, `getActionCenterForUser`) | action center | read | `action_center` | 1 |
| Positions list (`/dashboard/positions`) | position | read | `list_positions` | 1 |
| Position detail and setup (`/dashboard/positions/[id]`) | position | read | `get_position` | 1 |
| Scorecard (`/dashboard/positions/[id]/scorecard`) | scorecard | read | — | 6 |
| Interview guide (`/dashboard/positions/[id]/guides/[guideId]`) | interview guide | read | — | 6 |
| Application detail (`/dashboard/applications/[id]`) | application | read | `get_application` | 1 |
| Applications list, table view (`/dashboard/applications`) | application | read | — | 6 |
| Applications kanban view (`/dashboard/applications`) | application | dashboard-only | — | — |
| Decision (`/dashboard/applications/[id]/decision`) | decision | dashboard-only | — | — |
| Agenda (`/dashboard/agenda`) | interview | read | `list_interviews` | 1 |
| Interview preparation (`/dashboard/applications/[id]/interviews/[interviewId]/prepare`) | interview, kit | read | `get_interview` (non-identifying) | 3 |
| Kit editor structure (`…/prepare/edit`) | kit | read | `get_interview_kit` (non-identifying) | 4 |
| Live interview (`…/interviews/[interviewId]/live`) | live notes | dashboard-only | — | — |
| Interviewer scorecard (`…/interviews/[interviewId]/feedback`) | interviewer scorecard | dashboard-only | — | — |
| Candidates list (`/dashboard/candidates`) | candidate | read | — | 6 |
| Candidate detail (`/dashboard/candidates/[id]`) | candidate | read | — | 6 |
| Candidate evaluations (`/dashboard/candidates/[id]/evaluations`) | evaluation | read | — | 6 |
| Candidate quiz assignment (`/dashboard/candidates/[id]/quiz`) | assessment (creates and invites) | dashboard-only | — | — |
| Quizzes list (`/dashboard/quizzes`) | quiz | read | — | 6 |
| Quiz detail (`/dashboard/quizzes/[id]`) | quiz | read | — | 6 |
| Assessments list (`/dashboard/assessments`) | assessment | read | — | 6 |
| Assessment detail (`/dashboard/assessments/[id]`) | assessment, evaluation | read | — | 6 |
| Presets (`/dashboard/presets`, `/dashboard/presets/[id]`) | preset | dashboard-only | — | — |
| Reference data (`/dashboard/settings/reference-data`) | reference data | dashboard-only | — | — |
| Users (`/dashboard/settings/users`, `/dashboard/settings/users/[id]`) | user management | dashboard-only | — | — |
| Profile (`/dashboard/profile`) | profile (own account) | dashboard-only | — | — |
| Public apply form (`/recruiting`) and assessment (`/recruiting/[token]`) | candidate-facing | dashboard-only | — | — |
| Sign-in, sign-up and auth pages (`/auth/*`) | account | dashboard-only | — | — |
| Guide (`/guida`) and landing (`/`) | documentation | dashboard-only | — | — |
