"use client";

import {
  InputField,
  MultiSelectField,
  SelectField,
  SliderField,
  TextareaField,
} from "@/components/rhf-inputs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createPresetAction, updatePresetAction } from "@/lib/actions/presets";
import {
  createPresetSchema,
  type CreatePresetInput,
  type Preset,
} from "@/lib/schemas";
import { PRESET_ICON_OPTIONS } from "@/lib/utils/preset-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "code_snippet", label: "Code Snippet" },
  { value: "open_question", label: "Open Question" },
];

const COMMON_TAGS = [
  "React",
  "TypeScript",
  "JavaScript",
  "API",
  "Database",
  "Security",
  "Performance",
  "Frontend",
  "Backend",
  "FullStack",
  "Hooks",
  "Advanced",
  "Intermediate",
  "Beginner",
  "Algorithms",
  "Design Patterns",
  "Best Practices",
];

type PresetFormProps = {
  preset?: Preset;
};

export function PresetForm({ preset }: PresetFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreatePresetInput>({
    resolver: zodResolver(createPresetSchema),
    defaultValues: preset
      ? {
          name: preset.name,
          label: preset.label,
          description: preset.description || "",
          icon: preset.icon,
          questionType: preset.questionType as any,
          tags: preset.tags,
          difficulty: preset.difficulty,
          options: preset.options,
        }
      : {
          name: "",
          label: "",
          description: "",
          icon: "Code",
          questionType: "multiple_choice",
          tags: [],
          difficulty: 3,
          options: {},
        },
  });

  const onSubmit = (data: CreatePresetInput) => {
    startTransition(async () => {
      try {
        const result = preset
          ? await updatePresetAction(preset.id!, data)
          : await createPresetAction(data);

        if (result && !result.success) {
          toast.error(result.error || "Something went wrong");
        }
      } catch (error) {
        if (error instanceof Error && error.name === "Redirect") {
          throw error;
        }

        toast.error(
          error instanceof Error ? error.message : "Something went wrong"
        );
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{preset ? "Edit Preset" : "Create New Preset"}</CardTitle>
        <CardDescription>
          {preset
            ? "Update the preset configuration"
            : "Create a new question generation preset"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
            <InputField
              control={form.control}
              name="name"
              label="Preset Name"
              placeholder="e.g., react-hooks"
              description="Unique identifier for the preset"
            />

            <InputField
              control={form.control}
              name="label"
              label="Display Label"
              placeholder="e.g., React Hooks Expert"
              description="Human-readable name"
            />
          </div>

          <TextareaField
            control={form.control}
            name="description"
            label="Description"
            placeholder="Describe what this preset is for..."
            description="Optional description of the preset"
          />

          <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
            <SelectField
              control={form.control}
              name="icon"
              label="Icon"
              options={PRESET_ICON_OPTIONS.map((icon) => ({
                value: icon.value,
                label: icon.label,
                leading: (
                  <icon.icon
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                ),
              }))}
              description="Choose an icon from lucide-react"
            />

            <SelectField
              control={form.control}
              name="questionType"
              label="Question Type"
              options={QUESTION_TYPES}
              description="Type of questions this preset generates"
            />

            <SliderField
              control={form.control}
              name="difficulty"
              label="Difficulty Level"
              min={1}
              max={5}
              step={1}
              description="1 = Beginner, 5 = Expert"
            />
          </div>

          <MultiSelectField
            control={form.control}
            name="tags"
            label="Tags"
            options={COMMON_TAGS.map((tag) => ({
              value: tag,
              label: tag,
            }))}
            description="Select relevant tags for this preset"
          />

          <div>
            <label className="font-medium text-sm">Options (JSON)</label>
            <textarea
              className="flex bg-background disabled:opacity-50 mt-2 px-3 py-2 border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-background focus-visible:ring-offset-2 w-full min-h-[100px] placeholder:text-muted-foreground text-base disabled:cursor-not-allowed"
              value={JSON.stringify(form.watch("options"), null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  form.setValue("options", parsed);
                } catch {
                  // Invalid JSON, let user continue typing
                }
              }}
              placeholder='{"focusAreas": ["React"], "difficulty": "advanced"}'
            />
            <p className="mt-2 text-muted-foreground text-sm">
              Configuration options for this preset (JSON format)
            </p>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending
              ? "Saving..."
              : preset
              ? "Update Preset"
              : "Create Preset"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
