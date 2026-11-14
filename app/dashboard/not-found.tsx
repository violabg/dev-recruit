import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchX } from "lucide-react";
import Link from "next/link";

/** Shown when a dashboard page calls notFound() (unknown id, deleted record). */
export default function DashboardNotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col justify-center items-center py-12">
        <div className="flex flex-col items-center max-w-md text-center">
          <div className="flex justify-center items-center bg-muted mb-4 rounded-full size-12">
            <SearchX className="size-6 text-muted-foreground" />
          </div>
          <h2 className="mb-2 font-semibold text-lg">Pagina non trovata</h2>
          <p className="mb-6 text-muted-foreground text-sm">
            L&apos;elemento che cerchi non esiste o è stato eliminato.
          </p>
          <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
            Torna alla dashboard
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
