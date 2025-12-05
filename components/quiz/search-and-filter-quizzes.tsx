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
import { ArrowUpDown, Loader2, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";
import { PositionLevelsSelect } from "../positions/position-levels-select";
import PositionsSelect from "../positions/positions-select";

type PositionOption = {
  id: string;
  title: string;
};

type SearchAndFilterQuizzesProps = {
  levels: string[];
  positions: PositionOption[];
};

export const SearchAndFilterQuizzes = ({
  levels,
  positions,
}: SearchAndFilterQuizzesProps) => {
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  // Track local input separately from URL
  const urlSearch = searchParams.get("search") || "";
  const [inputValue, setInputValue] = useState(urlSearch);
  // Track the last URL value to detect external changes (e.g., reset button)
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);

  // Sync input when URL changes externally (e.g., reset button click)
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch);
    setInputValue(urlSearch);
  }

  // Focus input when there's a search term in URL on mount
  useEffect(() => {
    if (urlSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [urlSearch]);

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      replace(`/dashboard/quizzes?${params.toString()}`);
    });
  }, 800);

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    startTransition(() => {
      replace(`/dashboard/quizzes?${params.toString()}`);
    });
  };

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (value && value !== "all") {
      params.set("filter", value);
    } else {
      params.delete("filter");
    }
    startTransition(() => {
      replace(`/dashboard/quizzes?${params.toString()}`);
    });
  };

  const handlePosition = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (value && value !== "all") {
      params.set("positionId", value);
    } else {
      params.delete("positionId");
    }
    startTransition(() => {
      replace(`/dashboard/quizzes?${params.toString()}`);
    });
  };

  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentFilter = searchParams.get("filter") || "all";
  const currentPosition = searchParams.get("positionId") || "all";

  return (
    <div className="flex sm:flex-row flex-col gap-4">
      <div className="relative flex-1">
        {isPending ? (
          <Loader2 className="top-2.5 left-2.5 absolute size-4 animate-spin" />
        ) : (
          <SearchIcon className="top-2.5 left-2.5 absolute size-4 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          type="search"
          name="search"
          placeholder="Cerca quiz..."
          className="pl-8"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            handleSearch(e.target.value);
          }}
          disabled={isPending}
        />
      </div>
      <div className="flex gap-2">
        <Select
          name="sort"
          value={currentSort}
          onValueChange={handleSort}
          disabled={isPending}
        >
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="size-4" />
              <SelectValue placeholder="Ordina" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Più recenti</SelectItem>
            <SelectItem value="oldest">Meno recenti</SelectItem>
            <SelectItem value="a-z">A-Z</SelectItem>
            <SelectItem value="z-a">Z-A</SelectItem>
          </SelectContent>
        </Select>
        <PositionLevelsSelect
          levels={levels}
          currentFilter={currentFilter}
          handleFilter={handleFilter}
          isPending={isPending}
        />
        <PositionsSelect
          positions={positions}
          currentPosition={currentPosition}
          handlePosition={handlePosition}
          isPending={isPending}
        />
        {(currentSearch ||
          currentFilter !== "all" ||
          currentPosition !== "all") && (
          <Button variant="outlineDestructive" asChild disabled={isPending}>
            <Link href="/dashboard/quizzes">Resetta</Link>
          </Button>
        )}
      </div>
    </div>
  );
};
