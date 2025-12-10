"use client";

import { formatDistanceToNow } from "date-fns";
import { Copy } from "lucide-react";
import { useState } from "react";

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
import { deleteInterview } from "@/lib/actions/interviews";
import type { AssignedInterview } from "@/lib/data/interviews";
import { toast } from "sonner";
import { TableRowLink } from "../ui/table-row-link";

interface InvitesListProps {
  assignedInterviews: AssignedInterview[];
}

export function InvitesList({ assignedInterviews }: InvitesListProps) {
  const [interviews, setInterviews] =
    useState<AssignedInterview[]>(assignedInterviews);

  const copyInterviewLink = (token: string) => {
    const link = `${window.location.origin}/recruting/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied", {
      description: "The interview link has been copied to your clipboard",
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
                <TableCell className="relative font-medium">
                  <TableRowLink
                    href={`/dashboard/interviews/${interview.id}`}
                  />
                  {interview.candidateName}
                </TableCell>
                <TableCell>{interview.quizTitle}</TableCell>
                <TableCell>{getStatusBadge(interview.status)}</TableCell>
                <TableCell>{formatDate(interview.createdAt)}</TableCell>
                <TableCell className="z-10 relative text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInterviewLink(interview.token)}
                      title="Copy interview link"
                    >
                      <Copy className="size-4" />
                    </Button>
                    <DeleteWithConfirm
                      deleteAction={async () => {
                        await deleteInterview(interview.id);
                        setInterviews(
                          interviews.filter((i) => i.id !== interview.id)
                        );
                      }}
                      title="Are you sure?"
                      description="This will permanently delete the interview. This action cannot be undone."
                      label="Delete"
                      iconOnly
                      successMessage="Interview deleted successfully"
                      errorMessage="Failed to delete interview"
                      disabled={interview.status === "completed"}
                      variant="outline"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
