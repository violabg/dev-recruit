"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useDebouncedCallback } from "use-debounce";

export function SearchPresets({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [inputValue, setInputValue] = useState(defaultValue ?? "");

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
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    });
  }, 800);

  // Sync input value with URL params
  useEffect(() => {
    setInputValue(searchParams.get("search") || "");
  }, [searchParams]);

  const hasFilters = searchParams.get("search");

  return (
    <div className="flex flex-1 gap-2">
      <div className="relative flex-1">
        {isPending ? (
          <Loader2 className="top-2.5 left-2.5 absolute w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="top-2.5 left-2.5 absolute w-4 h-4 text-muted-foreground" />
        )}
        <Input
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
          <Link href={pathname}>
            <X className="mr-1 size-4" />
            Reset
          </Link>
        </Button>
      )}
    </div>
  );
}
