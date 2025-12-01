"use client";

import { formatDistanceToNow } from "date-fns";
import { Copy, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react"; // Keep useEffect for potential refreshTrigger if needed

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
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
import { deleteInterview } from "@/lib/actions/interviews";
import type { AssignedInterview } from "@/lib/data/interviews";
import { toast } from "sonner";

interface InvitesListProps {
  // quizId: string; // No longer needed if interviews are passed directly
  assignedInterviews: AssignedInterview[];
  refreshTrigger?: number; // Kept for now, might be removed if revalidation is sufficient
}

export function InvitesList({
  assignedInterviews,
  refreshTrigger = 0,
}: InvitesListProps) {
  const [interviews, setInterviews] =
    useState<AssignedInterview[]>(assignedInterviews);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Update interviews if the prop changes (e.g., after revalidation)
  useEffect(() => {
    setInterviews(
      assignedInterviews.filter((interview) => interview.createdAt)
    );
  }, [assignedInterviews, refreshTrigger]);

  const copyInterviewLink = (token: string) => {
    const link = `${window.location.origin}/recruting/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied", {
      description: "The interview link has been copied to your clipboard",
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    startTransition(async () => {
      try {
        setDeleting(true);
        await deleteInterview(deleteId); // This server action should revalidate the path

        // Optimistically update UI or rely on revalidation from parent
        setInterviews(
          interviews.filter((interview) => interview.id !== deleteId)
        );

        toast.success("Interview deleted", {
          description: "The interview has been deleted successfully",
        });
      } catch (error: unknown) {
        toast.error("Error", {
          description:
            error instanceof Error
              ? error.message
              : "Failed to delete interview",
        });
      } finally {
        setDeleting(false);
        setDeleteId(null);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "in_progress":
        return <Badge variant="secondary">In progress</Badge>;
      case "completed":
        return <Badge>Completed</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  if (interviews.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center p-8 border border-dashed rounded-lg h-40 text-center">
        <p className="text-muted-foreground text-sm">
          No interviews have been created for this quiz yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Quiz</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interviews.map((interview) => (
              <TableRow key={interview.id}>
                <TableCell className="font-medium">
                  {interview.candidateName}
                </TableCell>
                <TableCell>{interview.quizTitle}</TableCell>
                <TableCell>{getStatusBadge(interview.status)}</TableCell>
                <TableCell>{formatDate(interview.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInterviewLink(interview.token)}
                      title="Copy interview link"
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(interview.id)}
                      title="Delete interview"
                      disabled={interview.status === "completed"}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the interview. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || isPending}
            >
              {deleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
