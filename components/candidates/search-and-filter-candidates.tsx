"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown,
  Briefcase,
  ClockFading,
  Loader2,
  Search as SearchIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "../ui/button";

type SelectOption = {
  value: string;
  label: string;
};

const statusOptions: SelectOption[] = [
  { value: "all", label: "Tutti gli stati" },
  { value: "pending", label: "In attesa" },
  { value: "contacted", label: "Contattato" },
  { value: "interviewing", label: "In colloquio" },
  { value: "hired", label: "Assunto" },
  { value: "rejected", label: "Rifiutato" },
];

const sortOptions: SelectOption[] = [
  { value: "newest", label: "Più recenti" },
  { value: "oldest", label: "Più vecchi" },
  { value: "a-z", label: "A-Z" },
  { value: "z-a", label: "Z-A" },
];

export const SearchAndFilterCandidates = ({
  positionItems = [],
}: {
  positionItems?: SelectOption[];
}) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
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
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      replace(url as "/dashboard/candidates");
    });
  }, 800);

  const handleStatus = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value && value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    startTransition(() => {
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      replace(url as "/dashboard/candidates");
    });
  };

  const handlePosition = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value && value !== "all") {
      params.set("position", value);
    } else {
      params.delete("position");
    }
    startTransition(() => {
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      replace(url as "/dashboard/candidates");
    });
  };

  const handleSort = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    startTransition(() => {
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      replace(url as "/dashboard/candidates");
    });
  };

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "all";
  const currentPosition = searchParams.get("position") || "all";
  const currentSort = searchParams.get("sort") || "newest";

  const hasActiveFilters =
    currentSearch ||
    currentStatus !== "all" ||
    currentPosition !== "all" ||
    currentSort !== "newest";

  return (
    <div className="@container">
      <div className="flex @[800px]:flex-row flex-col gap-4">
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
            placeholder="Cerca candidati..."
            className="pl-8"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              handleSearch(e.target.value);
            }}
            disabled={isPending}
          />
        </div>
        <Select
          name="status"
          items={statusOptions}
          value={currentStatus}
          onValueChange={handleStatus}
          disabled={isPending}
        >
          <SelectTrigger className="w-auto @[800px]w-full">
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
          name="position"
          value={currentPosition}
          onValueChange={handlePosition}
          disabled={isPending}
          items={[
            { value: "all", label: "Tutte le posizioni" },
            ...positionItems,
          ]}
        >
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <Briefcase className="size-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{"Tutte le posizioni"}</SelectItem>
            <Suspense
              fallback={<SelectItem value="_">Caricamento...</SelectItem>}
            >
              {positionItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </Suspense>
          </SelectContent>
        </Select>
        <Select
          name="sort"
          items={sortOptions}
          value={currentSort}
          onValueChange={handleSort}
          disabled={isPending}
        >
          <SelectTrigger className="w-auto @[800px]w-full">
            <ArrowUpDown className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="outlineDestructive"
            render={<Link href={pathname as "/dashboard/candidates"} />}
            disabled={isPending}
            nativeButton={false}
          >
            <X className="mr-1 size-4" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
};
