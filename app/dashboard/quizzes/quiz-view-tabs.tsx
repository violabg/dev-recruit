"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type ViewTabsProps = {
  defaultValue: "table" | "grid";
  tableContent: React.ReactNode;
  gridContent: React.ReactNode;
  quizCount: number;
};

/**
 * URL-controlled tabs component for quiz view switching
 * Syncs tab state with URL search params for shareable links
 */
export function QuizViewTabs({
  defaultValue,
  tableContent,
  gridContent,
  quizCount,
}: ViewTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleViewChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value === "table") {
        params.delete("view");
      } else {
        params.set("view", value);
      }
      router.replace(`/dashboard/quizzes?${params.toString()}`);
    },
    [router, searchParams]
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
        <div className="text-muted-foreground text-sm">
          {quizCount} quiz trovati
        </div>
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
