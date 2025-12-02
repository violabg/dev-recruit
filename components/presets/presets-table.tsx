"use client";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { EntityActionsMenu } from "@/components/ui/entity-actions-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deletePresetAction } from "@/lib/actions/presets";
import { type Preset } from "@/lib/data/presets";
import { getPresetIcon } from "@/lib/utils/preset-icons";
import { Settings2 } from "lucide-react";
import Link from "next/link";

type PresetsTableProps = {
  presets: Preset[];
};

export function PresetsTable({ presets }: PresetsTableProps) {
  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Difficoltà</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <Empty className="h-[200px]">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Settings2 />
                      </EmptyMedia>
                      <EmptyTitle>Nessun preset ancora</EmptyTitle>
                      <EmptyDescription>
                        Crea il tuo primo preset per iniziare.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              presets.map((preset) => {
                const Icon = getPresetIcon(preset.icon);
                return (
                  <TableRow key={preset.id} className="group relative">
                    <TableCell>
                      <Link
                        href={`/dashboard/presets/${preset.id}`}
                        className="absolute inset-0"
                      />
                      <div className="flex items-center gap-3">
                        <Icon
                          className="size-5 text-primary"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-medium">{preset.label}</p>
                          <p className="text-muted-foreground text-sm">
                            {preset.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {preset.questionType.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        Livello {preset.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {preset.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {preset.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{preset.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="z-10 relative text-right">
                      <EntityActionsMenu
                        entityId={preset.id!}
                        editHref={`/dashboard/presets/${preset.id}/edit`}
                        deleteAction={deletePresetAction.bind(null, preset.id!)}
                        deleteSuccessMessage="Preset eliminato con successo"
                        deleteErrorMessage="Errore nell'eliminazione del preset"
                        deleteDescription="Sei sicuro di voler eliminare questo preset? Questa azione è irreversibile."
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
