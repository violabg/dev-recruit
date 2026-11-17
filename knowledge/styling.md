---
title: "styling"
tier: "PerComponent"
keywords: ["UI","styling","tokens","OKLCH","status colour","components","tailwind"]
intent: "When building or changing UI components or pages (project tokens and reusable project components, including interview status, kit and scorecard presentation and the decision page presentation; generic shadcn rules come from the shadcn skill)."
editable: true
---
# UI styling conventions

Generic shadcn/Tailwind rules, the project's shadcn style, primitives and icons come from the shadcn skill. Only project-specific additions are here.

## Tokens

All colours are OKLCH custom properties redefined for dark mode and exposed as Tailwind colours (`bg-<token>`, `text-<token>`, `border-<token>`, with opacity such as `bg-success/10`).

- `primary` is the brand blue and `secondary` the brand green (soft surface): NEVER change their values. `heading` colours page and section titles (`PAGE_TITLE_CLASS`).
- `success` = positive feedback, good scores; `warning` = caution (mid scores, low remaining time, unsaved changes); `destructive` = errors, delete actions, low scores, required asterisk.
- `stage-pending`, `stage-progress`, `stage-done`, `stage-cancelled`, `stage-expired` serve assessment states (including derived `expired`), interview statuses and application stages; `section-<key>` is the identity hue of each dashboard section (sidebar icon, page-title rule).
- New colours are OKLCH tokens in the global stylesheet (light and dark), never palette classes, hex or arbitrary values.
- Prefer a tint (`bg-success/10 text-success`) over a filled background. Only `primary`, `secondary` and `accent` have a `-foreground` companion: on `bg-success`/`bg-destructive` use `text-primary-foreground`, never `text-white`/`text-black`.
- There is no `section-applications` token: Candidature and the Agenda ("Agenda colloqui", `CalendarDays`, Selezione group after Candidati) reuse the candidates hue; the "Le mie azioni" entry uses `primary`.

## Status, score and label maps

Each family has exactly one presentation module. NEVER write a local state → colour or label map.

- Assessment status → `ASSESSMENT_STATE_PRESENTATION` via `getAssessmentStatePresentation`, badge `bg-stage-<state>/10 text-stage-<state>`.
- Application stage → `APPLICATION_STAGE_PRESENTATION` via `getApplicationStagePresentation`, same `stage-*` tokens, separate map from the assessment one: `applied` pending; `screening`, `assessment`, `interview`, `decision` progress; `offer`, `hired` done; `rejected` cancelled; `withdrawn` expired; unknown → `bg-muted text-muted-foreground`. Kanban columns reuse the stage labels, the last one being "Chiuse".
- `Position.status` → `getPositionStatusPresentation`: `draft` "Bozza" warning, `open` "Aperta" success, `closed` "Chiusa" muted.
- Scorecard criteria → the criterion presentation module only (`CRITERION_CATEGORY_LABEL`, `CRITERION_PRIORITY_PRESENTATION`, `CRITERION_SOURCE_LABEL` and the `*_OPTIONS` lists); the schema module holds the `*_VALUES` arrays, never labels or classes.
- Guide section kinds → the guide-section-kind module only (`GUIDE_SECTION_KIND_LABEL`, `GUIDE_SECTION_KIND_OPTIONS`, select label "Tipo").
- Interviews, kits, participants and interviewer scorecards → `interview-presentation.ts` only (`INTERVIEW_STATUS_PRESENTATION`, `KIT_STATUS_PRESENTATION`, `KIT_ITEM_ORIGIN_LABEL`/`getKitItemOriginLabel`, `PARTICIPANT_ROLE_LABEL`, `HIRE_RECOMMENDATION_LABEL`, `MISSING_SOURCE_LABEL`). The origin badge is `variant="outline"`; coverage shows "Nessuna prova" warning / "Con prove" success; the section timer is `text-warning` under 2 minutes and `text-destructive` past time.
- Decision page → `decision-presentation.ts` only (`DECISION_OUTCOME_LABEL`, `DECISION_OUTCOME_OPTIONS` ordered `offer`, `hired`, `rejected`, `mustWarningText(warning)`, `scoreTintClass(value, expectedLevel)`).
- Score thresholds: per-answer (0–10) ≥7 success, ≥4 warning, else destructive; percentages ≥70 success, ≥40 warning, else destructive.
- A per-criterion score follows the criterion's `expectedLevel`, never a fixed threshold: success at or above, `warning` exactly one below, `destructive` lower, muted with "Nessuna evidenza nel CV" when null. The chip reads `{score}/5 · atteso {expectedLevel}` plus " (archiviato)" for an archived criterion.
- In the decision matrix: no evidence → "Nessuna prova" in `warning`; "Disaccordo" badge `warning`; first column fixed, table scrolls horizontally.
- Unsaved changes are a `warning` tint: "Modifiche non salvate" in the scorecard, guide and kit editors; the scorecard editor adds "Criteri soft di default: non sono ancora salvati", the guide editor flags the minutes mismatch ("Somma sezioni: {minutes} min su {duration}"), and a generation dialog that replaces rows warns the same way.
- The legal reminder is `LegalReminder`, a `role="note"` block in `warning` holding the fixed `LEGAL_REMINDER_TEXT`; there is no Alert component under `components/ui`.

## Reusable project components

- `PageHeader` with `title`, `description?`, `actionBtns?`, `section` (colours the title rule); `PageHeaderSkeleton`, `TableSkeleton`, `FilterBarSkeleton`, `PaginationSkeleton` for Suspense fallbacks.
- `DeleteWithConfirm` (action returning a result or redirecting), `EntityActionsMenu`, `TableRowLink`, `UrlPagination`.
- `rhf-inputs` wrappers for form fields; raw `Controller` only for controls without one (`LLMModelSelect`, `CodeEditor`). `toast` from sonner for feedback.
- `MineToggle` with `label` (default "Solo le mie"; the Agenda passes "Solo i miei"); preset icons from `getPresetIcon(name)` with `PRESET_ICON_OPTIONS`; section metadata from `SECTIONS`, `NAV_GROUPS`, `NAV_FOOTER`.
- All UI text, `aria-label` and screen-reader text are Italian.

## Prohibitions

- NEVER use palette classes, hex, `text-white`/`text-black` or arbitrary colours, nor `dark:` colour overrides on top of tokens.
- NEVER build a page title or delete dialog by hand instead of `PageHeader` / `DeleteWithConfirm`.
- NEVER invent a `section-applications` token or a new Agenda token, or add a candidate status badge.
- NEVER render the legal reminder from generated or stored text, or with an Alert component that does not exist.
