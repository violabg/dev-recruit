"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Edit, Eye, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type PresetsTableProps = {
  presets: Preset[];
  onEdit: (preset: Preset) => void;
  onRefresh: () => void;
};

export function PresetsTable({
  presets,
  onEdit,
  onRefresh,
}: PresetsTableProps) {
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (presetId: string) => {
    startTransition(async () => {
      const result = await deletePresetAction(presetId);

      if (result.success) {
        toast.success("Preset deleted successfully");
        setDeleteId(null);
        onRefresh();
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
              presets.map((preset) => (
                <TableRow key={preset.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{preset.label}</p>
                      <p className="text-muted-foreground text-sm">
                        {preset.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {preset.questionType.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Level {preset.difficulty}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {preset.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
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
                        onClick={() => onEdit(preset)}
                        title="Edit preset"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(preset.id!)}
                        disabled={isPending}
                        title="Delete preset"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this preset? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
