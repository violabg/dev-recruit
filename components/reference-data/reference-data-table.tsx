"use client";
import { Button } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteReferenceDataAction,
  reorderReferenceDataAction,
} from "@/lib/actions/reference-data";
import { type ReferenceCategory } from "@/lib/constants/reference-categories";
import { closestCenter, DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ReferenceDataForm } from "./reference-data-form";

interface Item {
  id: string;
  label: string;
  category: ReferenceCategory | string;
  order: number;
  isActive: boolean;
}

interface ReferenceDataTableProps {
  data: Item[];
  category: ReferenceCategory | string;
}

export function ReferenceDataTable({
  data,
  category,
}: ReferenceDataTableProps) {
  const [editItem, setEditItem] = useState<Item | null>(null);
  // Local ordered state for drag & drop
  const [items, setItems] = useState<Item[]>(data);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(data);
  }, [data]);

  // Avoid SSR hydration mismatches by enabling DnD only after client mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sortable row component
  function SortableRow({ item }: { item: Item }) {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: item.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    } as React.CSSProperties;

    return (
      <TableRow ref={setNodeRef} style={style} key={item.id}>
        <TableCell>
          <button
            className="cursor-grab active:cursor-grabbing"
            aria-label="Drag handle"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </TableCell>
        <TableCell>{item.label}</TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditItem(item)}
                  />
                }
              >
                <Pencil className="w-4 h-4" />
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Modifica elemento</DialogTitle>
                </DialogHeader>
                <ReferenceDataForm
                  category={category as ReferenceCategory}
                  defaultValues={
                    editItem
                      ? {
                          id: editItem.id,
                          label: editItem.label,
                          isActive: editItem.isActive,
                          order: editItem.order,
                        }
                      : undefined
                  }
                />
              </DialogContent>
            </Dialog>

            <DeleteWithConfirm
              deleteAction={() => deleteReferenceDataAction(item.id)}
              label="Elimina"
              variant="ghost"
              size="sm"
              successMessage="Elemento eliminato"
            >
              <Button variant="ghost" size="sm">
                <Trash2 className="w-4 h-4" />
              </Button>
            </DeleteWithConfirm>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === String(active.id));
    const newIndex = items.findIndex((i) => i.id === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);

    // Persist order to server (send ordered IDs)
    try {
      await reorderReferenceDataAction({
        category: category as ReferenceCategory,
        itemIds: next.map((i: Item) => i.id),
      });
      toast.success("Ordine aggiornato");
    } catch (e) {
      // Revert on error
      setItems(items);
      console.error(e);
      toast.error("Errore durante il riordinamento");
    }
  }

  return (
    <div>
      {mounted ? (
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Etichetta</TableHead>
                  <TableHead className="w-32">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <SortableRow key={item.id} item={item} />
                ))}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Etichetta</TableHead>
              <TableHead className="w-32">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </TableCell>
                <TableCell>{item.label}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditItem(item)}
                          />
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Modifica elemento</DialogTitle>
                        </DialogHeader>
                        <ReferenceDataForm
                          category={category as ReferenceCategory}
                          defaultValues={
                            editItem
                              ? {
                                  id: editItem.id,
                                  label: editItem.label,
                                  isActive: editItem.isActive,
                                  order: editItem.order,
                                }
                              : undefined
                          }
                        />
                      </DialogContent>
                    </Dialog>

                    <DeleteWithConfirm
                      deleteAction={() => deleteReferenceDataAction(item.id)}
                      label="Elimina"
                      variant="ghost"
                      size="sm"
                      successMessage="Elemento eliminato"
                    >
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </DeleteWithConfirm>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
