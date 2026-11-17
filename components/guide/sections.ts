/**
 * Table of contents of the in-app guide (`/guida`): the single source of the
 * section ids, so a deep link like `/guida#decisione` and the sticky index can
 * never drift from the rendering order. Ids are part of the public URL: rename
 * a title freely, never an id.
 */
export type GuideSectionMeta = {
  /** Stable anchor, used by `/guida#<id>` deep links */
  id: string;
  /** Section number shown in the badge and the index */
  number: string;
  /** Section title, used by the heading and the index */
  title: string;
};

export const GUIDE_SECTIONS = [
  { id: "concetto", number: "1", title: "Il concetto in una frase" },
  { id: "mappa", number: "2", title: "La mappa dell'applicazione" },
  { id: "posizione", number: "3", title: "Percorso A · Preparare una posizione" },
  {
    id: "arrivo",
    number: "4",
    title: "Percorso B · Far arrivare una candidatura",
  },
  {
    id: "candidatura",
    number: "5",
    title: "Percorso C · Seguire una candidatura",
  },
  { id: "colloquio", number: "6", title: "Percorso D · Il colloquio" },
  { id: "decisione", number: "7", title: "Percorso E · La decisione" },
  { id: "giorno-per-giorno", number: "8", title: "Il giorno per giorno" },
  { id: "ai", number: "9", title: "Dove interviene l'AI" },
  { id: "glossario", number: "10", title: "Glossario rapido" },
  { id: "faq", number: "11", title: "Domande frequenti" },
] as const satisfies readonly GuideSectionMeta[];

export type GuideSectionId = (typeof GUIDE_SECTIONS)[number]["id"];

export const GUIDE_SECTION = Object.fromEntries(
  GUIDE_SECTIONS.map((section) => [section.id, section]),
) as Record<GuideSectionId, GuideSectionMeta>;

/** Deep link to a section of the guide, for cards and empty states. */
export function guideHref(id: GuideSectionId) {
  return `/guida#${id}`;
}
