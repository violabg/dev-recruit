"use client";

import { Button } from "@/components/ui/button";
import { DeleteWithConfirm } from "@/components/ui/delete-with-confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { ReactNode, useState } from "react";

export interface EntityActionsMenuProps {
  /** The ID of the entity (used for delete dialog state) */
  entityId: string;
  /** Link to the edit page */
  editHref?: string;
  /** Label for the edit action (default: "Modifica") */
  editLabel?: string;
  /** Delete action function */
  deleteAction?: () => Promise<void | { success: boolean; error?: string }>;
  /** Title for delete confirmation dialog */
  deleteTitle?: string;
  /** Description for delete confirmation dialog */
  deleteDescription?: string;
  /** Error message for delete failure */
  deleteErrorMessage?: string;
  /** Success message for delete success */
  deleteSuccessMessage?: string;
  /** Label for actions dropdown (default: "Azioni") */
  actionsLabel?: string;
  /** Additional menu items to render before the separator */
  children?: ReactNode;
  /** Callback after successful deletion */
  onDeleteSuccess?: () => void;
}

export function EntityActionsMenu({
  entityId,
  editHref,
  editLabel = "Modifica",
  deleteAction,
  deleteTitle = "Sei sicuro?",
  deleteDescription = "Questa azione non può essere annullata. I dati verranno eliminati permanentemente.",
  deleteErrorMessage = "Errore durante l'eliminazione",
  deleteSuccessMessage,
  actionsLabel = "Azioni",
  children,
  onDeleteSuccess,
}: EntityActionsMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="p-0 w-8 h-8" />}
        >
          <span className="sr-only">Apri menu</span>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{actionsLabel}</DropdownMenuLabel>
          </DropdownMenuGroup>
          {editHref && (
            <DropdownMenuItem render={<Link href={editHref as never} />}>
              <Edit className="mr-1 size-4" />
              {editLabel}
            </DropdownMenuItem>
          )}
          {deleteAction && (
            <DropdownMenuItem
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600"
            >
              <Trash2 className="mr-1 size-4" />
              Elimina
            </DropdownMenuItem>
          )}
          {children && (
            <>
              <DropdownMenuSeparator />
              {children}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {deleteAction && deleteDialogOpen && (
        <DeleteWithConfirm
          open={true}
          onOpenChange={(open) => {
            if (!open) setDeleteDialogOpen(false);
          }}
          deleteAction={deleteAction}
          title={deleteTitle}
          description={deleteDescription}
          errorMessage={deleteErrorMessage}
          successMessage={deleteSuccessMessage}
          onSuccess={onDeleteSuccess}
        />
      )}
    </>
  );
}
