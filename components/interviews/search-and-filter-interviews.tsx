"use client";

import {
  normalizeLanguage,
  normalizePosition,
  normalizeStatus,
} from "@/app/dashboard/interviews/utils";
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

type SearchAndFilterInterviewsProps = {
  languageOptions?: ReactNode;
  positionItems?: { value: string; label: string }[];
};

export function SearchAndFilterInterviews({
  languageOptions,
  positionItems = [],
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
          onValueChange={(value: InterviewStatus | "all" | null) => {
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
          onValueChange={(value) => {
            const newLanguage = value || "all";
            setLanguage(newLanguage);
            updateFilters({ search, status, position, language: newLanguage });
          }}
        >
          <SelectTrigger>
            <Code className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i linguaggi</SelectItem>
            {languageOptions}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          variant="outlineDestructive"
          onClick={clearAllFilters}
          disabled={isPending}
          render={<Link href={pathname as "/dashboard/interviews"} />}
          nativeButton={false}
        >
          <X className="mr-2 size-4" />
          Reset
        </Button>
      )}
    </div>
  );
}
