import { SECTIONS } from "@/components/dashboard/sections";
import type { Crumb } from "@/components/page-header";

/**
 * Trails of real names for the inner pages, built from the data the page
 * already loads. Pure and server-safe: the last step is the current page and
 * never carries an href. An id is never a label.
 */

/** Drops the href of the last step: the current page is not a link. */
function lastStepIsCurrent(trail: Crumb[]): Crumb[] {
  if (trail.length === 0) return trail;
  const last = trail[trail.length - 1];
  return [...trail.slice(0, -1), { label: last.label }];
}

/**
 * Posizioni → position. The position is the current page when there is no
 * tail, so it is not linked.
 */
export function positionTrail(
  position: { id: string; title: string },
  ...tail: Crumb[]
): Crumb[] {
  return lastStepIsCurrent([
    { label: SECTIONS.positions.label, href: SECTIONS.positions.href },
    {
      label: position.title,
      href: tail.length ? `/dashboard/positions/${position.id}` : undefined,
    },
    ...tail,
  ]);
}

/**
 * The position trail, then the candidate. The candidate is the current page
 * when there is no tail.
 */
export function applicationTrail(
  app: {
    id: string;
    candidateName: string;
    position: { id: string; title: string };
  },
  ...tail: Crumb[]
): Crumb[] {
  return positionTrail(app.position, {
    label: app.candidateName,
    href: tail.length ? `/dashboard/applications/${app.id}` : undefined,
  }, ...tail);
}

/**
 * The application trail, then the interview round and the current step. An
 * interview has no page of its own, so its step is never a link.
 */
export function interviewTrail(
  app: {
    id: string;
    candidateName: string;
    position: { id: string; title: string };
  },
  interview: { id: string; round: number },
  step: "Preparazione" | "Modifica preparazione" | "Live" | "Feedback",
): Crumb[] {
  return applicationTrail(
    app,
    { label: `Colloquio ${interview.round}` },
    { label: step },
  );
}

/** A section root trail, for the inner pages of that section. */
export function sectionTrail(
  section: { label: string; href: string },
  ...tail: Crumb[]
): Crumb[] {
  return lastStepIsCurrent([{ label: section.label, href: section.href }, ...tail]);
}
