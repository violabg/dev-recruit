"use client";

import { useEffect, useState } from "react";

import { type Preset } from "@/lib/schemas";
import { PresetGenerationButtonsClient } from "./preset-generation-buttons-client";
import { PresetGenerationButtonsProps } from "./preset-generation-buttons.types";

export function PresetGenerationButtons(props: PresetGenerationButtonsProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadPresets = async () => {
      try {
        const response = await fetch("/api/presets", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Failed to load presets");
        }

        const data: Preset[] = await response.json();

        if (isMounted) {
          setPresets(data);
        }
      } catch (error) {
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPresets();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PresetGenerationButtonsClient
      presets={presets}
      onGeneratePreset={props.onGeneratePreset}
      loading={isLoading}
    />
  );
}
