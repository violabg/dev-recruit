import {
  Briefcase,
  ClipboardCheck,
  FileQuestion,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Sparkles,
  SquareKanban,
  Users,
} from "lucide-react";

/**
 * Dashboard sections and their visual identity.
 *
 * Each section owns one hue (see `--section-*` tokens in app/globals.css).
 * The same hue tints the sidebar icon and the page-header icon tile, so the
 * colour alone tells the user which area they are in. Class strings are
 * written out in full so Tailwind can detect them.
 */
export type SectionKey =
  | "overview"
  | "positions"
  | "applications"
  | "candidates"
  | "quizzes"
  | "presets"
  | "assessments"
  | "settings";

export type Section = {
  key: SectionKey;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Icon colour */
  text: string;
  /** Soft tinted background for icon tiles */
  tile: string;
  /** Solid fill for the page-title rule */
  rule: string;
};

export const SECTIONS: Record<SectionKey, Section> = {
  overview: {
    key: "overview",
    label: "Le mie azioni",
    href: "/dashboard",
    icon: LayoutDashboard,
    text: "text-primary",
    tile: "bg-primary/12 ring-primary/20",
    rule: "bg-primary",
  },
  positions: {
    key: "positions",
    label: "Posizioni",
    href: "/dashboard/positions",
    icon: Briefcase,
    text: "text-section-positions",
    tile: "bg-section-positions/12 ring-section-positions/20",
    rule: "bg-section-positions",
  },
  // Same hue as the candidates: no section token exists for applications
  applications: {
    key: "applications",
    label: "Candidature",
    href: "/dashboard/applications",
    icon: SquareKanban,
    text: "text-section-candidates",
    tile: "bg-section-candidates/12 ring-section-candidates/20",
    rule: "bg-section-candidates",
  },
  candidates: {
    key: "candidates",
    label: "Candidati",
    href: "/dashboard/candidates",
    icon: Users,
    text: "text-section-candidates",
    tile: "bg-section-candidates/12 ring-section-candidates/20",
    rule: "bg-section-candidates",
  },
  quizzes: {
    key: "quizzes",
    label: "Quiz",
    href: "/dashboard/quizzes",
    icon: FileQuestion,
    text: "text-section-quizzes",
    tile: "bg-section-quizzes/12 ring-section-quizzes/20",
    rule: "bg-section-quizzes",
  },
  presets: {
    key: "presets",
    label: "Preset",
    href: "/dashboard/presets",
    icon: Sparkles,
    text: "text-section-presets",
    tile: "bg-section-presets/12 ring-section-presets/20",
    rule: "bg-section-presets",
  },
  assessments: {
    key: "assessments",
    label: "Test inviati",
    href: "/dashboard/assessments",
    icon: ClipboardCheck,
    text: "text-section-assessments",
    tile: "bg-section-assessments/12 ring-section-assessments/20",
    rule: "bg-section-assessments",
  },
  settings: {
    key: "settings",
    label: "Impostazioni",
    href: "/dashboard/settings/reference-data",
    icon: Settings,
    text: "text-section-settings",
    tile: "bg-section-settings/12 ring-section-settings/20",
    rule: "bg-section-settings",
  },
};

/** Sidebar groups: what needs me, the hiring workflow, reusable material. */
export const NAV_GROUPS: { label: string; items: Section[] }[] = [
  {
    label: "Panoramica",
    items: [SECTIONS.overview],
  },
  {
    label: "Selezione",
    items: [SECTIONS.positions, SECTIONS.applications, SECTIONS.candidates],
  },
  {
    label: "Libreria",
    items: [SECTIONS.quizzes, SECTIONS.assessments, SECTIONS.presets],
  },
];

/** Pinned above the user menu */
export const NAV_FOOTER: Section[] = [SECTIONS.settings];
