"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PresetsTable } from "@/components/presets/presets-table";
import { SeedPresetsButton } from "@/components/presets/seed-presets-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Preset } from "@/lib/schemas";

type PresetsClientProps = {
  presets: Preset[];
};

export function PresetsClient({ presets }: PresetsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => router.refresh());
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex sm:flex-row flex-col sm:justify-between sm:items-start gap-4">
        <div>
          <CardTitle>Question Generation Presets</CardTitle>
          <CardDescription>
            Manage your preset configurations for automated question generation
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {presets.length === 0 && (
            <SeedPresetsButton onSuccess={handleRefresh} />
          )}
          <Button asChild disabled={isPending} variant="secondary" size="sm">
            <Link href="/dashboard/presets/new">Create preset</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <PresetsTable presets={presets} onRefresh={handleRefresh} />
      </CardContent>
    </Card>
  );
}
