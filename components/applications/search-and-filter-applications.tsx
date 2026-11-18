"use client";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APPLICATION_STAGE_VALUES } from "@/lib/schemas";
import {
  Briefcase,
  ClockFading,
  Loader2,
  Search as SearchIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";
import { APPLICATION_STAGE_PRESENTATION } from "./application-stage";

type SelectOption = { value: string; label: string };

const stageOptions: SelectOption[] = [
  { value: "all", label: "Tutte le fasi" },
  ...APPLICATION_STAGE_VALUES.map((stage) => ({
    value: stage,
    label: APPLICATION_STAGE_PRESENTATION[stage].label,
  })),
];

/** Search and filters of the applications list, bound to the URL. */
export function SearchAndFilterApplications({
  positionItems = [],
}: {
  positionItems?: SelectOption[];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const urlSearch = searchParams.get("search") || "";
  const [inputValue, setInputValue] = useState(urlSearch);
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);

  // Sync the input when the URL changes from outside (e.g. Reset)
  if (urlSearch !== lastUrlSearch) {
    setLastUrlSearch(urlSearch);
    setInputValue(urlSearch);
  }

  useEffect(() => {
    if (urlSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [urlSearch]);

  const replaceParams = (update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    update(params);
    startTransition(() => {
      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      replace(url as "/dashboard/applications");
    });
  };

  const setParam = (key: string, value: string | null) =>
    replaceParams((params) => {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

  const handleSearch = useDebouncedCallback(
    (term: string) => setParam("search", term),
    800,
  );

  const currentStage = searchParams.get("stage") || "all";
  const currentPosition = searchParams.get("position") || "all";

  const hasActiveFilters =
    urlSearch || currentStage !== "all" || currentPosition !== "all";

  return (
    <div className="@container flex-1">
      <div className="flex @[700px]:flex-row flex-col gap-4">
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
            placeholder="Cerca candidature..."
            className="pl-8"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              handleSearch(e.target.value);
            }}
          />
        </div>
        <Select
          name="stage"
          items={stageOptions}
          value={currentStage}
          onValueChange={(value) => setParam("stage", value)}
          disabled={isPending}
        >
          <SelectTrigger aria-label="Fase">
            <ClockFading className="size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stageOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          name="position"
          items={[{ value: "all", label: "Tutte le posizioni" }, ...positionItems]}
          value={currentPosition}
          onValueChange={(value) => setParam("position", value)}
          disabled={isPending}
        >
          <SelectTrigger aria-label="Posizione">
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
        {hasActiveFilters && (
          <Link
            href={pathname as "/dashboard/applications"}
            className={buttonVariants({ variant: "ghostDestructive" })}
          >
            <X className="mr-1 size-4" />
            Reset
          </Link>
        )}
      </div>
    </div>
  );
}
