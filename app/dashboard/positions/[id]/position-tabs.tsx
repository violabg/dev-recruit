"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PositionTab } from "@/lib/utils/position-setup";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * The three tabs of the position page. Controlled value kept in step with the
 * server's `tab` prop; switching tab writes the new ?tab= value, while the
 * server page keeps building the three TabsContent elements.
 */
export function PositionTabs({
  tab,
  incomplete,
  children,
}: {
  tab: PositionTab;
  incomplete: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [value, setValue] = useState<PositionTab>(tab);

  useEffect(() => {
    // Controlled tabs: adopt the value the server resolved (legacy ?tab= or
    // a new default) after navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(tab);
  }, [tab]);

  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        setValue(next as PositionTab);
        router.replace(`?tab=${next}` as never, { scroll: false });
      }}
    >
      <TabsList variant="line">
        <TabsTrigger value="candidati">Candidati</TabsTrigger>
        <TabsTrigger value="criteri">
          Criteri e domande
          {incomplete && (
            <span className="ml-1.5 text-warning text-xs">da completare</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="dettagli">Dettagli</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
}
