"use client";
import {
  InputField,
  MultiSelectField,
  SelectField,
  SliderField,
  SwitchField,
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
import { type z } from "zod/v4";

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

const DISTRACTOR_COMPLEXITY_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "simple", label: "Simple" },
  { value: "moderate", label: "Moderate" },
  { value: "complex", label: "Complex" },
];

const EXPECTED_RESPONSE_LENGTH_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

const BUG_TYPE_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "syntax", label: "Syntax" },
  { value: "logic", label: "Logic" },
  { value: "performance", label: "Performance" },
  { value: "security", label: "Security" },
];

const CODE_COMPLEXITY_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "basic", label: "Basic" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

type PresetFormProps = {
  preset?: Preset;
};

type PresetFormValues = z.input<typeof createPresetSchema>;

export function PresetForm({ preset }: PresetFormProps) {
  const [isPending, startTransition] = useTransition();

  const parseListField = (value: string) =>
    value
      .split(/\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);

  const defaultValues: PresetFormValues = {
    name: preset?.name ?? "",
    label: preset?.label ?? "",
    description: preset?.description ?? "",
    icon: preset?.icon ?? "Code",
    questionType:
      (preset?.questionType as CreatePresetInput["questionType"]) ??
      "multiple_choice",
    tags: preset?.tags ?? [],
    difficulty: preset?.difficulty ?? 3,
    instructions: preset?.instructions ?? "",
    focusAreas: preset?.focusAreas ?? [],
    evaluationCriteria: preset?.evaluationCriteria ?? [],
    language: preset?.language ?? "",
    requireCodeExample: preset?.requireCodeExample ?? false,
    includeComments: preset?.includeComments ?? true,
    distractorComplexity: preset?.distractorComplexity ?? undefined,
    expectedResponseLength: preset?.expectedResponseLength ?? undefined,
    bugType: preset?.bugType ?? undefined,
    codeComplexity: preset?.codeComplexity ?? undefined,
  };

  const form = useForm<PresetFormValues>({
    resolver: zodResolver(createPresetSchema),
    defaultValues,
  });

  const questionType = form.watch("questionType");
  const focusAreasValue = (form.watch("focusAreas") ?? []).join("\n");
  const evaluationCriteriaValue = (form.watch("evaluationCriteria") ?? []).join(
    "\n"
  );

  const onSubmit = (data: PresetFormValues) => {
    startTransition(async () => {
      try {
        const normalizedData: CreatePresetInput = {
          ...data,
          description: data.description?.trim() || undefined,
          instructions: data.instructions?.trim() || undefined,
          focusAreas:
            data.focusAreas && data.focusAreas.length
              ? data.focusAreas
              : undefined,
          distractorComplexity: data.distractorComplexity || undefined,
          expectedResponseLength: data.expectedResponseLength || undefined,
          evaluationCriteria:
            data.evaluationCriteria && data.evaluationCriteria.length
              ? data.evaluationCriteria
              : undefined,
          language: data.language?.trim() || undefined,
          bugType: data.bugType || undefined,
          codeComplexity: data.codeComplexity || undefined,
        } as CreatePresetInput;

        const result = preset
          ? await updatePresetAction(preset.id!, normalizedData)
          : await createPresetAction(normalizedData);

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

          <TextareaField
            control={form.control}
            name="instructions"
            label="AI Instructions"
            placeholder="Additional guidance for the AI when generating questions"
            description="Helps the AI focus on specific requirements or patterns"
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

          {questionType === "multiple_choice" && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium text-base">Multiple Choice Options</h3>
              <div>
                <label className="font-medium text-sm">Focus Areas</label>
                <textarea
                  className="flex bg-background disabled:opacity-50 mt-2 px-3 py-2 border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-background focus-visible:ring-offset-2 w-full min-h-20 placeholder:text-muted-foreground text-base"
                  value={focusAreasValue}
                  onChange={(event) =>
                    form.setValue(
                      "focusAreas",
                      parseListField(event.target.value),
                      { shouldDirty: true, shouldValidate: true }
                    )
                  }
                  placeholder={"React Hooks\nState Management\nPerformance"}
                />
                <p className="mt-2 text-muted-foreground text-sm">
                  Enter one topic per line to help the AI focus the question.
                </p>
              </div>

              <SelectField
                control={form.control}
                name="distractorComplexity"
                label="Distractor Complexity"
                options={DISTRACTOR_COMPLEXITY_OPTIONS}
                description="How nuanced the incorrect answers should be"
              />
            </div>
          )}

          {questionType === "open_question" && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium text-base">Open Question Options</h3>
              <SwitchField
                control={form.control}
                name="requireCodeExample"
                label="Require Code Example"
                description="If enabled, candidates must include a code sample"
              />

              <SelectField
                control={form.control}
                name="expectedResponseLength"
                label="Expected Response Length"
                options={EXPECTED_RESPONSE_LENGTH_OPTIONS}
                description="Let the AI know how detailed the answer should be"
              />

              <div>
                <label className="font-medium text-sm">
                  Evaluation Criteria
                </label>
                <textarea
                  className="flex bg-background disabled:opacity-50 mt-2 px-3 py-2 border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-background focus-visible:ring-offset-2 w-full min-h-20 placeholder:text-muted-foreground text-base"
                  value={evaluationCriteriaValue}
                  onChange={(event) =>
                    form.setValue(
                      "evaluationCriteria",
                      parseListField(event.target.value),
                      { shouldDirty: true, shouldValidate: true }
                    )
                  }
                  placeholder={"scalability\ntrade-offs\nsecurity"}
                />
                <p className="mt-2 text-muted-foreground text-sm">
                  One criterion per line. These will guide the scoring rubric.
                </p>
              </div>
            </div>
          )}

          {questionType === "code_snippet" && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h3 className="font-medium text-base">Code Snippet Options</h3>
              <InputField
                control={form.control}
                name="language"
                label="Primary Language"
                placeholder="e.g., typescript"
                description="Language the buggy snippet should use"
              />

              <SelectField
                control={form.control}
                name="bugType"
                label="Bug Type"
                options={BUG_TYPE_OPTIONS}
                description="What kind of issue should the snippet include"
              />

              <SelectField
                control={form.control}
                name="codeComplexity"
                label="Code Complexity"
                options={CODE_COMPLEXITY_OPTIONS}
                description="Helps tune the length and difficulty of the snippet"
              />

              <SwitchField
                control={form.control}
                name="includeComments"
                label="Include Comments"
                description="Whether the snippet should contain inline comments"
              />
            </div>
          )}

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
