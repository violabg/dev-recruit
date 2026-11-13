import {
  BadgeSkeleton,
  ButtonSkeleton,
  PageHeaderSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors QuizHeader: PageHeader with position/level/time badges + date, and
 * QuizDetailActionsClient (Modifica, Duplica, Associa a candidati, Elimina —
 * all size "sm", h-7).
 */
export function QuizHeaderSkeleton() {
  return (
    <PageHeaderSkeleton
        section="quizzes"
      info={
        <>
          <BadgeSkeleton className="w-28" />
          <BadgeSkeleton className="w-16" />
          <BadgeSkeleton className="w-24" />
          <TextSkeleton className="w-36" />
        </>
      }
      actions={
        <>
          <ButtonSkeleton size="sm" className="w-24" />
          <ButtonSkeleton size="sm" className="w-20" />
          <ButtonSkeleton size="sm" className="w-40" />
          <ButtonSkeleton size="sm" />
        </>
      }
    />
  );
}

/** Mirrors QuizQuestionsContent cards (multiple-choice shape, the most common). */
export function QuizQuestionsTabSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <Card
          key={i}
          className="pt-0"
        >
          <CardHeader className="gap-0 bg-primary/10 pt-4 [.border-b]:pb-4 border-b">
            <CardTitle className="flex justify-between items-center gap-2 text-lg">
              <div className="flex items-center gap-2">
                <span className="flex justify-center items-center border rounded-full w-6 h-6 font-medium text-xs">
                  {i + 1}
                </span>
                <TextSkeleton lineClassName="h-7" className="w-40 h-5" />
              </div>
              {/* SaveFavoriteButton: ghost, size sm */}
              <ButtonSkeleton size="sm" className="w-9" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <h3 className="font-bold dark:text-heading text-sm">Domanda:</h3>
              <div className="mt-1">
                <TextSkeleton lineClassName="h-6" className="w-full max-w-2xl h-4" />
                <TextSkeleton lineClassName="h-6" className="w-full max-w-md h-4" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-bold dark:text-heading text-sm">Opzioni:</h3>
              <div className="flex flex-col gap-4 mt-2">
                {Array.from({ length: 4 }, (_, o) => (
                  <div
                    key={o}
                    className="flex items-center gap-2 p-2 border rounded-md"
                  >
                    <span className="border rounded-full size-5 shrink-0" />
                    <TextSkeleton className="w-full max-w-sm" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

const SETTINGS_LABELS = [
  ["Titolo", "w-40"],
  ["Limite di tempo", "w-20"],
  ["Numero di domande", "w-8"],
  ["Posizione", "w-48"],
] as const;

/** Mirrors QuizSettingsContent: real labels, skeleton values. */
export function QuizSettingsTabSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Impostazioni del quiz</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="gap-4 grid md:grid-cols-2">
          {SETTINGS_LABELS.map(([label, width]) => (
            <div key={label}>
              <h3 className="font-medium">{label}</h3>
              <TextSkeleton className={width} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const RESULTS_HEADERS = [
  "Candidato",
  "Email",
  "Stato",
  "Data Creazione",
  "Data Inizio",
  "Data Completamento",
];

/** Mirrors QuizResultsContent: plain table with real headers. */
export function QuizResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              {RESULTS_HEADERS.map((h) => (
                <th key={h} className="p-2 font-semibold text-left">
                  {h}
                </th>
              ))}
              <th className="p-2 font-semibold text-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 3 }, (_, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">
                  <TextSkeleton className="w-28" />
                </td>
                <td className="p-2">
                  <TextSkeleton className="w-36" />
                </td>
                <td className="p-2">
                  <BadgeSkeleton className="w-20" />
                </td>
                {Array.from({ length: 3 }, (_, d) => (
                  <td key={d} className="p-2">
                    <TextSkeleton lineClassName="h-4" className="w-20 h-3" />
                  </td>
                ))}
                <td className="p-2 text-center">
                  <Skeleton className="inline-block rounded-lg size-8" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
