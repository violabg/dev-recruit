"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

export function SearchPresets() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("search") || "";
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  // Track local input separately from URL - only sync on mount
  const urlSearch = searchParams.get("search") || "";
  const [inputValue, setInputValue] = useState(q ?? urlSearch);
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
      router.push(url as "/dashboard/presets");
    });
  }, 800);

  const hasFilters = searchParams.get("search");

  return (
    <div className="flex flex-1 gap-2">
      <div className="relative flex-1">
        {isPending ? (
          <Loader2 className="top-2.5 left-2.5 absolute size-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="top-2.5 left-2.5 absolute size-4 text-muted-foreground" />
        )}
        <Input
          ref={inputRef}
          type="search"
          placeholder="Cerca preset per nome, etichetta o tag..."
          className="pl-8"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            handleSearch(e.target.value);
          }}
          disabled={isPending}
        />
      </div>
      {hasFilters && (
        <Button variant="outlineDestructive" asChild disabled={isPending}>
          <Link href={pathname as "/dashboard/presets"}>
            <X className="mr-1 size-4" />
            Reset
          </Link>
        </Button>
      )}
    </div>
  );
}
