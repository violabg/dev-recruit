import {
  Briefcase,
  FileQuestion,
  type LucideIcon,
  MessageSquareMore,
  Settings,
  Sparkles,
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
  | "positions"
  | "candidates"
  | "quizzes"
  | "presets"
  | "interviews"
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
};

export const SECTIONS: Record<SectionKey, Section> = {
  positions: {
    key: "positions",
    label: "Posizioni",
    href: "/dashboard/positions",
    icon: Briefcase,
    text: "text-section-positions",
    tile: "bg-section-positions/12 ring-section-positions/20",
  },
  candidates: {
    key: "candidates",
    label: "Candidati",
    href: "/dashboard/candidates",
    icon: Users,
    text: "text-section-candidates",
    tile: "bg-section-candidates/12 ring-section-candidates/20",
  },
  quizzes: {
    key: "quizzes",
    label: "Quiz",
    href: "/dashboard/quizzes",
    icon: FileQuestion,
    text: "text-section-quizzes",
    tile: "bg-section-quizzes/12 ring-section-quizzes/20",
  },
  presets: {
    key: "presets",
    label: "Preset",
    href: "/dashboard/presets",
    icon: Sparkles,
    text: "text-section-presets",
    tile: "bg-section-presets/12 ring-section-presets/20",
  },
  interviews: {
    key: "interviews",
    label: "Colloqui",
    href: "/dashboard/interviews",
    icon: MessageSquareMore,
    text: "text-section-interviews",
    tile: "bg-section-interviews/12 ring-section-interviews/20",
  },
  settings: {
    key: "settings",
    label: "Impostazioni",
    href: "/dashboard/settings/reference-data",
    icon: Settings,
    text: "text-section-settings",
    tile: "bg-section-settings/12 ring-section-settings/20",
  },
};

/** Sidebar order */
export const NAV_SECTIONS: Section[] = [
  SECTIONS.positions,
  SECTIONS.candidates,
  SECTIONS.quizzes,
  SECTIONS.presets,
  SECTIONS.interviews,
  SECTIONS.settings,
];
