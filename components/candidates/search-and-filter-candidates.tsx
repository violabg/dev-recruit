"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState(
    searchParams.get("search") || ""
  );

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      replace(`/dashboard/candidates?${params.toString()}`);
    });
  }, 800);

  const handleStatus = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (value && value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    startTransition(() => {
      replace(`/dashboard/candidates?${params.toString()}`);
    });
  };

  const handlePosition = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (value && value !== "all") {
      params.set("position", value);
    } else {
      params.delete("position");
    }
    startTransition(() => {
      replace(`/dashboard/candidates?${params.toString()}`);
    });
  };

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    startTransition(() => {
      replace(`/dashboard/candidates?${params.toString()}`);
    });
  };

  useEffect(() => {
    setInputValue(searchParams.get("search") || "");
  }, [searchParams]);

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "all";
  const currentPosition = searchParams.get("position") || "all";
  const currentSort = searchParams.get("sort") || "newest";

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
            <SelectValue placeholder="Ordinamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Più recenti</SelectItem>
            <SelectItem value="oldest">Più vecchi</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="status">Stato</SelectItem>
          </SelectContent>
        </Select>
        {(currentSearch ||
          currentStatus !== "all" ||
          currentPosition !== "all" ||
          currentSort !== "newest") && (
          <Button variant="outlineDestructive" asChild disabled={isPending}>
            <Link href="/dashboard/candidates">Resetta</Link>
          </Button>
        )}
      </div>
    </div>
  );
};
