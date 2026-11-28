"use client";

import {
  normalizeLanguage,
  normalizePosition,
  normalizeStatus,
} from "@/app/dashboard/assessments/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssessmentStatus } from "@/lib/schemas";
import { Briefcase, ClockFading, Code, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useDebouncedCallback } from "use-debounce";

const statusOptions = [
  { value: "all", label: "Tutti gli stati" },
  { value: "pending", label: "Pendenti" },
  { value: "in_progress", label: "In corso" },
  { value: "completed", label: "Completati" },
  { value: "cancelled", label: "Annullati" },
];

const ALL_LANGUAGES = "all";
const allLanguagesOption = {
  value: ALL_LANGUAGES,
  label: "Tutti i linguaggi",
};

type SearchAndFilterAssessmentsProps = {
  languageOptions?: ReactNode;
  positionItems?: { value: string; label: string }[];
};

export function SearchAndFilterAssessments({
  languageOptions,
  positionItems = [],
}: SearchAndFilterAssessmentsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = normalizeStatus(
    searchParams.get("status") as AssessmentStatus | "all"
  );
  const initialPosition = normalizePosition(searchParams.get("position") || "");
  const initialLanguage = normalizeLanguage(searchParams.get("language") || "");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState(initialSearch);

  // Focus input when there's a search term in URL on mount
  useEffect(() => {
    if (initialSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [initialSearch]);
  const [status, setStatus] = useState(initialStatus);
  const [position, setPosition] = useState(initialPosition);
  const [language, setLanguage] = useState(initialLanguage);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // Reset to page 1 when searching
    params.delete("page");
    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(url as "/dashboard/assessments");
    });
  }, 800);

  const updateFilters = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Reset to page 1 when filters change
      params.delete("page");

      startTransition(() => {
        const queryString = params.toString();
        const url = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(url as "/dashboard/assessments");
      });
    },
    [router, pathname, searchParams]
  );

  const clearAllFilters = () => {
    setSearch("");
    setStatus("all");
    setPosition("all");
    setLanguage(ALL_LANGUAGES);
  };

  const hasActiveFilters =
    Boolean(search) ||
    status !== "all" ||
    position !== "all" ||
    language !== ALL_LANGUAGES;

  return (
    <div className="flex @[800px]:flex-row flex-col gap-4">
      <div className="relative flex-1">
        {isPending ? (
          <Loader2 className="top-2.5 left-2.5 absolute size-4 animate-spin" />
        ) : (
          <Search className="top-2.5 left-2.5 absolute size-4 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          type="search"
          placeholder="Cerca per candidato, email, test o posizione..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            handleSearch(e.target.value);
          }}
          className="pl-10"
        />
      </div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select
          items={statusOptions}
          value={status}
          onValueChange={(value: AssessmentStatus | "all" | null) => {
            const newStatus = value || "all";
            setStatus(newStatus);
            updateFilters({ search, status: newStatus, position, language });
          }}
        >
          <SelectTrigger>
            <ClockFading className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={position}
          onValueChange={(value) => {
            const newPosition = value || "all";
            setPosition(newPosition);
            updateFilters({ search, status, position: newPosition, language });
          }}
          items={[
            { value: "all", label: "Tutte le posizioni" },
            ...positionItems,
          ]}
        >
          <SelectTrigger>
            <Briefcase className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le posizioni</SelectItem>
            {positionItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={language}
          items={[allLanguagesOption]}
          onValueChange={(value) => {
            const newLanguage = value || ALL_LANGUAGES;
            setLanguage(newLanguage);
            updateFilters({ search, status, position, language: newLanguage });
          }}
        >
          <SelectTrigger>
            <Code className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LANGUAGES}>
              {allLanguagesOption.label}
            </SelectItem>
            {languageOptions}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Link
          href={pathname as "/dashboard/assessments"}
          className={buttonVariants({
            variant: "ghostDestructive",
          })}
          onClick={clearAllFilters}
        >
          <X className="mr-1 size-4" />
          Reset
        </Link>
      )}
    </div>
  );
}
