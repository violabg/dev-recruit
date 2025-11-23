"use client";

import { useState } from "react";

import { PresetForm } from "@/components/presets/preset-form";
import { PresetsTable } from "@/components/presets/presets-table";
import { SeedPresetsButton } from "@/components/presets/seed-presets-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Preset } from "@/lib/schemas";

const CREATE_TAB_SELECTOR = '[value="create"]';

type PresetsClientProps = {
  presets: Preset[];
};

export function PresetsClient({ presets }: PresetsClientProps) {
  const [editingPreset, setEditingPreset] = useState<Preset | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    setEditingPreset(undefined);
  };

  return (
    <Tabs defaultValue="list" className="w-full" key={refreshKey}>
      <TabsList>
        <TabsTrigger value="list">All Presets ({presets.length})</TabsTrigger>
        <TabsTrigger value="create">
          {editingPreset ? "Edit Preset" : "Create New"}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>Question Generation Presets</CardTitle>
              <CardDescription>
                Manage your preset configurations for automated question
                generation
              </CardDescription>
            </div>
            {presets.length === 0 && (
              <SeedPresetsButton onSuccess={handleRefresh} />
            )}
          </CardHeader>
          <CardContent>
            <PresetsTable
              presets={presets}
              onEdit={(preset) => {
                setEditingPreset(preset);
                setTimeout(() => {
                  document
                    .querySelector(CREATE_TAB_SELECTOR)
                    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
                }, 100);
              }}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="create">
        <PresetForm preset={editingPreset} onSuccess={handleRefresh} />
      </TabsContent>
    </Tabs>
  );
}
