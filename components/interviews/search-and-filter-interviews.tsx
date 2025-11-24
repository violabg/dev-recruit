"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, ClockFading, Code, Loader2, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

type Position = {
  id: string;
  title: string;
  skills: string[];
};

type SearchAndFilterInterviewsProps = {
  positions: Position[];
  programmingLanguages: string[];
  initialSearch: string;
  initialStatus: string;
  initialPosition: string;
  initialLanguage: string;
};

export function SearchAndFilterInterviews({
  positions,
  programmingLanguages,
  initialSearch,
  initialStatus,
  initialPosition,
  initialLanguage,
}: SearchAndFilterInterviewsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [position, setPosition] = useState(initialPosition);
  const [language, setLanguage] = useState(initialLanguage);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.replace(`/dashboard/interviews?${params.toString()}`);
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
        router.replace(`/dashboard/interviews?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search, status, position, language });
  };

  const clearAllFilters = () => {
    setSearch("");
    setStatus("all");
    setPosition("all");
    setLanguage("all");

    startTransition(() => {
      router.replace("/dashboard/interviews");
    });
  };

  const hasActiveFilters =
    search || status !== "all" || position !== "all" || language !== "all";

  return (
    <div className="flex sm:flex-row flex-col gap-4">
      <div className="relative flex-1">
        {isPending ? (
          <Loader2 className="top-2.5 left-2.5 absolute w-4 h-4 animate-spin" />
        ) : (
          <Search className="top-2.5 left-2.5 absolute w-4 h-4 text-muted-foreground" />
        )}
        <Input
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
          onValueChange={(value) => {
            setStatus(value);
            updateFilters({ search, status: value, position, language });
          }}
        >
          <SelectTrigger>
            <ClockFading className="w-4 h-4" />
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
            <Briefcase className="w-4 h-4" />
            <SelectValue placeholder="Posizione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le posizioni</SelectItem>
            {positions.map((pos) => (
              <SelectItem key={pos.id} value={pos.id}>
                {pos.title}
              </SelectItem>
            ))}
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
            <Code className="w-4 h-4" />
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
        >
          <X className="mr-2 size-4" />
          Reset
        </Button>
      )}
    </div>
  );
}
