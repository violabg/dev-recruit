"use client";
import { type Preset } from "@/lib/data/presets";
import { QuestionType } from "@/lib/schemas";
import { getPresetIcon } from "@/lib/utils/preset-icons";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";
import { ChevronsUpDown, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

export type Props = {
  onGeneratePreset: (
    type: QuestionType,
    preset: string,
    options: any
  ) => Promise<void>;
  loading: boolean;
};

export function PresetGenerationButtons(props: Props) {
  const { onGeneratePreset, loading } = props;
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isOpen, setIsOpen] = useState(false);

  const handlePresetClick = async (preset: Preset) => {
    await onGeneratePreset(preset.questionType as QuestionType, preset.id, {
      ...preset,
      llmModel: "llama-3.3-70b-versatile",
    });
  };

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Smart Question Presets
          </CardTitle>
          <CardDescription>
            <Button variant="outline">
              Genera domande automaticamente utilizzando preset predefiniti
              <ChevronsUpDown />
              <span className="sr-only">Toggle</span>
            </Button>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Smart Question Presets
          </CardTitle>
          <CardDescription>
            <CollapsibleTrigger asChild>
              <Button variant="outline">
                Genera domande automaticamente utilizzando preset predefiniti
                <ChevronsUpDown />
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </CardDescription>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="gap-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {presets.length === 0 ? (
                <p className="col-span-full text-muted-foreground text-sm">
                  Nessun preset disponibile al momento.
                </p>
              ) : (
                presets.map((preset) => {
                  const IconComponent = getPresetIcon(preset.icon);
                  return (
                    <Button
                      key={preset.id}
                      variant="outline"
                      className="flex flex-col items-start hover:bg-accent p-4 h-auto text-left"
                      onClick={() => handlePresetClick(preset)}
                      disabled={loading}
                    >
                      <div className="flex items-center gap-2 mb-2 w-full">
                        <IconComponent className="size-4 text-primary" />
                        <span className="font-medium text-sm">
                          {preset.label}
                        </span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Level {preset.difficulty}
                        </Badge>
                      </div>
                      <p className="mb-2 text-muted-foreground text-xs">
                        {preset.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {preset.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="px-1 py-0 text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </Button>
                  );
                })
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
