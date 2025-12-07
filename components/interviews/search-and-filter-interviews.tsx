"use client";

import {
  normalizeLanguage,
  normalizePage,
  normalizePosition,
  normalizeStatus,
} from "@/app/dashboard/interviews/runtime-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InterviewStatus } from "@/lib/schemas";
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
import { programmingLanguages } from "../positions/data";

type SearchAndFilterInterviewsProps = {
  positionOptions: ReactNode;
};

export function SearchAndFilterInterviews({
  positionOptions,
}: SearchAndFilterInterviewsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = normalizeStatus(
    searchParams.get("status") as InterviewStatus | "all"
  );
  const initialPosition = normalizePosition(searchParams.get("position") || "");
  const initialLanguage = normalizeLanguage(searchParams.get("language") || "");
  const page = normalizePage(searchParams.get("page") || "");
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
      router.replace(url as "/dashboard/interviews");
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
        router.replace(url as "/dashboard/interviews");
      });
    },
    [router, pathname, searchParams]
  );

  const clearAllFilters = () => {
    setSearch("");
    setStatus("all");
    setPosition("all");
    setLanguage("all");
  };

  const hasActiveFilters =
    search || status !== "all" || position !== "all" || language !== "all";

  return (
    <div className="flex sm:flex-row flex-col gap-4">
      <div className="relative flex-1">
        {isPending ? (
          <Loader2 className="top-2.5 left-2.5 absolute size-4 animate-spin" />
        ) : (
          <Search className="top-2.5 left-2.5 absolute size-4 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          type="search"
          placeholder="Cerca per candidato, email, quiz o posizione..."
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
          value={status}
          onValueChange={(value: InterviewStatus | "all") => {
            setStatus(value);
            updateFilters({ search, status: value, position, language });
          }}
        >
          <SelectTrigger>
            <ClockFading className="size-4" />
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="pending">Pendenti</SelectItem>
            <SelectItem value="in_progress">In corso</SelectItem>
            <SelectItem value="completed">Completati</SelectItem>
            <SelectItem value="cancelled">Annullati</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={position}
          onValueChange={(value) => {
            setPosition(value);
            updateFilters({ search, status, position: value, language });
          }}
        >
          <SelectTrigger>
            <Briefcase className="size-4" />
            <SelectValue placeholder="Posizione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le posizioni</SelectItem>
            {positionOptions}
          </SelectContent>
        </Select>
        <Select
          value={language}
          onValueChange={(value) => {
            setLanguage(value);
            updateFilters({ search, status, position, language: value });
          }}
        >
          <SelectTrigger>
            <Code className="size-4" />
            <SelectValue placeholder="Linguaggio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i linguaggi</SelectItem>
            {programmingLanguages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="outlineDestructive"
          onClick={clearAllFilters}
          disabled={isPending}
          asChild
        >
          <Link href={pathname as "/dashboard/interviews"}>
            <X className="mr-2 size-4" />
            Reset
          </Link>
        </Button>
      )}
    </div>
  );
}
