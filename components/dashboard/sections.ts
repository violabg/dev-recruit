import {
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  FileQuestion,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Sparkles,
  SquareKanban,
  UserCog,
  Users,
} from "lucide-react";

/**
 * Dashboard sections and their visual identity.
 *
 * Each section owns one hue (see `--section-*` tokens in app/globals.css).
 * The same hue tints the sidebar icon and the header band (stripe and
 * eyebrow, see SectionMark), so the colour alone tells the user which area
 * they are in. Class strings are written out in full so Tailwind can detect
 * them.
 */
export type SectionKey =
  | "overview"
  | "positions"
  | "applications"
  | "candidates"
  | "agenda"
  | "quizzes"
  | "presets"
  | "assessments"
  | "settings"
  | "users";

export type Section = {
  key: SectionKey;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Icon colour */
  text: string;
  /** Soft tinted background for icon tiles */
  tile: string;
  /** Solid fill for the header band stripe */
  rule: string;
  /**
   * Shown in the menu to administrators only. Presentation, not the guard:
   * the pages and actions check the role on the server.
   */
  adminOnly?: boolean;
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
  // Same hue as the candidates: interviews belong to the hiring workflow
  agenda: {
    key: "agenda",
    label: "Agenda",
    href: "/dashboard/agenda",
    icon: CalendarDays,
    text: "text-section-candidates",
    tile: "bg-section-candidates/12 ring-section-candidates/20",
    rule: "bg-section-candidates",
  },
  quizzes: {
    key: "quizzes",
    label: "Test",
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
  // Same hue as the settings: user management lives under Impostazioni
  users: {
    key: "users",
    label: "Utenti",
    href: "/dashboard/settings/users",
    icon: UserCog,
    text: "text-section-settings",
    tile: "bg-section-settings/12 ring-section-settings/20",
    rule: "bg-section-settings",
    adminOnly: true,
  },
};

/**
 * Sidebar groups: the selection flow without a title, then Gestione with the
 * quick links to the managed entities.
 */
export const NAV_GROUPS: { label?: string; items: Section[] }[] = [
  {
    items: [
      SECTIONS.overview,
      SECTIONS.positions,
      SECTIONS.candidates,
      SECTIONS.agenda,
    ],
  },
  {
    label: "Gestione",
    items: [
      SECTIONS.applications,
      SECTIONS.quizzes,
      SECTIONS.assessments,
      SECTIONS.presets,
    ],
  },
];

/** Pinned above the user menu */
export const NAV_FOOTER: Section[] = [SECTIONS.settings, SECTIONS.users];

/**
 * Menu entries the role may see: admin-only entries are hidden unless the
 * role is `admin` (also while the session is still loading).
 */
export function visibleNavItems(
  items: Section[],
  role: string | null | undefined,
): Section[] {
  return items.filter((item) => !item.adminOnly || role === "admin");
}
