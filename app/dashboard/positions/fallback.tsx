import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PositionsSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4">
        <Skeleton className="w-full h-10" />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Skeleton className="w-20 h-5" />
              </TableHead>
              <TableHead>
                <Skeleton className="w-16 h-5" />
              </TableHead>
              <TableHead>
                <Skeleton className="w-24 h-5" />
              </TableHead>
              <TableHead>
                <Skeleton className="w-32 h-5" />
              </TableHead>
              <TableHead className="text-right">
                <Skeleton className="ml-auto w-16 h-5" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="w-32 h-5" />
                </TableCell>
                <TableCell>
                  <Skeleton className="w-20 h-6" />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Skeleton className="w-16 h-6" />
                    <Skeleton className="w-16 h-6" />
                    <Skeleton className="w-10 h-6" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="w-24 h-5" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="ml-auto w-20 h-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
