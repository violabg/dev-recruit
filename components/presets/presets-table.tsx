"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
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
import { Edit, Eye } from "lucide-react";
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
                <TableCell
                  colSpan={5}
                  className="py-8 text-muted-foreground text-center"
                >
                  Nessun preset ancora. Crea il tuo primo preset!
                </TableCell>
              </TableRow>
            ) : (
              presets.map((preset) => {
                const Icon = getPresetIcon(preset.icon);
                return (
                  <TableRow key={preset.id}>
                    <TableCell>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Vai al dettaglio"
                          asChild
                        >
                          <Link href={`/dashboard/presets/${preset.id}`}>
                            <Eye className="w-4 h-4 text-primary" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Modifica preset"
                          asChild
                        >
                          <Link href={`/dashboard/presets/${preset.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <DeleteWithConfirm
                          deleteAction={deletePresetAction.bind(
                            null,
                            preset.id!
                          )}
                          iconOnly
                          variant="ghost"
                          successMessage="Preset eliminato con successo"
                          errorMessage="Errore nell'eliminazione del preset"
                          description="Sei sicuro di voler eliminare questo preset? Questa azione è irreversibile."
                        />
                      </div>
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
