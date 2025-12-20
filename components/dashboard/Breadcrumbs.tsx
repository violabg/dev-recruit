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
import { usePathname } from "next/navigation";

const DASHBOARD_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  positions: "Posizioni",
  quizzes: "Quiz",
  candidates: "Candidati",
  interviews: "Colloqui",
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
};

const getBreadcrumbSegments = (pathname: string) => {
  // Remove query/hash, split, filter empty, skip first empty (from leading slash)
  return pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);
};

const getBreadcrumbLabel = (segment: string) => {
  if (DASHBOARD_LABELS[segment]) return DASHBOARD_LABELS[segment];
  if (/^\d+$/.test(segment)) return `ID: ${segment}`;
  if (/^[a-z0-9\-]{8,}$/.test(segment)) return segment.slice(0, 8) + "...";
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
    return (
      <BreadcrumbItem key={href}>
        {isLast || isNewQuiz ? (
          <BreadcrumbPage>{getBreadcrumbLabel(segment)}</BreadcrumbPage>
        ) : (
          <BreadcrumbLink render={<Link href={href as any} />}>
            {getBreadcrumbLabel(segment)}
          </BreadcrumbLink>
        )}
        {!isLast && <BreadcrumbSeparator />}
      </BreadcrumbItem>
    );
  });

  if (items.length <= 1) return null; // Don't show on root dashboard

  return (
    <Breadcrumb className="ml-2">
      <BreadcrumbList className="flex-nowrap">{items}</BreadcrumbList>
    </Breadcrumb>
  );
};
export default Breadcrumbs;
