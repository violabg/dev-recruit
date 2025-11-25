"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type ViewTabsProps = {
  defaultValue: "table" | "grid";
  tableContent: React.ReactNode;
  gridContent: React.ReactNode;
};

/**
 * URL-controlled tabs component for quiz view switching
 * Syncs tab state with URL search params for shareable links
 */
export function QuizViewTabs({
  defaultValue,
  tableContent,
  gridContent,
}: ViewTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleViewChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "table") {
        params.delete("view");
      } else {
        params.set("view", value);
      }
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [router, pathname, searchParams]
  );

  return (
    <Tabs
      defaultValue={defaultValue}
      className="w-full"
      onValueChange={handleViewChange}
    >
      <div className="flex justify-between items-center">
        <TabsList>
          <TabsTrigger value="table">Tabella</TabsTrigger>
          <TabsTrigger value="grid">Griglia</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="table" className="pt-4">
        {tableContent}
      </TabsContent>
      <TabsContent value="grid" className="@container pt-4">
        {gridContent}
      </TabsContent>
    </Tabs>
  );
}
