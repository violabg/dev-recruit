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
import { useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "../ui/button";

type StatusOption = {
  value: string;
  label: string;
};

type PositionOption = {
  id: string;
  title: string;
};

type SearchAndFilterCandidatesProps = {
  positions: PositionOption[];
};

const statusOptions: StatusOption[] = [
  { value: "all", label: "Tutti gli stati" },
  { value: "pending", label: "In attesa" },
  { value: "contacted", label: "Contattato" },
  { value: "interviewing", label: "In colloquio" },
  { value: "hired", label: "Assunto" },
  { value: "rejected", label: "Rifiutato" },
];

export const SearchAndFilterCandidates = ({
  positions,
}: SearchAndFilterCandidatesProps) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();
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
      replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  }, 800);

  const handleStatus = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value && value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    startTransition(() => {
      const queryString = params.toString();
      replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  const handlePosition = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value && value !== "all") {
      params.set("position", value);
    } else {
      params.delete("position");
    }
    startTransition(() => {
      const queryString = params.toString();
      replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  };

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    startTransition(() => {
      const queryString = params.toString();
      replace(queryString ? `${pathname}?${queryString}` : pathname);
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
            <Loader2 className="top-2.5 left-2.5 absolute w-4 h-4 animate-spin" />
          ) : (
            <SearchIcon className="top-2.5 left-2.5 absolute w-4 h-4 text-muted-foreground" />
          )}
          <Input
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
          value={currentStatus}
          onValueChange={handleStatus}
          disabled={isPending}
        >
          <SelectTrigger className="w-auto @[800px]w-full">
            <ClockFading className="w-4 h-4" />
            <SelectValue placeholder="Stato" />
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
        >
          <SelectTrigger className="w-auto @[800px]w-full">
            <Briefcase className="w-4 h-4" />
            <SelectValue placeholder="Posizione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le posizioni</SelectItem>
            {positions?.map((position) => (
              <SelectItem key={position.id} value={position.id}>
                {position.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          name="sort"
          value={currentSort}
          onValueChange={handleSort}
          disabled={isPending}
        >
          <SelectTrigger className="w-auto @[800px]w-full">
            <ArrowUpDown className="w-4 h-4" />
            <SelectValue placeholder="Ordinamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Più recenti</SelectItem>
            <SelectItem value="oldest">Più vecchi</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="status">Stato</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="outlineDestructive" asChild disabled={isPending}>
            <Link href={pathname}>
              <X className="mr-1 size-4" />
              Reset
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};
