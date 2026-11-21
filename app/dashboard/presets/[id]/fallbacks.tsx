import {
  BadgeSkeleton,
  ButtonSkeleton,
  PageHeaderSkeleton,
  TextSkeleton,
} from "@/components/skeletons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Mirrors PresetDetailContent: header (label, description, edit + delete),
 * then the Configurazione and Guida AI cards with static titles.
 */
export function PresetDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton
        titleClassName="w-72"
        description
        actions={
          <>
            <ButtonSkeleton size="sm" className="w-24" />
            <ButtonSkeleton size="sm" className="w-24" />
          </>
        }
      />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>Configurazione</CardTitle>
            <CardDescription>
              Metadati essenziali catturati in questo preset.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <BadgeSkeleton className="w-28" />
              <BadgeSkeleton className="w-20" />
            </div>
            <div className="gap-4 grid sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">Identificatore</p>
                <TextSkeleton lineClassName="h-6" className="w-40" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Icona</p>
                <TextSkeleton lineClassName="h-6" className="w-20" />
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Tag</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <BadgeSkeleton />
                <BadgeSkeleton className="w-20" />
                <BadgeSkeleton className="w-12" />
              </div>
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
          <CardContent>
            <p className="text-muted-foreground text-sm">Istruzioni</p>
            <div className="flex flex-col gap-1 mt-2">
              <TextSkeleton className="w-full" />
              <TextSkeleton className="w-4/5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Mirrors EditPresetContent: the static card header and form fields. */
export function EditPresetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex items-center gap-4">
        <ButtonSkeleton size="icon" />
        <div>
          <CardTitle className="text-2xl">Modifica preset</CardTitle>
          <CardDescription>
            Aggiorna la configurazione di questo preset prima di riutilizzarlo
            nei tuoi test.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <TextSkeleton className="w-28" />
            <ButtonSkeleton className="rounded-lg w-full h-9" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
