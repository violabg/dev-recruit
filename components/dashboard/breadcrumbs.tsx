"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";

const DASHBOARD_LABELS: Record<string, string> = {
  dashboard: "Panoramica",
  presets: "Preset",
  "reference-data": "Dati di riferimento",
  positions: "Posizioni",
  quizzes: "Quiz",
  candidates: "Candidati",
  applications: "Candidature",
  assessments: "Test inviati",
  settings: "Impostazioni",
  "sign-up": "Registrazione",
  "sign-up-success": "Registrazione completata",
  "forgot-password": "Password dimenticata",
  "update-password": "Aggiorna password",
  login: "Accedi",
  profile: "Profilo",
  edit: "Modifica",
  new: "Nuovo",
  invite: "Invita",
  agenda: "Agenda colloqui",
  interviews: "Colloqui",
  prepare: "Preparazione",
  live: "Live",
  feedback: "Scheda intervistatore",
  guides: "Guide colloquio",
};

const getBreadcrumbSegments = (pathname: string) => {
  // Remove query/hash, split, filter empty, skip first empty (from leading slash)
  return pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);
};

const getBreadcrumbLabel = (segment: string) => {
  if (DASHBOARD_LABELS[segment]) return DASHBOARD_LABELS[segment];
  // Record ids (cuid / numeric) mean nothing to a recruiter
  if (/^\d+$/.test(segment) || /^[a-z0-9]{20,}$/.test(segment))
    return "Dettaglio";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

const Breadcrumbs = () => {
  const pathname = usePathname();
  const segments = getBreadcrumbSegments(pathname);

  // Only show breadcrumbs for /dashboard and below
  if (!pathname.startsWith("/dashboard")) return null;

  // Build hrefs for each segment using reduce to avoid mutable reassignment
  const items = segments.map((segment, idx) => {
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const isLast = idx === segments.length - 1;
    const isNewQuiz = segment === "quiz" && idx === 3;
    // Segments without a page of their own link to the tab that lists them
    const parentHref = "/" + segments.slice(0, idx).join("/");
    let linkHref = href;
    if (segment === "guides" && segments[idx - 2] === "positions") {
      linkHref = `${parentHref}?tab=guide`;
    } else if (
      segment === "interviews" &&
      segments[idx - 2] === "applications"
    ) {
      linkHref = `${parentHref}?tab=colloqui`;
    }
    // Separator is a sibling <li> of the item (valid list markup)
    return (
      <Fragment key={href}>
        <BreadcrumbItem>
          {isLast || isNewQuiz ? (
            <BreadcrumbPage>{getBreadcrumbLabel(segment)}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink render={<Link href={linkHref as any} />}>
              {getBreadcrumbLabel(segment)}
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {!isLast && (
          <BreadcrumbSeparator className="text-muted-foreground/60">/</BreadcrumbSeparator>
        )}
      </Fragment>
    );
  });

  if (items.length <= 1) return null; // Don't show on root dashboard

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap">{items}</BreadcrumbList>
    </Breadcrumb>
  );
};
export default Breadcrumbs;
