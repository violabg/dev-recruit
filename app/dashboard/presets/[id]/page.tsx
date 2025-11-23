import { PresetDetailsActions } from "@/components/presets/preset-details-actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPresetAction } from "@/lib/actions/presets";
import { notFound } from "next/navigation";

type PresetDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const toTitleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const formatEnum = (value?: string | null) =>
  value ? toTitleCase(value) : "Not specified";

const formatBoolean = (value?: boolean | null) => {
  if (value === undefined || value === null) {
    return "Not specified";
  }

  return value ? "Yes" : "No";
};

export default async function PresetDetailPage({
  params,
}: PresetDetailPageProps) {
  const { id } = await params;
  const result = await getPresetAction(id);

  if (!result.success || !result.preset) {
    notFound();
  }

  const preset = result.preset;
  const behaviorByType: Record<string, { label: string; value: string }[]> = {
    multiple_choice: [
      {
        label: "Distractor Complexity",
        value: formatEnum(preset.distractorComplexity),
      },
      {
        label: "Focus Areas",
        value: preset.focusAreas?.length
          ? `${preset.focusAreas.length} configured`
          : "Not specified",
      },
    ],
    open_question: [
      {
        label: "Require Code Example",
        value: formatBoolean(preset.requireCodeExample),
      },
      {
        label: "Expected Response Length",
        value: formatEnum(preset.expectedResponseLength),
      },
      {
        label: "Evaluation Criteria",
        value: preset.evaluationCriteria?.length
          ? `${preset.evaluationCriteria.length} configured`
          : "Not specified",
      },
    ],
    code_snippet: [
      {
        label: "Language",
        value: preset.language?.trim() || "Not specified",
      },
      {
        label: "Bug Type",
        value: formatEnum(preset.bugType),
      },
      {
        label: "Code Complexity",
        value: formatEnum(preset.codeComplexity),
      },
      {
        label: "Include Comments",
        value: formatBoolean(preset.includeComments),
      },
    ],
  };
  const questionBehaviorItems = behaviorByType[preset.questionType] ?? [];
  const isMultipleChoice = preset.questionType === "multiple_choice";
  const isOpenQuestion = preset.questionType === "open_question";

  return (
    <div className="space-y-6">
      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-start gap-4">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Preset details
          </p>
          <h1 className="font-bold text-3xl tracking-tight">{preset.label}</h1>
          <p className="mt-2 text-muted-foreground">
            {preset.description || "No description provided."}
          </p>
        </div>
        <PresetDetailsActions presetId={preset.id} />
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Essential metadata captured inside this preset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">
                {preset.questionType.replace(/_/g, " ")}
              </Badge>
              <Badge variant="secondary">Level {preset.difficulty}</Badge>
              {preset.isDefault && <Badge variant="default">Default</Badge>}
            </div>

            <div className="gap-4 grid sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">Identifier</p>
                <p className="font-medium">{preset.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Icon</p>
                <p className="font-medium">{preset.icon}</p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Tags</p>
              {preset.tags.length === 0 ? (
                <p className="mt-2 text-muted-foreground text-sm">
                  No tags configured for this preset.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  {preset.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>AI Guidance</CardTitle>
            <CardDescription>
              Only the instructions relevant to this question type are shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-muted-foreground text-sm">Instructions</p>
              {preset.instructions ? (
                <p className="mt-2 text-sm whitespace-pre-line">
                  {preset.instructions}
                </p>
              ) : (
                <p className="mt-2 text-muted-foreground text-sm">
                  No additional instructions provided.
                </p>
              )}
            </div>

            {isMultipleChoice && (
              <div>
                <p className="text-muted-foreground text-sm">Focus Areas</p>
                {preset.focusAreas?.length ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {preset.focusAreas.map((area) => (
                      <Badge key={area} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-muted-foreground text-sm">
                    No focus areas configured.
                  </p>
                )}
              </div>
            )}

            {isOpenQuestion && (
              <div>
                <p className="text-muted-foreground text-sm">
                  Evaluation Criteria
                </p>
                {preset.evaluationCriteria?.length ? (
                  <ul className="space-y-1 mt-2 text-sm">
                    {preset.evaluationCriteria.map((criterion) => (
                      <li key={criterion} className="flex items-center gap-2">
                        <span className="bg-muted-foreground/60 rounded-full w-1.5 h-1.5" />
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-muted-foreground text-sm">
                    No evaluation criteria defined.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {questionBehaviorItems.length > 0 && (
          <Card>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle>Question Behavior</CardTitle>
              <CardDescription>
                Fine-grained options specific to the{" "}
                {toTitleCase(preset.questionType)} preset.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="gap-4 grid sm:grid-cols-2">
                {questionBehaviorItems.map((item) => (
                  <div key={item.label}>
                    <p className="text-muted-foreground text-sm">
                      {item.label}
                    </p>
                    <p className="mt-1 font-medium text-sm">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
