---
title: "styling"
tier: "PerComponent"
keywords: ["UI","styling","tokens","OKLCH","status colour","components","tailwind"]
intent: "When building or changing UI components or pages (project tokens and reusable project components, including interview status, kit and scorecard presentation and the decision page presentation; generic shadcn rules come from the shadcn skill)."
editable: true
---
---
title: "styling"
tier: "PerComponent"
keywords: ["UI","styling","tokens","OKLCH","status colour","components","tailwind"]
intent: "When building or changing UI components or pages (project tokens and reusable project components, including interview status, kit and scorecard presentation; generic shadcn rules come from the shadcn skill)."
editable: true
---
# UI styling conventions

Generic shadcn and Tailwind rules, the project's shadcn style, its component primitives and its icon library come from the shadcn skill (which reads the project's own configuration). This document holds only the project-specific additions.

## Project tokens

All colours are OKLCH custom properties, each redefined for dark mode, exposed as Tailwind colours (`bg-<token>`, `text-<token>`, `border-<token>`, with opacity such as `bg-success/10`).

| Token | Use |
|---|---|
| `primary` | Brand blue. Company colour: NEVER change its value |
| `secondary` | Brand green (soft surface). Company colour: NEVER change its value |
| `heading` | Page and section titles (used by `PAGE_TITLE_CLASS`) |
| `success` | Positive feedback, good scores, `Button` variant `success` |
| `warning` | Caution: mid scores, low remaining time, unsaved changes |
| `destructive` | Errors, delete actions, low scores, required-field asterisk |
| `stage-pending`, `stage-progress`, `stage-done`, `stage-cancelled`, `stage-expired` | Assessment statuses `pending`, `in_progress`, `completed`, `cancelled`, and the derived `expired`; interview statuses; also the application stages, through their own map |
| `section-positions`, `section-candidates`, `section-quizzes`, `section-presets`, `section-assessments`, `section-settings` | Identity hue of each dashboard section (sidebar icon, page-title rule) |

- New colours are added as OKLCH tokens in the global stylesheet (light and dark values), never as palette classes (`text-green-600`), hex or arbitrary values in components.
- For status feedback prefer a tint (`bg-success/10 text-success`) over a filled background; never pair a token background with `text-white`/`text-black`.
- Only `primary`, `secondary` and `accent` have a `-foreground` companion. `success` and `destructive` do not: on a filled `bg-success` or `bg-destructive` surface use `text-primary-foreground`.
- There is no `section-applications` token. The Candidature section reuses the candidates hue (`text-section-candidates`, `bg-section-candidates`); the "Le mie azioni" overview entry uses `primary`.
- The Agenda section ("Agenda colloqui", icon `CalendarDays`) reuses the candidates hue too, like Candidature, and sits in the Selezione group after Candidati. No new token. `MineToggle` accepts a label (`label`, default "Solo le mie"): the Agenda passes "Solo i miei".

## Status and score colours

- Assessment status → `stage-*` token, badge `bg-stage-<state>/10 text-stage-<state>`. Italian labels: `pending` "In attesa", `in_progress` "In corso", `completed` "Completato", `cancelled` "Annullato", `expired` "Scaduto". Every state's label and tint comes from `ASSESSMENT_STATE_PRESENTATION` through `getAssessmentStatePresentation(state)`: never write a local state → colour map.
- The application stage never comes from `Candidate.status`, which does not exist: no candidate status badge, no candidate status → colour map. An application stage is shown with a badge tinted from the same `stage-*` tokens (their name predates the application stage: they are not reserved to assessments), through `APPLICATION_STAGE_PRESENTATION` and `getApplicationStagePresentation(stage)`, separate from the assessment map:

| Stage | Token |
|---|---|
| `applied` | `stage-pending` |
| `screening`, `assessment`, `interview`, `decision` | `stage-progress` |
| `offer`, `hired` | `stage-done` |
| `rejected` | `stage-cancelled` |
| `withdrawn` | `stage-expired` |

  An unknown stage falls back to `bg-muted text-muted-foreground` (dot `bg-muted-foreground`). Kanban columns reuse the stage labels; the last column is titled "Chiuse".
- `Position.status` → `POSITION_STATUS_PRESENTATION` through `getPositionStatusPresentation(status)`:

| Status | Label | Badge |
|---|---|---|
| `draft` | Bozza | `bg-warning/10 text-warning` |
| `open` | Aperta | `bg-success/10 text-success` |
| `closed` | Chiusa | `bg-muted text-muted-foreground` |

  An unknown status falls back to muted. Never write a local status → colour map.
- Scorecard criteria have one presentation module and no other map. `criterion-presentation.ts` of the scorecard components exports `CRITERION_CATEGORY_LABEL` ("Tecnico", "Soft skill", "Cultura"), `CRITERION_PRIORITY_PRESENTATION` (`must` "Indispensabile" `bg-primary/10 text-primary`, `nice` "Preferibile" `bg-muted text-muted-foreground`), `CRITERION_SOURCE_LABEL` ("Competenza", "Soft skill", "Personalizzato") and the option lists `CRITERION_CATEGORY_OPTIONS`, `CRITERION_PRIORITY_OPTIONS`, `CRITERION_SOURCE_OPTIONS`. Never write a local criterion map: the schema module only holds the value arrays (`CRITERION_CATEGORY_VALUES`, `CRITERION_PRIORITY_VALUES`, `CRITERION_SOURCE_VALUES`), never labels or classes.
- Interview-guide section kinds have one presentation module too: `guide-section-kind.ts` of the interview-guide components exports `GUIDE_SECTION_KIND_LABEL` ("Introduzione", "Esperienza", "Tecnica", "Comportamentale", "Domande del candidato", "Chiusura") and `GUIDE_SECTION_KIND_OPTIONS`. The select's label is "Tipo".
- Interviews, kits, kit items, participants and interviewer scorecards have one presentation module: `interview-presentation.ts` of the interview components. It is the only map:
  - `INTERVIEW_STATUS_PRESENTATION` and `getInterviewStatusPresentation(status)`, with the `stage-*` tokens: Pianificato `stage-pending`, In corso `stage-progress`, Concluso `stage-done`, Annullato `stage-cancelled`, Non presentato `stage-expired`; an unknown status falls back to `bg-muted text-muted-foreground` (dot `bg-muted-foreground`).
  - `KIT_STATUS_PRESENTATION`: "Kit in bozza" `bg-warning/10 text-warning`, "Kit pronto" `bg-success/10 text-success`.
  - `KIT_ITEM_ORIGIN_LABEL` and `getKitItemOriginLabel(origin, sourceRound)` ("Round N" for a previous-round question whose scorecard is known, otherwise "Round precedente"), `PARTICIPANT_ROLE_LABEL` ("Conduttore", "Osservatore"), `HIRE_RECOMMENDATION_LABEL` ("Assolutamente sì", "Sì", "Forse", "No", "Assolutamente no"), `MISSING_SOURCE_LABEL`, `LEGAL_REMINDER_TEXT`.
  - The origin badge of a kit question is neutral (`variant="outline"`), with no colour per origin. The criteria coverage shows "Nessuna prova" `bg-warning/10 text-warning` and "Con prove" `bg-success/10 text-success`. The section timer is `text-warning` under 2 minutes and `text-destructive` past the time.
- The Decision page has one presentation module too: `decision-presentation.ts` of the decision components exports `DECISION_OUTCOME_LABEL` ("Offerta", "Assunto", "Scartato"), `DECISION_OUTCOME_OPTIONS` in the order `offer`, `hired`, `rejected`, `mustWarningText(warning)` ("{criterio}: nessuna prova" / "{criterio}: sotto il livello atteso ({valore} su {atteso})") and `scoreTintClass(value, expectedLevel)`: `bg-success/10 text-success` from `expectedLevel` up, `bg-warning/10 text-warning` up to one point below, `bg-destructive/10 text-destructive` lower, `bg-muted text-muted-foreground` with no value (same rule as the per-criterion CV score, on values with one decimal).
- The per-criterion CV assessment compares the score with the expected level of the criterion, in this order: `success` when the score reaches or exceeds `expectedLevel`; `warning` when it is exactly one point below; `destructive` for anything lower; `bg-muted text-muted-foreground` with "Nessuna evidenza nel CV" when the score is `null`. The chip reads `{score}/5 · atteso {expectedLevel}` and adds " (archiviato)" for an archived criterion.
- In the decision matrix a cell with no evidence is "Nessuna prova" in `bg-warning/10 text-warning`, the "Disaccordo" badge is `bg-warning/10 text-warning`, the priority comes from `CRITERION_PRIORITY_PRESENTATION` and the recommendation from `HIRE_RECOMMENDATION_LABEL` ("Nessuna raccomandazione" when absent). The first column is fixed and the table scrolls horizontally.
- Score and feedback colours use `success` / `warning` / `destructive` / `primary` / `muted`, typically as a tint: `bg-<token>/10 text-<token>`.
- Score thresholds in the UI: per-answer score (0–10) ≥ 7 success, ≥ 4 warning, else destructive; percentages ≥ 70 success, ≥ 40 warning, else destructive.
- Unsaved changes are a `warning` tint: "Modifiche non salvate" with `bg-warning/10 px-2 py-1 rounded-md text-warning text-sm`, in the scorecard, the interview-guide and the kit editors. The scorecard editor adds "Criteri soft di default: non sono ancora salvati" with `bg-warning/10 px-3 py-2 rounded-md text-warning text-sm`, and the guide editor flags a minutes sum that does not match the duration with `bg-warning/10 text-warning` on "Somma sezioni: {minutes} min su {duration}". A generation dialog that will replace existing rows warns with the same `bg-warning/10 … text-warning text-sm` tint.
- The legal reminder of the preparation and live pages is `LegalReminder`, a `role="note"` block with `bg-warning/10 text-warning`, holding the fixed `LEGAL_REMINDER_TEXT`. There is no Alert component under `components/ui`, and the reminder is never generated or stored.

```tsx
<span aria-hidden className={cn("rounded-full size-2", stage.dot)} /> {/* stage.dot = "bg-stage-pending" */}
<span className={cn("rounded-full px-2 py-1 text-xs font-medium",
  score >= 7 ? "bg-success/10 text-success"
  : score >= 4 ? "bg-warning/10 text-warning"
  : "bg-destructive/10 text-destructive")}>
  {score}/10
</span>
```

## Project components to reuse

| Need | Use |
|---|---|
| Page title block | `PageHeader` with `title`, `description?`, `actionBtns?` and `section` (`SectionKey`, colours the title rule) |
| Suspense fallbacks | shared skeletons: `PageHeaderSkeleton`, `TableSkeleton`, `FilterBarSkeleton`, `PaginationSkeleton`, `TextSkeleton`, `ButtonSkeleton`, `BadgeSkeleton`, `FieldSkeleton`, `SelectOptionsSkeleton` |
| Section metadata (label, href, icon, colour classes) | `SECTIONS`, `NAV_GROUPS`, `NAV_FOOTER` |
| Delete with confirmation | `DeleteWithConfirm` (accepts an action that returns a result or redirects) |
| Row actions menu (edit + delete) | `EntityActionsMenu` |
| Clickable table row | `TableRowLink` |
| URL-based pagination | `UrlPagination` |
| Form fields | `rhf-inputs` wrappers (see server_actions); raw `Controller` only for controls without a wrapper (`LLMModelSelect`, `CodeEditor`) |
| Toasts | `toast` from `sonner` |
| Preset icons | `getPresetIcon(name)` and `PRESET_ICON_OPTIONS` (the icon name is stored on the preset) |
| "Solo le mie" / "Solo i miei" toggle | `MineToggle` with `label` |

All UI text, including `aria-label` and screen-reader text, is Italian.

## Common mistakes

- Palette classes, hex values, `text-white`/`text-black` or arbitrary colours in components.
- `dark:` colour overrides on top of tokens.
- Changing the `primary` or `secondary` values.
- Building a page title or delete dialog by hand instead of `PageHeader` / `DeleteWithConfirm`.
- Colouring assessment statuses with anything other than the `stage-*` tokens.
- A local stage → colour map instead of the shared presentation map, or a candidate status badge for a `Candidate.status` that no longer exists.
- Inventing a `section-applications` token instead of reusing the candidates hue, or a new token for the Agenda.
- Writing a position status badge by hand instead of `getPositionStatusPresentation`.
- Writing a local criterion, guide-section, interview-status, kit-status or kit-origin label/colour map instead of the shared presentation modules.
- Colouring a criterion score against a fixed threshold instead of the criterion's expected level.
- Rendering the legal reminder from generated or stored text, or with an Alert component that does not exist in the project.
- Writing a local decision outcome, warning or score-tint map instead of the decision presentation module, or colouring a decision score against a fixed threshold instead of the criterion's expected level.
