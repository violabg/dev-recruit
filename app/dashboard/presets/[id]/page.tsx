import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import { deletePresetAction, getPresetAction } from "@/lib/actions/presets";
import { getRecentPresetIds } from "@/lib/data/presets";
import { Edit } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const presetIds = await getRecentPresetIds(100);

  return presetIds.map((id) => ({ id }));
}

type PresetDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const toTitleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const formatEnum = (value?: string | null) =>
  value ? toTitleCase(value) : "Non specificato";

const formatBoolean = (value?: boolean | null) => {
  if (value === undefined || value === null) {
    return "Non specificato";
  }

  return value ? "Sì" : "No";
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
        label: "Complessità distrattori",
        value: formatEnum(preset.distractorComplexity),
      },
      {
        label: "Aree di focus",
        value: preset.focusAreas?.length
          ? `${preset.focusAreas.length} configurati`
          : "Non specificato",
      },
    ],
    open_question: [
      {
        label: "Richiedi esempio codice",
        value: formatBoolean(preset.requireCodeExample),
      },
      {
        label: "Lunghezza risposta attesa",
        value: formatEnum(preset.expectedResponseLength),
      },
      {
        label: "Criteri di valutazione",
        value: preset.evaluationCriteria?.length
          ? `${preset.evaluationCriteria.length} configurati`
          : "Non specificato",
      },
    ],
    code_snippet: [
      {
        label: "Linguaggio",
        value: preset.language?.trim() || "Non specificato",
      },
      {
        label: "Tipo bug",
        value: formatEnum(preset.bugType),
      },
      {
        label: "Complessità codice",
        value: formatEnum(preset.codeComplexity),
      },
      {
        label: "Includi commenti",
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
            Dettagli preset
          </p>
          <h1 className="font-bold text-3xl tracking-tight">{preset.label}</h1>
          <p className="mt-2 text-muted-foreground">
            {preset.description || "Nessuna descrizione fornita."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link
              href={
                `/dashboard/presets/${preset.id}/edit` as Route<`/dashboard/presets/${string}/edit`>
              }
            >
              <Edit className="mr-1 w-4 h-4" />
              Modifica
            </Link>
          </Button>
          <DeleteWithConfirm
            deleteAction={deletePresetAction.bind(null, preset.id)}
            description="Questa azione non può essere annullata. Il preset verrà rimosso da tutte le posizioni che ne dipendono."
            successMessage="Preset eliminato con successo"
            errorMessage="Errore nell'eliminazione del preset"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>Configurazione</CardTitle>
            <CardDescription>
              Metadati essenziali catturati in questo preset.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">
                {preset.questionType.replace(/_/g, " ")}
              </Badge>
              <Badge variant="secondary">Livello {preset.difficulty}</Badge>
              {preset.isDefault && <Badge variant="default">Predefinito</Badge>}
            </div>

            <div className="gap-4 grid sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">Identificatore</p>
                <p className="font-medium">{preset.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Icona</p>
                <p className="font-medium">{preset.icon}</p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">Tag</p>
              {preset.tags.length === 0 ? (
                <p className="mt-2 text-muted-foreground text-sm">
                  Nessun tag configurato per questo preset.
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
            <CardTitle>Guida AI</CardTitle>
            <CardDescription>
              Vengono mostrate solo le istruzioni rilevanti per questo tipo di
              domanda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-muted-foreground text-sm">Istruzioni</p>
              {preset.instructions ? (
                <p className="mt-2 text-sm whitespace-pre-line">
                  {preset.instructions}
                </p>
              ) : (
                <p className="mt-2 text-muted-foreground text-sm">
                  Nessuna istruzione aggiuntiva fornita.
                </p>
              )}
            </div>

            {isMultipleChoice && (
              <div>
                <p className="text-muted-foreground text-sm">Aree di focus</p>
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
                    Nessuna area di focus configurata.
                  </p>
                )}
              </div>
            )}

            {isOpenQuestion && (
              <div>
                <p className="text-muted-foreground text-sm">
                  Criteri di valutazione
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
                    Nessun criterio di valutazione definito.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {questionBehaviorItems.length > 0 && (
          <Card>
            <CardHeader className="flex flex-col gap-1">
              <CardTitle>Comportamento domanda</CardTitle>
              <CardDescription>
                Opzioni dettagliate specifiche per il{" "}
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
