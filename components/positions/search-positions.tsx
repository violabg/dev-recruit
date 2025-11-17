"use client";

import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function SearchPositions({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);

    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }

    startTransition(() => {
      router.push(`/dashboard/positions?${params.toString()}`);
    });
  }

  return (
    <div className="relative flex-1">
      {isPending ? (
        <Loader2 className="top-2.5 left-2.5 absolute w-4 h-4 text-muted-foreground animate-spin" />
      ) : (
        <Search className="top-2.5 left-2.5 absolute w-4 h-4 text-muted-foreground" />
      )}
      <Input
        type="search"
        placeholder="Cerca posizioni..."
        className="pl-8"
        defaultValue={defaultValue ?? ""}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  );
}
