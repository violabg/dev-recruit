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

| Token | Use |
|---|---|
| `primary` | Brand blue. NEVER change its value |
| `secondary` | Brand green (soft surface). NEVER change its value |
| `heading` | Page and section titles (`PAGE_TITLE_CLASS`) |
| `success` | Positive feedback, good scores, `Button` variant `success` |
| `warning` | Caution: mid scores, low remaining time, unsaved changes |
| `destructive` | Errors, delete actions, low scores, required asterisk |
| `stage-pending`, `stage-progress`, `stage-done`, `stage-cancelled`, `stage-expired` | Assessment states (including derived `expired`), interview statuses, application stages via their own map |
| `section-positions`, `section-candidates`, `section-quizzes`, `section-presets`, `section-assessments`, `section-settings` | Identity hue of each dashboard section (sidebar icon, page-title rule) |

- New colours are OKLCH tokens in the global stylesheet (light and dark), never palette classes, hex or arbitrary values.
- Prefer a tint (`bg-success/10 text-success`) over a filled background; never pair a token background with `text-white`/`text-black`.
- Only `primary`, `secondary` and `accent` have a `-foreground` companion. On `bg-success`/`bg-destructive` use `text-primary-foreground`.
- There is no `section-applications` token: Candidature and the Agenda ("Agenda colloqui", `CalendarDays`, Selezione group after Candidati) reuse the candidates hue; the "Le mie azioni" entry uses `primary`. `MineToggle` takes `label` (default "Solo le mie"; the Agenda passes "Solo i miei").

## Status, score and label maps

Each family has exactly one presentation module. NEVER write a local state → colour or label map.

- Assessment status → `ASSESSMENT_STATE_PRESENTATION` via `getAssessmentStatePresentation(state)`, badge `bg-stage-<state>/10 text-stage-<state>`: `pending` "In attesa", `in_progress` "In corso", `completed` "Completato", `cancelled` "Annullato", `expired` "Scaduto".
- Application stage → `APPLICATION_STAGE_PRESENTATION` via `getApplicationStagePresentation(stage)`, same `stage-*` tokens (the names predate application stages; not reserved to assessments), separate map from the assessment one:

| Stage | Token |
|---|---|
| `applied` | `stage-pending` |
| `screening`, `assessment`, `interview`, `decision` | `stage-progress` |
| `offer`, `hired` | `stage-done` |
| `rejected` | `stage-cancelled` |
| `withdrawn` | `stage-expired` |

  Unknown stage falls back to `bg-muted text-muted-foreground` (dot `bg-muted-foreground`). Kanban columns reuse the stage labels; the last column is "Chiuse". There is no `Candidate.status` and no candidate status badge.
- `Position.status` → `POSITION_STATUS_PRESENTATION` via `getPositionStatusPresentation`: `draft` "Bozza" `bg-warning/10 text-warning`, `open` "Aperta" `bg-success/10 text-success`, `closed` "Chiusa" `bg-muted text-muted-foreground`; unknown → muted.
- Scorecard criteria → the criterion presentation module only: `CRITERION_CATEGORY_LABEL` ("Tecnico", "Soft skill", "Cultura"), `CRITERION_PRIORITY_PRESENTATION` (`must` "Indispensabile" `bg-primary/10 text-primary`, `nice` "Preferibile" `bg-muted text-muted-foreground`), `CRITERION_SOURCE_LABEL` ("Competenza", "Soft skill", "Personalizzato") and the `*_OPTIONS` lists. The schema module holds only the `*_VALUES` arrays, never labels or classes.
- Guide section kinds → the guide-section-kind module only: `GUIDE_SECTION_KIND_LABEL` ("Introduzione", "Esperienza", "Tecnica", "Comportamentale", "Domande del candidato", "Chiusura"), `GUIDE_SECTION_KIND_OPTIONS`; select label "Tipo".
- Interviews, kits, participants and interviewer scorecards → `interview-presentation.ts` only: `INTERVIEW_STATUS_PRESENTATION` with `stage-*` (Pianificato `stage-pending`, In corso `stage-progress`, Concluso `stage-done`, Annullato `stage-cancelled`, Non presentato `stage-expired`; unknown → muted), `KIT_STATUS_PRESENTATION` ("Kit in bozza" `warning`, "Kit pronto" `success`), `KIT_ITEM_ORIGIN_LABEL`/`getKitItemOriginLabel` ("Round N" or "Round precedente"), `PARTICIPANT_ROLE_LABEL` ("Conduttore", "Osservatore"), `HIRE_RECOMMENDATION_LABEL` ("Assolutamente sì", "Sì", "Forse", "No", "Assolutamente no"), `MISSING_SOURCE_LABEL`, `LEGAL_REMINDER_TEXT`. The origin badge is neutral (`variant="outline"`); coverage shows "Nessuna prova" `warning` / "Con prove" `success`; the section timer is `text-warning` under 2 minutes and `text-destructive` past time.
- Decision page → `decision-presentation.ts` only: `DECISION_OUTCOME_LABEL` ("Offerta", "Assunto", "Scartato"), `DECISION_OUTCOME_OPTIONS` ordered `offer`, `hired`, `rejected`, `mustWarningText(warning)` ("{criterio}: nessuna prova" / "{criterio}: sotto il livello atteso ({valore} su {atteso})"), `scoreTintClass(value, expectedLevel)` (`success` from `expectedLevel` up, `warning` up to one point below, `destructive` lower, muted with no value).
- A per-criterion CV score follows the same expected-level rule: `success` at or above `expectedLevel`, `warning` exactly one below, `destructive` lower, muted with "Nessuna evidenza nel CV" when null. The chip reads `{score}/5 · atteso {expectedLevel}` plus " (archiviato)" for an archived criterion.
- In the decision matrix: no evidence → "Nessuna prova" in `warning`; "Disaccordo" badge `warning`; priority from `CRITERION_PRIORITY_PRESENTATION`; recommendation from `HIRE_RECOMMENDATION_LABEL` ("Nessuna raccomandazione" when absent); first column fixed, table scrolls horizontally.
- Score thresholds: per-answer (0–10) ≥7 success, ≥4 warning, else destructive; percentages ≥70 success, ≥40 warning, else destructive.

```tsx
<span aria-hidden className={cn("rounded-full size-2", stage.dot)} /> {/* stage.dot = "bg-stage-pending" */}
<span className={cn("rounded-full px-2 py-1 text-xs font-medium",
  score >= 7 ? "bg-success/10 text-success"
  : score >= 4 ? "bg-warning/10 text-warning"
  : "bg-destructive/10 text-destructive")}>
  {score}/10
</span>
```

- Unsaved changes are a `warning` tint: "Modifiche non salvate" with `bg-warning/10 px-2 py-1 rounded-md text-warning text-sm` in the scorecard, guide and kit editors. The scorecard editor adds "Criteri soft di default: non sono ancora salvati" (`bg-warning/10 px-3 py-2 rounded-md text-warning text-sm`); the guide editor flags a minutes mismatch with `bg-warning/10 text-warning` on "Somma sezioni: {minutes} min su {duration}"; a generation dialog that replaces rows warns with the same tint.
- The legal reminder is `LegalReminder`, a `role="note"` block with `bg-warning/10 text-warning` holding the fixed `LEGAL_REMINDER_TEXT`. There is no Alert component under `components/ui`; the reminder is never generated or stored.

## Reusable project components

| Need | Use |
|---|---|
| Page title block | `PageHeader` with `title`, `description?`, `actionBtns?`, `section` (`SectionKey`, colours the title rule) |
| Suspense fallbacks | `PageHeaderSkeleton`, `TableSkeleton`, `FilterBarSkeleton`, `PaginationSkeleton`, `TextSkeleton`, `ButtonSkeleton`, `BadgeSkeleton`, `FieldSkeleton`, `SelectOptionsSkeleton` |
| Section metadata | `SECTIONS`, `NAV_GROUPS`, `NAV_FOOTER` |
| Delete with confirmation | `DeleteWithConfirm` (action returning a result or redirecting) |
| Row actions menu | `EntityActionsMenu` |
| Clickable table row | `TableRowLink` |
| URL pagination | `UrlPagination` |
| Form fields | `rhf-inputs` wrappers; raw `Controller` only for controls without one (`LLMModelSelect`, `CodeEditor`) |
| Toasts | `toast` from sonner |
| Preset icons | `getPresetIcon(name)`, `PRESET_ICON_OPTIONS` |
| "Solo le mie/i" toggle | `MineToggle` with `label` |

All UI text, `aria-label` and screen-reader text are Italian.

## Prohibitions

- NEVER use palette classes, hex, `text-white`/`text-black` or arbitrary colours, nor `dark:` colour overrides on top of tokens.
- NEVER change the `primary` or `secondary` values.
- NEVER build a page title or delete dialog by hand instead of `PageHeader` / `DeleteWithConfirm`.
- NEVER colour an assessment status or application stage with anything but the `stage-*` tokens and the shared maps, and never add a candidate status badge.
- NEVER invent a `section-applications` token or a new Agenda token.
- NEVER write a local position-status, criterion, guide-section, interview-status, kit-status, kit-origin, decision-outcome, warning or score-tint map.
- NEVER colour a criterion score against a fixed threshold instead of the criterion's expected level.
- NEVER render the legal reminder from generated or stored text, or with an Alert component that does not exist.
