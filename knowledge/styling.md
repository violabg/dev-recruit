---
title: "styling"
tier: "PerComponent"
keywords: ["UI","styling","tokens","OKLCH","status colour","components","tailwind"]
intent: "When building or changing UI components or pages (project tokens and reusable project components; generic shadcn rules come from the shadcn skill)."
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
| `stage-pending`, `stage-progress`, `stage-done`, `stage-cancelled`, `stage-expired` | Assessment statuses `pending`, `in_progress`, `completed`, `cancelled`, and the derived `expired` |
| `section-positions`, `section-candidates`, `section-quizzes`, `section-presets`, `section-assessments`, `section-settings` | Identity hue of each dashboard section (sidebar icon, page-title rule) |

- New colours are added as OKLCH tokens in the global stylesheet (light and dark values), never as palette classes (`text-green-600`), hex or arbitrary values in components.
- For status feedback prefer a tint (`bg-success/10 text-success`) over a filled background; never pair a token background with `text-white`/`text-black`.
- Only `primary`, `secondary` and `accent` have a `-foreground` companion. `success` and `destructive` do not: on a filled `bg-success` or `bg-destructive` surface use `text-primary-foreground`.

## Status and score colours

- Assessment status → `stage-*` token, badge `bg-stage-<state>/10 text-stage-<state>`. Italian labels: `pending` "In attesa", `in_progress` "In corso", `completed` "Completato", `cancelled` "Annullato", `expired` "Scaduto". Every state's label and tint comes from `ASSESSMENT_STATE_PRESENTATION` through `getAssessmentStatePresentation(state)`: never write a local state → colour map.
- The application stage never comes from `Candidate.status`, which does not exist: no candidate status badge, no candidate status → colour map. An application stage is shown with a badge tinted from the same `stage-*` tokens (their name predates the application stage: they are not reserved to assessments), through one shared presentation map for application stages, separate from the assessment one. Which token each stage gets is a design decision: change it only in that map.
- Score and feedback colours use `success` / `warning` / `destructive` / `primary` / `muted`, typically as a tint: `bg-<token>/10 text-<token>`.
- Score thresholds in the UI: per-answer score (0–10) ≥ 7 success, ≥ 4 warning, else destructive; percentages ≥ 70 success, ≥ 40 warning, else destructive.

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

All UI text, including `aria-label` and screen-reader text, is Italian.

## Common mistakes

- Palette classes, hex values, `text-white`/`text-black` or arbitrary colours in components.
- `dark:` colour overrides on top of tokens.
- Changing the `primary` or `secondary` values.
- Building a page title or delete dialog by hand instead of `PageHeader` / `DeleteWithConfirm`.
- Colouring assessment statuses with anything other than the `stage-*` tokens.
- A local stage → colour map instead of the shared presentation map, or a candidate status badge for a `Candidate.status` that no longer exists.
