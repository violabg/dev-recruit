"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deletePresetAction } from "@/lib/actions/presets";
import { type Preset } from "@/lib/schemas";
import { getPresetIcon } from "@/lib/utils/preset-icons";
import { Edit, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type PresetsTableProps = {
  presets: Preset[];
};

export function PresetsTable({ presets }: PresetsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (presetId: string) => {
    startTransition(async () => {
      const result = await deletePresetAction(presetId);

      if (result.success) {
        toast.success("Preset deleted successfully");
        setConfirmDeleteId(null);
      } else {
        toast.error(result.error || "Failed to delete preset");
      }
    });
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-muted-foreground text-center"
                >
                  No presets yet. Create your first preset!
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
                        Level {preset.difficulty}
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
                          title="Edit preset"
                          asChild
                        >
                          <Link href={`/dashboard/presets/${preset.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Popover
                          open={confirmDeleteId === preset.id}
                          onOpenChange={(open) =>
                            open
                              ? setConfirmDeleteId(preset.id!)
                              : setConfirmDeleteId(null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete preset"
                              disabled={isPending}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64">
                            <p className="text-muted-foreground text-sm">
                              Are you sure you want to delete this preset? This
                              is irreversible.
                            </p>
                            <div className="flex justify-end gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isPending}
                                onClick={() =>
                                  preset.id && handleDelete(preset.id)
                                }
                              >
                                {isPending ? "Deleting..." : "Delete"}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
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
