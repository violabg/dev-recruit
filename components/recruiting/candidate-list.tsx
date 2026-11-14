"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Candidate {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface CandidateListProps {
  candidates: Candidate[];
  selectedCandidateIds?: string[];
}

export function CandidateList({
  candidates,
  selectedCandidateIds = [],
}: CandidateListProps) {
  const getStatusColor = (status: string) => {
    const statusMap: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      active: "default",
      inactive: "secondary",
      rejected: "destructive",
      pending: "outline",
    };
    return statusMap[status.toLowerCase()] || "outline";
  };

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center p-8 border border-dashed rounded-lg h-40 text-center">
        <p className="text-muted-foreground text-sm">
          No candidates available to assign for this quiz position.
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          All candidates in this position have already been assigned or there
          are no candidates in this position.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px] text-center">Selection</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <TableRow
              key={candidate.id}
              className={
                selectedCandidateIds.includes(candidate.id) ? "bg-muted/50" : ""
              }
            >
              <TableCell className="font-medium">{candidate.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {candidate.email}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusColor(candidate.status)}>
                  {candidate.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {selectedCandidateIds.includes(candidate.id) && (
                  <Badge variant="default">Selected</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
